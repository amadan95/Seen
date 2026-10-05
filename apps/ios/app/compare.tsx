import { useRef, useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, View, useWindowDimensions } from 'react-native';
import type { ComparisonAnswer, Media } from '@seen/contracts';
import { answerComparison, buildSnapshot, confirmSeenEnough, pickComparison } from '@seen/domain';
import { useLibrary } from '../src/local/LibraryProvider';
import { Body, Button, EmptyState, Heading, InlineError, Screen, s } from '../src/components/ui';
import { Poster } from '../src/components/Poster';

export default function Compare() {
  const params = useLocalSearchParams<{ kind?: string; target?: string; mode?: string }>(),
    kind = params.kind === 'tv' ? 'tv' : 'movie',
    placement = params.mode === 'placement' && Boolean(params.target);
  const { library, mutate, busy, snapshot, catalog } = useLibrary(),
    { width, fontScale } = useWindowDimensions();
  const [steps, setSteps] = useState(0),
    [excluded, setExcluded] = useState(new Set<string>()),
    [error, setError] = useState<string | null>(null);
  const [undo, setUndo] = useState<{
    eventId: string;
    pairKey: string;
    previousExcluded: Set<string>;
    steps: number;
  } | null>(null);
  const inFlight = useRef(false);
  const targetMedia = catalog.find((media) => media.id === params.target);
  const targetOpinion = library.opinions.find((opinion) => opinion.mediaId === params.target);
  const needsConfirmation =
    placement && kind === 'tv' && targetOpinion?.sentiment && !targetOpinion.seenEnough;
  const pair =
    !needsConfirmation && (placement || steps < 3)
      ? pickComparison(catalog, library, kind, excluded, params.target)
      : null;
  function openRankings(placed = false, revision?: number) {
    router.dismissAll();
    router.replace({
      pathname: '/(tabs)/rank',
      params: {
        kind,
        ...(placed
          ? { placed: params.target, placementRevision: String(revision ?? library.revision) }
          : {}),
      },
    });
  }
  async function confirmTv() {
    if (!params.target || busy || inFlight.current) return;
    inFlight.current = true;
    setError(null);
    try {
      await mutate((state) => confirmSeenEnough(state, catalog, params.target!));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Confirmation could not save. Try again.');
    } finally {
      inFlight.current = false;
    }
  }
  async function answer(value: ComparisonAnswer) {
    if (!pair || busy || inFlight.current) return;
    inFlight.current = true;
    setError(null);
    const key = [pair[0].id, pair[1].id].sort().join('|'),
      eventId = `pair-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try {
      const next = await mutate((state) =>
        answerComparison(state, catalog, pair[0].id, pair[1].id, value, eventId),
      );
      setUndo({ eventId, pairKey: key, previousExcluded: new Set(excluded), steps });
      setExcluded(new Set([...excluded, key]));
      setSteps(steps + 1);
      if (placement && value !== 'skip' && value !== 'undecided') {
        const placed = buildSnapshot(catalog, next, kind).items.find(
          (item) => item.mediaId === params.target,
        );
        if (placed?.rankScore !== null && placed?.rankScore !== undefined)
          openRankings(true, next.revision);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Answer could not be saved. Try again.');
    } finally {
      inFlight.current = false;
    }
  }
  async function undoAnswer() {
    if (!undo || busy) return;
    setError(null);
    try {
      await mutate((state) => ({
        ...state,
        revision: state.revision + 1,
        comparisons: state.comparisons.filter((c) => c.id !== undo.eventId),
      }));
      setExcluded(undo.previousExcluded);
      setSteps(undo.steps);
      setUndo(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Undo failed. Try again.');
    }
  }
  const stacked = fontScale > 1.4,
    posterWidth = stacked ? Math.min(width - 40, 240) : Math.min((width - 72) / 2, 170);
  function choice(media: Media, value: ComparisonAnswer) {
    return (
      <View key={media.id} style={{ width: posterWidth, gap: 10, alignItems: 'center' }}>
        <Poster
          media={media}
          width={posterWidth}
          accessibilityLabel={`I enjoyed ${media.title} more`}
          disabled={busy}
          onPress={() => void answer(value)}
        />
        <Pressable
          disabled={busy}
          onPress={() => void answer(value)}
          accessible={false}
          focusable={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ gap: 10, alignItems: 'center', width: posterWidth }}
        >
          <Body style={[s.editorial, { fontSize: 20, lineHeight: 26, textAlign: 'center' }]}>
            {media.title}
          </Body>
          <Body muted style={s.caption}>
            {media.year ?? 'Year unknown'}
          </Body>
        </Pressable>
      </View>
    );
  }
  const targetRank = params.target
    ? snapshot(kind).items.find((i) => i.mediaId === params.target)
    : undefined;
  return (
    <Screen>
      <Stack.Screen options={{ gestureEnabled: !placement }} />
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <Body muted>
          {placement
            ? `Placing ${targetMedia?.title ?? 'your title'}`
            : `${Math.min(steps + 1, 3)} of up to 3`}
        </Body>
        <Button
          label={placement ? 'Finish later' : 'Done'}
          secondary
          onPress={() => (placement ? openRankings() : router.back())}
        />
      </View>
      {needsConfirmation ? (
        <EmptyState
          title="Have you seen enough to rank it?"
          message={`Your watch for ${targetMedia?.title ?? 'this show'} is saved. Confirm that you have seen enough of the show to compare it with other TV titles.`}
          action={
            <Button
              label="Yes, compare this show"
              disabled={busy}
              onPress={() => void confirmTv()}
            />
          }
        />
      ) : pair ? (
        <>
          <View style={{ gap: 10, marginVertical: 12 }}>
            <Heading large>Which did you enjoy more?</Heading>
            <Body muted>Tap a poster to choose.</Body>
            {placement && (
              <Body muted style={s.caption}>
                Your watch is saved. Compare {targetMedia?.title} to place it in your ranking.
              </Body>
            )}
          </View>
          <View
            style={{
              flexDirection: stacked ? 'column' : 'row',
              gap: 32,
              justifyContent: 'center',
              alignItems: stacked ? 'center' : 'flex-start',
            }}
          >
            {choice(pair[0], 'a_wins')}
            {choice(pair[1], 'b_wins')}
          </View>
          <Button
            label="About the same"
            secondary
            disabled={busy}
            onPress={() => void answer('similar')}
          />
          <View style={s.row}>
            <Button
              label="Can’t decide"
              secondary
              style={{ flex: 1 }}
              disabled={busy}
              onPress={() => void answer('undecided')}
            />
            <Button
              label="Skip"
              secondary
              style={{ flex: 1 }}
              disabled={busy}
              onPress={() => void answer('skip')}
            />
          </View>
          <Body muted style={[s.caption, { textAlign: 'center' }]}>
            A few comparisons refine your list. Scores stay hidden while you choose.
          </Body>
        </>
      ) : (
        <EmptyState
          title={
            placement && targetRank?.rankScore !== null && targetRank?.rankScore !== undefined
              ? 'Your title is already ranked'
              : placement
                ? 'One more title makes a comparison'
                : steps >= 3
                  ? 'Your list feels a little more like you'
                  : 'No useful comparisons right now'
          }
          message={
            placement && targetRank?.rankScore !== null && targetRank?.rankScore !== undefined
              ? 'Your saved score is ready in your ranking.'
              : placement
                ? steps > 0
                  ? 'None of the remaining pairs can place this title yet. Try the skipped pairs again, or log another title of the same format. Your watch is saved.'
                  : `Your watch is saved. Log another ${kind === 'movie' ? 'movie' : 'TV show you have seen enough of'} so a comparison can assign a score.`
                : steps >= 3
                  ? 'Your answers are saved on this device. Come back whenever you want to refine your list.'
                  : steps > 0
                    ? 'Your answer is saved. Log another title to create more pairs, or return to your list.'
                    : 'Log two titles of the same format. TV titles also need a sentiment and seen-enough confirmation.'
          }
          action={
            <View style={{ gap: 12 }}>
              {placement && excluded.size > 0 && (
                <Button
                  label="Try skipped pairs again"
                  secondary
                  onPress={() => setExcluded(new Set())}
                />
              )}
              <Button
                label="View your ranking"
                onPress={() => openRankings(Boolean(targetRank?.position))}
              />
            </View>
          }
        />
      )}
      {!needsConfirmation &&
        !pair &&
        targetRank?.rankScore !== null &&
        targetRank?.rankScore !== undefined && (
          <Body>
            Your score {targetRank.rankScore.toFixed(1)} / 10 · #{targetRank.position} ·{' '}
            {targetRank.evidence}
          </Body>
        )}
      <InlineError message={error} />
      {undo && (
        <Button
          label="Undo last answer"
          secondary
          icon="undo"
          disabled={busy}
          onPress={() => void undoAnswer()}
        />
      )}
      <Body muted style={s.caption}>
        Local comparison preview. Production comparisons will require an online, authorized session.
      </Body>
    </Screen>
  );
}
