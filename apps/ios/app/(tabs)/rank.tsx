import { useState } from 'react';
import { router } from 'expo-router';
import { FlatList, View } from 'react-native';
import type { MediaKind } from '@seen/contracts';
import { useLibrary } from '../../src/local/LibraryProvider';
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
} from '../../src/components/ui';
import { MediaRow } from '../../src/components/Poster';

export default function Rank() {
  const { snapshot, mediaById } = useLibrary(),
    [kind, setKind] = useState<MediaKind>('movie'),
    [limit, setLimit] = useState('10'),
    [genre, setGenre] = useState<string | null>(null),
    [about, setAbout] = useState(false);
  const ranks = snapshot(kind),
    placed = ranks.items.filter((i) => i.position !== null),
    unplaced = ranks.items.filter((i) => i.position === null);
  const visible = placed.filter(
    (i) =>
      (!genre || mediaById.get(i.mediaId)!.genres.includes(genre)) &&
      (limit === 'all' || i.position! <= Number(limit)),
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
            <Segments
              options={[
                { value: 'movie', label: 'Movies' },
                { value: 'tv', label: 'TV' },
              ]}
              value={kind}
              onChange={setKind}
            />
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
            <Button
              label="Refine your list"
              secondary
              icon="rank"
              onPress={() => router.push({ pathname: '/compare', params: { kind } })}
            />
            <PreviewNotice />
            <View style={[s.row, { justifyContent: 'space-between' }]}>
              <Body muted style={s.caption}>
                Assigned from your comparisons · /10
              </Body>
              <Chip label="Rank Score" selected={false} onPress={() => setAbout(!about)} />
            </View>
            {about && (
              <Body muted style={s.caption}>
                An automatically assigned personal preference index. Comparisons can change it;
                filters don’t. It is not a critic rating or an enjoyment probability.
              </Body>
            )}
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
