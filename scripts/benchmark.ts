import { fitBradleyTerry } from '../packages/domain/src/ranking';
const titles = Array.from({ length: 2000 }, (_, i) => ({
  id: `title-${String(i).padStart(4, '0')}`,
  prior: (i % 3) - 1,
}));
const edges = Array.from({ length: 10000 }, (_, i) => ({
  a: titles[i % 2000]!.id,
  b: titles[((i % 2000) + 1 + Math.floor(i / 2000) * 7) % 2000]!.id,
  y: i % 3 === 0 ? 0.5 : i % 2,
}));
const start = performance.now(),
  fit = fitBradleyTerry(titles, edges);
console.log(
  JSON.stringify({
    titles: titles.length,
    pairs: edges.length,
    elapsedMs: Math.round((performance.now() - start) * 10) / 10,
    iterations: fit.iterations,
    converged: fit.converged,
    gradientNorm: fit.gradientNorm,
  }),
);
if (!fit.converged) process.exitCode = 1;
