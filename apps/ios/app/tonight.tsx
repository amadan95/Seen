import { SheetControl } from '../src/components/Sheet';
import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { View, useWindowDimensions } from 'react-native';
import type { MediaKind } from '@seen/contracts';
import { dismissRecommendation, recommend, providerCompany } from '@seen/domain';
import { useLibrary } from '../src/local/LibraryProvider';
import {
  Body,
  Button,
  Chip,
  Disclosure,
  EmptyState,
  Heading,
  InlineError,
  Screen,
  Segments,
  s,
} from '../src/components/ui';
import { Poster } from '../src/components/Poster';
import { colors } from '../src/design/tokens';
import { UndoActions } from '../src/components/UndoActions';

export default function Tonight() {
  const { fontScale } = useWindowDimensions();
  const { catalog, library, mutate, busy, snapshot } = useLibrary();
  const [kind, setKind] = useState<MediaKind>('movie'),
    [minutes, setMinutes] = useState('any');
  const [servicesOnly, setServicesOnly] = useState(false),
    [watchlistOnly, setWatchlistOnly] = useState(false);
  const [excluded, setExcluded] = useState(new Set<string>()),
    [round, setRound] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hiddenPage, setHiddenPage] = useState(0);
  const pageIndex = Math.min(
    hiddenPage,
    Math.max(0, Math.ceil(library.dismissals.length / 10) - 1),
  );
  const [startedAt] = useState(() => new Date().toISOString());
  const [checkedAt, setCheckedAt] = useState(startedAt);
  useEffect(() => {
    const timer = setInterval(() => setCheckedAt(new Date().toISOString()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const providers = useMemo(
    () =>
      [
        ...new Map(
          catalog.flatMap(
            (m) =>
              m.availability?.offers
                .filter((o) => o.type === 'subscription')
                .map((o) => [o.providerId, o] as const) ?? [],
          ),
        ).values(),
      ].sort((a, b) => a.name.localeCompare(b.name)),
    [catalog],
  );
  const result = useMemo(
    () =>
      recommend(
        catalog.filter((m) => m.id !== 'unknown'),
        library,
        {
          kind,
          seed: `tonight:${startedAt}:${round}`,
          now: checkedAt,
          limit: 3,
          maxRuntime: kind === 'movie' && minutes !== 'any' ? Number(minutes) : null,
          providerIds: servicesOnly ? library.selectedProviders : [],
          watchlistOnly,
          exclude: excluded,
          snapshots: [snapshot(kind)],
        },
      ),
    [
      catalog,
      library,
      kind,
      minutes,
      servicesOnly,
      watchlistOnly,
      excluded,
      round,
      startedAt,
      checkedAt,
    ],
  );
  const picks = servicesOnly && !library.selectedProviders.length ? [] : result.items;
  const companies = [...new Set(providers.map((p) => providerCompany(p.name)))].map((name) => ({
    name,
    ids: providers.filter((p) => providerCompany(p.name) === name).map((p) => p.providerId),
  }));
  function updateServices(ids: number[]) {
    setError(null);
    void mutate((state) => ({
      ...state,
      revision: state.revision + 1,
      selectedProviders: ids.some((id) => state.selectedProviders.includes(id))
        ? state.selectedProviders.filter((id) => !ids.includes(id))
        : [...new Set([...state.selectedProviders, ...ids])],
    })).catch(() => setError('Your service choices could not be saved. Try again.'));
  }
  return (
    <Screen inStack>
      <Heading large>What’s on tonight?</Heading>
      <SheetControl
        title="Tonight filters"
        label={`${kind === 'movie' ? 'Movies' : 'TV'} · ${kind === 'movie' && minutes !== 'any' ? `${minutes} min` : 'Any length'}${servicesOnly ? ' · Your services' : ''}${watchlistOnly ? ' · Watchlist' : ''}`}
      >
        <Segments
          options={[
            { value: 'movie', label: 'Movies' },
            { value: 'tv', label: 'TV' },
          ]}
          value={kind}
          onChange={setKind}
        />
        {kind === 'movie' ? (
          <Segments
            options={[
              { value: 'any', label: 'Any length' },
              { value: '90', label: '90 min' },
              { value: '120', label: '2 hours' },
            ]}
            value={minutes}
            onChange={setMinutes}
          />
        ) : (
          <Body muted style={s.caption}>
            These are whole-show suggestions. An episode’s runtime does not describe the full
            commitment.
          </Body>
        )}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip
            label="Watchlist only"
            selected={watchlistOnly}
            onPress={() => setWatchlistOnly(!watchlistOnly)}
          />
          <Chip
            label="On selected services"
            selected={servicesOnly}
            onPress={() => setServicesOnly(!servicesOnly)}
          />
        </View>
        <Disclosure
          title={`Your services${library.selectedProviders.length ? ` · ${library.selectedProviders.length} selected` : ''}`}
        >
          <Body muted style={s.caption}>
            United States · companies group their reported subscription tiers and channels. A
            company choice can include add-ons; check your plan before watching. Existing selections
            retain their exact listings.
          </Body>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {companies.map((p) => (
              <Chip
                key={p.name}
                label={p.name}
                selected={p.ids.some((id) => library.selectedProviders.includes(id))}
                onPress={() => {
                  if (!busy) updateServices(p.ids);
                }}
              />
            ))}
          </View>
          {!providers.length && (
            <Body muted>
              No subscription listings have been loaded yet. Open a title’s details or browse
              Discover to load viewing options.
            </Body>
          )}
        </Disclosure>
      </SheetControl>
      <InlineError message={error} />
      {picks.map((item) => (
        <View
          key={item.itemId}
          style={{
            gap: 12,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <View
            style={{
              flexDirection: fontScale > 1.4 ? 'column' : 'row',
              gap: 16,
              alignItems: fontScale > 1.4 ? 'flex-start' : 'center',
            }}
          >
            <Poster
              media={item.media}
              width={118}
              onPress={() =>
                router.push({
                  pathname: '/media/[id]',
                  params: {
                    id: item.media.id,
                    requestId: item.requestId,
                    itemId: item.itemId,
                    servedAt: startedAt,
                  },
                })
              }
            />
            <View style={{ flex: 1, gap: 6 }}>
              <Heading>{item.media.title}</Heading>
              <Body muted style={s.caption}>
                {item.reason}
              </Body>
              <Body muted style={s.caption}>
                {item.media.year ?? 'Year unknown'}
                {item.media.kind === 'movie'
                  ? ` · ${item.media.runtimeMinutes === null ? 'Runtime unknown' : `${item.media.runtimeMinutes} min`}`
                  : ' · TV'}
              </Body>
            </View>
          </View>
          <SheetControl
            title={`Options for ${item.media.title}`}
            label="Title options"
            accessibilityLabel={`Options for ${item.media.title}`}
          >
            <Body muted style={s.caption}>
              Not tonight skips this visit. Not interested hides this recommendation until restored,
              without changing your rating.
            </Body>
            <Chip
              label="Not tonight"
              selected={false}
              onPress={() => setExcluded(new Set([...excluded, item.media.id]))}
            />
            <Chip
              label="Not interested"
              selected={false}
              onPress={() => {
                if (busy) return;
                setError(null);
                void mutate(
                  (state) => dismissRecommendation(state, item, new Date().toISOString()),
                  'recommendation dismissal',
                ).catch(() => setError('Your feedback could not be saved. Try again.'));
              }}
            />
            <Chip
              label="Already seen"
              selected={false}
              onPress={() =>
                router.push({
                  pathname: '/log/[id]',
                  params: { id: item.media.id, historical: 'true' },
                })
              }
            />
          </SheetControl>
        </View>
      ))}
      {!picks.length && (
        <EmptyState
          title="No picks fit right now"
          message={
            servicesOnly && !library.selectedProviders.length
              ? 'Choose a subscription listing, or turn off the service filter.'
              : 'Try another format, allow more time, or browse Discover for more titles. Your filters have not changed.'
          }
          action={
            <Button
              label="Clear filters"
              secondary
              onPress={() => {
                setMinutes('any');
                setServicesOnly(false);
                setWatchlistOnly(false);
                setExcluded(new Set());
              }}
            />
          }
        />
      )}
      <Button
        label="Something different"
        secondary
        disabled={!picks.length}
        onPress={() => {
          setExcluded(new Set([...excluded, ...picks.map((i) => i.media.id)]));
          setRound(round + 1);
        }}
      />
      {excluded.size > 0 && (
        <Button
          label="Bring back tonight’s skipped titles"
          secondary
          onPress={() => setExcluded(new Set())}
        />
      )}
      <UndoActions labels={['recommendation dismissal', 'restored recommendation']} />
      {library.dismissals.length > 0 && (
        <SheetControl title={`Hidden recommendations · ${library.dismissals.length}`}>
          {library.dismissals.slice(pageIndex * 10, pageIndex * 10 + 10).map((dismissal) => (
            <Button
              key={dismissal.mediaId}
              label={`Restore ${catalog.find((m) => m.id === dismissal.mediaId)?.title ?? 'hidden title'}`}
              secondary
              disabled={busy}
              onPress={() => {
                setError(null);
                void mutate(
                  (state) => ({
                    ...state,
                    revision: state.revision + 1,
                    dismissals: state.dismissals.filter((d) => d.mediaId !== dismissal.mediaId),
                  }),
                  'restored recommendation',
                ).catch(() => setError('This recommendation could not be restored. Try again.'));
              }}
            />
          ))}
          {library.dismissals.length > 10 && (
            <View style={{ gap: 8 }}>
              <Body muted style={s.caption}>
                Page {pageIndex + 1} of {Math.ceil(library.dismissals.length / 10)}
              </Body>
              <Button
                label="Previous hidden titles"
                secondary
                disabled={pageIndex === 0}
                onPress={() => setHiddenPage(pageIndex - 1)}
              />
              <Button
                label="Next hidden titles"
                secondary
                disabled={(pageIndex + 1) * 10 >= library.dismissals.length}
                onPress={() => setHiddenPage(pageIndex + 1)}
              />
            </View>
          )}
        </SheetControl>
      )}
    </Screen>
  );
}
