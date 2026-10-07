// Local development bridge only. Never deploy this server or bind it to a public interface.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { TmdbCatalog, CatalogError, previewTitles } from '@seen/catalog';
import { catalogQuerySchema } from '@seen/contracts/catalog';
import type { MediaKind } from '@seen/contracts';
import { isLocalCatalogOrigin } from './catalog-local-policy';

try {
  process.loadEnvFile(resolve('supabase/functions/.env'));
} catch {
  console.error(
    'Create supabase/functions/.env with TMDB_API_KEY before starting the local catalog.',
  );
  process.exit(1);
}
const credential = process.env.TMDB_API_KEY;
if (!credential?.trim()) {
  console.error('TMDB_API_KEY is empty. Update supabase/functions/.env.');
  process.exit(1);
}
const identityPath = resolve('.seen-dev/identities.json');
mkdirSync(resolve('.seen-dev'), { recursive: true });
const identities = new Map<string, string>();
if (existsSync(identityPath)) {
  try {
    const entries: unknown = JSON.parse(readFileSync(identityPath, 'utf8'));
    if (
      !Array.isArray(entries) ||
      !entries.every(
        (entry) =>
          Array.isArray(entry) &&
          entry.length === 2 &&
          typeof entry[0] === 'string' &&
          /^(movie|tv):[1-9]\d*$/.test(entry[0]) &&
          typeof entry[1] === 'string' &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(entry[1]),
      )
    )
      throw new Error('Invalid identity store');
    for (const [key, id] of entries) identities.set(key, id);
  } catch {
    console.error('Local identity store could not be opened. It has been preserved.');
    process.exit(1);
  }
}
const catalog = new TmdbCatalog({
  credential,
  identity: (kind, externalId) => {
    const key = `${kind}:${externalId}`,
      existing = identities.get(key);
    if (existing) return existing;
    const id = randomUUID();
    const next = new Map(identities).set(key, id);
    writeFileSync(`${identityPath}.tmp`, JSON.stringify([...next]));
    renameSync(`${identityPath}.tmp`, identityPath);
    identities.set(key, id);
    return id;
  },
});
let windowAt = Date.now(),
  received = 0;
const server = createServer(async (request, response) => {
  const requestId = randomUUID();
  const reply = (status: number, data: unknown) => {
    response.writeHead(status, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Request-Id': requestId,
    });
    response.end(JSON.stringify(data));
  };
  if (!['127.0.0.1:8787', 'localhost:8787'].includes(request.headers.host ?? '')) {
    reply(403, {
      code: 'forbidden',
      message: 'Local catalog only.',
      request_id: requestId,
      retryable: false,
    });
    return;
  }
  const origin = request.headers.origin;
  if (origin) {
    const allowed = isLocalCatalogOrigin(origin);
    if (!allowed) {
      reply(403, {
        code: 'forbidden',
        message: 'Local development origin required.',
        request_id: requestId,
        retryable: false,
      });
      return;
    }
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  }
  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }
  if (request.method !== 'GET') {
    reply(405, {
      code: 'validation',
      message: 'GET required.',
      request_id: requestId,
      retryable: false,
    });
    return;
  }
  if (Date.now() - windowAt > 60_000) {
    windowAt = Date.now();
    received = 0;
  }
  if (++received > 120) {
    response.setHeader('Retry-After', '60');
    reply(429, {
      code: 'rate_limited',
      message: 'Try again shortly.',
      request_id: requestId,
      retryable: true,
    });
    return;
  }
  try {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1:8787');
    if (url.pathname === '/health') {
      reply(200, { ok: true, scope: 'local-development', configured: true });
      return;
    }
    if (url.pathname === '/catalog') {
      const input = catalogQuerySchema.safeParse({
        query: url.searchParams.get('query') ?? '',
        kind: url.searchParams.get('kind') ?? 'all',
        page: url.searchParams.get('page') ?? 1,
        genre: url.searchParams.get('genre'),
        maxRuntime: url.searchParams.get('maxRuntime'),
      });
      if (!input.success) throw new CatalogError('validation', 'Invalid catalog filters.', 400);
      reply(200, { ...(await catalog.search(input.data)), request_id: requestId });
      return;
    }
    if (url.pathname === '/catalog/preview') {
      const entries = Object.entries(previewTitles),
        items = [];
      let stale = false;
      for (let start = 0; start < entries.length; start += 4) {
        const batch = await Promise.allSettled(
          entries.slice(start, start + 4).map(async ([id, ref]) => {
            const result = await catalog.detail(ref.kind, ref.externalId);
            return { ...result, media: { ...result.media, id } };
          }),
        );
        for (const result of batch) {
          if (result.status === 'fulfilled') {
            items.push(result.value.media);
            stale ||= result.value.stale;
          }
        }
      }
      if (!items.length)
        throw new CatalogError('upstream', 'Title artwork could not refresh. Try again.');
      reply(200, {
        items,
        nextPage: null,
        source: 'tmdb',
        stale,
        fetchedAt: new Date().toISOString(),
        request_id: requestId,
      });
      return;
    }
    const match = /^\/media\/([a-z0-9-]{1,64})$/.exec(url.pathname);
    if (match) {
      const id = match[1]!;
      const key = [...identities].find(([, storedId]) => storedId === id)?.[0];
      const ref =
        previewTitles[id] ??
        (key
          ? { kind: key.split(':')[0] as MediaKind, externalId: Number(key.split(':')[1]) }
          : null);
      if (!ref) throw new CatalogError('not_found', 'This title is unavailable.', 404);
      const result = await catalog.detail(ref.kind, ref.externalId);
      reply(200, { ...result, media: { ...result.media, id }, request_id: requestId });
      return;
    }
    throw new CatalogError('not_found', 'Route unavailable.', 404);
  } catch (error) {
    const known = error instanceof CatalogError;
    if (known && error.code === 'rate_limited')
      response.setHeader('Retry-After', String(error.retryAfter));
    reply(known ? error.status : 503, {
      code: known ? error.code : 'upstream',
      message: known ? error.message : 'Catalog is temporarily unavailable.',
      request_id: requestId,
      retryable: !known || error.status === 429 || error.status >= 500,
    });
  }
});
server.on('error', () => {
  console.error('Local catalog could not bind to port 8787.');
  process.exitCode = 1;
});
server.listen(8787, '127.0.0.1', () =>
  console.info('Seen local catalog ready at http://127.0.0.1:8787 (key hidden).'),
);
