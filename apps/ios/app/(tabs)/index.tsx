import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { sampleLibrary } from '@seen/fixtures';
import { discoveryPicks } from '@seen/domain';
import { useLibrary } from '../../src/local/LibraryProvider';
import {
  Body,
  Button,
  EmptyState,
  Heading,
  IconButton,
  InlineError,
  PreviewNotice,
  Screen,
  Section,
  s,
} from '../../src/components/ui';
import { MediaRow, Poster, PosterTile } from '../../src/components/Poster';

export default function Home() {
  const { library, mutate, snapshot, busy, catalog, mediaById } = useLibrary();
  const [error, setError] = useState<string | null>(null);
  function start(sample: boolean) {
    setError(null);
    void mutate((state) => (sample ? sampleLibrary() : { ...state, onboarded: true })).catch((e) =>
      setError(e instanceof Error ? e.message : 'Could not save. Try again.'),
    );
  }
  if (!library.onboarded)
    return (
      <Screen key="welcome" title="Seen">
        <View style={{ paddingTop: 20, paddingBottom: 20, gap: 18 }}>
          <Heading large>Remember what you watched.</Heading>
          <Body muted>Discover what you’ll love.</Body>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
          <Poster media={mediaById.get('arrival')!} width={138} />
          <Poster media={mediaById.get('dune')!} width={138} />
        </View>
        <Heading>Track. Rank. Discover.</Heading>
        <Body muted>
          A quick log keeps the memory. A few comparisons make the list yours. Your next watch
          starts here.
        </Body>
        <Button label="Explore with sample history" disabled={busy} onPress={() => start(true)} />
        <Button
          label="Start my own local library"
          secondary
          disabled={busy}
          onPress={() => start(false)}
        />
        <InlineError message={error} />
        <Body muted style={s.caption}>
          This first build is a private local preview. Sample history is illustrative. No account or
          streaming connection is active.
        </Body>
      </Screen>
    );
  const picks = discoveryPicks(catalog, library),
    unplaced = snapshot('movie').items.filter((i) => i.position === null);
  const recent = [...library.logs].reverse().slice(0, 3);
  return (
    <Screen
      key="home"
      title="Seen"
      action={
        <View style={s.row}>
          <IconButton name="search" label="Search titles" onPress={() => router.push('/search')} />
          <IconButton
            name="profile"
            label="Open your profile"
            onPress={() => router.push('/(tabs)/profile')}
          />
        </View>
      }
    >
      <PreviewNotice />
      <Section
        title="Continue ranking"
        action={
          <IconButton
            name="chevron"
            label="Open rankings"
            onPress={() => router.push('/(tabs)/rank')}
          />
        }
      >
        {library.opinions.length >= 2 ? (
          <View style={{ gap: 12 }}>
            <Body muted>
              {unplaced.length
                ? `${unplaced.length} movie${unplaced.length === 1 ? '' : 's'} waiting to find a place.`
                : 'A few comparisons refine your list.'}
            </Body>
            <Button
              label="Refine your movies"
              secondary
              icon="rank"
              onPress={() => router.push({ pathname: '/compare', params: { kind: 'movie' } })}
            />
          </View>
        ) : (
          <EmptyState
            title="Your list starts with a watch"
            message="Log two movies you’ve seen to try your first comparison."
            action={
              <Button label="Find a title" secondary onPress={() => router.push('/search')} />
            }
          />
        )}
      </Section>
      <Section
        title="Watch tonight"
        action={
          <IconButton
            name="chevron"
            label="Discover more titles"
            onPress={() => router.push('/(tabs)/discover')}
          />
        }
      >
        <Body muted style={s.caption}>
          Ideas from your local catalog. Availability is not connected yet.
        </Body>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 14 }}
        >
          {picks.slice(0, 5).map((p) => (
            <PosterTile key={p.media.id} media={p.media} reason={p.reason} width={158} />
          ))}
        </ScrollView>
        {!picks.length && (
          <EmptyState
            title="You’ve explored this catalog"
            message="Search in Discover to explore more titles."
          />
        )}
      </Section>
      <Section
        title="Recently watched"
        action={
          <IconButton
            name="chevron"
            label="View watch history"
            onPress={() => router.push('/(tabs)/profile')}
          />
        }
      >
        {recent.map((log) => (
          <MediaRow key={log.id} media={mediaById.get(log.mediaId)!} />
        ))}
        {!recent.length && <Body muted>Your first log will appear here.</Body>}
      </Section>
    </Screen>
  );
}
