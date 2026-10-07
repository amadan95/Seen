import { openDatabaseAsync } from 'expo-sqlite';
import { createRecordStorage } from './recordStorage';
const storage = createRecordStorage(() => openDatabaseAsync('seen-preview.db'));
export const readLibrary = storage.readLibrary;
export const writeLibrary = storage.writeLibrary;
