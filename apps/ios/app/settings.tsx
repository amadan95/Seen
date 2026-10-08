import { useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { sampleLibrary } from '@seen/fixtures';
import { emptyLibrary } from '@seen/domain';
import { useLibrary } from '../src/local/LibraryProvider';
import { Body, Button, Heading, InlineError, Screen, Section, s } from '../src/components/ui';
import { colors } from '../src/design/tokens';
import { TmdbLogo } from '../src/components/TmdbLogo';

export default function Settings() {
  const { library, mutate, busy, mediaById } = useLibrary(),
    [error, setError] = useState<string | null>(null),
    [exported, setExported] = useState(false);
  function replace(sample: boolean) {
    setError(null);
    void mutate(() =>
      sample
        ? sampleLibrary()
        : { ...emptyLibrary(), onboarded: true, revision: library.revision + 1 },
    ).catch((e) => setError(e instanceof Error ? e.message : 'Change failed. Try again.'));
  }
  function confirm(sample: boolean) {
    const title = sample ? 'Replace with sample history?' : 'Clear this local library?';
    const message =
      'This replaces logs, private notes, collections, comparisons, and saved titles on this device.';
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n${message}`)) replace(sample);
    } else
      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace', style: 'destructive', onPress: () => replace(sample) },
      ]);
  }
  async function exportData() {
    setError(null);
    const contents = JSON.stringify(
      {
        ...library,
        opinions: library.opinions.map((o) => ({ ...o, title: mediaById.get(o.mediaId)?.title })),
      },
      null,
      2,
    );
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'seen-local-library.json';
      a.click();
      URL.revokeObjectURL(url);
      setExported(true);
    } else {
      const { Share } = await import('react-native');
      try {
        await Share.share({ message: contents, title: 'Seen local library export' });
        setExported(true);
      } catch {
        setError('Export could not be shared. Try again.');
      }
    }
  }
  return (
    <Screen inStack>
      <Heading large>Make it yours.</Heading>
      <Section title="Account">
        <Body>Local preview · no signed-in account</Body>
        <Body muted>
          Apple sign-in and email authentication are in the next implementation phases.
        </Body>
      </Section>
      <Section title="Privacy">
        <View style={{ backgroundColor: colors.surface, padding: 16, borderRadius: 12, gap: 8 }}>
          <Body>History, notes, and watchlist: private</Body>
          <Body muted style={s.caption}>
            Stored locally on this device. No social sharing or remote sync is active. Device
            backups may include this data.
          </Body>
        </View>
      </Section>
      <Section title="Services and region">
        <Body>United States</Body>
        <Body muted>
          Viewing options use the United States region. Selected-service filters are planned for a
          later release.
        </Body>
      </Section>
      <Section title="Local data">
        <Button
          label="Export local library"
          secondary
          disabled={busy}
          onPress={() => void exportData()}
        />
        {exported && <Body muted>Export prepared.</Body>}
        <Button
          label="Load sample history"
          secondary
          disabled={busy}
          onPress={() => confirm(true)}
        />
        <Button
          label="Clear local library"
          secondary
          disabled={busy}
          onPress={() => confirm(false)}
        />
        <InlineError message={error} />
      </Section>
      <Section title="About Seen">
        <Body>Version 0.1.0 · development preview</Body>
        <Body muted style={s.caption}>
          Sample titles use original abstract art. Live title metadata and images are supplied by
          TMDB. The app icon is an existing ImageGen concept; final icon approval is pending.
        </Body>
        <Body muted style={s.caption}>
          Rank Scores are personal indices derived from comparisons, not critic ratings. Hosted
          catalog, Supabase authentication, server ranking, offline sync, moderation, and account
          deletion are release gates.
        </Body>
        <TmdbLogo />
        <Body muted style={s.caption}>
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </Body>
      </Section>
    </Screen>
  );
}
