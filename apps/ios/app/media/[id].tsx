import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, View, useWindowDimensions } from 'react-native';
import { setWatchlist } from '@seen/domain';
import { useLibrary } from '../../src/local/LibraryProvider';
import {
  Body,
  Button,
  EmptyState,
  Heading,
  Disclosure,
  InlineError,
  PreviewNotice,
  Screen,
  Section,
  s,
} from '../../src/components/ui';
import { TitleNote } from '../../src/components/TitleNote';
import { Availability } from '../../src/components/Availability';
import { Poster } from '../../src/components/Poster';
import { colors } from '../../src/design/tokens';
import { catalogUrl, loadCatalogDetail } from '../../src/features/catalog/client';

export default function MediaDetail() {
  const { width, fontScale } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>(),
    { library, mutate, snapshot, busy, mediaById, cacheMedia } = useLibrary(),
    media = mediaById.get(id);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false),
    [detailError, setDetailError] = useState<string | null>(null),
    [retry, setRetry] = useState(0),
    [stale, setStale] = useState(false);
  const live = media?.source === 'tmdb' || Boolean(catalogUrl && media && media.id !== 'unknown');
  useEffect(() => {
    if (!live || !catalogUrl) return;
    const abort = new AbortController();
    setLoading(true);
    setDetailError(null);
    void loadCatalogDetail(id, abort.signal)
      .then((result) => {
        if (!abort.signal.aborted) {
          cacheMedia([result.media]);
          setStale(result.stale);
        }
      })
      .catch(() => {
        if (!abort.signal.aborted)
          setDetailError(
            'Details could not refresh. Your saved title and library are still available.',
          );
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [id, live, retry, cacheMedia]);
  if (!media)
    return (
      <Screen inStack>
        <EmptyState
          title="Title unavailable"
          message="This title isn’t available in the local catalog."
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
    <Screen inStack>
      <View style={{ alignItems: 'center', paddingBottom: 4 }}>
        <Poster media={media} width={Math.min(width - 40, fontScale > 1.4 ? 190 : 250)} />
      </View>
      <Heading large>{media.title}</Heading>
      <Body muted style={s.caption}>
        {media.year ?? 'Year unknown'} ·{' '}
        {media.kind === 'movie'
          ? media.runtimeMinutes
            ? `${media.runtimeMinutes} min`
            : 'Runtime unknown'
          : media.episodeMinutes
            ? `${media.episodeDurationSource === 'latest' ? 'Latest episode: ' : 'About '}${media.episodeMinutes} min${media.episodeDurationSource === 'latest' ? '' : ' / episode'}`
            : 'TV show'}
      </Body>
      {loading && (
        <ActivityIndicator color={colors.accent} accessibilityLabel="Refreshing title details" />
      )}
      {detailError && (
        <>
          <InlineError message={detailError} />
          <Button label="Retry details" secondary onPress={() => setRetry((value) => value + 1)} />
        </>
      )}
      {stale && (
        <Body muted style={s.caption}>
          Showing recently cached metadata.
        </Body>
      )}
      <View style={[s.row, { flexWrap: 'wrap', paddingVertical: 6 }]}>
        <Body
          accessibilityLabel={
            ranked?.rankScore != null
              ? `Your score ${ranked.rankScore.toFixed(1)} out of 10`
              : 'Not yet scored'
          }
          style={{
            fontSize: 34,
            lineHeight: 46,
            fontWeight: '600',
            fontVariant: ['tabular-nums'],
            color: colors.accent,
            flexShrink: 0,
          }}
        >
          {ranked?.rankScore?.toFixed(1) ?? '—'}
        </Body>
        <View style={{ flex: 1, minWidth: 150, gap: 2 }}>
          <Body muted style={s.caption}>
            Your score / 10{ranked?.position ? ` · #${ranked.position}` : ''}
          </Body>
          {ranked?.evidence === 'provisional' && (
            <Body muted style={s.caption}>
              Provisional
            </Body>
          )}
        </View>
      </View>
      <View style={{ flexDirection: fontScale > 1.4 ? 'column' : 'row', gap: 12 }}>
        <Button
          style={fontScale > 1.4 ? { width: '100%' } : { flex: 1 }}
          label={opinion ? 'Edit log' : 'Log'}
          icon="plus"
          onPress={() => router.push({ pathname: '/log/[id]', params: { id } })}
        />
        <Button
          style={fontScale > 1.4 ? { width: '100%' } : { flex: 1 }}
          label={saved ? 'Saved' : 'Watchlist'}
          disabled={busy}
          secondary
          icon={saved ? 'saved' : 'watchlist'}
          onPress={() => void save()}
        />
      </View>
      <InlineError message={error} />
      <TitleNote key={id} mediaId={id} />
      <Section title="Where to watch">
        {live ? (
          <Availability data={media.availability} loading={loading} />
        ) : (
          <Body muted>Connect the live catalog to check US viewing options.</Body>
        )}
        {live &&
          !loading &&
          (!media.availability || media.availability.status === 'unavailable') && (
            <Button
              label="Retry viewing options"
              secondary
              onPress={() => setRetry((value) => value + 1)}
            />
          )}
      </Section>
      <Section title="Overview">
        <Body muted numberOfLines={3}>
          {media.synopsis || 'No overview is available for this title.'}
        </Body>
        {Boolean(media.synopsis) && (
          <Disclosure title="Read full overview">
            <Body muted>{media.synopsis}</Body>
          </Disclosure>
        )}
      </Section>
      {media.metadataComplete && (
        <Disclosure title="Title details">
          {Boolean(media.genres.length) && <Body muted>{media.genres.join(' · ')}</Body>}
          {Boolean(media.tagline) && <Body muted>{media.tagline}</Body>}
          {media.releaseDate && (
            <Body muted>
              {media.kind === 'movie' ? 'Released' : 'First aired'}: {media.releaseDate}
            </Body>
          )}
          {media.originalLanguage && (
            <Body muted>Original language: {media.originalLanguage.toUpperCase()}</Body>
          )}
          {media.catalogStatus && (
            <Body muted>
              {media.kind === 'tv' ? 'Series' : 'Release'} status: {media.catalogStatus}
            </Body>
          )}
          {media.seasons !== null && media.seasons !== undefined && (
            <Body muted>
              {media.seasons} seasons · {media.episodes ?? 'Unknown'} episodes in the catalog
            </Body>
          )}
          {Boolean(media.directors?.length) && (
            <Body muted>Directed by {media.directors!.join(', ')}</Body>
          )}
          {Boolean(media.creators?.length) && (
            <Body muted>Created by {media.creators!.join(', ')}</Body>
          )}
          {media.trailerUrl && (
            <Button
              label="Watch official trailer"
              secondary
              onPress={() =>
                void Linking.openURL(media.trailerUrl!).catch(() =>
                  setError('The trailer could not be opened.'),
                )
              }
            />
          )}
        </Disclosure>
      )}
      {Boolean(media.cast?.length) && (
        <Disclosure title="Cast & crew">
          {media.cast!.map((person, index) => (
            <View key={`${person.name}-${index}`} style={{ gap: 2 }}>
              <Body>{person.name}</Body>
              {person.character && (
                <Body muted style={s.caption}>
                  {person.character}
                </Body>
              )}
            </View>
          ))}
        </Disclosure>
      )}
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
      <PreviewNotice />
      <Body muted style={s.caption}>
        {live
          ? 'This product uses the TMDB API but is not endorsed or certified by TMDB.'
          : 'Illustrative metadata and original abstract artwork.'}
      </Body>
      {media.sourceUrl && (
        <Button
          label="View on TMDB"
          secondary
          onPress={() =>
            void Linking.openURL(media.sourceUrl!).catch(() =>
              setError('The source link could not be opened.'),
            )
          }
        />
      )}
    </Screen>
  );
}
