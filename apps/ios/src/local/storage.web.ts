import { librarySchema, type Library } from '@seen/contracts';
const key = 'seen-preview-v1';
export async function readLibrary(): Promise<Library | null> {
  const payload = localStorage.getItem(key);
  return payload ? librarySchema.parse(JSON.parse(payload)) : null;
}
export async function writeLibrary(value: Library): Promise<void> {
  localStorage.setItem(key, JSON.stringify(librarySchema.parse(value)));
}
