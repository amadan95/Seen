import { Stack } from 'expo-router/stack';
import { DarkTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LibraryProvider } from '../src/local/LibraryProvider';
import { colors } from '../src/design/tokens';

// THESIS: a quiet personal movie memory, following the supplied v2 boards.
// OWN-WORLD: charcoal, ivory, system typography, geometric preview posters.
// STORY: browse, save a sentiment, optionally compare, choose another watch.
// SIGNATURE: independent ordinal and automatic score, hidden while comparing.
// SCOPE: local preview; actual auth, social, catalog and sync remain gated.
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider
        value={{
          ...DarkTheme,
          colors: {
            ...DarkTheme.colors,
            background: colors.background,
            card: colors.background,
            text: colors.text,
            primary: colors.accent,
            border: colors.border,
          },
        }}
      >
        <LibraryProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.accent,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="media/[id]" options={{ title: '', headerBackTitle: 'Back' }} />
            <Stack.Screen name="search" options={{ title: 'Search', presentation: 'card' }} />
            <Stack.Screen
              name="log/[id]"
              options={{
                title: 'Log a watch',
                presentation: 'formSheet',
                sheetAllowedDetents: [0.9, 1],
                sheetGrabberVisible: true,
              }}
            />
            <Stack.Screen
              name="compare"
              options={{ title: 'Your ranking', presentation: 'modal' }}
            />
            <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          </Stack>
        </LibraryProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
