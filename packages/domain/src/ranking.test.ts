import { describe, expect, it } from 'vitest';
import { catalog, sampleLibrary } from '@seen/fixtures';
import {
  activeComparisons,
  buildSnapshot,
  fitBradleyTerry,
  isEligible,
  pickComparison,
  rankScore,
  sigmoid,
} from './ranking';
import { answerComparison, emptyLibrary, saveLog } from './library';

describe('regularized ranking and Rank Score', () => {
  it('keeps scores finite for extreme values and uses the fixed monotonic scale', () => {
    expect(sigmoid(-1000)).toBe(0);
    expect(sigmoid(1000)).toBe(1);
    expect(rankScore(0)).toBe(5);
    expect(rankScore(1000)).toBe(10);
    expect(rankScore(-1000)).toBe(0);
    expect(rankScore(0.3)).toBeLessThan(rankScore(1));
    expect(() => rankScore(NaN)).toThrow();
  });
  it('does not assign ordinal or score from sentiment alone', () => {
    const state = sampleLibrary();
    state.comparisons = [];
    expect(
      buildSnapshot(catalog, state, 'movie').items.every(
        (i) => i.position === null && i.rankScore === null,
      ),
    ).toBe(true);
  });
  it('converges independently of title and edge input order', () => {
    const titles = [
        { id: 'a', prior: 1 },
        { id: 'b', prior: 0 },
        { id: 'c', prior: -1 },
      ],
      edges = [
        { a: 'a', b: 'b', y: 1 },
        { a: 'b', b: 'c', y: 0.5 },
        { a: 'c', b: 'a', y: 1 },
      ];
    const a = fitBradleyTerry(titles, edges),
      b = fitBradleyTerry([...titles].reverse(), [...edges].reverse());
    expect(a.converged).toBe(true);
    expect([...a.scores]).toEqual([...b.scores]);
    expect(a.gradientNorm).toBeLessThan(1e-5);
  });
  it('permits Fine to outrank Liked through evidence', () => {
    const result = fitBradleyTerry(
      [
        { id: 'liked', prior: 1 },
        { id: 'fine', prior: 0 },
      ],
      [{ a: 'fine', b: 'liked', y: 1 }],
    );
    expect(result.converged).toBe(true);
    expect(result.scores.get('fine')!).toBeGreaterThan(result.scores.get('liked')!);
  });
  it('accepts cycles and disconnected components without inventing certainty', () => {
    const fit = fitBradleyTerry(
      ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, prior: 0 })),
      [
        { a: 'a', b: 'b', y: 1 },
        { a: 'b', b: 'c', y: 1 },
        { a: 'c', b: 'a', y: 1 },
        { a: 'd', b: 'e', y: 1 },
      ],
    );
    expect(fit.converged).toBe(true);
    expect([...fit.scores.values()].every(Number.isFinite)).toBe(true);
    expect(fit.scores.get('a')).toBeCloseTo(fit.scores.get('b')!, 5);
  });
  it('never rescales existing scores when unrelated unplaced media is added', () => {
    const state = sampleLibrary(),
      before = buildSnapshot(catalog, state, 'movie');
    const after = buildSnapshot(
      catalog,
      {
        ...state,
        opinions: [
          ...state.opinions,
          { mediaId: 'moon', sentiment: 'liked', seenEnough: true, status: null, revision: 1 },
        ],
      },
      'movie',
    );
    for (const item of before.items)
      expect(after.items.find((i) => i.mediaId === item.mediaId)?.rankScore).toBe(item.rankScore);
  });
  it('filters stale opinion evidence and keeps only the latest answer per unordered pair', () => {
    const state = sampleLibrary(),
      first = state.comparisons[0]!;
    const answer = { ...first, id: 'replacement', outcome: 'similar' as const };
    expect(activeComparisons(state.opinions, [first, answer])).toEqual([answer]);
    const opinions = state.opinions.map((o) => (o.mediaId === first.a ? { ...o, revision: 2 } : o));
    expect(activeComparisons(opinions, [first, answer])).toEqual([]);
  });
  it('requires seen-enough confirmation for TV and never compares formats', () => {
    const tv = catalog.find((m) => m.kind === 'tv')!;
    expect(
      isEligible(
        { mediaId: tv.id, sentiment: 'liked', status: 'watching', seenEnough: false, revision: 1 },
        tv,
      ),
    ).toBe(false);
    const state = sampleLibrary();
    expect(() =>
      answerComparison(state, catalog, 'arrival', 'severance', 'a_wins', 'invalid'),
    ).toThrow();
    expect(
      pickComparison(catalog, state, 'movie', new Set())?.every((m) => m.kind === 'movie'),
    ).toBe(true);
  });
  it('returns no pair for zero or one eligible title and for an exhausted session', () => {
    expect(pickComparison(catalog, emptyLibrary(), 'movie', new Set())).toBeNull();
    const state = sampleLibrary();
    state.opinions = state.opinions.filter((o) => o.mediaId === 'arrival');
    state.comparisons = [];
    expect(pickComparison(catalog, state, 'movie', new Set())).toBeNull();
    const full = sampleLibrary(),
      blocked = new Set<string>();
    for (const a of catalog) for (const b of catalog) blocked.add([a.id, b.id].sort().join('|'));
    expect(pickComparison(catalog, full, 'movie', blocked)).toBeNull();
  });
  it('does not count skip or undecided as preference and undo restores prior pair evidence', () => {
    const state = sampleLibrary();
    expect(answerComparison(state, catalog, 'arrival', 'parasite', 'skip', 's')).toBe(state);
    expect(answerComparison(state, catalog, 'arrival', 'parasite', 'undecided', 'u')).toBe(state);
    const changed = answerComparison(state, catalog, 'arrival', 'parasite', 'b_wins', 'change');
    expect(changed.comparisons.length).toBe(state.comparisons.length + 1);
    const restored = {
      ...changed,
      comparisons: changed.comparisons.filter((c) => c.id !== 'change'),
    };
    expect(buildSnapshot(catalog, restored, 'movie').items).toEqual(
      buildSnapshot(catalog, state, 'movie').items,
    );
  });
  it('a same answer is soft evidence, and sentiment revisions clear touching ranks', () => {
    let state = emptyLibrary();
    const input = {
      sentiment: 'liked' as const,
      status: null,
      seenEnough: true,
      watchedOn: null,
      historical: true,
      rewatch: false,
      note: '',
    };
    for (const mediaId of ['arrival', 'moon'])
      state = saveLog(state, catalog, { ...input, mediaId }, mediaId, '2026-10-04T12:00:00.000Z');
    state = answerComparison(state, catalog, 'arrival', 'moon', 'similar', 'similar');
    const ranks = buildSnapshot(catalog, state, 'movie');
    expect(ranks.items[0]?.rankScore).toBe(ranks.items[1]?.rankScore);
    state = saveLog(
      state,
      catalog,
      { ...input, mediaId: 'arrival', sentiment: 'fine' },
      'edit',
      '2026-10-04T12:00:00.000Z',
    );
    expect(buildSnapshot(catalog, state, 'movie').items.every((i) => i.rankScore === null)).toBe(
      true,
    );
  });
  it('prefers a ranked anchor with matching genres for a newly logged title', () => {
    const state = saveLog(
      sampleLibrary(),
      catalog,
      {
        mediaId: 'moon',
        sentiment: 'liked',
        status: null,
        seenEnough: true,
        watchedOn: null,
        historical: true,
        rewatch: false,
        note: '',
      },
      'moon-log',
      '2026-10-04T12:00:00.000Z',
    );
    const pair = pickComparison(catalog, state, 'movie', new Set(), 'moon');
    expect(pair?.map((media) => media.id)).toEqual(['moon', 'arrival']);
    const reversed = pickComparison([...catalog].reverse(), state, 'movie', new Set(), 'moon');
    expect(reversed).toEqual(pair);
  });
  it('keeps a selected title unscored through four skipped pairs, then places it from evidence', () => {
    let state = saveLog(
      sampleLibrary(),
      catalog,
      {
        mediaId: 'moon',
        sentiment: 'fine',
        status: null,
        seenEnough: true,
        watchedOn: null,
        historical: true,
        rewatch: false,
        note: '',
      },
      'moon-log',
      '2026-10-04T12:00:00.000Z',
    );
    const excluded = new Set<string>();
    for (let step = 0; step < 4; step++) {
      const pair = pickComparison(catalog, state, 'movie', excluded, 'moon')!;
      expect(pair[0].id).toBe('moon');
      state = answerComparison(
        state,
        catalog,
        pair[0].id,
        pair[1].id,
        step % 2 ? 'undecided' : 'skip',
        `skip-${step}`,
      );
      excluded.add(
        pair
          .map((media) => media.id)
          .sort()
          .join('|'),
      );
      expect(
        buildSnapshot(catalog, state, 'movie').items.find((item) => item.mediaId === 'moon')
          ?.rankScore,
      ).toBeNull();
    }
    const pair = pickComparison(catalog, state, 'movie', excluded, 'moon')!;
    state = answerComparison(state, catalog, pair[0].id, pair[1].id, 'similar', 'place');
    const placed = buildSnapshot(catalog, state, 'movie').items.find(
      (item) => item.mediaId === 'moon',
    )!;
    expect(placed.rankScore).not.toBeNull();
    expect(placed.position).toBeGreaterThan(0);
    expect(placed.evidence).toBe('provisional');
  });
  it('never substitutes another focus when the selected TV title is ineligible', () => {
    const state = saveLog(
      sampleLibrary(),
      catalog,
      {
        mediaId: 'bear',
        sentiment: 'disliked',
        status: 'watching',
        seenEnough: false,
        watchedOn: null,
        historical: true,
        rewatch: false,
        note: '',
      },
      'bear-log',
      '2026-10-04T12:00:00.000Z',
    );
    expect(pickComparison(catalog, state, 'tv', new Set(), 'bear')).toBeNull();
    expect(pickComparison(catalog, state, 'movie', new Set(), 'missing')).toBeNull();
  });
});
