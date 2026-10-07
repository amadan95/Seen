import { describe, expect, it } from 'vitest';
import { librarySchema, type Library, type Media } from '@seen/contracts';
import { catalog, sampleLibrary } from '@seen/fixtures';
import {
  analyzeRanking,
  RankingCache,
  chooseComparison,
  rankingInputKey,
  pairKey,
} from './ranking';
import { answerComparison, emptyLibrary, saveLog, setTitleNote, setWatchlist } from './library';
import { recommend, dismissRecommendation } from './recommendations';
import { withUndo, undoMutation } from './recovery';
import {
  openComparisonSession,
  offerComparison,
  answerSession,
  retrySkippedPairs,
} from './sessions';

const now = '2026-10-06T12:00:00.000Z';
const input = {
  sentiment: 'liked' as const,
  status: null,
  seenEnough: true,
  watchedOn: null,
  historical: true,
  rewatch: false,
  note: '',
};
const movie = (id: string, genres = ['Drama']): Media => ({
  ...catalog[0]!,
  id,
  title: id,
  kind: 'movie',
  genres,
  releaseDate: '2020-01-01',
  source: 'fixture',
});
const log = (state: Library, media: Media[], id: string) =>
  saveLog(state, media, { ...input, mediaId: id }, `log-${id}`, now);

describe('personal recommendations', () => {
  const media = [
    movie('liked', ['Sci-fi']),
    movie('disliked', ['Crime']),
    movie('good', ['Sci-fi']),
    movie('bad', ['Crime']),
    movie('neutral', ['Comedy']),
  ];
  it('orders by explicit taste rather than input catalog order, with grounded reasons', () => {
    let state = log(emptyLibrary(), media, 'liked');
    state = saveLog(
      state,
      media,
      { ...input, mediaId: 'disliked', sentiment: 'disliked' },
      'negative',
      now,
    );
    const a = recommend(media, state, { kind: 'movie', seed: 'fixed', now }),
      b = recommend([...media].reverse(), state, { kind: 'movie', seed: 'fixed', now });
    expect(a.items[0]!.media.id).toBe('good');
    expect(a.items[0]!.reason).toBe('Because you liked liked');
    expect(a.items.map((i) => i.media.id)).toEqual(b.items.map((i) => i.media.id));
    expect(a.items.find((i) => i.media.id === 'bad')!.score).toBeLessThan(
      a.items.find((i) => i.media.id === 'neutral')!.score,
    );
  });
  it('strictly filters runtime, release dates, format, watchlist membership and temporary exclusion', () => {
    const pool = [
      ...media,
      movie('unknown'),
      { ...movie('future'), releaseDate: '2027-01-01' },
      { ...movie('tv'), kind: 'tv' as const },
      { ...movie('long'), runtimeMinutes: 180 },
    ];
    pool.find((m) => m.id === 'unknown')!.runtimeMinutes = null;
    const state = setWatchlist(emptyLibrary(), 'good', true, now);
    const result = recommend(pool, state, {
      kind: 'movie',
      seed: 's',
      now,
      maxRuntime: 120,
      watchlistOnly: true,
    });
    expect(result.items.map((i) => i.media.id)).toEqual(['good']);
    expect(
      recommend(pool, state, {
        kind: 'movie',
        seed: 's',
        now,
        maxRuntime: 120,
        watchlistOnly: true,
        exclude: new Set(['good']),
      }).items,
    ).toEqual([]);
    expect(
      recommend(pool, state, { kind: 'movie', seed: 's', now, maxRuntime: 120 }).items.some((i) =>
        ['unknown', 'future', 'tv', 'long'].includes(i.media.id),
      ),
    ).toBe(false);
  });
  it('requires fresh exact subscription offers; rent, unknown, stale, and add-on IDs fail', () => {
    const available: Media = {
      ...movie('available'),
      availability: {
        region: 'US',
        status: 'available',
        source: 'JustWatch via TMDB',
        checkedAt: now,
        stale: false,
        sourceUrl: null,
        offers: [{ providerId: 9, name: 'Example', logoUrl: null, type: 'subscription' }],
      },
    };
    const pool = [
      available,
      {
        ...available,
        id: 'rent',
        availability: {
          ...available.availability!,
          offers: [{ providerId: 9, name: 'Example', logoUrl: null, type: 'rent' as const }],
        },
      },
      { ...available, id: 'stale', availability: { ...available.availability!, stale: true } },
      {
        ...available,
        id: 'expired',
        availability: { ...available.availability!, checkedAt: '2026-10-01T12:00:00.000Z' },
      },
      movie('unknown'),
    ];
    expect(
      recommend(pool, emptyLibrary(), {
        kind: 'movie',
        seed: 's',
        now,
        providerIds: [9],
      }).items.map((i) => i.media.id),
    ).toEqual(['available']);
    expect(
      recommend(pool, emptyLibrary(), { kind: 'movie', seed: 's', now, providerIds: [119] }).items,
    ).toEqual([]);
  });
  it('persistent dismissals survive reload and undo without changing sentiment or search catalog', () => {
    const state = emptyLibrary(),
      item = recommend(media, state, { kind: 'movie', seed: 's', now }).items[0]!;
    const changed = withUndo(state, dismissRecommendation(state, item, now), 'dismissal', 'u', now);
    const restored = librarySchema.parse(JSON.parse(JSON.stringify(changed)));
    expect(
      recommend(media, restored, { kind: 'movie', seed: 's', now }).items.some(
        (i) => i.media.id === item.media.id,
      ),
    ).toBe(false);
    expect(restored.opinions).toEqual([]);
    expect(media.some((m) => m.id === item.media.id)).toBe(true);
    expect(undoMutation(restored, 'u').dismissals).toEqual([]);
  });
  it('labels cold-start recommendations and excludes seen titles without inventing scores', () => {
    const state = log(emptyLibrary(), media, 'liked');
    expect(
      recommend(media, emptyLibrary(), { kind: 'movie', seed: 's', now }).items.every(
        (i) => i.reasonCode === 'catalog',
      ),
    ).toBe(true);
    expect(
      recommend(media, state, { kind: 'movie', seed: 's', now }).items.some(
        (i) => i.media.id === 'liked',
      ),
    ).toBe(false);
    expect(analyzeRanking(media, state, 'movie').snapshot.items[0]!.rankScore).toBeNull();
  });
  it('preserves recommendation source on save and first log, without attributing rewatches', () => {
    const origin = { requestId: 'r', itemId: 'r:good', servedAt: now };
    const saved = setWatchlist(emptyLibrary(), 'good', true, now, origin);
    const watched = saveLog(
      saved,
      media,
      { ...input, historical: false, mediaId: 'good' },
      'first',
      now,
    );
    expect(log(saved, media, 'good').logs[0]!.recommendation).toBeUndefined();
    expect(watched.logs[0]!.recommendation).toEqual(origin);
    const rewatch = saveLog(
      watched,
      media,
      { ...input, mediaId: 'good', rewatch: true },
      'rewatch',
      now,
    );
    expect(rewatch.logs[1]!.recommendation).toBeUndefined();
  });
});

describe('durable targeted undo', () => {
  it('restores a log after serialization and preserves unrelated later edits', () => {
    const before = emptyLibrary(),
      after = withUndo(before, log(before, catalog, 'moon'), 'watch', 'u', now);
    const changed = setTitleNote(
      librarySchema.parse(JSON.parse(JSON.stringify(after))),
      catalog,
      'arrival',
      'Keep this',
      now,
    );
    const restored = undoMutation(changed, 'u');
    expect(restored.logs).toEqual([]);
    expect(restored.opinions).toEqual([]);
    expect(restored.notes.find((n) => n.mediaId === 'arrival')!.text).toBe('Keep this');
  });
  it('refuses log undo after a later comparison touches the title', () => {
    const before = log(emptyLibrary(), catalog, 'arrival');
    const after = withUndo(before, log(before, catalog, 'moon'), 'watch', 'u', now);
    expect(() =>
      undoMutation(answerComparison(after, catalog, 'arrival', 'moon', 'similar', 'pair'), 'u'),
    ).toThrow('changed');
  });
  it('restores pair evidence but refuses superseded votes and changed endpoint opinions', () => {
    const before = sampleLibrary(),
      after = withUndo(
        before,
        answerComparison(before, catalog, 'arrival', 'parasite', 'b_wins', 'answer'),
        'comparison',
        'u',
        now,
      );
    expect(analyzeRanking(catalog, undoMutation(after, 'u'), 'movie').snapshot.items).toEqual(
      analyzeRanking(catalog, before, 'movie').snapshot.items,
    );
    expect(() =>
      undoMutation(answerComparison(after, catalog, 'arrival', 'parasite', 'a_wins', 'newer'), 'u'),
    ).toThrow('changed');
    expect(() =>
      undoMutation(
        saveLog(
          after,
          catalog,
          { ...input, mediaId: 'arrival', sentiment: 'disliked' },
          'edit',
          now,
        ),
        'u',
      ),
    ).toThrow('changed');
  });
  it('restores watchlist priority/date without reverting other titles', () => {
    const before = sampleLibrary(),
      after = withUndo(before, setWatchlist(before, 'moon', false, now), 'remove', 'u', now);
    const changed = setWatchlist(after, 'arrival', true, now);
    const restored = undoMutation(changed, 'u');
    expect(restored.watchlist.find((w) => w.mediaId === 'moon')).toEqual(
      before.watchlist.find((w) => w.mediaId === 'moon'),
    );
    expect(restored.watchlist.some((w) => w.mediaId === 'arrival')).toBe(true);
  });
});

describe('ranking input cache', () => {
  it('does not refit for notes, provider choices, watchlist changes or hydrated posters', () => {
    let fits = 0;
    const cache = new RankingCache((c, l, k) => {
      fits++;
      return analyzeRanking(c, l, k);
    });
    const state = sampleLibrary();
    cache.update(catalog, state);
    expect(fits).toBe(2);
    const changed = setTitleNote(
      setWatchlist(state, 'arrival', true, now),
      catalog,
      'arrival',
      'Private',
      now,
    );
    changed.selectedProviders = [9];
    cache.update(
      catalog.map((m) => ({ ...m, posterUrl: 'https://example.com/poster.jpg' })),
      changed,
    );
    expect(fits).toBe(2);
    cache.update(catalog, log(changed, catalog, 'moon'));
    expect(fits).toBe(3);
  });
  it('retains confirmed scores on failed fits and recovers on explicit retry', () => {
    let fail = false;
    const cache = new RankingCache((c, l, k) => {
      if (fail && k === 'movie') throw new Error('failed');
      return analyzeRanking(c, l, k);
    });
    const state = sampleLibrary();
    cache.update(catalog, state);
    const old = cache.get('movie').analysis.snapshot;
    fail = true;
    const next = answerComparison(state, catalog, 'arrival', 'parasite', 'b_wins', 'next');
    cache.update(catalog, next);
    expect(cache.get('movie').error).not.toBeNull();
    expect(cache.get('movie').analysis.snapshot.items).toEqual(old.items);
    fail = false;
    cache.update(catalog, next, true);
    expect(cache.get('movie').error).toBeNull();
    expect(cache.get('movie').analysis.snapshot.sourceRevision).toBe(next.revision);
  });
  it('clears reset evidence even if the next fit fails', () => {
    let fail = false;
    const cache = new RankingCache((c, l, k) => {
      if (fail) throw new Error('failure');
      return analyzeRanking(c, l, k);
    });
    const state = sampleLibrary();
    cache.update(catalog, state);
    fail = true;
    cache.update(catalog, { ...state, comparisons: [] });
    expect(
      cache
        .get('movie')
        .analysis.snapshot.items.every((i) => i.rankScore === null && i.position === null),
    ).toBe(true);
  });
});

describe('adaptive persisted comparison sessions', () => {
  it('schedules the fifth served bridge across short sessions and reloads', () => {
    const media = Array.from({ length: 8 }, (_, i) => movie(`m${i}`));
    let state = emptyLibrary();
    for (const m of media) state = log(state, media, m.id);
    state = openComparisonSession(state, 'movie', undefined, 'refine', 'first');
    for (let i = 0; i < 3; i++) {
      state = offerComparison(state, media, 'first', analyzeRanking(media, state, 'movie'), now);
      state = answerSession(state, media, 'first', 'skip', `skip-${i}`, now);
    }
    state = librarySchema.parse(JSON.parse(JSON.stringify(state)));
    state = openComparisonSession(state, 'movie', undefined, 'refine', 'second');
    state = offerComparison(state, media, 'second', analyzeRanking(media, state, 'movie'), now);
    expect(state.comparisonServeCounts.movie).toBe(4);
    state = answerSession(state, media, 'second', 'skip', 'skip-4', now);
    state = offerComparison(state, media, 'second', analyzeRanking(media, state, 'movie'), now);
    expect(state.comparisonServeCounts.movie).toBe(5);
    expect(state.comparisonSessions.find((s) => s.id === 'second')!.reason).toBe(
      'component_bridge',
    );
    expect(state.comparisonServeCounts.tv).toBe(0);
  });
  it('persists skips beyond three placement questions without preference evidence', () => {
    const media = Array.from({ length: 8 }, (_, i) => movie(`m${i}`));
    let state = emptyLibrary();
    for (const m of media) state = log(state, media, m.id);
    state = openComparisonSession(state, 'movie', 'm0', 'placement', 'session');
    for (let i = 0; i < 4; i++) {
      state = offerComparison(state, media, 'session', analyzeRanking(media, state, 'movie'), now);
      const offered = state.comparisonSessions[0]!.offered!;
      state = answerSession(state, media, 'session', i % 2 ? 'skip' : 'undecided', `skip${i}`, now);
      expect(state.comparisonCooldowns.some((c) => c.key === pairKey(...offered))).toBe(true);
      state = librarySchema.parse(JSON.parse(JSON.stringify(state)));
    }
    expect(state.comparisons).toEqual([]);
    expect(state.comparisonSessions[0]!.steps).toBe(4);
    state = offerComparison(state, media, 'session', analyzeRanking(media, state, 'movie'), now);
    state = answerSession(state, media, 'session', 'similar', 'answer', now);
    expect(
      analyzeRanking(media, state, 'movie').snapshot.items.find((i) => i.mediaId === 'm0')!
        .rankScore,
    ).not.toBeNull();
  });
  it('limits general refinement to three questions and supports explicit skipped-pair retry', () => {
    let state = openComparisonSession(sampleLibrary(), 'movie', undefined, 'refine', 's');
    for (let i = 0; i < 3; i++) {
      state = offerComparison(state, catalog, 's', analyzeRanking(catalog, state, 'movie'), now);
      state = answerSession(state, catalog, 's', 'skip', `skip${i}`, now);
    }
    expect(offerComparison(state, catalog, 's', analyzeRanking(catalog, state, 'movie'), now)).toBe(
      state,
    );
    state = retrySkippedPairs(state, 's');
    expect(state.comparisonSessions[0]!.excluded).toEqual([]);
    expect(state.comparisonCooldowns).toEqual([]);
  });
  it('rejects stale offered evidence and ineligible TV without offering a substitute', () => {
    let state = openComparisonSession(sampleLibrary(), 'movie', 'arrival', 'placement', 's');
    state = offerComparison(state, catalog, 's', analyzeRanking(catalog, state, 'movie'), now);
    state = saveLog(
      state,
      catalog,
      { ...input, mediaId: 'arrival', sentiment: 'fine' },
      'edit',
      now,
    );
    expect(() => answerSession(state, catalog, 's', 'similar', 'answer', now)).toThrow('changed');
    const tv = saveLog(
      sampleLibrary(),
      catalog,
      { ...input, mediaId: 'bear', status: 'watching', seenEnough: false },
      'tv',
      now,
    );
    expect(chooseComparison(catalog, tv, 'tv', new Set(), 'bear')).toBeNull();
  });
  it('bridges disconnected groups every fifth question and randomizes sides reproducibly', () => {
    const media = ['a', 'b', 'c', 'd'].map((id) => movie(id));
    let state = emptyLibrary();
    for (const m of media) state = log(state, media, m.id);
    state = answerComparison(state, media, 'a', 'b', 'similar', 'ab');
    state = answerComparison(state, media, 'c', 'd', 'similar', 'cd');
    const analysis = analyzeRanking(media, state, 'movie');
    const choice = chooseComparison(media, state, 'movie', new Set(), undefined, {
      analysis,
      served: 4,
      seed: 'seed',
    })!;
    expect(choice.reason).toBe('component_bridge');
    expect(analysis.components.get(choice.pair[0].id)).not.toBe(
      analysis.components.get(choice.pair[1].id),
    );
    expect(
      chooseComparison([...media].reverse(), state, 'movie', new Set(), undefined, {
        analysis,
        served: 4,
        seed: 'seed',
      }),
    ).toEqual(choice);
    const sides = new Set(
      Array.from(
        { length: 20 },
        (_, i) =>
          chooseComparison(media, state, 'movie', new Set(), 'a', { analysis, seed: String(i) })!
            .pair[0].id,
      ),
    );
    expect(sides.size).toBeGreaterThan(1);
    expect(rankingInputKey(media, state, 'movie')).toBe(
      rankingInputKey([...media].reverse(), state, 'movie'),
    );
  });
});
