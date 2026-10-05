import { describe, expect, it } from 'vitest';
import { TmdbCatalog, CatalogError } from './index.ts';
import type { CatalogQuery } from '@seen/contracts/catalog';

const query: CatalogQuery = { query: 'Title', kind: 'all', page: 1, genre: null, maxRuntime: null };
const movie = {
  id: 11,
  media_type: 'movie',
  title: 'Title',
  release_date: '',
  poster_path: null,
  genre_ids: [18],
};
const config = {
  images: { secure_base_url: 'https://image.tmdb.org/t/p/', poster_sizes: ['w500'] },
};
function setup(handler: (url: URL) => Response, now?: () => number) {
  const urls: URL[] = [];
  const adapter = new TmdbCatalog({
    credential: 'a'.repeat(32),
    now,
    identity: (kind, id) => `${kind}:${id}`,
    fetch: (async (input: string | URL | Request) => {
      const url = new URL(String(input));
      urls.push(url);
      return handler(url);
    }) as typeof fetch,
  });
  return { adapter, urls };
}
describe('TMDB boundary', () => {
  it('keeps movie/TV supplier ID namespaces separate and unknown dates/runtime null', async () => {
    const { adapter } = setup((url) =>
      Response.json(
        url.pathname.endsWith('configuration')
          ? config
          : {
              results: [
                movie,
                { id: 11, media_type: 'tv', name: 'Title', first_air_date: '2020-01-01' },
                { id: 22, media_type: 'person', name: 'Person' },
              ],
              total_pages: 1,
            },
      ),
    );
    const page = await adapter.search(query);
    expect(page.items.map((item) => item.id)).toEqual(['movie:11', 'tv:11']);
    expect(page.items[0]).toMatchObject({ year: null, runtimeMinutes: null, posterUrl: null });
  });
  it('deduplicates identical pending queries', async () => {
    const { adapter, urls } = setup((url) =>
      Response.json(
        url.pathname.endsWith('configuration') ? config : { results: [movie], total_pages: 1 },
      ),
    );
    await Promise.all([adapter.search(query), adapter.search(query)]);
    expect(urls.filter((url) => url.pathname.includes('search/'))).toHaveLength(1);
  });
  it('never includes credentials in client contracts', async () => {
    const { adapter } = setup((url) =>
      Response.json(
        url.pathname.endsWith('configuration') ? config : { results: [movie], total_pages: 1 },
      ),
    );
    expect(JSON.stringify(await adapter.search(query))).not.toContain('a'.repeat(32));
  });
  it('preserves a bounded usable page on 429 and reports stale', async () => {
    let clock = 0;
    const { adapter, urls } = setup(
      (url) =>
        url.pathname.endsWith('configuration')
          ? Response.json(config)
          : clock === 0
            ? Response.json({ results: [movie], total_pages: 1 })
            : new Response(null, { status: 429, headers: { 'Retry-After': '45' } }),
      () => clock,
    );
    await adapter.search(query);
    clock = 301_000;
    const result = await adapter.search(query);
    expect(result.stale).toBe(true);
    expect(result.items).toHaveLength(1);
    await adapter.search(query);
    expect(urls.filter((url) => url.pathname.includes('search/'))).toHaveLength(2);
  });
  it('does not replace usable cache with malformed upstream data', async () => {
    let clock = 0;
    const { adapter } = setup(
      (url) =>
        url.pathname.endsWith('configuration')
          ? Response.json(config)
          : Response.json(clock === 0 ? { results: [movie], total_pages: 1 } : { invalid: true }),
      () => clock,
    );
    await adapter.search(query);
    clock = 301_000;
    expect((await adapter.search(query)).stale).toBe(true);
  });
  it('excludes adult titles and preserves source configured image paths', async () => {
    const { adapter } = setup((url) =>
      Response.json(
        url.pathname.endsWith('configuration')
          ? config
          : {
              results: [
                { ...movie, poster_path: '/poster.jpg' },
                { ...movie, id: 12, adult: true },
              ],
              total_pages: 1,
            },
      ),
    );
    const page = await adapter.search(query);
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.posterUrl).toBe('https://image.tmdb.org/t/p/w500/poster.jpg');
  });
  it('hydrates movie runtime before applying a hard search filter', async () => {
    const { adapter } = setup((url) =>
      Response.json(
        url.pathname.endsWith('configuration')
          ? config
          : url.pathname.includes('/movie/')
            ? { ...movie, runtime: null }
            : { results: [movie], total_pages: 1 },
      ),
    );
    expect((await adapter.search({ ...query, kind: 'movie', maxRuntime: 120 })).items).toHaveLength(
      0,
    );
  });
  it('rejects TV runtime filtering and bounds pagination before upstream I/O', async () => {
    const { adapter, urls } = setup(() => {
      throw new Error('Should not fetch');
    });
    await expect(adapter.search({ ...query, kind: 'tv', maxRuntime: 120 })).rejects.toBeInstanceOf(
      CatalogError,
    );
    await expect(adapter.search({ ...query, page: 11 })).rejects.toBeInstanceOf(CatalogError);
    expect(urls).toHaveLength(0);
  });
});
