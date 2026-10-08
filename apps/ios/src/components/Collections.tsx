import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { removeCollection, saveCollection, setCollectionTitle } from '@seen/domain';
import { useLibrary } from '../local/LibraryProvider';
import { Body, Button, Chip, Disclosure, InlineError, s } from './ui';
import { SheetControl } from './Sheet';
import { UndoActions } from './UndoActions';
import { colors } from '../design/tokens';

export function Collections({
  mediaId,
  onSelect,
  embedded = false,
}: {
  mediaId?: string;
  embedded?: boolean;
  onSelect?: (id: string | null) => void;
}) {
  const { library, catalog, mutate, busy } = useLibrary();
  const [name, setName] = useState(''),
    [editing, setEditing] = useState<string | null>(null),
    [error, setError] = useState<string | null>(null);
  async function run(change: Parameters<typeof mutate>[0]) {
    setError(null);
    try {
      await mutate(change, 'collection change');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Try again.');
      return false;
    }
  }
  const content = (
    <>
      {onSelect && <Button label="All saved titles" secondary onPress={() => onSelect(null)} />}
      {!library.collections.length && (
        <Body muted>Create a collection for a mood or occasion.</Body>
      )}
      {library.collections.map((collection) => (
        <View
          key={collection.id}
          style={{
            gap: 8,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          {mediaId ? (
            <Chip
              label={collection.name}
              selected={collection.mediaIds.includes(mediaId)}
              onPress={() => {
                if (!busy)
                  void run((state) =>
                    setCollectionTitle(
                      state,
                      catalog,
                      collection.id,
                      mediaId,
                      !state.collections
                        .find((item) => item.id === collection.id)!
                        .mediaIds.includes(mediaId),
                    ),
                  );
              }}
            />
          ) : (
            <Button
              label={`${collection.name} · ${collection.mediaIds.length} titles`}
              secondary
              onPress={() => onSelect?.(collection.id)}
            />
          )}
          {!mediaId && (
            <View style={[s.row, { flexWrap: 'wrap' }]}>
              <Chip
                label={`Rename ${collection.name}`}
                selected={editing === collection.id}
                onPress={() => {
                  setEditing(collection.id);
                  setName(collection.name);
                }}
              />
              <Chip
                label={`Delete ${collection.name}`}
                selected={false}
                onPress={() => {
                  if (!busy)
                    void run((state) => removeCollection(state, collection.id)).then((ok) => {
                      if (ok) {
                        onSelect?.(null);
                        setEditing(null);
                        setName('');
                      }
                    });
                }}
              />
            </View>
          )}
        </View>
      ))}
      <TextInput
        accessibilityLabel="Collection name"
        placeholder={editing ? 'Rename collection' : 'New collection name'}
        placeholderTextColor={colors.muted}
        value={name}
        onChangeText={setName}
        maxLength={40}
        style={s.input}
      />
      <Button
        label={editing ? 'Save collection name' : 'Create collection'}
        disabled={busy || !name.trim()}
        onPress={() => {
          const id = editing ?? `collection-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          void run((state) => {
            const next = saveCollection(state, id, name);
            return mediaId ? setCollectionTitle(next, catalog, id, mediaId, true) : next;
          }).then((ok) => {
            if (ok) {
              setName('');
              setEditing(null);
            }
          });
        }}
      />
      {editing && (
        <Button
          label="Cancel rename"
          secondary
          onPress={() => {
            setName('');
            setEditing(null);
          }}
        />
      )}
      <UndoActions limit={1} />
      <Body muted style={s.caption}>
        Private on this device. Deleting a collection keeps its titles and notes.
      </Body>
      <InlineError message={error} />
    </>
  );
  return embedded ? (
    <Disclosure title="Collections">{content}</Disclosure>
  ) : (
    <SheetControl title="Collections" label={mediaId ? 'Add to collections' : 'Collections'}>
      {content}
    </SheetControl>
  );
}
