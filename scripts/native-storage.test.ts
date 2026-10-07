import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';
import { createRecordStorage, type RecordDatabase } from '../apps/ios/src/local/recordStorage';
import { sampleLibrary } from '../packages/fixtures/src/index';
import { setTitleNote, emptyLibrary } from '../packages/domain/src/library';
import { catalog } from '../packages/fixtures/src/index';
const control = { db: null as DatabaseSync | null, failMeta: false, writes: [] as string[] };
async function openDatabase(): Promise<RecordDatabase> {
  const db = control.db!;
  const adapter: RecordDatabase = {
    execAsync: async (sql: string) => {
      db.exec(sql);
    },
    getFirstAsync: async <T>(sql: string) => (db.prepare(sql).get() as T | undefined) ?? null,
    getAllAsync: async <T>(sql: string) => db.prepare(sql).all() as T[],
    runAsync: async (sql: string, ...args: (string | number)[]) => {
      control.writes.push(sql);
      if (control.failMeta && sql.startsWith('INSERT INTO preview_meta'))
        throw new Error('Injected interrupted write');
      db.prepare(sql).run(...args);
    },
    withExclusiveTransactionAsync: async (work: (transaction: RecordDatabase) => Promise<void>) => {
      db.exec('BEGIN IMMEDIATE');
      try {
        await work(adapter);
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  };
  return adapter;
}
beforeEach(() => {
  control.db?.close();
  control.db = new DatabaseSync(':memory:');
  control.failMeta = false;
  control.writes = [];
});
describe('native preview SQLite transaction adapter', () => {
  it('migrates legacy JSON atomically, preserving it on failure and removing it on success', async () => {
    control.db!.exec('CREATE TABLE preview_state(id INTEGER PRIMARY KEY,payload TEXT NOT NULL)');
    control
      .db!.prepare('INSERT INTO preview_state VALUES(1,?)')
      .run(JSON.stringify(sampleLibrary()));
    const storage = createRecordStorage(openDatabase);
    control.failMeta = true;
    await expect(storage.readLibrary()).rejects.toThrow('interrupted');
    expect(control.db!.prepare('SELECT count(*) AS count FROM preview_state').get()!.count).toBe(1);
    expect(control.db!.prepare('SELECT count(*) AS count FROM preview_records').get()!.count).toBe(
      0,
    );
    control.failMeta = false;
    expect(await storage.readLibrary()).toEqual(sampleLibrary());
    expect(control.db!.prepare('SELECT count(*) AS count FROM preview_state').get()!.count).toBe(0);
  });
  it('rolls back interrupted updates, retries correctly, and writes only changed rows', async () => {
    const storage = createRecordStorage(openDatabase);
    const state = sampleLibrary();
    await storage.writeLibrary(state);
    control.writes = [];
    const next = setTitleNote(state, catalog, 'arrival', 'Private', '2026-10-06T12:00:00.000Z');
    control.failMeta = true;
    await expect(storage.writeLibrary(next)).rejects.toThrow('interrupted');
    expect(await storage.readLibrary()).toEqual(state);
    control.failMeta = false;
    control.writes = [];
    await storage.writeLibrary(next);
    expect(
      control.writes.filter((sql) => sql.includes('INSERT INTO preview_records')),
    ).toHaveLength(1);
    expect(await storage.readLibrary()).toEqual(next);
    await storage.writeLibrary(emptyLibrary());
    expect(await storage.readLibrary()).toEqual(emptyLibrary());
  });
});
