import { TextAction } from '../src/components/Sheet';
import { useEffect, useRef, useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, View, useWindowDimensions } from 'react-native';
import type { ComparisonAnswer, Media } from '@seen/contracts';
import {
  answerSession,
  confirmSeenEnough,
  openComparisonSession,
  offerComparison,
  rankingInputKey,
  retrySkippedPairs,
} from '@seen/domain';
import { useLibrary } from '../src/local/LibraryProvider';
import { Body, Button, EmptyState, Heading, InlineError, Screen, s } from '../src/components/ui';
import { UndoActions } from '../src/components/UndoActions';
import { Poster } from '../src/components/Poster';

export default function Compare() {
  const params = useLocalSearchParams<{ kind?: string; target?: string; mode?: string }>(),
    placement = params.mode === 'placement' && Boolean(params.target);
  const { library, mutate, busy, snapshot, catalog, rankingState, retryRanking } = useLibrary(),
    { width, fontScale } = useWindowDimensions();
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const targetMedia = catalog.find((media) => media.id === params.target);
  const kind = targetMedia?.kind ?? (params.kind === 'tv' ? 'tv' : 'movie');
  const mode = placement ? 'placement' : 'refine';
  const [sessionId] = useState(
    () =>
      library.comparisonSessions.find(
        (s) =>
          s.kind === kind &&
          s.target === params.target &&
          s.mode === mode &&
          (placement || s.steps < 3),
      )?.id ?? `session-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const session = library.comparisonSessions.find((s) => s.id === sessionId);
  const steps = session?.steps ?? 0;
  const targetOpinion = library.opinions.find((o) => o.mediaId === params.target);
  const needsConfirmation = Boolean(
    placement && kind === 'tv' && targetOpinion?.sentiment && !targetOpinion.seenEnough,
  );
  const rankState = rankingState(kind);
  const inputKey = rankingInputKey(catalog, library, kind);
  useEffect(() => {
    if (!session) {
      void mutate((state) =>
        openComparisonSession(state, kind, params.target, mode, sessionId),
      ).catch(() => setError('This comparison session could not be saved. Try reopening it.'));
      return;
    }
    if (
      needsConfirmation ||
      rankState.error ||
      (mode === 'refine' && session.steps >= 3) ||
      session.inputKey === inputKey
    )
      return;
    void mutate((state) =>
      offerComparison(
        state,
        catalog,
        sessionId,
        rankingState(kind).analysis,
        new Date().toISOString(),
      ),
    ).catch(() => setError('Your next pair could not be saved. Try reopening comparisons.'));
  }, [session, inputKey, needsConfirmation, rankState.error, catalog]);
  const offered = session?.inputKey === inputKey ? session.offered : null;
  const pair =
    !needsConfirmation && offered && (placement || steps < 3)
      ? ([catalog.find((m) => m.id === offered[0])!, catalog.find((m) => m.id === offered[1])!] as [
          Media,
          Media,
        ])
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
      await mutate(
        (state) => confirmSeenEnough(state, catalog, params.target!),
        'TV ranking eligibility',
      );
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
    const eventId = `pair-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try {
      const next = await mutate(
        (state) =>
          answerSession(state, catalog, sessionId, value, eventId, new Date().toISOString()),
        value === 'skip' || value === 'undecided' ? undefined : 'last comparison',
      );
      if (placement && value !== 'skip' && value !== 'undecided' && !rankingState(kind).error) {
        const placed = snapshot(kind).items.find((item) => item.mediaId === params.target);
        if (placed?.rankScore !== null && placed?.rankScore !== undefined)
          openRankings(true, next.revision);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Answer could not be saved. Try again.');
    } finally {
      inFlight.current = false;
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
    <Screen inStack>
      <Stack.Screen options={{ gestureEnabled: !placement }} />
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <Body muted style={{ flex: 1 }}>
          {placement
            ? `Placing ${targetMedia?.title ?? 'your title'}`
            : `${kind === 'tv' ? 'TV' : 'Movies'} · ${Math.min(steps + 1, 3)} of up to 3`}
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
      ) : !session ||
        (session.inputKey !== inputKey && !rankState.error && (placement || steps < 3)) ? (
        <Body muted>Preparing your next comparison…</Body>
      ) : pair ? (
        <>
          <View style={{ gap: 10, marginVertical: 12 }}>
            <Heading large>Which did you enjoy more?</Heading>
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
          <View style={[s.row, { flexWrap: 'wrap', justifyContent: 'center' }]}>
            <TextAction
              label="Can’t decide"
              disabled={busy}
              onPress={() => void answer('undecided')}
            />
            <TextAction label="Skip" disabled={busy} onPress={() => void answer('skip')} />
          </View>
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
              {placement && (session?.excluded.length ?? 0) > 0 && (
                <Button
                  label="Try skipped pairs again"
                  secondary
                  onPress={() => {
                    void mutate((state) => retrySkippedPairs(state, sessionId)).catch(() =>
                      setError('Could not retry these pairs. Try again.'),
                    );
                  }}
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
      <InlineError message={error ?? rankState.error} />
      {rankState.error && <Button label="Retry ranking" secondary onPress={retryRanking} />}
      {!session && <Body muted>Opening your saved comparison session…</Body>}
      <UndoActions labels={['saved watch', 'last comparison']} />
    </Screen>
  );
}
