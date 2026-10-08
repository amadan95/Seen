import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { SectionList, ScrollView, TextInput, View } from 'react-native';
import { journalEntries, viewingRecap, type JournalEntry } from '@seen/domain';
import { useLibrary } from '../src/local/LibraryProvider';
import {
  Body,
  Button,
  Heading,
  IconButton,
  PreviewNotice,
  Screen,
  Segments,
  Section,
  s,
} from '../src/components/ui';
import { SheetControl } from '../src/components/Sheet';
import { MediaRow, PosterTile } from '../src/components/Poster';
import { colors } from '../src/design/tokens';

export default function Profile() {
  const { library, snapshot, catalog, mediaById } = useLibrary();
  const [kind, setKind] = useState<'movie' | 'tv'>('movie'),
    [query, setQuery] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const top = snapshot(kind)
    .items.filter((i) => i.position !== null)
    .slice(0, 3);
  const entries = useMemo(() => journalEntries(library, catalog, query), [library, catalog, query]);
  const sections = [...new Set(entries.map((entry) => entry.month))].map((month) => ({
    title: month,
    data: entries.filter((entry) => entry.month === month),
  }));
  const recap = viewingRecap(library, catalog, year);
  const years = [
    ...new Set([
      new Date().getFullYear().toString(),
      ...library.logs.flatMap((log) => (log.watchedOn ? [log.watchedOn.slice(0, 4)] : [])),
    ]),
  ]
    .sort()
    .reverse();
  const recapFavorites = snapshot(kind)
    .items.filter((item) => item.rankScore !== null && recap.mediaIds.includes(item.mediaId))
    .slice(0, 5);
  function monthLabel(value: string) {
    return /^\d{4}-\d{2}$/.test(value)
      ? new Date(`${value}-01T12:00:00`).toLocaleDateString(undefined, {
          month: 'long',
          year: 'numeric',
        })
      : value;
  }
  return (
    <Screen
      inStack
      scroll={false}
      title="Your journal"
      action={
        <IconButton name="settings" label="Settings" onPress={() => router.push('/settings')} />
      }
    >
      <SectionList<JournalEntry>
        sections={sections}
        keyExtractor={(item) => item.key}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 80 }}
        ListHeaderComponent={
          <View style={{ gap: 16 }}>
            <Body muted style={s.caption}>
              Private · saved on this device
            </Body>
            <Section title="Favorites">
              <Segments
                options={[
                  { value: 'movie', label: 'Movies' },
                  { value: 'tv', label: 'TV' },
                ]}
                value={kind}
                onChange={setKind}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
              >
                {top.map((item) => (
                  <PosterTile
                    key={item.mediaId}
                    media={mediaById.get(item.mediaId)!}
                    width={106}
                    reason={`#${item.position} · ${item.rankScore?.toFixed(1)}`}
                  />
                ))}
              </ScrollView>
              {!top.length && <Body muted>Your ranked favorites will appear here.</Body>}
            </Section>
            <SheetControl title="Your year in film" label="View your yearly recap">
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {years.map((value) => (
                  <Button
                    key={value}
                    label={value}
                    secondary={year !== value}
                    onPress={() => setYear(value)}
                  />
                ))}
              </View>
              <Heading>{year}</Heading>
              <Body>
                {recap.movies} movie logs · {recap.tv} TV logs
              </Body>
              <Body muted>{recap.rewatches} rewatches included</Body>
              <Body muted style={s.caption}>
                Only watches dated in {year}. {recap.undated} undated watches are excluded. A TV log
                records a show watch, not completed seasons or episodes.
              </Body>
              <Heading>
                {kind === 'movie'
                  ? 'Movie favorites from this year'
                  : 'TV favorites from this year'}
              </Heading>
              {recapFavorites.map((item) => (
                <MediaRow key={item.mediaId} media={mediaById.get(item.mediaId)!} rank={item} />
              ))}
              {!recapFavorites.length && (
                <Body muted>No dated, ranked titles for this format yet.</Body>
              )}
              <Body muted style={s.caption}>
                Favorites use your current ranking; this is not a historical ranking snapshot.
              </Body>
            </SheetControl>
            <TextInput
              accessibilityLabel="Search your journal"
              placeholder="Search titles, dates and private notes"
              placeholderTextColor={colors.muted}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              clearButtonMode="while-editing"
              style={s.input}
            />
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={{ paddingTop: 24, paddingBottom: 8 }}>
            <Heading>{monthLabel(section.title)}</Heading>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={{ paddingBottom: 16 }}>
            <MediaRow media={mediaById.get(item.mediaId)!} />
            <Body muted style={s.caption}>
              {item.noteOnly
                ? 'Private note · not logged as watched'
                : `${item.watchedOn ?? 'Watch date unknown'}${item.rewatch ? ' · Rewatch' : ''}`}
            </Body>
            {Boolean(item.note) && (
              <Body muted numberOfLines={2} style={s.caption}>
                {item.note}
              </Body>
            )}
            {Boolean(item.watchNote) && item.watchNote !== item.note && (
              <Body muted numberOfLines={2} style={s.caption}>
                Watch note: {item.watchNote}
              </Body>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={{ paddingVertical: 24, gap: 12 }}>
            <Body muted>
              {query
                ? 'No titles or notes match your search.'
                : 'Your watches and private notes will appear here.'}
            </Body>
            <Button
              label={query ? 'Clear journal search' : 'Find a title'}
              secondary
              onPress={() => (query ? setQuery('') : router.push('/search'))}
            />
          </View>
        }
        ListFooterComponent={<PreviewNotice />}
      />
    </Screen>
  );
}
