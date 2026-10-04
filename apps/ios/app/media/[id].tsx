import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { mediaById } from '@seen/fixtures';
import { setWatchlist } from '@seen/domain';
import { useLibrary } from '../../src/local/LibraryProvider';
import {
  Body,
  Badge,
  Button,
  EmptyState,
  Heading,
  InlineError,
  PreviewNotice,
  Screen,
  Section,
  s,
} from '../../src/components/ui';
import { Poster } from '../../src/components/Poster';
import { colors } from '../../src/design/tokens';

export default function MediaDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    media = mediaById.get(id),
    { library, mutate, snapshot, busy } = useLibrary();
  const [error, setError] = useState<string | null>(null);
  if (!media)
    return (
      <Screen>
        <EmptyState
          title="Title unavailable"
          message="This title isn’t in the sample catalog."
          action={
            <Button label="Back to Discover" onPress={() => router.replace('/(tabs)/discover')} />
          }
        />
      </Screen>
    );
  const ranked = snapshot(media.kind).items.find((i) => i.mediaId === id),
    opinion = library.opinions.find((o) => o.mediaId === id),
    saved = library.watchlist.some((w) => w.mediaId === id);
  async function save() {
    setError(null);
    try {
      await mutate((state) => setWatchlist(state, id, !saved, new Date().toISOString()));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed. Try again.');
    }
  }
  return (
    <Screen>
      <View style={[s.row, { alignItems: 'flex-start', gap: 18 }]}>
        <Poster media={media} width={116} />
        <View style={{ flex: 1, gap: 9 }}>
          <Heading>{media.title}</Heading>
          <Body muted style={{ fontSize: 15 }}>
            {media.year} · {media.kind === 'movie' ? 'Movie' : 'TV show'}
          </Body>
          <Body muted style={s.caption}>
            {media.kind === 'movie'
              ? media.runtimeMinutes
                ? `${media.runtimeMinutes} min`
                : 'Runtime unknown'
              : media.episodeMinutes
                ? `About ${media.episodeMinutes} min per episode`
                : 'Episode duration unknown'}
          </Body>
          <Body muted style={s.caption}>
            {media.genres.join(' · ')}
          </Body>
        </View>
      </View>
      <View style={[s.row, { paddingVertical: 12 }]}>
        <Body
          style={{
            fontSize: 34,
            fontWeight: '600',
            fontVariant: ['tabular-nums'],
            color: colors.accent,
          }}
        >
          {ranked?.rankScore?.toFixed(1) ?? '—'}
        </Body>
        <View style={{ flex: 1, gap: 5 }}>
          <Body>Your score / 10</Body>
          <Body muted style={s.caption}>
            {ranked?.position
              ? `#${ranked.position} in your ${media.kind === 'movie' ? 'movies' : 'TV shows'}`
              : opinion
                ? 'Not yet scored · compare to place it'
                : 'Log it, then compare to get your score'}
          </Body>
          {ranked?.evidence === 'provisional' && <Badge label="Provisional" />}
        </View>
      </View>
      <View style={s.row}>
        <Button
          style={{ flex: 1 }}
          label={opinion ? 'Edit log' : 'Log'}
          icon="plus"
          onPress={() => router.push({ pathname: '/log/[id]', params: { id } })}
        />
        <Button
          style={{ flex: 1 }}
          label={saved ? 'Saved' : 'Watchlist'}
          disabled={busy}
          secondary
          icon={saved ? 'saved' : 'watchlist'}
          onPress={() => void save()}
        />
      </View>
      <InlineError message={error} />
      <PreviewNotice />
      <Section title="Where to watch">
        <Body muted>Availability is not connected in this preview.</Body>
        <Body muted style={s.caption}>
          The live service will show regional subscription, rent, and buy offers with source and
          freshness information. No streaming entitlement is implied.
        </Body>
      </Section>
      <Section title="Overview">
        <Body muted>{media.synopsis}</Body>
      </Section>
      {opinion && (
        <Section title="Your watch">
          <Body>
            {opinion.sentiment
              ? `You ${opinion.sentiment === 'liked' ? 'liked' : opinion.sentiment === 'fine' ? 'felt fine about' : 'disliked'} this ${media.kind === 'movie' ? 'movie' : 'show'}.`
              : 'No sentiment yet.'}
          </Body>
          {opinion.status && <Body muted>Status: {opinion.status.replace('_', ' ')}</Body>}
          <Button
            label="Refine its placement"
            secondary
            icon="rank"
            onPress={() =>
              router.push({ pathname: '/compare', params: { kind: media.kind, target: id } })
            }
          />
        </Section>
      )}
      <Body muted style={s.caption}>
        Illustrative metadata and original abstract artwork. Live TMDB metadata and credits will be
        added after vendor access is configured.
      </Body>
    </Screen>
  );
}
