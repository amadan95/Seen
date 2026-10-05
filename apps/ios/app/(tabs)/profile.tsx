import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useLibrary } from '../../src/local/LibraryProvider';
import {
  Body,
  Button,
  Heading,
  IconButton,
  PreviewNotice,
  Screen,
  Section,
  s,
} from '../../src/components/ui';
import { MediaRow, PosterTile } from '../../src/components/Poster';
import { Icon } from '../../src/components/Icon';
import { colors } from '../../src/design/tokens';

export default function Profile() {
  const { library, snapshot, mediaById } = useLibrary();
  const top = snapshot('movie')
    .items.filter((i) => i.position !== null)
    .slice(0, 3);
  return (
    <Screen
      title="Your library"
      action={
        <IconButton name="settings" label="Settings" onPress={() => router.push('/settings')} />
      }
    >
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
        title="The films you return to"
        action={
          <IconButton
            name="chevron"
            label="View all rankings"
            onPress={() => router.push('/(tabs)/rank')}
          />
        }
      >
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
      <Section title="Watch history">
        <Body muted style={s.caption}>
          Historical watches with unknown dates stay undated.
        </Body>
        {[...library.logs].reverse().map((log) => (
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
        ))}
        {!library.logs.length && (
          <Button label="Log your first watch" secondary onPress={() => router.push('/search')} />
        )}
      </Section>
    </Screen>
  );
}
