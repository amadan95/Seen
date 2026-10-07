import type {
  ComparisonAnswer,
  Library,
  Media,
  MediaKind,
  Sentiment,
  TvStatus,
  RecommendationContext,
} from '@seen/contracts';
import { isEligible } from './ranking.ts';
import { recommend } from './recommendations.ts';

export const emptyLibrary = (): Library => ({
  schemaVersion: 1,
  onboarded: false,
  revision: 0,
  opinions: [],
  logs: [],
  notes: [],
  comparisons: [],
  watchlist: [],
  catalogEntries: [],
  dismissals: [],
  selectedProviders: [],
  logDrafts: [],
  comparisonSessions: [],
  comparisonCooldowns: [],
  comparisonServeCounts: { movie: 0, tv: 0 },
  undoReceipts: [],
});
export interface LogInput {
  mediaId: string;
  sentiment: Sentiment | null;
  status: TvStatus | null;
  seenEnough: boolean;
  watchedOn: string | null;
  historical: boolean;
  rewatch: boolean;
  note: string;
  recommendation?: RecommendationContext;
}
export function saveLog(
  state: Library,
  catalog: Media[],
  input: LogInput,
  eventId: string,
  now: string,
): Library {
  if (state.logs.some((l) => l.id === eventId)) return state;
  const media = catalog.find((m) => m.id === input.mediaId);
  if (!media) throw new Error('Title unavailable');
  if (input.note.length > 280) throw new Error('Private notes are limited to 280 characters');
  if (input.watchedOn !== null) {
    const parsedDate = new Date(input.watchedOn);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(input.watchedOn) ||
      !Number.isFinite(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== input.watchedOn
    )
      throw new Error('Use a valid YYYY-MM-DD date');
    if (input.watchedOn > now.slice(0, 10)) throw new Error('Watch date cannot be in the future');
  }
  if (media.kind === 'movie' && !input.sentiment)
    throw new Error('Choose how you felt about this movie');
  if (media.kind === 'tv' && !input.status) throw new Error('Choose your show status');
  const previous = state.opinions.find((o) => o.mediaId === media.id);
  const opinionChanged =
    previous &&
    (previous.sentiment !== input.sentiment || previous.seenEnough !== input.seenEnough);
  const opinion = {
    mediaId: media.id,
    sentiment: input.sentiment,
    status: media.kind === 'tv' ? input.status : null,
    seenEnough: media.kind === 'movie' || input.seenEnough,
    revision: previous ? previous.revision + (opinionChanged ? 1 : 0) : 1,
  };
  const latest = [...state.logs].reverse().find((l) => l.mediaId === media.id);
  const log = {
    id: latest && !input.rewatch ? latest.id : eventId,
    mediaId: media.id,
    createdAt: latest && !input.rewatch ? latest.createdAt : now,
    watchedOn: input.watchedOn,
    historical: input.historical,
    rewatch: input.rewatch,
    note: input.note,
    recommendation:
      latest && !input.rewatch
        ? latest.recommendation
        : input.rewatch || input.historical || previous
          ? undefined
          : (input.recommendation ??
            state.watchlist.find((w) => w.mediaId === media.id)?.recommendation),
  };
  const createsWatchEvent =
    media.kind === 'movie' ||
    input.sentiment !== null ||
    input.status === 'finished' ||
    input.status === 'caught_up';
  return {
    ...state,
    revision: state.revision + 1,
    logDrafts: state.logDrafts.filter((draft) => draft.mediaId !== media.id),
    opinions: [...state.opinions.filter((o) => o.mediaId !== media.id), opinion],
    notes: [
      ...(state.notes ?? []).filter((note) => note.mediaId !== media.id),
      { mediaId: media.id, text: input.note.trim(), updatedAt: now },
    ],
    logs: !createsWatchEvent
      ? state.logs
      : latest && !input.rewatch
        ? state.logs.map((l) => (l.id === latest.id ? log : l))
        : [...state.logs, log],
    watchlist: state.watchlist.filter((w) => w.mediaId !== media.id),
  };
}
/** Private title notes never create watch events or invalidate ranking evidence. */
export function setTitleNote(
  state: Library,
  catalog: Media[],
  mediaId: string,
  text: string,
  now: string,
): Library {
  if (!catalog.some((media) => media.id === mediaId)) throw new Error('Title unavailable');
  if (text.length > 280) throw new Error('Private notes are limited to 280 characters');
  const cleaned = text.trim();
  const notes = state.notes ?? [];
  const previous = notes.find((note) => note.mediaId === mediaId);
  if (previous?.text === cleaned) return state;
  return {
    ...state,
    revision: state.revision + 1,
    // Keep an empty override when clearing a note so legacy watch notes don't reappear.
    notes: [
      ...notes.filter((note) => note.mediaId !== mediaId),
      { mediaId, text: cleaned, updatedAt: now },
    ],
  };
}

export function confirmSeenEnough(state: Library, catalog: Media[], mediaId: string): Library {
  const media = catalog.find((item) => item.id === mediaId);
  const opinion = state.opinions.find((item) => item.mediaId === mediaId);
  if (media?.kind !== 'tv' || !opinion?.sentiment)
    throw new Error('Save a sentiment for this show before ranking it');
  if (opinion.seenEnough) return state;
  return {
    ...state,
    revision: state.revision + 1,
    opinions: state.opinions.map((item) =>
      item.mediaId === mediaId ? { ...item, seenEnough: true, revision: item.revision + 1 } : item,
    ),
  };
}

export function setWatchlist(
  state: Library,
  mediaId: string,
  present: boolean,
  now: string,
  recommendation?: RecommendationContext,
): Library {
  const exists = state.watchlist.some((w) => w.mediaId === mediaId);
  if (exists === present) return state;
  return {
    ...state,
    revision: state.revision + 1,
    watchlist: present
      ? [...state.watchlist, { mediaId, addedAt: now, priority: 0, recommendation }]
      : state.watchlist.filter((w) => w.mediaId !== mediaId),
  };
}
export function setPriority(state: Library, mediaId: string, priority: number): Library {
  if (![0, 1, 2].includes(priority)) throw new Error('Invalid priority');
  return {
    ...state,
    revision: state.revision + 1,
    watchlist: state.watchlist.map((w) => (w.mediaId === mediaId ? { ...w, priority } : w)),
  };
}
export function answerComparison(
  state: Library,
  catalog: Media[],
  left: string,
  right: string,
  answer: ComparisonAnswer,
  eventId: string,
): Library {
  if (
    answer === 'skip' ||
    answer === 'undecided' ||
    state.comparisons.some((c) => c.id === eventId)
  )
    return state;
  const a = left < right ? left : right,
    b = left < right ? right : left;
  const ma = catalog.find((m) => m.id === a),
    mb = catalog.find((m) => m.id === b);
  const oa = state.opinions.find((o) => o.mediaId === a),
    ob = state.opinions.find((o) => o.mediaId === b);
  if (
    !ma ||
    !mb ||
    !oa ||
    !ob ||
    ma.kind !== mb.kind ||
    a === b ||
    !isEligible(oa, ma) ||
    !isEligible(ob, mb)
  )
    throw new Error('Compare two seen titles of the same format');
  const outcome =
    left === a || answer === 'similar' ? answer : answer === 'a_wins' ? 'b_wins' : 'a_wins';
  return {
    ...state,
    revision: state.revision + 1,
    comparisons: [
      ...state.comparisons,
      { id: eventId, a, b, aRevision: oa.revision, bRevision: ob.revision, outcome },
    ],
  };
}
export function removeHistory(state: Library, mediaId: string): Library {
  return {
    ...state,
    revision: state.revision + 1,
    opinions: state.opinions.filter((o) => o.mediaId !== mediaId),
    logs: state.logs.filter((l) => l.mediaId !== mediaId),
    notes: (state.notes ?? []).filter((note) => note.mediaId !== mediaId),
    comparisons: state.comparisons.filter((c) => c.a !== mediaId && c.b !== mediaId),
  };
}
export interface DiscoverFilters {
  kind: MediaKind | 'all';
  maxRuntime: number | null;
  genre: string | null;
}
export function filterCatalog(catalog: Media[], filter: DiscoverFilters, query = ''): Media[] {
  const q = query.trim().toLocaleLowerCase();
  return catalog.filter(
    (m) =>
      (filter.kind === 'all' || m.kind === filter.kind) &&
      (!filter.genre || m.genres.includes(filter.genre)) &&
      (filter.maxRuntime === null ||
        (m.kind === 'movie' &&
          m.runtimeMinutes !== null &&
          m.runtimeMinutes <= filter.maxRuntime)) &&
      (!q || `${m.title} ${m.year} ${m.genres.join(' ')}`.toLocaleLowerCase().includes(q)),
  );
}
export function discoveryPicks(
  catalog: Media[],
  state: Library,
): { media: Media; reason: string }[] {
  return recommend(catalog, state, { kind: 'all', seed: 'home' }).items;
}
