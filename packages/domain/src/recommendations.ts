import type { Library, Media, MediaKind, RankSnapshot } from '@seen/contracts';
import { seededNumber } from './ranking.ts';

export const RECOMMENDATION_VERSION = 'content-preview-v2';
export interface RecommendationOptions {
  kind: MediaKind | 'all';
  seed: string;
  now?: string;
  maxRuntime?: number | null;
  genre?: string | null;
  providerIds?: number[];
  watchlistOnly?: boolean;
  exclude?: Set<string>;
  limit?: number;
  snapshots?: RankSnapshot[];
}
export interface RecommendationItem {
  media: Media;
  reason: string;
  reasonCode: 'genre' | 'creator' | 'catalog';
  sourceMediaId: string | null;
  requestId: string;
  itemId: string;
  score: number;
}
const names = (m: Media) => [
  ...new Set([
    ...(m.directors ?? []),
    ...(m.creators ?? []),
    ...(m.cast ?? []).slice(0, 5).map((c) => c.name),
  ]),
];
const overlap = (a: string[], b: string[]) => {
  const set = new Set(a);
  return b.filter((value) => set.has(value)).length / Math.max(1, new Set([...a, ...b]).size);
};
/** No vendor calls or invented related-title/popularity/friend signals. Missing features are omitted. */
export function recommend(catalog: Media[], state: Library, options: RecommendationOptions) {
  const lookup = new Map(catalog.map((m) => [m.id, m]));
  const seen = new Set(state.opinions.map((o) => o.mediaId));
  const dismissed = new Set(state.dismissals.map((d) => d.mediaId));
  const saved = new Set(state.watchlist.map((w) => w.mediaId));
  const ranks = new Map(
    (options.snapshots ?? []).flatMap((s) => s.items.map((i) => [i.mediaId, i] as const)),
  );
  const inputs = state.opinions.flatMap((opinion) => {
    const media = lookup.get(opinion.mediaId);
    if (!media || !opinion.sentiment || opinion.sentiment === 'fine') return [];
    const rank = ranks.get(media.id);
    const support = Math.min(1, (rank?.opponents ?? 0) / 5);
    return [
      {
        media,
        sign: opinion.sentiment === 'liked' ? 1 : -1,
        weight: 1 + 0.1 * support * ((rank?.rankScore ?? 5) / 10),
      },
    ];
  });
  const preferences = inputs.map((i) => [i.media.id, i.sign, i.weight]);
  const requestId = `rec-${Math.floor(
    seededNumber(
      JSON.stringify([
        RECOMMENDATION_VERSION,
        preferences,
        state.dismissals,
        options.kind,
        options.maxRuntime,
        options.genre,
        [...(options.exclude ?? [])].sort(),
        options.providerIds,
        options.watchlistOnly,
        options.seed,
        options.now?.slice(0, 10),
        catalog
          .map((m) => [m.id, m.fetchedAt])
          .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
      ]),
    ) * 4294967296,
  ).toString(36)}`;
  const date = options.now?.slice(0, 10);
  const candidates = [...lookup.values()]
    .filter((m) => {
      if (seen.has(m.id) || dismissed.has(m.id) || options.exclude?.has(m.id)) return false;
      if (options.kind !== 'all' && m.kind !== options.kind) return false;
      if (options.genre && !m.genres.includes(options.genre)) return false;
      if (options.watchlistOnly && !saved.has(m.id)) return false;
      if (m.releaseDate && date && m.releaseDate > date) return false;
      if (m.catalogStatus && ['Planned', 'In Production', 'Pilot'].includes(m.catalogStatus))
        return false;
      if (m.source === 'tmdb' && (!m.releaseDate || !date)) return false;
      if (
        options.maxRuntime != null &&
        (m.kind !== 'movie' || m.runtimeMinutes === null || m.runtimeMinutes > options.maxRuntime)
      )
        return false;
      if (options.providerIds?.length) {
        const availability = m.availability;
        if (
          !availability ||
          availability.region !== 'US' ||
          availability.stale ||
          availability.status !== 'available'
        )
          return false;
        // A stale or unknown offer cannot satisfy a hard filter. Brand grouping is display-only.
        if (
          !options.now ||
          Date.parse(options.now) - Date.parse(availability.checkedAt) > 6 * 60 * 60 * 1000 ||
          Date.parse(availability.checkedAt) > Date.parse(options.now)
        )
          return false;
        if (
          !availability.offers.some(
            (o) => o.type === 'subscription' && options.providerIds!.includes(o.providerId),
          )
        )
          return false;
      }
      return true;
    })
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, 500);
  const scored = candidates
    .map((media): RecommendationItem => {
      const signals = inputs.filter((i) => i.media.kind === media.kind);
      const liked = signals.filter((i) => i.sign > 0),
        disliked = signals.filter((i) => i.sign < 0);
      const feature = (seeds: typeof signals, extract: (m: Media) => string[]) =>
        seeds.reduce((sum, i) => sum + i.weight * overlap(extract(media), extract(i.media)), 0) /
        Math.max(
          1,
          seeds.reduce((sum, i) => sum + i.weight, 0),
        );
      const genre = feature(liked, (m) => m.genres),
        creator = feature(liked, names);
      let weight = 0,
        positive = 0;
      if (liked.some((i) => i.media.genres.length) && media.genres.length) {
        weight += 0.35;
        positive += 0.35 * genre;
      }
      if (liked.some((i) => names(i.media).length) && names(media).length) {
        weight += 0.15;
        positive += 0.15 * creator;
      }
      if (options.providerIds?.length) {
        weight += 0.1;
        positive += 0.1;
      }
      const score =
        (weight ? positive / weight : 0) -
        0.4 * feature(disliked, (m) => m.genres) -
        0.2 * feature(disliked, names);
      const seed = [...liked].sort(
        (a, b) =>
          overlap(media.genres, b.media.genres) - overlap(media.genres, a.media.genres) ||
          a.media.id.localeCompare(b.media.id),
      )[0];
      const creatorSeed = liked.find((i) =>
        names(media).some((name) => names(i.media).includes(name)),
      );
      return {
        media,
        score,
        requestId,
        itemId: `${requestId}:${media.id}`,
        reasonCode:
          creatorSeed && creator > genre ? 'creator' : seed && genre > 0 ? 'genre' : 'catalog',
        sourceMediaId:
          creatorSeed && creator > genre
            ? creatorSeed.media.id
            : seed && genre > 0
              ? seed.media.id
              : null,
        reason:
          creatorSeed && creator > genre
            ? `Shares cast or creators with ${creatorSeed.media.title}`
            : seed && genre > 0
              ? `Because you liked ${seed.media.title}`
              : media.source === 'tmdb'
                ? 'Explore the TMDB catalog'
                : 'Explore the sample catalog',
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        seededNumber(`${options.seed}:${a.media.id}`) -
          seededNumber(`${options.seed}:${b.media.id}`),
    );
  const selected: RecommendationItem[] = [],
    remaining = [...scored];
  const limit = Math.min(50, options.limit ?? 50);
  while (remaining.length && selected.length < limit) {
    // Every fifth slot explores another suitable candidate. All hard filters already passed.
    const explore = selected.length % 5 === 4;
    remaining.sort((a, b) => {
      const variety = (i: RecommendationItem) =>
        Math.max(
          0,
          ...selected.map(
            (s) =>
              0.15 * overlap(s.media.genres, i.media.genres) +
              0.25 * overlap(names(s.media), names(i.media)),
          ),
        );
      const utility = (i: RecommendationItem) => (explore ? 0.5 : 1) * i.score - variety(i);
      return (
        utility(b) - utility(a) ||
        seededNumber(`${options.seed}:${a.media.id}`) -
          seededNumber(`${options.seed}:${b.media.id}`)
      );
    });
    selected.push(remaining.shift()!);
  }
  return { requestId, algorithmVersion: RECOMMENDATION_VERSION, items: selected };
}
export function dismissRecommendation(
  state: Library,
  item: Pick<RecommendationItem, 'media' | 'requestId' | 'itemId'>,
  now: string,
): Library {
  if (state.dismissals.some((d) => d.mediaId === item.media.id)) return state;
  return {
    ...state,
    revision: state.revision + 1,
    dismissals: [
      ...state.dismissals,
      { mediaId: item.media.id, createdAt: now, requestId: item.requestId, itemId: item.itemId },
    ],
  };
}
