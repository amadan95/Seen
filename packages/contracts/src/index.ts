import { z } from 'zod';

export const mediaKindSchema = z.enum(['movie', 'tv']);
export const sentimentSchema = z.enum(['liked', 'fine', 'disliked']);
export const tvStatusSchema = z.enum(['watching', 'caught_up', 'finished', 'dropped']);
export const visibilitySchema = z.enum(['private', 'friends', 'public']);
export type MediaKind = z.infer<typeof mediaKindSchema>;
export type Sentiment = z.infer<typeof sentimentSchema>;
export type TvStatus = z.infer<typeof tvStatusSchema>;

export const mediaSchema = z.object({
  id: z.string().min(1),
  kind: mediaKindSchema,
  title: z.string().min(1),
  year: z.number().int(),
  runtimeMinutes: z.number().int().positive().nullable(),
  episodeMinutes: z.number().int().positive().nullable(),
  genres: z.array(z.string()),
  synopsis: z.string(),
  palette: z.tuple([z.string(), z.string(), z.string()]),
  artwork: z.enum(['orbit', 'stairs', 'window', 'pulse', 'mountain', 'maze']),
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
