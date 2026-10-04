import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Library, MediaKind } from '@seen/contracts';
import { buildSnapshot, emptyLibrary } from '@seen/domain';
import { catalog } from '@seen/fixtures';
import { readLibrary, writeLibrary } from './storage';
import { ActivityIndicator, View } from 'react-native';
import { Button, Body } from '../components/ui';
import { colors } from '../design/tokens';

type Mutation = (state: Library) => Library;
interface LibraryContextValue {
  library: Library;
  mutate: (change: Mutation) => Promise<Library>;
  snapshot: (kind: MediaKind) => ReturnType<typeof buildSnapshot>;
  busy: boolean;
}
const Context = createContext<LibraryContextValue | null>(null);
export function LibraryProvider({ children }: { children: ReactNode }) {
  const [library, setLibrary] = useState<Library | null>(null);
  const [loadError, setLoadError] = useState(false),
    [busy, setBusy] = useState(false);
  const current = useRef<Library | null>(null),
    queue = useRef(Promise.resolve());
  async function load() {
    setLoadError(false);
    try {
      const value = (await readLibrary()) ?? emptyLibrary();
      current.current = value;
      setLibrary(value);
    } catch {
      setLoadError(true);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  function mutate(change: Mutation): Promise<Library> {
    const task = queue.current.then(async () => {
      if (!current.current) throw new Error('Library is still loading');
      setBusy(true);
      try {
        const next = change(current.current);
        await writeLibrary(next); // Acknowledge only after durable storage succeeds.
        current.current = next;
        setLibrary(next);
        return next;
      } finally {
        setBusy(false);
      }
    });
    queue.current = task.then(
      () => undefined,
      () => undefined,
    );
    return task;
  }
  if (!library)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: 'center',
          padding: 28,
          gap: 20,
        }}
      >
        {loadError ? (
          <>
            <Body>Your local library could not be opened. Your saved data has been preserved.</Body>
            <Button label="Try again" onPress={() => void load()} />
          </>
        ) : (
          <ActivityIndicator color={colors.accent} accessibilityLabel="Opening your library" />
        )}
      </View>
    );
  return (
    <Context.Provider
      value={{ library, mutate, busy, snapshot: (kind) => buildSnapshot(catalog, library, kind) }}
    >
      {children}
    </Context.Provider>
  );
}
export function useLibrary(): LibraryContextValue {
  const value = useContext(Context);
  if (!value) throw new Error('Library provider missing');
  return value;
}
