import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, View, useWindowDimensions } from 'react-native';
import { sampleLibrary } from '@seen/fixtures';
import { recommend } from '@seen/domain';
import { useLibrary } from '../../src/local/LibraryProvider';
import {
  Body,
  Button,
  EmptyState,
  Heading,
  IconButton,
  InlineError,
  Screen,
  Section,
  s,
} from '../../src/components/ui';
import { catalogUrl } from '../../src/features/catalog/client';
import { colors } from '../../src/design/tokens';
import { Poster, PosterTile } from '../../src/components/Poster';

export default function Home() {
  const {
    library,
    mutate,
    snapshot,
    busy,
    catalog,
    mediaById,
    catalogLoading,
    catalogError,
    refreshCatalog,
  } = useLibrary();
  const { width, fontScale } = useWindowDimensions();
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
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
          <Poster media={mediaById.get('arrival')!} width={Math.max(64, (width - 60) / 3)} />
          <Poster media={mediaById.get('dune')!} width={Math.max(64, (width - 60) / 3)} />
          <Poster media={mediaById.get('moon')!} width={Math.max(64, (width - 60) / 3)} />
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
          streaming account is connected.
        </Body>
      </Screen>
    );
  const servedAt = new Date().toISOString();
  const picks = recommend(
    catalogUrl ? catalog.filter((media) => media.id !== 'unknown') : catalog,
    library,
    {
      kind: 'all',
      seed: 'home',
      now: servedAt,
      snapshots: [snapshot('movie'), snapshot('tv')],
      limit: 6,
    },
  ).items;
  const scopes = (['movie', 'tv'] as const).map((kind) => ({
    kind,
    eligible: snapshot(kind).items,
    unplaced: snapshot(kind).items.filter((i) => i.position === null),
  }));
  const featured = picks[0];
  const rail = picks.slice(1, 6);
  const featureWidth = Math.max(1, width - 40);
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
            onPress={() => router.push('/profile')}
          />
        </View>
      }
    >
      {featured && (
        <View style={{ gap: 12 }}>
          <Poster
            media={featured.media}
            width={featureWidth}
            height={fontScale > 1.4 ? 270 : 230}
            onPress={() =>
              router.push({
                pathname: '/media/[id]',
                params: {
                  id: featured.media.id,
                  requestId: featured.requestId,
                  itemId: featured.itemId,
                  servedAt,
                },
              })
            }
            accessibilityLabel={`Explore ${featured.media.title}. ${featured.reason}`}
          />
          <Heading>{featured.media.title}</Heading>
          <Body muted style={s.caption}>
            {featured.reason}
          </Body>
        </View>
      )}
      <Section title="Watch tonight">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 14 }}
        >
          {rail.map((p) => (
            <PosterTile
              key={p.media.id}
              media={p.media}
              width={158}
              recommendation={{ requestId: p.requestId, itemId: p.itemId, servedAt }}
            />
          ))}
        </ScrollView>
        <Button label="Choose from three picks" secondary onPress={() => router.push('/tonight')} />
        {!picks.length && (
          <EmptyState
            title="You’ve explored this catalog"
            message="Search in Discover to explore more titles."
          />
        )}
      </Section>
      {scopes.some((scope) => scope.unplaced.length > 0) && (
        <View style={{ backgroundColor: colors.surface, padding: 16, borderRadius: 12 }}>
          <Section inset title="Continue ranking">
            {scopes
              .filter((scope) => scope.unplaced.length > 0)
              .map((scope) => (
                <View key={scope.kind} style={{ gap: 8 }}>
                  <Body muted style={s.caption}>
                    {scope.kind === 'movie' ? 'Movies' : 'TV'} ·{' '}
                    {scope.unplaced.length
                      ? `${scope.unplaced.length} waiting to find a place`
                      : 'Refine whenever you like'}
                  </Body>
                  <Button
                    label={scope.kind === 'movie' ? 'Place a movie' : 'Place a show'}
                    secondary
                    icon="rank"
                    onPress={() =>
                      router.push({
                        pathname: '/compare',
                        params: {
                          kind: scope.kind,
                          target: scope.unplaced[0]!.mediaId,
                          mode: 'placement',
                        },
                      })
                    }
                  />
                </View>
              ))}
          </Section>
        </View>
      )}
      {catalogLoading && (
        <ActivityIndicator
          color={colors.accent}
          accessibilityLabel="Loading posters and title details"
        />
      )}
      {catalogError && (
        <>
          <InlineError message={catalogError} />
          <Button label="Retry catalog" secondary onPress={refreshCatalog} />
        </>
      )}
    </Screen>
  );
}
