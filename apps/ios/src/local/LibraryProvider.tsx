import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Library, Media, MediaKind } from '@seen/contracts';
import { buildSnapshot, emptyLibrary } from '@seen/domain';
import { catalog as fixtureCatalog } from '@seen/fixtures';
import { readLibrary, writeLibrary } from './storage';
import { ActivityIndicator, View } from 'react-native';
import { Button, Body } from '../components/ui';
import { colors } from '../design/tokens';

type Mutation = (state: Library) => Library;
interface LibraryContextValue {
  catalog: Media[];
  mediaById: Map<string, Media>;
  cacheMedia: (items: Media[]) => void;
  library: Library;
  mutate: (change: Mutation) => Promise<Library>;
  snapshot: (kind: MediaKind) => ReturnType<typeof buildSnapshot>;
  busy: boolean;
}
const Context = createContext<LibraryContextValue | null>(null);
export function LibraryProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Media[]>(fixtureCatalog);
  const catalogRef = useRef(new Map(fixtureCatalog.map((media) => [media.id, media])));
  const cacheMedia = useCallback((items: Media[]) => {
    for (const media of items) {
      const previous = catalogRef.current.get(media.id);
      if (previous?.metadataComplete && !media.metadataComplete) continue;
      catalogRef.current.set(media.id, media);
    }
    setCatalog([...catalogRef.current.values()]);
  }, []);
  const [library, setLibrary] = useState<Library | null>(null);
  const [loadError, setLoadError] = useState(false),
    [busy, setBusy] = useState(false);
  const current = useRef<Library | null>(null),
    queue = useRef(Promise.resolve());
  async function load() {
    setLoadError(false);
    try {
      const value = (await readLibrary()) ?? emptyLibrary();
      cacheMedia(value.catalogEntries);
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
        const changed = change(current.current);
        const referenced = new Set([
          ...changed.opinions.map((item) => item.mediaId),
          ...changed.logs.map((item) => item.mediaId),
          ...changed.watchlist.map((item) => item.mediaId),
          ...changed.comparisons.flatMap((item) => [item.a, item.b]),
        ]);
        const next = {
          ...changed,
          catalogEntries: [...catalogRef.current.values()].filter(
            (media) => media.source === 'tmdb' && referenced.has(media.id),
          ),
        };
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
      value={{
        library,
        mutate,
        busy,
        catalog,
        mediaById: catalogRef.current,
        cacheMedia,
        snapshot: (kind) => buildSnapshot(catalog, library, kind),
      }}
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
