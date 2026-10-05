import { mediaSchema, apiErrorSchema } from '@seen/contracts';
import { catalogPageSchema, type CatalogQuery } from '@seen/contracts/catalog';

// The local bridge is a development aid only. A hosted, authorized service is a later increment.
export const catalogUrl = __DEV__
  ? process.env.EXPO_PUBLIC_CATALOG_URL?.replace(/\/$/, '')
  : undefined;
async function request(path: string, signal?: AbortSignal) {
  if (!catalogUrl) throw new Error('Live catalog is not configured.');
  const response = await fetch(`${catalogUrl}${path}`, { signal });
  const data: unknown = await response.json();
  if (!response.ok) {
    const error = apiErrorSchema.safeParse(data);
    throw new Error(error.success ? error.data.message : 'Catalog is temporarily unavailable.');
  }
  return data;
}
export async function searchCatalog(query: CatalogQuery, signal?: AbortSignal) {
  const params = new URLSearchParams({
    query: query.query,
    kind: query.kind,
    page: String(query.page),
  });
  if (query.genre) params.set('genre', query.genre);
  if (query.maxRuntime !== null) params.set('maxRuntime', String(query.maxRuntime));
  return catalogPageSchema.parse(await request(`/catalog?${params}`, signal));
}
export async function loadCatalogDetail(id: string, signal?: AbortSignal) {
  const data = (await request(`/media/${encodeURIComponent(id)}`, signal)) as {
    media?: unknown;
    stale?: boolean;
  };
  return { media: mediaSchema.parse(data.media), stale: data.stale === true };
}
