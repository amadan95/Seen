import { describe, expect, it } from 'vitest';
import type { Availability } from '@seen/contracts';
import { groupViewingProviders } from './availability';
const offer = (
  providerId: number,
  name: string,
  type: Availability['offers'][number]['type'] = 'subscription',
  logoUrl: string | null = null,
) => ({ providerId, name, type, logoUrl });
describe('company-level viewing options', () => {
  it('collapses subscription tiers and channel variants into their service brand', () => {
    const offers = [
      offer(1, 'Paramount Plus Premium'),
      offer(2, 'Paramount Plus Essential'),
      offer(3, 'Paramount+ Amazon Channel'),
      offer(4, 'Paramount+ Roku Premium Channel'),
      offer(5, 'Peacock Premium'),
      offer(6, 'Peacock Premium Plus'),
    ];
    expect(groupViewingProviders(offers, 'stream').map((provider) => provider.name)).toEqual([
      'Paramount+',
      'Peacock',
    ]);
    expect(offers).toHaveLength(6);
  });
  it('keeps viewing groups separate and retains all access types without duplicates', () => {
    const offers = [
      offer(1, 'Netflix'),
      offer(2, 'Netflix with Ads', 'ads'),
      offer(3, 'Netflix', 'free'),
      offer(4, 'Netflix', 'rent'),
      offer(5, 'Netflix', 'buy'),
    ];
    expect(groupViewingProviders(offers, 'stream')).toEqual([
      { name: 'Netflix', logoUrl: null, types: ['subscription', 'ads', 'free'] },
    ]);
    expect(groupViewingProviders(offers, 'rent')[0]?.types).toEqual(['rent']);
    expect(groupViewingProviders(offers, 'buy')[0]?.types).toEqual(['buy']);
  });
  it('uses the base service logo where present and preserves distinct and unknown services', () => {
    const offers = [
      offer(1, 'Paramount+ Amazon Channel', 'subscription', 'https://example.com/channel.png'),
      offer(2, 'Paramount+', 'subscription', 'https://example.com/base.png'),
      offer(3, 'Prime Video'),
      offer(4, 'Disney+'),
      offer(5, 'Hulu'),
      offer(6, 'Independent Cinema'),
      offer(7, 'Independent Cinema Plus'),
    ];
    expect(groupViewingProviders(offers, 'stream').map((provider) => provider.name)).toEqual([
      'Paramount+',
      'Prime Video',
      'Disney+',
      'Hulu',
      'Independent Cinema',
      'Independent Cinema Plus',
    ]);
    expect(groupViewingProviders(offers, 'stream')[0]?.logoUrl).toBe(
      'https://example.com/base.png',
    );
    expect(groupViewingProviders([], 'stream')).toEqual([]);
  });
});
