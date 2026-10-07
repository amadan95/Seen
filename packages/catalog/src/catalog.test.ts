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
  it('checks runtime without requesting credits, videos or providers', async () => {
    const { adapter, urls } = setup((url) =>
      Response.json(
        url.pathname.endsWith('configuration')
          ? config
          : url.pathname.includes('/search/')
            ? { results: [movie], total_pages: 1 }
            : { ...movie, runtime: 87, release_date: '2009-01-01' },
      ),
    );
    const page = await adapter.search({ ...query, kind: 'movie', maxRuntime: 90 });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({
      runtimeMinutes: 87,
      releaseDate: '2009-01-01',
      metadataComplete: false,
    });
    const detail = urls.find((url) => url.pathname.endsWith('/movie/11'));
    expect(detail).toBeDefined();
    expect(detail!.searchParams.has('append_to_response')).toBe(false);
    expect(urls.some((url) => url.pathname.includes('watch/providers'))).toBe(false);
  });
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
  it('hydrates full metadata and deduplicates US offers while preserving offer types', async () => {
    const provider = { provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg' };
    const { adapter, urls } = setup((url) =>
      Response.json(
        url.pathname.endsWith('configuration')
          ? config
          : {
              ...movie,
              runtime: 110,
              overview: 'A real overview',
              tagline: 'A tagline',
              original_language: 'en',
              status: 'Released',
              genres: [{ id: 18, name: 'Drama' }],
              poster_path: '/poster.jpg',
              credits: {
                cast: [{ name: 'Actor', character: 'Character' }],
                crew: [{ name: 'Director', job: 'Director' }],
              },
              videos: {
                results: [{ site: 'YouTube', key: 'abcdefghijk', type: 'Trailer', official: true }],
              },
              'watch/providers': {
                results: {
                  US: {
                    link: 'https://www.themoviedb.org/movie/11-title/watch?locale=US',
                    flatrate: [provider, provider],
                    rent: [provider],
                  },
                  GB: { flatrate: [{ provider_id: 9, provider_name: 'UK only' }] },
                },
              },
            },
      ),
    );
    const { media } = await adapter.detail('movie', 11);
    expect(
      urls
        .find((url) => url.pathname.endsWith('/movie/11'))
        ?.searchParams.get('append_to_response'),
    ).toBe('credits,videos,watch/providers');
    expect(media).toMatchObject({
      runtimeMinutes: 110,
      metadataComplete: true,
      tagline: 'A tagline',
      cast: [{ name: 'Actor', character: 'Character' }],
      directors: ['Director'],
      trailerUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
    });
    expect(media.availability).toMatchObject({
      region: 'US',
      status: 'available',
      source: 'JustWatch via TMDB',
      sourceUrl: 'https://www.themoviedb.org/movie/11-title/watch?locale=US',
    });
    expect(media.availability?.offers.map((offer) => [offer.name, offer.type])).toEqual([
      ['Netflix', 'subscription'],
      ['Netflix', 'rent'],
    ]);
    expect(media.availability?.offers[0]?.logoUrl).toBe(
      'https://image.tmdb.org/t/p/w92/netflix.jpg',
    );
  });
  it('distinguishes no regional offers from unavailable provider data and rejects unsafe links', async () => {
    for (const [providers, status] of [
      [{ results: {} }, 'available'],
      [undefined, 'unavailable'],
      [{ results: { US: { flatrate: [{ provider_id: 'bad' }] } } }, 'unavailable'],
      [{ results: { US: { link: 'https://evil.example/movie/11/watch', buy: [] } } }, 'available'],
    ] as const) {
      const { adapter } = setup((url) =>
        Response.json(
          url.pathname.endsWith('configuration')
            ? config
            : { ...movie, 'watch/providers': providers },
        ),
      );
      const { media } = await adapter.detail('movie', 11);
      expect(media.availability?.status).toBe(status);
      expect(media.availability?.offers).toEqual([]);
      expect(media.availability?.sourceUrl).toBeNull();
      expect(media.metadataComplete).toBe(true);
    }
  });
  it('labels latest episode duration honestly when TV typical runtime is absent', async () => {
    const { adapter } = setup((url) =>
      Response.json(
        url.pathname.endsWith('configuration')
          ? config
          : {
              id: 11,
              name: 'Show',
              episode_run_time: [],
              last_episode_to_air: { runtime: 62 },
              number_of_seasons: 4,
              number_of_episodes: 38,
              created_by: [{ name: 'Creator' }],
              'watch/providers': { results: {} },
            },
      ),
    );
    expect((await adapter.detail('tv', 11)).media).toMatchObject({
      kind: 'tv',
      episodeMinutes: 62,
      episodeDurationSource: 'latest',
      runtimeMinutes: null,
      seasons: 4,
      episodes: 38,
      creators: ['Creator'],
    });
  });
  it('marks cached viewing data stale during an upstream outage', async () => {
    let clock = 0;
    const { adapter } = setup(
      (url) =>
        url.pathname.endsWith('configuration')
          ? Response.json(config)
          : clock === 0
            ? Response.json({ ...movie, 'watch/providers': { results: {} } })
            : new Response(null, { status: 503 }),
      () => clock,
    );
    await adapter.detail('movie', 11);
    clock = 301_000;
    const cached = await adapter.detail('movie', 11);
    expect(cached.stale).toBe(true);
    expect(cached.media.availability?.stale).toBe(true);
    expect(cached.media.availability?.checkedAt).toBe('1970-01-01T00:00:00.000Z');
  });
});
