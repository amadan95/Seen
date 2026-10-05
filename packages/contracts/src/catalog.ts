import { z } from 'zod';
import { mediaSchema } from './index.ts';

export const catalogPageSchema = z.object({
  items: z.array(mediaSchema).max(20),
  nextPage: z.number().int().positive().nullable(),
  source: z.literal('tmdb'),
  stale: z.boolean(),
  fetchedAt: z.string().datetime(),
});
export type CatalogPage = z.infer<typeof catalogPageSchema>;
export const catalogQuerySchema = z.object({
  query: z.string().trim().max(120).default(''),
  kind: z.enum(['all', 'movie', 'tv']).default('all'),
  page: z.coerce.number().int().min(1).max(10).default(1),
  genre: z.enum(['Sci-fi', 'Drama', 'Comedy', 'Crime']).nullable().default(null),
  maxRuntime: z.coerce.number().int().min(1).max(240).nullable().default(null),
});
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
