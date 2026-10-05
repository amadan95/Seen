import { useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, View, useWindowDimensions } from 'react-native';
import type { ComparisonAnswer, Media } from '@seen/contracts';
import { answerComparison, pickComparison } from '@seen/domain';
import { useLibrary } from '../src/local/LibraryProvider';
import { Body, Button, EmptyState, Heading, InlineError, Screen, s } from '../src/components/ui';
import { Poster } from '../src/components/Poster';

export default function Compare() {
  const params = useLocalSearchParams<{ kind?: string; target?: string }>(),
    kind = params.kind === 'tv' ? 'tv' : 'movie';
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
  const pair = steps < 3 ? pickComparison(catalog, library, kind, excluded, params.target) : null;
  async function answer(value: ComparisonAnswer) {
    if (!pair || busy || inFlight.current) return;
    inFlight.current = true;
    setError(null);
    const key = [pair[0].id, pair[1].id].sort().join('|'),
      eventId = `pair-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try {
      await mutate((state) =>
        answerComparison(state, catalog, pair[0].id, pair[1].id, value, eventId),
      );
      setUndo({ eventId, pairKey: key, previousExcluded: new Set(excluded), steps });
      setExcluded(new Set([...excluded, key]));
      setSteps(steps + 1);
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
    posterWidth = stacked ? Math.min(width - 40, 240) : (width - 54) / 2;
  function choice(media: Media, value: ComparisonAnswer) {
    return (
      <Pressable
        key={media.id}
        accessibilityRole="button"
        accessibilityLabel={`I enjoyed ${media.title} more`}
        disabled={busy}
        onPress={() => void answer(value)}
        style={{ width: posterWidth, gap: 10, alignItems: 'center' }}
      >
        <Poster media={media} width={posterWidth} />
        <Body style={{ fontWeight: '600', textAlign: 'center' }}>{media.title}</Body>
        <Body muted style={s.caption}>
          {media.year ?? 'Year unknown'}
        </Body>
      </Pressable>
    );
  }
  const targetRank = params.target
    ? snapshot(kind).items.find((i) => i.mediaId === params.target)
    : undefined;
  return (
    <Screen>
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <Body muted>{Math.min(steps + 1, 3)} of up to 3</Body>
        <Button label="Done" secondary onPress={() => router.back()} />
      </View>
      {pair ? (
        <>
          <View style={{ gap: 10, marginVertical: 12 }}>
            <Heading large>Which did you enjoy more?</Heading>
            <Body muted>Tap a poster to choose.</Body>
          </View>
          <View
            style={{
              flexDirection: stacked ? 'column' : 'row',
              gap: 14,
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
            steps >= 3
              ? 'Your list feels a little more like you'
              : 'No useful comparisons right now'
          }
          message={
            steps >= 3
              ? 'Your answers are saved on this device. Come back whenever you want to refine your list.'
              : steps > 0
                ? 'Your answer is saved. Log another title to create more pairs, or return to your list.'
                : 'Log two titles of the same format. TV titles also need a sentiment and seen-enough confirmation.'
          }
          action={
            <Button label="Back to your list" onPress={() => router.replace('/(tabs)/rank')} />
          }
        />
      )}
      {!pair && targetRank?.rankScore !== null && targetRank?.rankScore !== undefined && (
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
