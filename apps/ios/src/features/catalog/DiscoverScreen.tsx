import { useMemo, useState } from 'react';
import { FlatList, TextInput, View, useWindowDimensions } from 'react-native';
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
  Screen,
  Segments,
  s,
} from '../../components/ui';
import { PosterTile } from '../../components/Poster';
import { colors } from '../../design/tokens';

export function DiscoverScreen({ search = false }: { search?: boolean }) {
  const { library } = useLibrary(),
    { width, fontScale } = useWindowDimensions();
  const [query, setQuery] = useState(''),
    [kind, setKind] = useState<MediaKind | 'all'>('all'),
    [short, setShort] = useState(false),
    [genre, setGenre] = useState<string | null>(null);
  const reasons = useMemo(
    () => new Map(discoveryPicks(catalog, library).map((p) => [p.media.id, p.reason])),
    [library],
  );
  const results = filterCatalog(catalog, { kind, maxRuntime: short ? 120 : null, genre }, query);
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
              {['Sci-fi', 'Drama', 'Comedy', 'Crime'].map((g) => (
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
                : 'Illustrative catalog · live search is coming in a later build.'}
            </Body>
          </View>
        }
        renderItem={({ item }) => (
          <PosterTile
            media={item}
            reason={
              reasons.get(item.id) ??
              `${item.year} · ${item.kind === 'movie' ? 'Movie' : 'TV show'}`
            }
            width={tileWidth}
          />
        )}
        ListEmptyComponent={
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
        }
      />
    </Screen>
  );
}
