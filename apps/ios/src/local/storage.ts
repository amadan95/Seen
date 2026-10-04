import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { librarySchema, type Library } from '@seen/contracts';
let database: Promise<SQLiteDatabase> | undefined;
async function db() {
  database ??= (async () => {
    const connection = await openDatabaseAsync('seen-preview.db');
    await connection.execAsync(
      'PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS preview_state (id INTEGER PRIMARY KEY CHECK(id = 1), payload TEXT NOT NULL);',
    );
    return connection;
  })();
  return database;
}
export async function readLibrary(): Promise<Library | null> {
  const row = await (
    await db()
  ).getFirstAsync<{ payload: string }>('SELECT payload FROM preview_state WHERE id = 1');
  return row ? librarySchema.parse(JSON.parse(row.payload)) : null;
}
export async function writeLibrary(value: Library): Promise<void> {
  const payload = JSON.stringify(librarySchema.parse(value));
  await (
    await db()
  ).runAsync(
    'INSERT INTO preview_state (id, payload) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload',
    payload,
  );
}
