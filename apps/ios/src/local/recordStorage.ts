import { librarySchema, type Library } from '@seen/contracts';
import {
  decodeLibraryRecords,
  diffLibraryRecords,
  encodeLibraryRecords,
  type PreviewRecord,
} from '@seen/contracts/preview-records';
export interface RecordDatabase {
  execAsync(sql: string): Promise<void>;
  getFirstAsync<T>(sql: string): Promise<T | null>;
  getAllAsync<T>(sql: string): Promise<T[]>;
  runAsync(sql: string, ...args: (string | number)[]): Promise<unknown>;
  withExclusiveTransactionAsync(
    work: (transaction: RecordDatabase) => Promise<void>,
  ): Promise<void>;
}
export function createRecordStorage(openDatabase: () => Promise<RecordDatabase>) {
  let database: Promise<RecordDatabase> | undefined;
  let persisted: PreviewRecord[] = [];
  async function db() {
    database ??= (async () => {
      const connection = await openDatabase();
      await connection.execAsync(`PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS preview_state (id INTEGER PRIMARY KEY CHECK(id = 1), payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS preview_meta (id INTEGER PRIMARY KEY CHECK(id = 1), payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS preview_records (collection TEXT NOT NULL, item_key TEXT NOT NULL,
        position INTEGER NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(collection,item_key));`);
      return connection;
    })();
    return database;
  }
  async function readLibrary(): Promise<Library | null> {
    const connection = await db();
    const meta = await connection.getFirstAsync<{ payload: string }>(
      'SELECT payload FROM preview_meta WHERE id = 1',
    );
    if (meta) {
      const rows = await connection.getAllAsync<PreviewRecord>(
        'SELECT collection,item_key AS key,position,payload FROM preview_records',
      );
      const library = decodeLibraryRecords(meta.payload, rows);
      persisted = rows;
      return library;
    }
    const legacy = await connection.getFirstAsync<{ payload: string }>(
      'SELECT payload FROM preview_state WHERE id = 1',
    );
    if (!legacy) return null;
    const library = librarySchema.parse(JSON.parse(legacy.payload));
    await writeLibrary(library); // Rollback retains the legacy copy if migration fails.
    return library;
  }
  async function writeLibrary(value: Library): Promise<void> {
    const connection = await db(),
      encoded = encodeLibraryRecords(value);
    const diff = diffLibraryRecords(persisted, encoded.rows);
    await connection.withExclusiveTransactionAsync(async (transaction) => {
      for (const row of diff.removed)
        await transaction.runAsync(
          'DELETE FROM preview_records WHERE collection = ? AND item_key = ?',
          row.collection,
          row.key,
        );
      for (const row of diff.changed)
        await transaction.runAsync(
          `INSERT INTO preview_records(collection,item_key,position,payload)
      VALUES (?,?,?,?) ON CONFLICT(collection,item_key) DO UPDATE SET position=excluded.position,payload=excluded.payload`,
          row.collection,
          row.key,
          row.position,
          row.payload,
        );
      await transaction.runAsync(
        'INSERT INTO preview_meta(id,payload) VALUES (1,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload',
        encoded.meta,
      );
      await transaction.runAsync('DELETE FROM preview_state');
    });
    persisted = encoded.rows; // Failed transactions never advance the acknowledged local state.
  }

  return { readLibrary, writeLibrary };
}
