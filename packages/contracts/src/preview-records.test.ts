import { describe, expect, it } from 'vitest';
import { sampleLibrary } from '../../fixtures/src/index';
import { librarySchema } from './index';
import { decodeLibraryRecords, diffLibraryRecords, encodeLibraryRecords } from './preview-records';

describe('preview record persistence', () => {
  it('round-trips order, defaults and local recovery metadata without loss', () => {
    const state = sampleLibrary(),
      encoded = encodeLibraryRecords(state);
    expect(decodeLibraryRecords(encoded.meta, [...encoded.rows].reverse())).toEqual(state);
    const legacy = { ...state } as Record<string, unknown>;
    delete legacy.dismissals;
    delete legacy.logDrafts;
    delete legacy.undoReceipts;
    expect(librarySchema.parse(legacy).undoReceipts).toEqual([]);
  });
  it('a note edit writes only its own record instead of the full library', () => {
    const state = sampleLibrary(),
      old = encodeLibraryRecords(state);
    const next = encodeLibraryRecords({
      ...state,
      revision: state.revision + 1,
      notes: [{ mediaId: 'arrival', text: 'Keep this', updatedAt: '2026-10-06T12:00:00.000Z' }],
    });
    const diff = diffLibraryRecords(old.rows, next.rows);
    expect(diff.changed.map((r) => `${r.collection}:${r.key}`)).toEqual(['notes:arrival']);
    expect(diff.removed).toEqual([]);
    expect(decodeLibraryRecords(next.meta, next.rows).notes[0]!.text).toBe('Keep this');
  });
  it('reset deletes every old record and malformed payloads fail instead of silently resetting', () => {
    const encoded = encodeLibraryRecords(sampleLibrary());
    expect(diffLibraryRecords(encoded.rows, []).removed).toHaveLength(encoded.rows.length);
    expect(() =>
      decodeLibraryRecords(encoded.meta, [
        { collection: 'opinions', key: 'bad', position: 0, payload: '{"bad":true}' },
      ]),
    ).toThrow();
  });
});
