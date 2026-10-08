import { describe, expect, it } from 'vitest';
import { librarySchema } from '@seen/contracts';
import {
  encodeLibraryRecords,
  decodeLibraryRecords,
  diffLibraryRecords,
} from '@seen/contracts/preview-records';
import { catalog, sampleLibrary } from '@seen/fixtures';
import { undoMutation, withUndo } from './recovery';
import { emptyLibrary, setTitleNote } from './library';
import {
  journalEntries,
  removeCollection,
  saveCollection,
  setCollectionTitle,
  viewingRecap,
} from './journal';

describe('private collections', () => {
  it('allows membership in multiple collections without changing watches, notes or rankings', () => {
    const before = sampleLibrary();
    let state = saveCollection(before, 'a', 'Rainy night');
    state = saveCollection(state, 'b', 'Rewatch someday');
    state = setCollectionTitle(state, catalog, 'a', 'arrival', true);
    state = setCollectionTitle(state, catalog, 'b', 'arrival', true);
    expect(state.collections.map((c) => c.mediaIds)).toEqual([['arrival'], ['arrival']]);
    expect(setCollectionTitle(state, catalog, 'a', 'arrival', true)).toBe(state);
    expect(state.logs).toEqual(before.logs);
    expect(state.notes).toEqual(before.notes);
    expect(state.opinions).toEqual(before.opinions);
    expect(state.comparisons).toEqual(before.comparisons);
    const renamed = saveCollection(state, 'a', 'With friends');
    expect(renamed.collections[0]?.mediaIds).toEqual(['arrival']);
    expect(removeCollection(renamed, 'a').collections.map((c) => c.id)).toEqual(['b']);
    expect(removeCollection(renamed, 'a').watchlist).toEqual(state.watchlist);
    expect(
      setCollectionTitle(state, catalog, 'a', 'arrival', false).collections[0]?.mediaIds,
    ).toEqual([]);
  });
  it('validates names, duplicate collections and membership targets', () => {
    const state = saveCollection(emptyLibrary(), 'a', 'Rainy night');
    for (const name of ['', '   ', 'x'.repeat(41), 'RAINY NIGHT'])
      expect(() => saveCollection(state, 'b', name)).toThrow();
    expect(() => setCollectionTitle(state, catalog, 'missing', 'arrival', true)).toThrow();
    expect(() => setCollectionTitle(state, catalog, 'a', 'missing', true)).toThrow();
  });
  it('defaults old libraries and persists collections with the per-record encoder', () => {
    const { collections: omitted, ...old } = sampleLibrary();
    expect(omitted).toEqual([]);
    expect(librarySchema.parse(old).collections).toEqual([]);
    const before = sampleLibrary(),
      next = setCollectionTitle(
        saveCollection(before, 'a', 'Rainy night'),
        catalog,
        'a',
        'arrival',
        true,
      );
    const encoded = encodeLibraryRecords(next);
    expect(decodeLibraryRecords(encoded.meta, encoded.rows)).toEqual(next);
    expect(
      diffLibraryRecords(encodeLibraryRecords(before).rows, encoded.rows).changed.map(
        (row) => row.collection,
      ),
    ).toEqual(['collections']);
  });
});
describe('journal and recaps', () => {
  it('searches title notes before watching without fabricating a watch or dating notes as watches', () => {
    const state = setTitleNote(
      emptyLibrary(),
      catalog,
      'moon',
      'Beautiful soundtrack',
      '2026-10-07T12:00:00.000Z',
    );
    expect(journalEntries(state, catalog, 'soundtrack')[0]).toMatchObject({
      mediaId: 'moon',
      noteOnly: true,
      month: 'Notes before watching',
      watchedOn: null,
    });
    expect(journalEntries(state, catalog, 'MOON')).toHaveLength(1);
    expect(journalEntries(state, catalog, 'missing')).toEqual([]);
    expect(viewingRecap(state, catalog, '2026')).toMatchObject({ movies: 0, tv: 0 });
  });
  it('keeps historical watch notes distinct and separates undated events', () => {
    const state = sampleLibrary();
    state.logs = [
      {
        id: 'a',
        mediaId: 'arrival',
        createdAt: '2026-10-07T12:00:00.000Z',
        watchedOn: '2025-01-01',
        historical: true,
        rewatch: false,
        note: 'Original impression',
      },
      {
        id: 'b',
        mediaId: 'arrival',
        createdAt: '2026-10-07T12:00:00.000Z',
        watchedOn: '2026-10-01',
        historical: false,
        rewatch: true,
        note: 'Different on rewatch',
      },
      {
        id: 'c',
        mediaId: 'severance',
        createdAt: '2026-10-07T12:00:00.000Z',
        watchedOn: null,
        historical: true,
        rewatch: false,
        note: '',
      },
    ];
    state.notes = [
      { mediaId: 'arrival', text: 'Current memory', updatedAt: '2026-10-07T12:00:00.000Z' },
    ];
    expect(journalEntries(state, catalog, 'Original')[0]).toMatchObject({
      watchedOn: '2025-01-01',
      note: 'Current memory',
      watchNote: 'Original impression',
    });
    expect(journalEntries(state, catalog).map((row) => row.month)).toEqual([
      '2026-10',
      '2025-01',
      'Undated watches',
    ]);
    expect(viewingRecap(state, catalog, '2026')).toEqual({
      movies: 1,
      tv: 0,
      rewatches: 1,
      undated: 1,
      mediaIds: ['arrival'],
    });
  });
});

it('restores collection deletion after serialization and refuses later conflicting edits', () => {
  const before = setCollectionTitle(
    saveCollection(emptyLibrary(), 'a', 'Film night'),
    catalog,
    'a',
    'arrival',
    true,
  );
  const removed = withUndo(
    before,
    removeCollection(before, 'a'),
    'collection change',
    'undo-delete',
    '2026-10-08T12:00:00.000Z',
  );
  const restored = undoMutation(
    librarySchema.parse(JSON.parse(JSON.stringify(removed))),
    'undo-delete',
  );
  expect(restored.collections).toEqual(before.collections);
  const renamed = withUndo(
    before,
    saveCollection(before, 'a', 'Evening'),
    'collection change',
    'undo-name',
    '2026-10-08T12:00:00.000Z',
  );
  expect(() => undoMutation(saveCollection(renamed, 'a', 'Later edit'), 'undo-name')).toThrow();
});
