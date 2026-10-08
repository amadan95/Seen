import { Collections } from '../../src/components/Collections';
import { Sheet, SheetControl } from '../../src/components/Sheet';
import { useState } from 'react';
import { router } from 'expo-router';
import { FlatList, View, useWindowDimensions } from 'react-native';
import type { MediaKind } from '@seen/contracts';
import { setCollectionTitle, setPriority, setWatchlist } from '@seen/domain';
import { useLibrary } from '../../src/local/LibraryProvider';
import {
  Body,
  Button,
  Chip,
  EmptyState,
  Heading,
  IconButton,
  InlineError,
  Screen,
  Segments,
  s,
} from '../../src/components/ui';
import { UndoActions } from '../../src/components/UndoActions';
import { PosterTile } from '../../src/components/Poster';

export default function Watchlist() {
  const { width, fontScale } = useWindowDimensions();
  const columns = fontScale > 1.4 ? 1 : 2;
  const posterWidth = (width - 40 - (columns - 1) * 14) / columns;
  const { library, mutate, busy, mediaById, catalog } = useLibrary(),
    [kind, setKind] = useState<MediaKind | 'all'>('all'),
    [sort, setSort] = useState('added'),
    [short, setShort] = useState(false),
    [collectionId, setCollectionId] = useState<string | null>(null),
    [editingPriority, setEditingPriority] = useState<string | null>(null),
    [error, setError] = useState<string | null>(null);
  const selectedCollection = library.collections.find((c) => c.id === collectionId);
  const sourceItems = selectedCollection
    ? [...selectedCollection.mediaIds]
        .reverse()
        .map(
          (mediaId) =>
            library.watchlist.find((item) => item.mediaId === mediaId) ?? {
              mediaId,
              addedAt: '',
              priority: 0,
            },
        )
    : library.watchlist;
  const items = sourceItems
    .filter((i) => {
      const m = mediaById.get(i.mediaId)!;
      return (
        (kind === 'all' || m.kind === kind) &&
        (!short || (m.kind === 'movie' && m.runtimeMinutes !== null && m.runtimeMinutes <= 120))
      );
    })
    .sort((a, b) =>
      selectedCollection && sort === 'added'
        ? 0
        : sort === 'priority'
          ? b.priority - a.priority || b.addedAt.localeCompare(a.addedAt)
          : sort === 'title'
            ? mediaById.get(a.mediaId)!.title.localeCompare(mediaById.get(b.mediaId)!.title)
            : b.addedAt.localeCompare(a.addedAt),
    );
  function change(action: () => Promise<unknown>) {
    setError(null);
    void action().catch((e) =>
      setError(e instanceof Error ? e.message : 'Could not save. Try again.'),
    );
  }
  return (
    <Screen scroll={false}>
      <Sheet
        title={
          editingPriority
            ? (mediaById.get(editingPriority)?.title ?? 'Title options')
            : 'Title options'
        }
        visible={Boolean(editingPriority)}
        onClose={() => setEditingPriority(null)}
      >
        {editingPriority && (
          <>
            {library.watchlist.some((item) => item.mediaId === editingPriority) && (
              <Heading>Priority</Heading>
            )}
            {library.watchlist.some((item) => item.mediaId === editingPriority) &&
              [
                { value: 0, label: 'No priority' },
                { value: 1, label: 'Interested' },
                { value: 2, label: 'Watch next' },
              ].map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={
                    library.watchlist.find((item) => item.mediaId === editingPriority)?.priority ===
                    option.value
                  }
                  onPress={() => {
                    if (!busy)
                      change(() =>
                        mutate((state) => setPriority(state, editingPriority, option.value)),
                      );
                  }}
                />
              ))}
            <Collections mediaId={editingPriority} embedded />
            {selectedCollection && (
              <Button
                label="Remove from this collection"
                secondary
                disabled={busy}
                onPress={() =>
                  change(async () => {
                    await mutate(
                      (state) =>
                        setCollectionTitle(
                          state,
                          catalog,
                          selectedCollection.id,
                          editingPriority,
                          false,
                        ),
                      'collection change',
                    );
                    setEditingPriority(null);
                  })
                }
              />
            )}
            {library.watchlist.some((item) => item.mediaId === editingPriority) && (
              <Button
                label="Remove from watchlist"
                secondary
                disabled={busy}
                onPress={() =>
                  change(async () => {
                    await mutate(
                      (state) =>
                        setWatchlist(state, editingPriority, false, new Date().toISOString()),
                      'watchlist removal',
                    );
                    setEditingPriority(null);
                  })
                }
              />
            )}
            <InlineError message={error} />
          </>
        )}
      </Sheet>
      <FlatList
        key={columns}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? { gap: 14 } : undefined}
        data={items}
        keyExtractor={(i) => i.mediaId}
        contentContainerStyle={{ paddingBottom: 80, gap: 18 }}
        ListHeaderComponent={
          <View style={{ gap: 16 }}>
            <Heading large>Your watchlist</Heading>
            <Segments
              options={[
                { value: 'all', label: 'All' },
                { value: 'movie', label: 'Movies' },
                { value: 'tv', label: 'TV' },
              ]}
              value={kind}
              onChange={(value) => {
                setKind(value);
                if (value === 'tv') setShort(false);
              }}
            />
            <SheetControl
              title={`Sort & filters · ${sort === 'added' ? 'Recent' : sort === 'priority' ? 'Priority' : 'Title'}${short ? ' · Under 2 hours' : ''}`}
            >
              <Segments
                options={[
                  { value: 'added', label: 'Recent' },
                  { value: 'priority', label: 'Priority' },
                  { value: 'title', label: 'Title' },
                ]}
                value={sort}
                onChange={setSort}
              />
              <View style={s.row}>
                <Chip
                  label="Under 2 hours"
                  icon="clock"
                  selected={short}
                  onPress={() => {
                    setShort(!short);
                    if (!short) setKind('movie');
                  }}
                />
                <Body muted style={s.caption}>
                  {items.length} saved
                </Body>
              </View>
            </SheetControl>
            <Collections
              onSelect={(id) => {
                setCollectionId(id);
                setKind('all');
                setShort(false);
              }}
            />
            {collectionId && (
              <Body muted style={s.caption}>
                {library.collections.find((c) => c.id === collectionId)?.name}
              </Body>
            )}
            <InlineError message={error} />
            <UndoActions />
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ width: posterWidth }}>
            <PosterTile
              media={mediaById.get(item.mediaId)!}
              width={posterWidth}
              reason={String(mediaById.get(item.mediaId)!.year ?? 'Year unknown')}
            />
            <IconButton
              name="filter"
              label={`Options for ${mediaById.get(item.mediaId)!.title}`}
              onPress={() => setEditingPriority(item.mediaId)}
            />
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            title={
              sourceItems.length
                ? 'No titles fit'
                : selectedCollection
                  ? 'Your collection is empty'
                  : 'Keep your next watch here'
            }
            message={
              sourceItems.length
                ? 'Try clearing the format or runtime filter.'
                : selectedCollection
                  ? 'Add titles from their detail pages.'
                  : 'Save a movie or show from Discover. It stays here until you log it or remove it.'
            }
            action={
              sourceItems.length ? (
                <Button
                  label="Clear filters"
                  onPress={() => {
                    setKind('all');
                    setShort(false);
                    setCollectionId(null);
                  }}
                />
              ) : (
                <Button label="Discover a title" onPress={() => router.push('/(tabs)/discover')} />
              )
            }
          />
        }
      />
    </Screen>
  );
}
