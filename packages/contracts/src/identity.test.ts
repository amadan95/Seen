import { describe, expect, it } from 'vitest';
import { bootstrapProfileSchema, usernameSchema } from './identity.ts';
import { librarySchema } from './index.ts';

describe('identity boundary', () => {
  it('canonicalizes usernames and rejects actor injection', () => {
    expect(usernameSchema.parse(' Owner_Name ')).toBe('owner_name');
    expect(
      bootstrapProfileSchema.safeParse({
        username: 'owner_name',
        display_name: 'Owner',
        user_id: 'injected',
      }).success,
    ).toBe(false);
  });
  it('reads existing preview libraries with no catalog field', () => {
    const previous = {
      schemaVersion: 1,
      onboarded: false,
      revision: 0,
      opinions: [],
      logs: [],
      comparisons: [],
      watchlist: [],
    };
    expect(librarySchema.parse(previous).catalogEntries).toEqual([]);
  });
});
