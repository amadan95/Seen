import { router } from 'expo-router';
import { View } from 'react-native';
import { mediaById } from '@seen/fixtures';
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
import { MediaRow } from '../../src/components/Poster';
import { Icon } from '../../src/components/Icon';
import { colors } from '../../src/design/tokens';

export default function Profile() {
  const { library, snapshot } = useLibrary();
  const top = snapshot('movie')
    .items.filter((i) => i.position !== null)
    .slice(0, 3);
  return (
    <Screen
      title="Your profile"
      action={
        <IconButton name="settings" label="Settings" onPress={() => router.push('/settings')} />
      }
    >
      <View style={{ alignItems: 'center', gap: 10, paddingVertical: 20 }}>
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
        <Heading>Your local library</Heading>
        <Body muted>Private by default. A record of your taste.</Body>
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
        title="Your top movies"
        action={
          <IconButton
            name="chevron"
            label="View all rankings"
            onPress={() => router.push('/(tabs)/rank')}
          />
        }
      >
        {top.map((item) => (
          <MediaRow key={item.mediaId} media={mediaById.get(item.mediaId)!} rank={item} />
        ))}
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
            {log.note && (
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
