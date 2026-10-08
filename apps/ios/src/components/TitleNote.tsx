import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { setTitleNote } from '@seen/domain';
import { useLibrary } from '../local/LibraryProvider';
import { colors } from '../design/tokens';
import { Sheet, TextAction } from './Sheet';
import { Body, Button, InlineError, s } from './ui';

export function TitleNote({ mediaId }: { mediaId: string }) {
  const { library, catalog, mutate, busy } = useLibrary();
  const stored = (library.notes ?? []).find((note) => note.mediaId === mediaId);
  const legacy = [...library.logs].reverse().find((log) => log.mediaId === mediaId)?.note ?? '';
  const savedText = stored?.text ?? legacy;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(savedText);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const saving = useRef(false);
  async function save() {
    if (busy || saving.current) return;
    saving.current = true;
    setError(null);
    try {
      await mutate((state) =>
        setTitleNote(state, catalog, mediaId, draft, new Date().toISOString()),
      );
      setSaved(true);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your note could not save. Try again.');
    } finally {
      saving.current = false;
    }
  }
  return (
    <View style={{ gap: 10 }}>
      {Boolean(savedText) && !editing && (
        <Body muted numberOfLines={3}>
          {savedText}
        </Body>
      )}
      {!editing && (
        <TextAction
          label={savedText ? 'Edit private note' : 'Add a private note'}
          disabled={busy}
          onPress={() => {
            setDraft(savedText);
            setEditing(true);
            setSaved(false);
            setError(null);
          }}
        />
      )}
      <Sheet
        title="Private note"
        visible={editing}
        onClose={() => {
          if (!busy) setEditing(false);
        }}
      >
        <TextInput
          accessibilityLabel="Private title note"
          placeholder="What will you remember?"
          placeholderTextColor={colors.muted}
          multiline
          maxLength={280}
          value={draft}
          onChangeText={setDraft}
          style={[s.input, { minHeight: 110, textAlignVertical: 'top' }]}
        />
        <Body muted style={s.caption}>
          {draft.length}/280 · Private · saved on this device
        </Body>
        <Button label="Save note" disabled={busy} onPress={() => void save()} />
        <Button
          label="Cancel note edit"
          secondary
          disabled={busy}
          onPress={() => {
            setEditing(false);
            setError(null);
          }}
        />
        <InlineError message={error} />
      </Sheet>
      {saved && (
        <Body muted accessibilityLiveRegion="polite" style={s.caption}>
          {savedText ? 'Note saved' : 'Note cleared'}
        </Body>
      )}
    </View>
  );
}
