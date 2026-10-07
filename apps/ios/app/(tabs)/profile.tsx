import { useState } from 'react';
import { router } from 'expo-router';
import { FlatList, ScrollView, View } from 'react-native';
import { useLibrary } from '../../src/local/LibraryProvider';
import {
  Body,
  Button,
  Heading,
  IconButton,
  PreviewNotice,
  Screen,
  Segments,
  Section,
  s,
} from '../../src/components/ui';
import { MediaRow, PosterTile } from '../../src/components/Poster';
import { Icon } from '../../src/components/Icon';
import { colors } from '../../src/design/tokens';

export default function Profile() {
  const { library, snapshot, mediaById } = useLibrary();
  const [kind, setKind] = useState<'movie' | 'tv'>('movie');
  const top = snapshot(kind)
    .items.filter((i) => i.position !== null)
    .slice(0, 3);
  return (
    <Screen
      scroll={false}
      title="Your library"
      action={
        <IconButton name="settings" label="Settings" onPress={() => router.push('/settings')} />
      }
    >
      <FlatList
        data={[...library.logs].reverse()}
        keyExtractor={(log) => log.id}
        contentContainerStyle={{ paddingBottom: 80 }}
        ListHeaderComponent={
          <View style={{ gap: 16 }}>
            <View style={[s.row, { gap: 16, paddingVertical: 12 }]}>
              <View
                style={{
                  backgroundColor: colors.surface,
                  width: 82,
                  height: 82,
                  borderRadius: 41,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="profile" size={54} color={colors.accent} />
              </View>
              <View style={{ flex: 1, gap: 8 }}>
                <Heading>A record of your taste.</Heading>
                <Body muted>Private by default.</Body>
              </View>
            </View>
            <PreviewNotice />
            <View
              style={[
                s.row,
                {
                  justifyContent: 'space-around',
                  paddingVertical: 18,
                  borderTopWidth: 1,
                  borderBottomWidth: 1,
                  borderColor: colors.border,
                },
              ]}
            >
              {[
                [library.opinions.length, 'Titles seen'],
                [library.watchlist.length, 'Watchlisted'],
                [library.comparisons.length, 'Comparisons'],
              ].map(([value, label]) => (
                <View key={label} style={{ alignItems: 'center', gap: 4 }}>
                  <Heading>{value}</Heading>
                  <Body muted style={s.caption}>
                    {label}
                  </Body>
                </View>
              ))}
            </View>
            <Section
              title={kind === 'movie' ? 'Your favorite movies' : 'Your favorite TV'}
              action={
                <IconButton
                  name="chevron"
                  label="View all rankings"
                  onPress={() => router.push({ pathname: '/(tabs)/rank', params: { kind } })}
                />
              }
            >
              <Segments
                options={[
                  { value: 'movie', label: 'Movies' },
                  { value: 'tv', label: 'TV' },
                ]}
                value={kind}
                onChange={setKind}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
              >
                {top.map((item) => (
                  <PosterTile
                    key={item.mediaId}
                    media={mediaById.get(item.mediaId)!}
                    width={106}
                    reason={`#${item.position} · ${item.rankScore?.toFixed(1)} / 10${item.evidence === 'provisional' ? ' · Provisional' : ''}`}
                  />
                ))}
              </ScrollView>
              {!top.length && <Body muted>Compare a few seen titles to start your list.</Body>}
            </Section>
            <Heading>Watch history</Heading>
            <Body muted style={s.caption}>
              Historical watches with unknown dates stay undated.
            </Body>
          </View>
        }
        renderItem={({ item: log }) => (
          <View key={log.id}>
            <MediaRow media={mediaById.get(log.mediaId)!} />
            <Body muted style={[s.caption, { marginTop: 5 }]}>
              {log.watchedOn ?? 'Watch date unknown'}
              {log.rewatch ? ' · Rewatch' : ''}
            </Body>
            {Boolean(log.note) && (
              <Body muted style={s.caption}>
                Private note: {log.note}
              </Body>
            )}
          </View>
        )}
        ListEmptyComponent={
          !library.logs.length ? (
            <Button label="Log your first watch" secondary onPress={() => router.push('/search')} />
          ) : null
        }
      />
    </Screen>
  );
}
