import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, TextInput, View, useWindowDimensions } from 'react-native';
import type { MediaKind } from '@seen/contracts';
import { catalog } from '@seen/fixtures';
import { discoveryPicks, filterCatalog } from '@seen/domain';
import { useLibrary } from '../../local/LibraryProvider';
import {
  Body,
  Button,
  Chip,
  EmptyState,
  Heading,
  PreviewNotice,
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
  const { library } = useLibrary(),
    { width, fontScale } = useWindowDimensions();
  const [query, setQuery] = useState(''),
    [kind, setKind] = useState<MediaKind | 'all'>('all'),
    [short, setShort] = useState(false),
    [genre, setGenre] = useState<'Sci-fi' | 'Drama' | 'Comedy' | 'Crime' | null>(null),
    [live, setLive] = useState(Boolean(catalogUrl));
  const options = useMemo(
    () => ({ query, kind, genre, maxRuntime: short ? 120 : null, page: 1 }),
    [query, kind, genre, short],
  );
  const remote = useCatalogSearch(options, live);
  const reasons = useMemo(
    () => new Map(discoveryPicks(catalog, library).map((p) => [p.media.id, p.reason])),
    [library],
  );
  const results = live
    ? (remote.page?.items ?? [])
    : filterCatalog(catalog, { kind, maxRuntime: short ? 120 : null, genre }, query);
  const columns = fontScale > 1.4 ? 1 : 2,
    tileWidth = (width - 40 - (columns - 1) * 14) / columns;
  return (
    <Screen scroll={false}>
      <FlatList
        key={columns}
        data={results}
        numColumns={columns}
        keyExtractor={(m) => m.id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={columns === 2 ? { gap: 14 } : undefined}
        contentContainerStyle={{ gap: 22, paddingBottom: 80 }}
        ListHeaderComponent={
          <View style={{ gap: 16 }}>
            {!search && <Heading large>Discover</Heading>}
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
            <PreviewNotice />
            <Heading>
              {query ? 'Search results' : genre ? `${genre} picks` : 'Explore the catalog'}
            </Heading>
            <Body muted style={s.caption}>
              {short
                ? 'Movies with known runtime of 120 minutes or less.'
                : live
                  ? 'Movie and TV metadata from TMDB.'
                  : 'Illustrative sample catalog.'}
            </Body>
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
            media={item}
            reason={
              live
                ? `${item.year ?? 'Year unknown'} · ${item.kind === 'movie' ? 'Movie' : 'TV show'}`
                : (reasons.get(item.id) ??
                  `${item.year ?? 'Year unknown'} · ${item.kind === 'movie' ? 'Movie' : 'TV show'}`)
            }
            width={tileWidth}
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
          live ? (
            <View style={{ gap: 14, paddingTop: 18 }}>
              {remote.page?.nextPage && (
                <Button
                  label="More titles"
                  secondary
                  disabled={remote.loading}
                  onPress={remote.loadMore}
                />
              )}
              <Body muted style={s.caption}>
                This product uses the TMDB API but is not endorsed or certified by TMDB.
              </Body>
            </View>
          ) : null
        }
      />
    </Screen>
  );
}
