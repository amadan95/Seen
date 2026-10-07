import { librarySchema, type Library } from './index.ts';

export interface PreviewRecord {
  collection: string;
  key: string;
  position: number;
  payload: string;
}
export const previewCollections = [
  'opinions',
  'logs',
  'notes',
  'comparisons',
  'watchlist',
  'catalogEntries',
  'dismissals',
  'logDrafts',
  'comparisonSessions',
  'comparisonCooldowns',
  'undoReceipts',
] as const;
export function encodeLibraryRecords(library: Library): { meta: string; rows: PreviewRecord[] } {
  const validated = librarySchema.parse(library);
  const rows = previewCollections.flatMap((collection) =>
    validated[collection].map((value, position) => {
      const item = value as { id?: string; mediaId?: string; key?: string };
      return {
        collection,
        key: item.id ?? item.mediaId ?? item.key!,
        position,
        payload: JSON.stringify(value),
      };
    }),
  );
  return {
    meta: JSON.stringify({
      schemaVersion: validated.schemaVersion,
      onboarded: validated.onboarded,
      revision: validated.revision,
      selectedProviders: validated.selectedProviders,
      comparisonServeCounts: validated.comparisonServeCounts,
    }),
    rows,
  };
}
export function decodeLibraryRecords(meta: string, rows: PreviewRecord[]): Library {
  const values: Record<string, unknown> = JSON.parse(meta) as Record<string, unknown>;
  for (const collection of previewCollections)
    values[collection] = rows
      .filter((r) => r.collection === collection)
      .sort((a, b) => a.position - b.position)
      .map((r) => JSON.parse(r.payload) as unknown);
  return librarySchema.parse(values);
}
export function diffLibraryRecords(previous: PreviewRecord[], next: PreviewRecord[]) {
  const key = (r: PreviewRecord) => `${r.collection}:${r.key}`;
  const old = new Map(previous.map((r) => [key(r), r]));
  const fresh = new Set(next.map(key));
  return {
    removed: previous.filter((r) => !fresh.has(key(r))),
    changed: next.filter((r) => {
      const p = old.get(key(r));
      return !p || p.payload !== r.payload || p.position !== r.position;
    }),
  };
}
