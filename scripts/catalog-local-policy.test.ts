import { describe, expect, it } from 'vitest';
import { isLocalCatalogOrigin } from './catalog-local-policy';
describe('local catalog browser origins', () => {
  it('accepts the supported local Metro and verification ports', () => {
    for (const host of ['localhost', '127.0.0.1'])
      for (const port of [8081, 8082, 8083, 8092])
        expect(isLocalCatalogOrigin(`http://${host}:${port}`)).toBe(true);
  });
  it('rejects remote, spoofed, unlisted and malformed origins', () => {
    for (const origin of [
      'https://example.com',
      'http://localhost:9000',
      'http://localhost.example.com:8092',
      'http://localhost:8092@evil.example',
      'null',
      'http://localhost:8092/path',
      'https://localhost:8092',
    ])
      expect(isLocalCatalogOrigin(origin)).toBe(false);
  });
});
