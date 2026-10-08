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
import {
  RankingCache,
  emptyLibrary,
  withUndo,
  undoMutation,
  type RankingState,
} from '@seen/domain';
import { catalog as fixtureCatalog } from '@seen/fixtures';
import { readLibrary, writeLibrary } from './storage';
import { ActivityIndicator, View } from 'react-native';
import { Button, Body } from '../components/ui';
import { colors } from '../design/tokens';
import { catalogUrl, loadCatalogDetail, loadPreviewCatalog } from '../features/catalog/client';

type Mutation = (state: Library) => Library;
interface LibraryContextValue {
  catalog: Media[];
  mediaById: Map<string, Media>;
  cacheMedia: (items: Media[]) => void;
  library: Library;
  mutate: (change: Mutation, undoLabel?: string) => Promise<Library>;
  undo: (id: string) => Promise<Library>;
  rankingState: (kind: MediaKind) => RankingState;
  retryRanking: () => void;
  snapshot: (kind: MediaKind) => RankingState['analysis']['snapshot'];
  busy: boolean;
  catalogLoading: boolean;
  catalogError: string | null;
  refreshCatalog: () => void;
}
const Context = createContext<LibraryContextValue | null>(null);
export function LibraryProvider({ children }: { children: ReactNode }) {
  const rankingCache = useRef(new RankingCache());
  const [, updateRanks] = useState(0);
  const [catalog, setCatalog] = useState<Media[]>(fixtureCatalog);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const catalogRef = useRef(new Map(fixtureCatalog.map((media) => [media.id, media])));
  const cacheMedia = useCallback((items: Media[]) => {
    for (const media of items) {
      const previous = catalogRef.current.get(media.id);
      if (previous?.metadataComplete && !media.metadataComplete) continue;
      catalogRef.current.set(media.id, media);
    }
    const next = [...catalogRef.current.values()];
    if (current.current) rankingCache.current.update(next, current.current);
    setCatalog(next);
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
      rankingCache.current.update([...catalogRef.current.values()], value);
      current.current = value;
      setLibrary(value);
    } catch {
      setLoadError(true);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  function mutate(change: Mutation, undoLabel?: string): Promise<Library> {
    const task = queue.current.then(async () => {
      if (!current.current) throw new Error('Library is still loading');
      setBusy(true);
      try {
        const before = current.current;
        let changed = change(before);
        if (undoLabel)
          changed = withUndo(
            before,
            changed,
            undoLabel,
            `undo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            new Date().toISOString(),
          );
        const referenced = new Set([
          ...changed.opinions.map((item) => item.mediaId),
          ...changed.logs.map((item) => item.mediaId),
          ...(changed.notes ?? []).map((item) => item.mediaId),
          ...changed.collections.flatMap((item) => item.mediaIds),
          ...changed.watchlist.map((item) => item.mediaId),
          ...changed.comparisons.flatMap((item) => [item.a, item.b]),
          ...changed.logDrafts.map((item) => item.mediaId),
          ...changed.dismissals.map((item) => item.mediaId),
          ...changed.undoReceipts.flatMap((r) => [
            ...r.guardedMediaIds,
            ...(r.patches.watchlist?.keys ?? []),
            ...(r.patches.notes?.keys ?? []),
            ...(r.patches.collections?.before ?? []).flatMap((c) => c.mediaIds),
            ...(r.patches.collections?.after ?? []).flatMap((c) => c.mediaIds),
            ...(r.patches.dismissals?.keys ?? []),
          ]),
          ...fixtureCatalog.map((m) => m.id),
        ]);
        const next = {
          ...changed,
          catalogEntries: [...catalogRef.current.values()].filter(
            (media) => media.source === 'tmdb' && referenced.has(media.id),
          ),
        };
        await writeLibrary(next); // Acknowledge only after durable storage succeeds.
        rankingCache.current.update([...catalogRef.current.values()], next);
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
  const refreshing = useRef(false);
  const refreshCatalog = useCallback(() => {
    if (!catalogUrl || refreshing.current) return;
    refreshing.current = true;
    setCatalogLoading(true);
    setCatalogError(null);
    const work = async () => {
      let failed = false;
      const now = Date.now();
      const stale = (media: Media) =>
        !media.fetchedAt || now - Date.parse(media.fetchedAt) > 6 * 60 * 60 * 1000;
      if (fixtureCatalog.some((m) => stale(catalogRef.current.get(m.id) ?? m))) {
        try {
          const preview = await loadPreviewCatalog();
          cacheMedia(preview.items);
          failed = preview.items.length < fixtureCatalog.length - 1;
        } catch {
          failed = true;
        }
      }
      const preferred = new Set([
        ...(current.current?.watchlist ?? []).map((w) => w.mediaId),
        ...(current.current?.logs ?? []).slice(-8).map((l) => l.mediaId),
      ]);
      const saved = (current.current?.catalogEntries ?? [])
        .filter((media) => /^[a-f0-9-]{36}$/.test(media.id) && stale(media))
        .sort((a, b) => Number(preferred.has(b.id)) - Number(preferred.has(a.id)))
        .slice(0, 8);
      const refreshed: Media[] = [];
      for (let start = 0; start < saved.length; start += 4) {
        const batch = await Promise.allSettled(
          saved.slice(start, start + 4).map((m) => loadCatalogDetail(m.id)),
        );
        for (const result of batch) {
          if (result.status === 'fulfilled') refreshed.push(result.value.media);
          else failed = true;
        }
      }
      if (refreshed.length) cacheMedia(refreshed);
      // Refresh referenced metadata on disk without changing opinion revisions or evidence.
      await mutate((state) => state);
      if (failed)
        setCatalogError('Some title details could not refresh. Saved titles are still available.');
    };
    void work()
      .catch(() => setCatalogError('Title artwork and details could not refresh. Try again.'))
      .finally(() => {
        refreshing.current = false;
        setCatalogLoading(false);
      });
  }, [cacheMedia]);
  const ready = library !== null;
  useEffect(() => {
    if (ready) refreshCatalog();
  }, [ready, refreshCatalog]);
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
        undo: (id) => mutate((state) => undoMutation(state, id)),
        rankingState: (kind) => rankingCache.current.get(kind),
        retryRanking: () => {
          rankingCache.current.update(catalog, library, true);
          updateRanks((value) => value + 1);
        },
        busy,
        catalogLoading,
        catalogError,
        refreshCatalog,
        catalog,
        mediaById: catalogRef.current,
        cacheMedia,
        snapshot: (kind) => rankingCache.current.get(kind).analysis.snapshot,
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
