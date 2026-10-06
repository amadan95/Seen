import type { Availability } from '@seen/contracts';

type Offer = Availability['offers'][number];
export type ViewingGroup = 'stream' | 'rent' | 'buy';

// Display brands, not parent corporations: Disney+ and Hulu remain separate services.
// Channel listings are grouped with the service they carry, rather than the reseller.
const brands: [RegExp, string][] = [
  [/^paramount\s*(?:\+|plus)(?:\s|$)/i, 'Paramount+'],
  [/^peacock(?:\s|$)/i, 'Peacock'],
  [/^netflix(?:\s|$)/i, 'Netflix'],
  [/^(?:hbo\s+)?max(?:\s|$)/i, 'Max'],
  [/^disney\s*(?:\+|plus)(?:\s|$)/i, 'Disney+'],
  [/^hulu(?:\s|$)/i, 'Hulu'],
  [/^apple\s+tv(?:\s|\+|$)/i, 'Apple TV'],
  [/^(?:amazon\s+)?prime\s+video(?:\s|$)/i, 'Prime Video'],
  [/^crunchyroll(?:\s|$)/i, 'Crunchyroll'],
  [/^discovery\s*(?:\+|plus)(?:\s|$)/i, 'Discovery+'],
  [/^starz(?:\s|$)/i, 'Starz'],
  [/^amc\s*(?:\+|plus)(?:\s|$)/i, 'AMC+'],
  [/^britbox(?:\s|$)/i, 'BritBox'],
  [/^mgm\s*(?:\+|plus)(?:\s|$)/i, 'MGM+'],
  [/^shudder(?:\s|$)/i, 'Shudder'],
];

export function providerCompany(name: string): string {
  const cleaned = name.trim().replace(/\s+/g, ' ');
  return brands.find(([pattern]) => pattern.test(cleaned))?.[1] ?? cleaned;
}

/** Company-level presentation only; the source offers and entitlements stay intact. */
export function groupViewingProviders(offers: Offer[], group: ViewingGroup) {
  const providers = new Map<
    string,
    { name: string; logoUrl: string | null; types: Offer['type'][] }
  >();
  for (const offer of offers) {
    if (
      group === 'stream'
        ? !['subscription', 'free', 'ads'].includes(offer.type)
        : offer.type !== group
    )
      continue;
    const name = providerCompany(offer.name);
    const key = name.toLocaleLowerCase('en-US');
    const existing = providers.get(key);
    if (existing) {
      if (!existing.types.includes(offer.type)) existing.types.push(offer.type);
      if (offer.logoUrl && (!existing.logoUrl || offer.name.trim() === name))
        existing.logoUrl = offer.logoUrl;
    } else providers.set(key, { name, logoUrl: offer.logoUrl, types: [offer.type] });
  }
  return [...providers.values()];
}
