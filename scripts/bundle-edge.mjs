import { build } from 'esbuild';
await build({
  entryPoints: ['packages/domain/src/index.ts'],
  bundle: true,
  platform: 'neutral',
  format: 'esm',
  target: 'es2022',
  outfile: 'supabase/functions/preview-smoke/domain.bundle.js',
  packages: 'bundle',
});
console.log('Bundled the single-copy pure domain source for the Deno Edge runtime.');
