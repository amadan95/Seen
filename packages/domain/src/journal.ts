import type { Library, Media, WatchLog } from '@seen/contracts';

export function saveCollection(state: Library, id: string, name: string): Library {
  const cleaned = name.trim();
  if (!cleaned || cleaned.length > 40) throw new Error('Use a collection name of 1–40 characters');
  if (
    state.collections.some(
      (item) => item.id !== id && item.name.toLowerCase() === cleaned.toLowerCase(),
    )
  )
    throw new Error('A collection with this name already exists');
  const previous = state.collections.find((item) => item.id === id);
  if (previous?.name === cleaned) return state;
  return {
    ...state,
    revision: state.revision + 1,
    collections: previous
      ? state.collections.map((item) => (item.id === id ? { ...item, name: cleaned } : item))
      : [...state.collections, { id, name: cleaned, mediaIds: [] }],
  };
}
export function removeCollection(state: Library, id: string): Library {
  return {
    ...state,
    revision: state.revision + 1,
    collections: state.collections.filter((item) => item.id !== id),
  };
}
export function setCollectionTitle(
  state: Library,
  catalog: Media[],
  collectionId: string,
  mediaId: string,
  present: boolean,
): Library {
  if (!catalog.some((media) => media.id === mediaId)) throw new Error('Title unavailable');
  const collection = state.collections.find((item) => item.id === collectionId);
  if (!collection) throw new Error('Collection unavailable');
  if (collection.mediaIds.includes(mediaId) === present) return state;
  return {
    ...state,
    revision: state.revision + 1,
    collections: state.collections.map((item) =>
      item.id === collectionId
        ? {
            ...item,
            mediaIds: present
              ? [...item.mediaIds, mediaId]
              : item.mediaIds.filter((id) => id !== mediaId),
          }
        : item,
    ),
  };
}
export interface JournalEntry {
  key: string;
  mediaId: string;
  month: string;
  watchedOn: string | null;
  note: string;
  watchNote: string;
  rewatch: boolean;
  noteOnly: boolean;
}
export function journalEntries(state: Library, catalog: Media[], query = ''): JournalEntry[] {
  const media = new Map(catalog.map((item) => [item.id, item]));
  const titleNotes = new Map(state.notes.map((note) => [note.mediaId, note.text]));
  const entries: JournalEntry[] = [...state.logs]
    .sort(
      (a, b) =>
        (b.watchedOn ?? '').localeCompare(a.watchedOn ?? '') ||
        b.createdAt.localeCompare(a.createdAt),
    )
    .map((log: WatchLog) => ({
      key: log.id,
      mediaId: log.mediaId,
      month: log.watchedOn?.slice(0, 7) ?? 'Undated watches',
      watchedOn: log.watchedOn,
      note: titleNotes.get(log.mediaId) ?? '',
      watchNote: log.note,
      rewatch: log.rewatch,
      noteOnly: false,
    }));
  const logged = new Set(state.logs.map((log) => log.mediaId));
  entries.push(
    ...state.notes
      .filter((note) => note.text && !logged.has(note.mediaId))
      .map((note) => ({
        key: `note:${note.mediaId}`,
        mediaId: note.mediaId,
        month: 'Notes before watching',
        watchedOn: null,
        note: note.text,
        watchNote: '',
        rewatch: false,
        noteOnly: true,
      })),
  );
  const q = query.trim().toLowerCase();
  return entries.filter(
    (entry) =>
      media.has(entry.mediaId) &&
      (!q ||
        `${media.get(entry.mediaId)!.title} ${entry.watchedOn ?? ''} ${entry.note} ${entry.watchNote}`
          .toLowerCase()
          .includes(q)),
  );
}
export function viewingRecap(state: Library, catalog: Media[], year: string) {
  const media = new Map(catalog.map((item) => [item.id, item]));
  const logs = state.logs.filter((log) => log.watchedOn?.slice(0, 4) === year);
  return {
    movies: logs.filter((log) => media.get(log.mediaId)?.kind === 'movie').length,
    tv: logs.filter((log) => media.get(log.mediaId)?.kind === 'tv').length,
    rewatches: logs.filter((log) => log.rewatch).length,
    undated: state.logs.filter((log) => !log.watchedOn).length,
    mediaIds: [...new Set(logs.map((log) => log.mediaId))],
  };
}
