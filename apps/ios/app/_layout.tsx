import { Stack } from 'expo-router/stack';
import { DarkTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LibraryProvider } from '../src/local/LibraryProvider';
import { colors } from '../src/design/tokens';

// THESIS: a private film journal in the user's approved Festival Programme world.
// OWN-WORLD: plum, cream Georgia headings, fine rules and poster-led programme rows.
// STORY: discover, save a sentiment, compare until scored, return to a personal ranking.
// FIRST VIEWPORT: Home uses A's cropped feature and rail in B's typography and palette.
// FORM: user-pinned B, with the explicitly requested A Home composition.
// FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md.
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
