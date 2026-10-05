import { describe, expect, it } from 'vitest';
import {
  librarySchema,
  mutationEnvelopeSchema,
  sentimentSchema,
  watchlistCommandSchema,
} from '@seen/contracts';
import { catalog, sampleLibrary } from '@seen/fixtures';
import {
  answerComparison,
  confirmSeenEnough,
  emptyLibrary,
  filterCatalog,
  removeHistory,
  saveLog,
  setWatchlist,
  setTitleNote,
} from './library';

const now = '2026-10-04T12:00:00.000Z';
const input = {
  mediaId: 'moon',
  sentiment: 'liked' as const,
  status: null,
  seenEnough: true,
  watchedOn: null,
  historical: true,
  rewatch: false,
  note: '',
};
describe('local preview library semantics', () => {
  it('persists one event on repeated delivery, retains unknown historical date, and removes watched title from watchlist', () => {
    const saved = saveLog(
      setWatchlist(emptyLibrary(), 'moon', true, now),
      catalog,
      input,
      'log-1',
      now,
    );
    expect(saved.logs).toHaveLength(1);
    expect(saved.logs[0]?.watchedOn).toBeNull();
    expect(saved.watchlist).toHaveLength(0);
    expect(saveLog(saved, catalog, input, 'log-1', now)).toBe(saved);
    expect(librarySchema.parse(saved)).toEqual(saved);
  });
  it('edits latest log while explicit rewatches add a distinct event and no opinion revision', () => {
    const state = saveLog(emptyLibrary(), catalog, input, 'one', now);
    const edited = saveLog(state, catalog, { ...input, note: 'Private note' }, 'edit', now);
    expect(edited.logs).toHaveLength(1);
    expect(edited.opinions[0]?.revision).toBe(1);
    const rewatched = saveLog(edited, catalog, { ...input, rewatch: true }, 'two', now);
    expect(rewatched.logs).toHaveLength(2);
    expect(rewatched.opinions[0]?.revision).toBe(1);
  });
  it('rejects invalid and future dates, overlong notes, and movie logging without sentiment', () => {
    for (const date of ['2026-10-05', '2026-02-30', '2026-99-99', 'yesterday'])
      expect(() =>
        saveLog(emptyLibrary(), catalog, { ...input, watchedOn: date }, 'bad', now),
      ).toThrow();
    expect(() =>
      saveLog(emptyLibrary(), catalog, { ...input, note: 'x'.repeat(281) }, 'bad', now),
    ).toThrow();
    expect(() =>
      saveLog(emptyLibrary(), catalog, { ...input, sentiment: null }, 'bad', now),
    ).toThrow();
  });
  it('records status-only TV without manufacturing a completed watch or sentiment', () => {
    const watching = saveLog(
      emptyLibrary(),
      catalog,
      { ...input, mediaId: 'bear', sentiment: null, status: 'watching', seenEnough: false },
      'watching',
      now,
    );
    expect(watching.logs).toHaveLength(0);
    expect(watching.opinions[0]?.sentiment).toBeNull();
    const dropped = saveLog(
      watching,
      catalog,
      { ...input, mediaId: 'bear', sentiment: null, status: 'dropped', seenEnough: false },
      'drop',
      now,
    );
    expect(dropped.opinions[0]?.sentiment).toBeNull();
  });
  it('watchlist desired state is retry-safe and deliberate re-add is allowed', () => {
    let state = setWatchlist(emptyLibrary(), 'moon', true, now);
    expect(setWatchlist(state, 'moon', true, now)).toBe(state);
    state = saveLog(state, catalog, input, 'seen', now);
    state = setWatchlist(state, 'moon', true, now);
    expect(state.watchlist).toHaveLength(1);
    expect(setWatchlist(state, 'moon', false, now).watchlist).toHaveLength(0);
  });
  it('requires known movie runtime for hard time filters; episodes never pass as movies', () => {
    const results = filterCatalog(catalog, { kind: 'all', maxRuntime: 120, genre: null });
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.every(
        (m) => m.kind === 'movie' && m.runtimeMinutes !== null && m.runtimeMinutes <= 120,
      ),
    ).toBe(true);
    expect(results.some((m) => m.id === 'unknown' || m.id === 'bear')).toBe(false);
  });
  it('removes title history and touching evidence without disturbing other titles', () => {
    const state = sampleLibrary(),
      result = removeHistory(state, 'arrival');
    expect(result.logs.some((l) => l.mediaId === 'arrival')).toBe(false);
    expect(result.comparisons.some((c) => c.a === 'arrival' || c.b === 'arrival')).toBe(false);
    expect(result.logs.filter((l) => l.mediaId === 'parasite')).toEqual(
      state.logs.filter((l) => l.mediaId === 'parasite'),
    );
  });
  it('rejects duplicate comparison delivery and validates envelope boundaries', () => {
    const state = sampleLibrary(),
      once = answerComparison(state, catalog, 'moon', 'arrival', 'skip', 'skip');
    expect(once).toBe(state);
    const answered = answerComparison(state, catalog, 'arrival', 'parasite', 'b_wins', 'id');
    expect(answerComparison(answered, catalog, 'arrival', 'parasite', 'b_wins', 'id')).toBe(
      answered,
    );
    expect(
      mutationEnvelopeSchema(sentimentSchema).safeParse({
        operation_id: 'not-a-uuid',
        schema_version: 1,
        kind: 'log',
        target_id: 'bad',
        base_revision: -1,
        payload: 'liked',
      }).success,
    ).toBe(false);
    expect(
      watchlistCommandSchema.safeParse({
        operation_id: '90f2c664-f29d-4e85-923e-cbe27bb744d3',
        schema_version: 1,
        kind: 'watchlist',
        target_id: '90f2c664-f29d-4e85-923e-cbe27bb744d3',
        base_revision: 0,
        payload: { present: true, priority: 3 },
      }).success,
    ).toBe(false);
  });
  it('confirms TV eligibility without adding a watch event or changing viewing status', () => {
    const state = saveLog(
      emptyLibrary(),
      catalog,
      { ...input, mediaId: 'bear', status: 'watching', seenEnough: false },
      'bear',
      now,
    );
    const confirmed = confirmSeenEnough(state, catalog, 'bear');
    expect(confirmed.logs).toEqual(state.logs);
    expect(confirmed.opinions[0]).toEqual({ ...state.opinions[0], seenEnough: true, revision: 2 });
    expect(confirmed.opinions[0]?.status).toBe('watching');
    expect(confirmSeenEnough(confirmed, catalog, 'bear')).toBe(confirmed);
    expect(() => confirmSeenEnough(emptyLibrary(), catalog, 'bear')).toThrow();
    expect(() => confirmSeenEnough(state, catalog, 'moon')).toThrow();
  });
});

describe('private title notes', () => {
  it('adds, edits and clears a note without manufacturing watches or changing ranking evidence', () => {
    const state = sampleLibrary();
    const added = setTitleNote(state, catalog, 'moon', ' First impression ', now);
    const edited = setTitleNote(added, catalog, 'moon', 'Remember the soundtrack', now);
    expect(edited.notes.find((note) => note.mediaId === 'moon')?.text).toBe(
      'Remember the soundtrack',
    );
    for (const result of [added, edited]) {
      expect(result.logs).toEqual(state.logs);
      expect(result.opinions).toEqual(state.opinions);
      expect(result.comparisons).toEqual(state.comparisons);
      expect(result.watchlist).toEqual(state.watchlist);
    }
    expect(setTitleNote(edited, catalog, 'moon', 'Remember the soundtrack', now)).toBe(edited);
    const cleared = setTitleNote(edited, catalog, 'moon', '', now);
    expect(cleared.notes.find((note) => note.mediaId === 'moon')?.text).toBe('');
    expect(librarySchema.parse(JSON.parse(JSON.stringify(edited)))).toEqual(edited);
  });
  it('reads older libraries and keeps the log and title editors consistent', () => {
    const { notes: omitted, ...legacy } = sampleLibrary();
    expect(omitted).toEqual([]);
    expect(librarySchema.parse(legacy).notes).toEqual([]);
    const noted = setTitleNote(emptyLibrary(), catalog, 'moon', 'Before watching', now);
    expect(noted.logs).toEqual([]);
    expect(noted.opinions).toEqual([]);
    const logged = saveLog(noted, catalog, { ...input, note: 'After watching' }, 'watch', now);
    expect(logged.notes[0]?.text).toBe('After watching');
    const cleared = setTitleNote(logged, catalog, 'moon', '', now);
    expect(cleared.notes[0]?.text).toBe('');
    expect(removeHistory(cleared, 'moon').notes).toEqual([]);
  });
  it('rejects overlong notes and unknown titles', () => {
    expect(() => setTitleNote(emptyLibrary(), catalog, 'moon', 'x'.repeat(281), now)).toThrow();
    expect(() => setTitleNote(emptyLibrary(), catalog, 'missing', 'Hello', now)).toThrow();
  });
});
