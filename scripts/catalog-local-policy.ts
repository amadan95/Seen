// Explicit local preview ports only; never accept arbitrary remote origins.
export function isLocalCatalogOrigin(origin: string): boolean {
  return /^http:\/\/(localhost|127\.0\.0\.1):(8081|8082|8083|8092)$/.test(origin);
}
