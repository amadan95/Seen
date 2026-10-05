import { z } from 'zod';
import { mediaSchema, type Media, type MediaKind } from '@seen/contracts';
import { catalogQuerySchema, type CatalogPage, type CatalogQuery } from '@seen/contracts/catalog';

const itemSchema = z.object({
  id: z.number().int().positive(),
  adult: z.boolean().optional(),
  media_type: z.string().optional(),
  title: z.string().optional(),
  name: z.string().optional(),
  release_date: z.string().optional(),
  first_air_date: z.string().optional(),
  overview: z.string().nullable().optional(),
  poster_path: z.string().nullable().optional(),
  genre_ids: z.array(z.number().int()).optional(),
  genres: z.array(z.object({ id: z.number().int(), name: z.string() })).optional(),
  runtime: z.number().int().nonnegative().nullable().optional(),
  episode_run_time: z.array(z.number().int().nonnegative()).optional(),
});
const pageSchema = z.object({
  results: z.array(z.unknown()).max(100),
  total_pages: z.number().int().nonnegative(),
});
const configurationSchema = z.object({
  images: z.object({ secure_base_url: z.string().url(), poster_sizes: z.array(z.string()) }),
});
const genreNames: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-fi',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
};
const genreId = (name: string, kind: MediaKind) =>
  Object.entries(genreNames).find(
    ([id, value]) =>
      value === name && (name !== 'Sci-fi' || Number(id) === (kind === 'tv' ? 10765 : 878)),
  )?.[0];
export class CatalogError extends Error {
  constructor(
    public code: 'validation' | 'rate_limited' | 'upstream' | 'not_found',
    message: string,
    public status = 503,
    public retryAfter = 30,
  ) {
    super(message);
  }
}
export interface CatalogDependencies {
  credential: string;
  identity: (kind: MediaKind, externalId: number) => string;
  fetch?: typeof fetch;
  now?: () => number;
}

/** Portable TMDB adapter. Cache/budget are per process; hosted distributed caching comes later. */
export class TmdbCatalog {
  private cache = new Map<string, { value: unknown; at: number }>();
  private pending = new Map<string, Promise<unknown>>();
  private fetcher: typeof fetch;
  private now: () => number;
  private requests: number[] = [];
  private cooldown = 0;
  constructor(private dependencies: CatalogDependencies) {
    if (!dependencies.credential.trim()) throw new Error('TMDB credential missing');
    this.fetcher = dependencies.fetch ?? fetch;
    this.now = dependencies.now ?? Date.now;
  }
  private async request(
    path: string,
    params: Record<string, string> = {},
  ): Promise<{ value: unknown; stale: boolean; at: number }> {
    const url = new URL(`https://api.themoviedb.org/3/${path}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    // This cache key never contains credentials. No upstream URLs/errors are logged or returned.
    const cacheKey = url.toString(),
      previous = this.cache.get(cacheKey),
      now = this.now();
    if (previous && now - previous.at < 300_000) return { ...previous, stale: false };
    const existing = this.pending.get(cacheKey);
    if (existing) {
      try {
        await existing;
      } catch (error) {
        if (
          previous &&
          now - previous.at < 900_000 &&
          error instanceof CatalogError &&
          error.code !== 'not_found'
        )
          return { ...previous, stale: true };
        throw error;
      }
      return this.request(path, params);
    }
    const task = (async () => {
      this.requests = this.requests.filter((at) => now - at < 60_000);
      if (now < this.cooldown || this.requests.length >= 60)
        throw new CatalogError(
          'rate_limited',
          'Catalog is busy. Try again shortly.',
          429,
          Math.max(1, Math.ceil((this.cooldown - now) / 1000)),
        );
      this.requests.push(now);
      const credential = this.dependencies.credential.trim(),
        headers: Record<string, string> = { accept: 'application/json' };
      if (/^[a-f0-9]{32}$/i.test(credential)) url.searchParams.set('api_key', credential);
      else headers.Authorization = `Bearer ${credential}`;
      let response: Response;
      try {
        response = await this.fetcher(url, {
          headers,
          signal: AbortSignal.timeout(8000),
          redirect: 'error',
        });
      } catch {
        throw new CatalogError('upstream', 'Catalog could not be reached. Try again.');
      }
      if (response.status === 429) {
        const retry = Number(response.headers.get('retry-after'));
        const seconds = Number.isFinite(retry) && retry > 0 ? Math.min(retry, 300) : 30;
        this.cooldown = this.now() + seconds * 1000;
        throw new CatalogError('rate_limited', 'Catalog is busy. Try again shortly.', 429, seconds);
      }
      if (response.status === 404)
        throw new CatalogError('not_found', 'This title is unavailable.', 404);
      if (!response.ok)
        throw new CatalogError(
          'upstream',
          response.status === 401
            ? 'Catalog credentials need attention.'
            : 'Catalog is temporarily unavailable.',
        );
      let value: unknown;
      try {
        value = await response.json();
      } catch {
        throw new CatalogError('upstream', 'Catalog returned an unreadable response.');
      }
      const valid =
        path === 'configuration'
          ? configurationSchema.safeParse(value)
          : path.startsWith('search/') || path.startsWith('discover/')
            ? pageSchema.safeParse(value)
            : itemSchema.safeParse(value);
      if (!valid.success)
        throw new CatalogError('upstream', 'Catalog returned invalid information.');
      this.cache.delete(cacheKey);
      this.cache.set(cacheKey, { value, at: this.now() });
      if (this.cache.size > 300) this.cache.delete(this.cache.keys().next().value!);
      return value;
    })();
    this.pending.set(cacheKey, task);
    try {
      await task;
      return { ...this.cache.get(cacheKey)!, stale: false };
    } catch (error) {
      // Never erase the last usable response on 429/outage. Bounded stale data is labeled.
      if (
        previous &&
        now - previous.at < 900_000 &&
        error instanceof CatalogError &&
        error.code !== 'not_found'
      )
        return { ...previous, stale: true };
      throw error;
    } finally {
      this.pending.delete(cacheKey);
    }
  }
  private async posterBase(): Promise<string> {
    const result = await this.request('configuration');
    const config = configurationSchema.safeParse(result.value);
    if (!config.success)
      throw new CatalogError('upstream', 'Catalog image configuration is unavailable.');
    const base = new URL(config.data.images.secure_base_url);
    if (base.protocol !== 'https:' || base.hostname !== 'image.tmdb.org')
      throw new CatalogError('upstream', 'Catalog image configuration is invalid.');
    const size = config.data.images.poster_sizes.includes('w500')
      ? 'w500'
      : config.data.images.poster_sizes.includes('w342')
        ? 'w342'
        : null;
    if (!size) throw new CatalogError('upstream', 'Catalog image size is unavailable.');
    return `${base.toString().replace(/\/?$/, '/')}${size}`;
  }
  private normalize(
    raw: z.infer<typeof itemSchema>,
    kind: MediaKind,
    posterBase: string | null,
    at: number,
    complete: boolean,
  ): Media {
    const date = kind === 'movie' ? raw.release_date : raw.first_air_date;
    const parsedYear = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? Number(date.slice(0, 4)) : null;
    const path =
      raw.poster_path && /^\/[A-Za-z0-9_-]+\.(jpg|png|webp)$/.test(raw.poster_path)
        ? raw.poster_path
        : null;
    const genres =
      raw.genres?.map((g) => genreNames[g.id] ?? g.name) ??
      (raw.genre_ids ?? []).map((id) => genreNames[id]).filter((g): g is string => Boolean(g));
    return mediaSchema.parse({
      id: this.dependencies.identity(kind, raw.id),
      kind,
      title: (kind === 'movie' ? raw.title : raw.name)?.trim() || 'Untitled',
      year: parsedYear,
      runtimeMinutes: kind === 'movie' && raw.runtime ? raw.runtime : null,
      episodeMinutes: kind === 'tv' ? (raw.episode_run_time?.find((n) => n > 0) ?? null) : null,
      genres,
      synopsis: raw.overview ?? '',
      palette: ['#182027', '#81999E', '#E9E3CF'],
      artwork: 'orbit',
      posterUrl: posterBase && path ? `${posterBase}${path}` : null,
      source: 'tmdb',
      sourceUrl: `https://www.themoviedb.org/${kind}/${raw.id}`,
      fetchedAt: new Date(at).toISOString(),
      metadataComplete: complete,
    });
  }
  async detail(kind: MediaKind, externalId: number): Promise<{ media: Media; stale: boolean }> {
    if (!['movie', 'tv'].includes(kind) || !Number.isSafeInteger(externalId) || externalId < 1)
      throw new CatalogError('validation', 'Invalid title.', 400);
    const result = await this.request(`${kind}/${externalId}`, { language: 'en-US' });
    const parsed = itemSchema.safeParse(result.value);
    if (!parsed.success || parsed.data.id !== externalId)
      throw new CatalogError('upstream', 'Catalog returned invalid title information.');
    if (parsed.data.adult) throw new CatalogError('not_found', 'This title is unavailable.', 404);
    const base = await this.posterBase().catch(() => null);
    return { media: this.normalize(parsed.data, kind, base, result.at, true), stale: result.stale };
  }
  async search(input: CatalogQuery): Promise<CatalogPage> {
    const parsed = catalogQuerySchema.safeParse(input);
    if (!parsed.success) throw new CatalogError('validation', 'Invalid catalog filters.', 400);
    const query = parsed.data;
    if (query.maxRuntime !== null && query.kind === 'tv')
      throw new CatalogError('validation', 'Movie runtime filters do not apply to TV.', 400);
    const kind = query.maxRuntime !== null ? 'movie' : query.kind;
    const params: Record<string, string> = {
      language: 'en-US',
      include_adult: 'false',
      page: String(query.page),
    };
    let path: string;
    if (query.query) {
      path = `search/${kind === 'all' ? 'multi' : kind}`;
      params.query = query.query;
    } else {
      const browseKind = kind === 'all' ? 'movie' : kind;
      path = `discover/${browseKind}`;
      params.sort_by = 'popularity.desc';
      if (query.genre) params.with_genres = genreId(query.genre, browseKind) ?? '';
      if (query.maxRuntime !== null) {
        params['with_runtime.gte'] = '1';
        params['with_runtime.lte'] = String(query.maxRuntime);
      }
    }
    const result = await this.request(path, params),
      page = pageSchema.safeParse(result.value);
    if (!page.success)
      throw new CatalogError('upstream', 'Catalog returned invalid search results.');
    const base = await this.posterBase().catch(() => null);
    let stale = result.stale;
    let items = page.data.results
      .flatMap((raw) => {
        const item = itemSchema.safeParse(raw);
        if (!item.success || item.data.adult) return [];
        const itemKind = item.data.media_type ?? (kind === 'all' ? 'movie' : kind);
        if (itemKind !== 'movie' && itemKind !== 'tv') return [];
        return [
          { raw: item.data, media: this.normalize(item.data, itemKind, base, result.at, false) },
        ];
      })
      .slice(0, 20);
    if (query.genre) items = items.filter((i) => i.media.genres.includes(query.genre!));
    // Search results do not contain runtime. Resolve a bounded page, with four concurrent requests.
    if (query.maxRuntime !== null) {
      const hydrated: typeof items = [];
      for (let start = 0; start < items.length; start += 4) {
        const batch = await Promise.allSettled(
          items.slice(start, start + 4).map((i) => this.detail('movie', i.raw.id)),
        );
        for (let offset = 0; offset < batch.length; offset++) {
          const entry = batch[offset]!;
          if (entry.status === 'fulfilled') {
            stale ||= entry.value.stale;
            if (
              entry.value.media.runtimeMinutes !== null &&
              entry.value.media.runtimeMinutes <= query.maxRuntime
            )
              hydrated.push({ raw: items[start + offset]!.raw, media: entry.value.media });
          } else if (entry.status === 'rejected') throw entry.reason; // Never represent an outage as an empty filtered result.
        }
      }
      items = hydrated;
    }
    const unique = [...new Map(items.map((i) => [i.media.id, i.media])).values()];
    return {
      items: unique,
      nextPage: query.page < Math.min(page.data.total_pages, 10) ? query.page + 1 : null,
      source: 'tmdb',
      stale,
      fetchedAt: new Date(result.at).toISOString(),
    };
  }
}
