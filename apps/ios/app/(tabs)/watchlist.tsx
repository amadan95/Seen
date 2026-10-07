import { useState } from 'react';
import { router } from 'expo-router';
import { FlatList, View, useWindowDimensions } from 'react-native';
import type { MediaKind } from '@seen/contracts';
import { setPriority, setWatchlist } from '@seen/domain';
import { useLibrary } from '../../src/local/LibraryProvider';
import {
  Body,
  Button,
  Chip,
  EmptyState,
  Disclosure,
  Heading,
  IconButton,
  InlineError,
  PreviewNotice,
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
  const { library, mutate, busy, mediaById } = useLibrary(),
    [kind, setKind] = useState<MediaKind | 'all'>('all'),
    [sort, setSort] = useState('added'),
    [short, setShort] = useState(false),
    [editingPriority, setEditingPriority] = useState<string | null>(null),
    [error, setError] = useState<string | null>(null);
  const items = library.watchlist
    .filter((i) => {
      const m = mediaById.get(i.mediaId)!;
      return (
        (kind === 'all' || m.kind === kind) &&
        (!short || (m.kind === 'movie' && m.runtimeMinutes !== null && m.runtimeMinutes <= 120))
      );
    })
    .sort((a, b) =>
      sort === 'priority'
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
            <Disclosure
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
            </Disclosure>
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
            <View style={[s.row, { flexWrap: 'wrap', gap: 4 }]}>
              <IconButton
                name="close"
                label={`Remove ${mediaById.get(item.mediaId)!.title} from watchlist`}
                onPress={() => {
                  if (!busy)
                    change(() =>
                      mutate(
                        (state) =>
                          setWatchlist(state, item.mediaId, false, new Date().toISOString()),
                        'watchlist removal',
                      ),
                    );
                }}
              />
              <View style={{ alignItems: 'flex-start', marginTop: 6, marginBottom: 8 }}>
                <Chip
                  label={
                    item.priority === 2
                      ? 'Watch next'
                      : item.priority === 1
                        ? 'Interested'
                        : 'Set priority'
                  }
                  selected={item.priority > 0}
                  icon="star"
                  onPress={() =>
                    setEditingPriority(editingPriority === item.mediaId ? null : item.mediaId)
                  }
                />
                {editingPriority === item.mediaId && (
                  <View style={{ gap: 6, marginTop: 8 }}>
                    {[
                      { value: 0, label: 'No priority' },
                      { value: 1, label: 'Interested' },
                      { value: 2, label: 'Watch next' },
                    ].map((option) => (
                      <Chip
                        key={option.value}
                        label={option.label}
                        selected={item.priority === option.value}
                        onPress={() => {
                          if (!busy) {
                            change(() =>
                              mutate((state) => setPriority(state, item.mediaId, option.value)),
                            );
                            setEditingPriority(null);
                          }
                        }}
                      />
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>
        )}
        ListFooterComponent={<PreviewNotice />}
        ListEmptyComponent={
          <EmptyState
            title={library.watchlist.length ? 'No saved titles fit' : 'Keep your next watch here'}
            message={
              library.watchlist.length
                ? 'Try clearing the format or runtime filter.'
                : 'Save a movie or show from Discover. It stays here until you log it or remove it.'
            }
            action={
              library.watchlist.length ? (
                <Button
                  label="Clear filters"
                  onPress={() => {
                    setKind('all');
                    setShort(false);
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
