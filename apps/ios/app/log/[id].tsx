import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { AppState, Switch, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { recommendationContextSchema } from '@seen/contracts';
import type { LogDraft, Sentiment, TvStatus } from '@seen/contracts';
import { saveLog } from '@seen/domain';
import { useLibrary } from '../../src/local/LibraryProvider';
import {
  Body,
  Button,
  EmptyState,
  Heading,
  InlineError,
  Screen,
  Segments,
  s,
} from '../../src/components/ui';
import { UndoActions } from '../../src/components/UndoActions';
import { Poster } from '../../src/components/Poster';
import { Icon } from '../../src/components/Icon';
import { colors } from '../../src/design/tokens';

export default function LogScreen() {
  const {
      id,
      historical: historicalParam,
      requestId,
      itemId,
      servedAt,
    } = useLocalSearchParams<{
      id: string;
      historical?: string;
      requestId?: string;
      itemId?: string;
      servedAt?: string;
    }>(),
    { library, mutate, busy, catalog, mediaById } = useLibrary(),
    media = mediaById.get(id);
  const opinion = library.opinions.find((o) => o.mediaId === id),
    latest = [...library.logs].reverse().find((l) => l.mediaId === id),
    draft = library.logDrafts.find((d) => d.mediaId === id);
  const [sentiment, setSentiment] = useState<Sentiment | null>(opinion?.sentiment ?? null),
    [status, setStatus] = useState<TvStatus>(draft?.status ?? opinion?.status ?? 'watching');
  const [enough, setEnough] = useState(draft?.seenEnough ?? opinion?.seenEnough ?? false),
    [details, setDetails] = useState(Boolean(draft)),
    [historical, setHistorical] = useState(
      draft?.historical ?? latest?.historical ?? historicalParam === 'true',
    );
  const [rewatch, setRewatch] = useState(draft?.rewatch ?? false),
    [date, setDate] = useState(draft?.watchedOn ?? latest?.watchedOn ?? ''),
    [note, setNote] = useState(
      draft?.note ??
        (library.notes ?? []).find((item) => item.mediaId === id)?.text ??
        latest?.note ??
        '',
    );
  const [saved, setSaved] = useState(false),
    [error, setError] = useState<string | null>(null);
  const saving = useRef(false),
    savedRef = useRef(false);
  const draftValue: LogDraft = {
    mediaId: id,
    status,
    seenEnough: enough,
    watchedOn: date,
    historical,
    rewatch,
    note,
  };
  const draftRef = useRef(draftValue);
  draftRef.current = draftValue;
  const originalDraft = useRef(JSON.stringify(draftValue));
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  async function preserveDraft() {
    if (
      saving.current ||
      savedRef.current ||
      JSON.stringify(draftRef.current) === originalDraft.current
    )
      return;
    const value = draftRef.current;
    await mutate((state) => ({
      ...state,
      logDrafts: [...state.logDrafts.filter((d) => d.mediaId !== id), value],
    }));
    originalDraft.current = JSON.stringify(value);
  }
  useEffect(() => {
    savedRef.current = saved;
    if (saved) return;
    draftTimer.current = setTimeout(() => {
      void preserveDraft().catch(() =>
        setError('Your draft could not be saved. Keep this screen open and try again.'),
      );
    }, 400);
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
  }, [status, enough, date, historical, rewatch, note, saved]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      if (state !== 'active') void preserveDraft().catch(() => undefined);
    });
    return () => {
      listener.remove();
      void preserveDraft().catch(() => undefined);
    };
  }, []);
  if (!media)
    return (
      <Screen inStack>
        <EmptyState title="Title unavailable" message="Go back and choose a title from Discover." />
      </Screen>
    );
  async function save(value: Sentiment | null, compare = false) {
    if (!media || busy || saving.current) return;
    saving.current = true;
    setError(null);
    try {
      await mutate(
        (state) =>
          saveLog(
            state,
            catalog,
            {
              mediaId: id,
              sentiment: value,
              status: media.kind === 'tv' ? status : null,
              seenEnough: media.kind === 'movie' || enough,
              watchedOn: date || null,
              historical,
              rewatch,
              note,
              recommendation: recommendationContextSchema.safeParse({ requestId, itemId, servedAt })
                .success
                ? recommendationContextSchema.parse({ requestId, itemId, servedAt })
                : undefined,
            },
            `log-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            new Date().toISOString(),
          ),
        'saved watch',
      );
      setSentiment(value);
      setSaved(true);
      savedRef.current = true;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      if (compare && value)
        router.replace({
          pathname: '/compare',
          params: { kind: media.kind, target: id, mode: 'placement' },
        });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Try again.');
    } finally {
      saving.current = false;
    }
  }
  return (
    <Screen inStack>
      <View style={s.row}>
        <Poster media={media} width={110} compact />
        <View style={{ flex: 1, gap: 4 }}>
          <Heading>{media.title}</Heading>
          <Body muted>
            {opinion && !rewatch ? 'Edit your latest watch' : 'Log what you watched'}
          </Body>
        </View>
      </View>
      <Heading large>How was it?</Heading>
      {media.kind === 'tv' && (
        <View style={{ gap: 12 }}>
          <Heading>Where are you with this show?</Heading>
          <Segments
            options={[
              { value: 'watching', label: 'Watching' },
              { value: 'caught_up', label: 'Caught up' },
            ]}
            value={status}
            onChange={(value) => {
              setStatus(value);
              setSaved(false);
            }}
          />
          <Segments
            options={[
              { value: 'finished', label: 'Finished' },
              { value: 'dropped', label: 'Dropped' },
            ]}
            value={status}
            onChange={(value) => {
              setStatus(value);
              setSaved(false);
            }}
          />
          <View style={[s.row, { justifyContent: 'space-between' }]}>
            <Body style={{ flex: 1 }}>I’ve seen enough to rank it</Body>
            <Switch
              accessibilityLabel="I’ve seen enough to rank this show"
              value={enough}
              onValueChange={(value) => {
                setEnough(value);
                setSaved(false);
              }}
              trackColor={{ true: colors.accent }}
            />
          </View>
          <Body muted style={s.caption}>
            Status alone doesn’t imply a sentiment. You can save without ranking.
          </Body>
        </View>
      )}
      <Body muted>
        {media.kind === 'movie'
          ? 'Choose your sentiment. Your watch saves before comparisons begin.'
          : 'Sentiment is optional. Tap to save your status and opinion.'}
      </Body>
      <View style={{ gap: 10 }}>
        {(['liked', 'fine', 'disliked'] as const).map((value) => (
          <View key={value} style={{ width: '100%' }}>
            <Button
              icon={value}
              label={value === 'liked' ? 'Liked' : value === 'fine' ? 'Fine' : 'Disliked'}
              secondary={sentiment !== value}
              disabled={busy}
              onPress={() => void save(value, true)}
            />
          </View>
        ))}
      </View>
      {media.kind === 'tv' && !saved && (
        <Button
          label="Save show status"
          secondary
          disabled={busy}
          onPress={() => void save(sentiment)}
        />
      )}
      {busy && (
        <Body muted accessibilityLiveRegion="polite">
          Saving on this device…
        </Body>
      )}
      <InlineError message={error} />
      <UndoActions />
      {draft && !saved && (
        <Body muted style={s.caption}>
          Your unfinished details were restored. They are a draft until you save your watch.
        </Body>
      )}
      {saved && (
        <View style={[s.row, { padding: 14, backgroundColor: colors.surface, borderRadius: 12 }]}>
          <Icon name="check" color={colors.success} />
          <Body accessibilityLiveRegion="polite" style={{ flex: 1 }}>
            Saved on this device
          </Body>
        </View>
      )}
      <Button
        label={details ? 'Hide details' : 'Details · date, rewatch, private note'}
        secondary
        onPress={() => setDetails(!details)}
      />
      {details && (
        <View style={{ gap: 14 }}>
          <View style={[s.row, { justifyContent: 'space-between' }]}>
            <Body style={{ flex: 1 }}>Historical watch</Body>
            <Switch
              accessibilityLabel="Historical watch"
              value={historical}
              onValueChange={(value) => {
                setHistorical(value);
                setSaved(false);
              }}
            />
          </View>
          {opinion && (
            <View style={[s.row, { justifyContent: 'space-between' }]}>
              <Body style={{ flex: 1 }}>Add a separate rewatch</Body>
              <Switch
                accessibilityLabel="Add a separate rewatch"
                value={rewatch}
                onValueChange={(value) => {
                  setRewatch(value);
                  setSaved(false);
                }}
              />
            </View>
          )}
          <Body>Watch date (optional)</Body>
          <TextInput
            accessibilityLabel="Watch date YYYY-MM-DD"
            placeholder="YYYY-MM-DD · leave blank if unknown"
            placeholderTextColor={colors.muted}
            value={date}
            onChangeText={(value) => {
              setDate(value);
              setSaved(false);
            }}
            style={s.input}
            autoCorrect={false}
          />
          <Body>Private note</Body>
          <TextInput
            accessibilityLabel="Private note"
            placeholder="What will you remember?"
            placeholderTextColor={colors.muted}
            multiline
            maxLength={280}
            value={note}
            onChangeText={(value) => {
              setNote(value);
              setSaved(false);
            }}
            style={[s.input, { minHeight: 90, textAlignVertical: 'top' }]}
          />
          <Body muted style={s.caption}>
            {note.length}/280 · stays on this device
          </Body>
          <Button
            label="Save details"
            disabled={busy || (media.kind === 'movie' && !sentiment)}
            onPress={() => void save(sentiment)}
          />
        </View>
      )}
      {saved && sentiment && (media.kind === 'movie' || enough) && (
        <Button
          label="Place in ranking"
          icon="rank"
          onPress={() =>
            router.replace({
              pathname: '/compare',
              params: { kind: media.kind, target: id, mode: 'placement' },
            })
          }
        />
      )}
      <Button
        label="Done"
        secondary
        onPress={() => {
          if (draftTimer.current) clearTimeout(draftTimer.current);
          void preserveDraft()
            .then(() => router.back())
            .catch(() => setError('Your draft could not be saved. Try again before closing.'));
        }}
      />
      <Body muted style={[s.caption, { textAlign: 'center' }]}>
        {saved
          ? 'Your watch is saved. Comparisons place it in your ranking.'
          : 'Choose a sentiment to save your watch and start comparing.'}
      </Body>
    </Screen>
  );
}
