import { Sheet, SheetControl, TextAction } from '../../src/components/Sheet';
import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { FlatList, View } from 'react-native';
import type { MediaKind, RankItem } from '@seen/contracts';
import { useLibrary } from '../../src/local/LibraryProvider';
import {
  Body,
  Button,
  Chip,
  EmptyState,
  Heading,
  InlineError,
  Screen,
  Segments,
} from '../../src/components/ui';
import { MediaRow } from '../../src/components/Poster';
import { UndoActions } from '../../src/components/UndoActions';
import { colors } from '../../src/design/tokens';

type Row = { type: 'title'; item: RankItem } | { type: 'unplaced' };
export default function Rank() {
  const params = useLocalSearchParams<{
    kind?: string;
    placed?: string;
    placementRevision?: string;
  }>();
  const { snapshot, mediaById, rankingState, retryRanking } = useLibrary();
  const [kind, setKind] = useState<MediaKind>('movie'),
    [limit, setLimit] = useState('10');
  const [genre, setGenre] = useState<string | null>(null),
    [about, setAbout] = useState(false),
    [pendingOpen, setPendingOpen] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);
  const list = useRef<FlatList<Row>>(null),
    scrolled = useRef('');
  const rowHeights = useRef(new Map<string, number>()),
    headerHeight = useRef(0),
    viewportHeight = useRef(0);
  const keyFor = (r: Row) => (r.type === 'title' ? r.item.mediaId : 'unplaced-heading');
  useEffect(() => {
    if (params.kind) setKind(params.kind === 'tv' ? 'tv' : 'movie');
    if (params.placed) {
      setGenre(null);
      setLimit('all');
      setHighlight(params.placed);
    }
    const timer = setTimeout(() => setHighlight(null), 5000);
    return () => clearTimeout(timer);
  }, [params.kind, params.placed, params.placementRevision]);
  const ranks = snapshot(kind),
    state = rankingState(kind);
  const placed = ranks.items.filter((i) => i.position !== null);
  const unplaced = ranks.items.filter(
    (i) => i.position === null && (!genre || mediaById.get(i.mediaId)?.genres.includes(genre)),
  );
  const visible = placed.filter(
    (i) =>
      (!genre || mediaById.get(i.mediaId)?.genres.includes(genre)) &&
      (limit === 'all' || i.position! <= Number(limit)),
  );
  const data: Row[] = [
    ...visible.map((item): Row => ({ type: 'title', item })),
    ...(unplaced.length
      ? [
          { type: 'unplaced' } as Row,
          ...(pendingOpen ? unplaced.map((item): Row => ({ type: 'title', item })) : []),
        ]
      : []),
  ];
  const added = ranks.items.find((i) => i.mediaId === params.placed && i.rankScore !== null);
  function showPlacement() {
    const token = `${params.placed}:${params.placementRevision}:${kind}`;
    if (!params.placed || scrolled.current === token || genre || limit !== 'all') return;
    const index = data.findIndex((r) => r.type === 'title' && r.item.mediaId === params.placed);
    if (index < 0) return;
    const measured = data.slice(0, index + 1).every((r) => rowHeights.current.has(keyFor(r)));
    if (!measured) {
      list.current?.scrollToIndex({ index, animated: false, viewPosition: 0.3 });
      return;
    }
    if (!headerHeight.current || !viewportHeight.current) return;
    scrolled.current = token;
    const offset =
      headerHeight.current +
      data.slice(0, index).reduce((sum, r) => sum + rowHeights.current.get(keyFor(r))!, 0);
    list.current?.scrollToOffset({
      offset: Math.max(0, offset - viewportHeight.current * 0.3),
      animated: false,
    });
  }
  return (
    <Screen scroll={false}>
      <Sheet title="About Rank Score" visible={about} onClose={() => setAbout(false)}>
        <Body>
          Your score / 10 comes from comparisons. Filters never change it. Early scores are
          provisional. Titles without comparison evidence remain unplaced.
        </Body>
      </Sheet>
      <FlatList
        ref={list}
        data={data}
        keyExtractor={keyFor}
        onLayout={(event) => {
          viewportHeight.current = event.nativeEvent.layout.height;
          requestAnimationFrame(showPlacement);
        }}
        contentContainerStyle={{ paddingBottom: 80 }}
        onContentSizeChange={showPlacement}
        onScrollToIndexFailed={({ index, averageItemLength }) => {
          list.current?.scrollToOffset({
            offset: Math.max(0, (index - 1) * averageItemLength),
            animated: false,
          });
        }}
        ListHeaderComponent={
          <View
            style={{ gap: 16 }}
            onLayout={(event) => {
              headerHeight.current = event.nativeEvent.layout.height;
              requestAnimationFrame(showPlacement);
            }}
          >
            <Heading large>Your rankings</Heading>
            {added && !state.error && (
              <Body accessibilityLiveRegion="polite">
                {mediaById.get(added.mediaId)?.title} has found a place ·{' '}
                {added.rankScore?.toFixed(1)} / 10 · #{added.position}
                {added.evidence === 'provisional' ? ' · Provisional' : ''}
              </Body>
            )}
            <UndoActions labels={['saved watch', 'last comparison']} />
            <InlineError message={state.error} />
            {state.error && <Button label="Retry ranking" secondary onPress={retryRanking} />}
            <Segments
              options={[
                { value: 'movie', label: 'Movies' },
                { value: 'tv', label: 'TV' },
              ]}
              value={kind}
              onChange={setKind}
            />
            <SheetControl
              title={`Filters · ${limit === 'all' ? 'All' : `Top ${limit}`}${genre ? ` · ${genre}` : ''}`}
            >
              <View style={{ gap: 8 }}>
                <Segments
                  options={[
                    { value: '10', label: 'Top 10' },
                    { value: '25', label: 'Top 25' },
                    { value: '50', label: 'Top 50' },
                    { value: 'all', label: 'All' },
                  ]}
                  value={limit}
                  onChange={setLimit}
                />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[...new Set(ranks.items.flatMap((i) => mediaById.get(i.mediaId)?.genres ?? []))]
                    .sort()
                    .map((g) => (
                      <Chip
                        key={g}
                        label={g}
                        selected={genre === g}
                        onPress={() => setGenre(genre === g ? null : g)}
                      />
                    ))}
                </View>
              </View>
            </SheetControl>
            <Button
              label="Refine your list"
              secondary
              icon="rank"
              onPress={() => router.push({ pathname: '/compare', params: { kind } })}
            />
          </View>
        }
        renderItem={({ item: row }) => (
          <View
            onLayout={(event) => {
              rowHeights.current.set(keyFor(row), event.nativeEvent.layout.height);
              requestAnimationFrame(showPlacement);
            }}
          >
            {row.type === 'unplaced' ? (
              <View style={{ gap: 8, marginTop: 24 }}>
                <TextAction
                  label={`${pendingOpen ? 'Hide' : 'Show'} pending titles · ${unplaced.length}`}
                  onPress={() => setPendingOpen(!pendingOpen)}
                />
              </View>
            ) : (
              <View
                style={
                  highlight === row.item.mediaId ? { backgroundColor: colors.surface } : undefined
                }
              >
                <MediaRow
                  media={mediaById.get(row.item.mediaId)!}
                  rank={row.item}
                  onScore={() => setAbout(true)}
                  trailing={
                    row.item.position === null ? (
                      <Button
                        label="Compare"
                        secondary
                        style={{ paddingHorizontal: 10 }}
                        onPress={() =>
                          router.push({
                            pathname: '/compare',
                            params: { kind, target: row.item.mediaId, mode: 'placement' },
                          })
                        }
                      />
                    ) : undefined
                  }
                />
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            title={placed.length ? 'No ranked titles match' : 'Your ranking is taking shape'}
            message={
              placed.length
                ? 'Try another genre or view.'
                : 'Log two titles and compare them. Sentiment alone never creates a Rank Score.'
            }
            action={
              <Button label="Find a title" secondary onPress={() => router.push('/search')} />
            }
          />
        }
      />
    </Screen>
  );
}
