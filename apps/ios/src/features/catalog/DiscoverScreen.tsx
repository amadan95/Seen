import { SheetControl } from '../../components/Sheet';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, TextInput, View, useWindowDimensions } from 'react-native';
import type { MediaKind } from '@seen/contracts';
import { catalog } from '@seen/fixtures';
import { recommend, filterCatalog } from '@seen/domain';
import { useLibrary } from '../../local/LibraryProvider';
import {
  Body,
  Button,
  Chip,
  EmptyState,
  Heading,
  InlineError,
  Screen,
  Segments,
  s,
} from '../../components/ui';
import { PosterTile } from '../../components/Poster';
import { colors } from '../../design/tokens';
import { catalogUrl } from './client';
import { useCatalogSearch } from './useCatalogSearch';

export function DiscoverScreen({ search = false }: { search?: boolean }) {
  const { library, mediaById, catalog: cachedCatalog, snapshot } = useLibrary();
  const { width, fontScale } = useWindowDimensions();
  const columns = fontScale > 1.4 ? 1 : 2;
  const posterWidth = (width - 40 - (columns - 1) * 14) / columns;
  const [query, setQuery] = useState(''),
    [kind, setKind] = useState<MediaKind | 'all'>('all'),
    [short, setShort] = useState(false),
    [genre, setGenre] = useState<'Sci-fi' | 'Drama' | 'Comedy' | 'Crime' | null>(null),
    [live, setLive] = useState(Boolean(catalogUrl)),
    [view, setView] = useState<'for_you' | 'browse'>('for_you');
  const options = useMemo(
    () => ({ query, kind, genre, maxRuntime: short ? 120 : null, page: 1 }),
    [query, kind, genre, short],
  );
  const remote = useCatalogSearch(options, live);
  const [servedAt] = useState(() => new Date().toISOString());
  const personal = !search && !query.trim() && view === 'for_you';
  const picks = useMemo(
    () =>
      recommend(
        (live ? cachedCatalog : catalog.map((m) => mediaById.get(m.id) ?? m)).filter(
          (m) => m.id !== 'unknown',
        ),
        library,
        {
          kind,
          genre,
          maxRuntime: short ? 120 : null,
          seed: 'discover',
          now: new Date().toISOString(),
          snapshots: [snapshot('movie'), snapshot('tv')],
        },
      ).items,
    [cachedCatalog, library, kind, genre, short, live],
  );
  const results = personal
    ? picks.map((p) => p.media)
    : live
      ? (remote.page?.items ?? [])
      : filterCatalog(
          catalog
            .map((m) => mediaById.get(m.id) ?? m)
            .filter((m) => !catalogUrl || m.id !== 'unknown'),
          { kind, maxRuntime: short ? 120 : null, genre },
          query,
        );
  return (
    <Screen scroll={false} inStack={search}>
      <FlatList
        key={columns}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? { gap: 14 } : undefined}
        data={results}
        keyExtractor={(m) => m.id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80, gap: 16 }}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: 12 }}>
            {!search && <Heading large>Discover</Heading>}
            {!search && !query.trim() && (
              <Segments
                options={[
                  { value: 'for_you', label: 'For you' },
                  { value: 'browse', label: 'Browse' },
                ]}
                value={view}
                onChange={setView}
              />
            )}
            <TextInput
              accessibilityLabel="Search movies and TV"
              placeholder="Search movies and shows"
              placeholderTextColor={colors.muted}
              value={query}
              onChangeText={setQuery}
              autoFocus={search}
              autoCorrect={false}
              clearButtonMode="while-editing"
              returnKeyType="search"
              style={s.input}
            />
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
            <SheetControl title={`Filters${genre || short ? ' · active' : ''}`}>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <Chip
                  label="Under 2 hours"
                  icon="clock"
                  selected={short}
                  onPress={() => {
                    setShort(!short);
                    if (!short) setKind('movie');
                  }}
                />
                {(['Sci-fi', 'Drama', 'Comedy', 'Crime'] as const).map((g) => (
                  <Chip
                    key={g}
                    label={g}
                    selected={genre === g}
                    onPress={() => setGenre(genre === g ? null : g)}
                  />
                ))}
              </View>
              {catalogUrl && (
                <Segments
                  options={[
                    { value: 'live', label: 'Live catalog' },
                    { value: 'sample', label: 'Sample catalog' },
                  ]}
                  value={live ? 'live' : 'sample'}
                  onChange={(value) => setLive(value === 'live')}
                />
              )}
            </SheetControl>
            {live && remote.page?.stale && (
              <Body muted style={s.caption}>
                Showing recently cached titles while TMDB is unavailable.
              </Body>
            )}
            {live && remote.loading && (
              <ActivityIndicator color={colors.accent} accessibilityLabel="Loading titles" />
            )}
            {live && remote.error && (
              <>
                <InlineError message={remote.error} />
                <Button label="Try again" secondary onPress={remote.retry} />
              </>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <PosterTile
            media={mediaById.get(item.id) ?? item}
            width={posterWidth}
            recommendation={
              personal
                ? (() => {
                    const pick = picks.find((p) => p.media.id === item.id);
                    return pick
                      ? { requestId: pick.requestId, itemId: pick.itemId, servedAt }
                      : undefined;
                  })()
                : undefined
            }
            reason={String(item.year ?? 'Year unknown')}
          />
        )}
        ListEmptyComponent={
          live && (remote.loading || remote.error) ? null : (
            <EmptyState
              title="No titles fit these filters"
              message="Try another title, genre, or runtime. Your filters haven’t been changed."
              action={
                <Button
                  label="Clear filters"
                  secondary
                  onPress={() => {
                    setKind('all');
                    setGenre(null);
                    setShort(false);
                    setQuery('');
                  }}
                />
              }
            />
          )
        }
        ListFooterComponent={
          <View style={{ gap: 14, paddingTop: 18 }}>
            {live && !personal && remote.page?.nextPage && (
              <Button
                label="More titles"
                secondary
                disabled={remote.loading}
                onPress={remote.loadMore}
              />
            )}
            <Body muted style={s.caption}>
              {short
                ? 'Movies with known runtime of 120 minutes or less.'
                : live
                  ? 'Movie and TV metadata from TMDB.'
                  : 'Illustrative sample catalog.'}
            </Body>
            {live && (
              <Body muted style={s.caption}>
                This product uses the TMDB API but is not endorsed or certified by TMDB.
              </Body>
            )}
          </View>
        }
      />
    </Screen>
  );
}
