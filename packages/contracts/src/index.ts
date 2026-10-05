import { z } from 'zod';
export * from './identity.ts';

export const mediaKindSchema = z.enum(['movie', 'tv']);
export const sentimentSchema = z.enum(['liked', 'fine', 'disliked']);
export const tvStatusSchema = z.enum(['watching', 'caught_up', 'finished', 'dropped']);
export const visibilitySchema = z.enum(['private', 'friends', 'public']);
export type MediaKind = z.infer<typeof mediaKindSchema>;
export type Sentiment = z.infer<typeof sentimentSchema>;
export type TvStatus = z.infer<typeof tvStatusSchema>;

export const availabilitySchema = z.object({
  region: z.literal('US'),
  status: z.enum(['available', 'unavailable']),
  source: z.literal('JustWatch via TMDB'),
  checkedAt: z.string().datetime(),
  stale: z.boolean(),
  sourceUrl: z.string().url().nullable(),
  offers: z.array(
    z.object({
      providerId: z.number().int().positive(),
      name: z.string().min(1),
      logoUrl: z.string().url().nullable(),
      type: z.enum(['subscription', 'rent', 'buy', 'free', 'ads']),
    }),
  ),
});
export type Availability = z.infer<typeof availabilitySchema>;

export const mediaSchema = z.object({
  id: z.string().min(1),
  kind: mediaKindSchema,
  title: z.string().min(1),
  year: z.number().int().nullable(),
  runtimeMinutes: z.number().int().positive().nullable(),
  episodeMinutes: z.number().int().positive().nullable(),
  genres: z.array(z.string()),
  synopsis: z.string(),
  palette: z.tuple([z.string(), z.string(), z.string()]),
  artwork: z.enum(['orbit', 'stairs', 'window', 'pulse', 'mountain', 'maze']),
  posterUrl: z.string().url().nullable().optional(),
  source: z.enum(['fixture', 'tmdb']).optional(),
  sourceUrl: z.string().url().optional(),
  fetchedAt: z.string().datetime().optional(),
  metadataComplete: z.boolean().optional(),
  episodeDurationSource: z.enum(['typical', 'latest']).optional(),
  tagline: z.string().optional(),
  releaseDate: z.string().nullable().optional(),
  originalLanguage: z.string().nullable().optional(),
  catalogStatus: z.string().nullable().optional(),
  seasons: z.number().int().nonnegative().nullable().optional(),
  episodes: z.number().int().nonnegative().nullable().optional(),
  creators: z.array(z.string()).optional(),
  directors: z.array(z.string()).optional(),
  cast: z.array(z.object({ name: z.string(), character: z.string() })).optional(),
  trailerUrl: z.string().url().nullable().optional(),
  availability: availabilitySchema.optional(),
});
export type Media = z.infer<typeof mediaSchema>;

export const opinionSchema = z.object({
  mediaId: z.string(),
  sentiment: sentimentSchema.nullable(),
  status: tvStatusSchema.nullable(),
  seenEnough: z.boolean(),
  revision: z.number().int().positive(),
});
export type Opinion = z.infer<typeof opinionSchema>;
export const logSchema = z.object({
  id: z.string(),
  mediaId: z.string(),
  createdAt: z.string().datetime(),
  watchedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  historical: z.boolean(),
  rewatch: z.boolean(),
  note: z.string().max(280),
});
export type WatchLog = z.infer<typeof logSchema>;
export const comparisonSchema = z.object({
  id: z.string(),
  a: z.string(),
  b: z.string(),
  aRevision: z.number().int().positive(),
  bRevision: z.number().int().positive(),
  outcome: z.enum(['a_wins', 'b_wins', 'similar']),
});
export type Comparison = z.infer<typeof comparisonSchema>;
export type ComparisonAnswer = Comparison['outcome'] | 'skip' | 'undecided';
export const watchlistSchema = z.object({
  mediaId: z.string(),
  addedAt: z.string().datetime(),
  priority: z.number().int().min(0).max(2),
});
export type WatchlistItem = z.infer<typeof watchlistSchema>;

export const librarySchema = z.object({
  schemaVersion: z.literal(1),
  onboarded: z.boolean(),
  revision: z.number().int().nonnegative(),
  opinions: z.array(opinionSchema),
  logs: z.array(logSchema),
  comparisons: z.array(comparisonSchema),
  watchlist: z.array(watchlistSchema),
  // Backward-compatible preview metadata, independent of eventual production catalog tables.
  catalogEntries: z.array(mediaSchema).default([]),
});
export type Library = z.infer<typeof librarySchema>;

export const apiErrorSchema = z.object({
  code: z.enum([
    'unauthorized',
    'forbidden',
    'not_found',
    'conflict',
    'validation',
    'rate_limited',
    'upstream',
    'internal',
  ]),
  message: z.string(),
  request_id: z.string(),
  retryable: z.boolean(),
});
export const cursorPageSchema = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    next_cursor: z.string().nullable(),
  });
export const mutationEnvelopeSchema = <T extends z.ZodType>(payload: T) =>
  z.object({
    operation_id: z.string().uuid(),
    schema_version: z.literal(1),
    kind: z.string().min(1),
    target_id: z.string().uuid(),
    base_revision: z.number().int().nonnegative(),
    payload,
  });
export const watchlistCommandSchema = mutationEnvelopeSchema(
  z.object({
    present: z.boolean(),
    priority: z.number().int().min(0).max(2),
  }),
);

export interface RankItem {
  mediaId: string;
  position: number | null;
  rankScore: number | null;
  evidence: 'unplaced' | 'provisional' | 'refined';
  opponents: number;
}
export interface RankSnapshot {
  kind: MediaKind;
  sourceRevision: number;
  modelVersion: string;
  scoreScaleVersion: string;
  items: RankItem[];
}
