import type { MediaKind } from '@seen/contracts';

/** Supplier references for real titles in the preview; never replace saved local IDs. */
export const previewTitles: Record<string, { kind: MediaKind; externalId: number }> = {
  arrival: { kind: 'movie', externalId: 329865 },
  parasite: { kind: 'movie', externalId: 496243 },
  godfather: { kind: 'movie', externalId: 238 },
  dune: { kind: 'movie', externalId: 693134 },
  whiplash: { kind: 'movie', externalId: 244786 },
  oppenheimer: { kind: 'movie', externalId: 872585 },
  moon: { kind: 'movie', externalId: 17431 },
  'grand-budapest': { kind: 'movie', externalId: 120467 },
  truman: { kind: 'movie', externalId: 37165 },
  fox: { kind: 'movie', externalId: 10315 },
  zodiac: { kind: 'movie', externalId: 1949 },
  severance: { kind: 'tv', externalId: 95396 },
  sopranos: { kind: 'tv', externalId: 1398 },
  'breaking-bad': { kind: 'tv', externalId: 1396 },
  bear: { kind: 'tv', externalId: 136315 },
};
