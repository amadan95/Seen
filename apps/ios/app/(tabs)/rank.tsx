import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { FlatList, View } from 'react-native';
import type { MediaKind } from '@seen/contracts';
import { useLibrary } from '../../src/local/LibraryProvider';
import {
  Body,
  Button,
  Chip,
  EmptyState,
  Disclosure,
  Heading,
  PreviewNotice,
  Screen,
  Segments,
  s,
} from '../../src/components/ui';
import { MediaRow } from '../../src/components/Poster';

export default function Rank() {
  const params = useLocalSearchParams<{
    kind?: string;
    placed?: string;
    placementRevision?: string;
  }>();
  const { snapshot, mediaById } = useLibrary(),
    [kind, setKind] = useState<MediaKind>('movie'),
    [limit, setLimit] = useState('10'),
    [genre, setGenre] = useState<string | null>(null),
    [about, setAbout] = useState(false);
  useEffect(() => {
    if (params.kind) setKind(params.kind === 'tv' ? 'tv' : 'movie');
    if (params.placed) {
      setGenre(null);
      setLimit('all');
    }
  }, [params.kind, params.placed, params.placementRevision]);
  const ranks = snapshot(kind),
    placed = ranks.items.filter((i) => i.position !== null),
    unplaced = ranks.items.filter((i) => i.position === null);
  const visible = placed.filter(
    (i) =>
      (!genre || mediaById.get(i.mediaId)!.genres.includes(genre)) &&
      (limit === 'all' || i.position! <= Number(limit)),
  );
  const added = ranks.items.find(
    (item) => item.mediaId === params.placed && item.rankScore !== null,
  );
  return (
    <Screen scroll={false}>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.mediaId}
        contentContainerStyle={{ paddingBottom: 80 }}
        ListHeaderComponent={
          <View style={{ gap: 16 }}>
            <Heading large>Your rankings</Heading>
            {added && (
              <Body accessibilityLiveRegion="polite">
                {mediaById.get(added.mediaId)?.title} is ranked · {added.rankScore?.toFixed(1)} / 10
                · #{added.position}
                {added.evidence === 'provisional' ? ' · Provisional' : ''}
              </Body>
            )}
            <Segments
              options={[
                { value: 'movie', label: 'Movies' },
                { value: 'tv', label: 'TV' },
              ]}
              value={kind}
              onChange={setKind}
            />
            <Disclosure
              title={`Filters · ${limit === 'all' ? 'All' : `Top ${limit}`}${genre ? ` · ${genre}` : ''}`}
            >
              <View style={{ gap: 8 }}>
                <Segments
                  options={[
                    { value: '10', label: 'Top 10' },
                    { value: '25', label: 'Top 25' },
                    { value: '50', label: 'Top 50' },
                    { value: 'all', label: 'All' },
                  ]}
                  value={limit}
                  onChange={setLimit}
                />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['Drama', 'Sci-fi', 'Crime'].map((g) => (
                    <Chip
                      key={g}
                      label={g}
                      selected={genre === g}
                      onPress={() => setGenre(genre === g ? null : g)}
                    />
                  ))}
                </View>
              </View>
            </Disclosure>
            <Button
              label="Refine your list"
              secondary
              icon="rank"
              onPress={() => router.push({ pathname: '/compare', params: { kind } })}
            />
          </View>
        }
        renderItem={({ item }) => <MediaRow media={mediaById.get(item.mediaId)!} rank={item} />}
        ListEmptyComponent={
          <EmptyState
            title={placed.length ? 'No ranked titles match' : 'Your ranking is taking shape'}
            message={
              placed.length
                ? 'Try another genre or view.'
                : 'Log at least two titles and compare them. Sentiment alone never creates a Rank Score.'
            }
            action={
              <Button label="Find a title" secondary onPress={() => router.push('/search')} />
            }
          />
        }
        ListFooterComponent={
          <View style={{ marginTop: 28, gap: 12 }}>
            <Chip label="About Rank Score" selected={about} onPress={() => setAbout(!about)} />
            {about && (
              <Body muted style={s.caption}>
                Your score / 10 comes from comparisons. Filters never change it. Early scores are
                provisional.
              </Body>
            )}
            <PreviewNotice />
            {unplaced.length > 0 && (
              <>
                <Heading>Not yet placed</Heading>
                <Body muted style={s.caption}>
                  These titles are saved. Comparisons are always optional.
                </Body>
                {unplaced
                  .filter((i) => !genre || mediaById.get(i.mediaId)!.genres.includes(genre))
                  .map((item) => (
                    <MediaRow
                      key={item.mediaId}
                      media={mediaById.get(item.mediaId)!}
                      rank={item}
                      trailing={
                        <Button
                          label="Compare"
                          secondary
                          style={{ paddingHorizontal: 10 }}
                          onPress={() =>
                            router.push({
                              pathname: '/compare',
                              params: { kind, target: item.mediaId },
                            })
                          }
                        />
                      }
                    />
                  ))}
              </>
            )}
          </View>
        }
      />
    </Screen>
  );
}
