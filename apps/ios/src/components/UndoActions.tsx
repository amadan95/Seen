import { useState } from 'react';
import { View } from 'react-native';
import { useLibrary } from '../local/LibraryProvider';
import { Button, InlineError } from './ui';

export function UndoActions({ limit = 2 }: { limit?: number }) {
  const { library, undo, busy } = useLibrary();
  const [error, setError] = useState<string | null>(null);
  const receipts = library.undoReceipts.slice(-limit).reverse();
  if (!receipts.length) return null;
  return (
    <View style={{ gap: 8 }}>
      {receipts.map((receipt) => (
        <Button
          key={receipt.id}
          label={`Undo ${receipt.label}`}
          secondary
          icon="undo"
          disabled={busy}
          onPress={() => {
            setError(null);
            void undo(receipt.id).catch((e: unknown) =>
              setError(e instanceof Error ? e.message : 'Undo could not save. Try again.'),
            );
          }}
        />
      ))}
      <InlineError message={error} />
    </View>
  );
}
