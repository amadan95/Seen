import { router } from 'expo-router';
import { Button, EmptyState, Screen } from '../src/components/ui';
export default function NotFound() {
  return (
    <Screen>
      <EmptyState
        title="This page is unavailable"
        message="Return to your library to continue."
        action={<Button label="Go Home" onPress={() => router.replace('/')} />}
      />
    </Screen>
  );
}
