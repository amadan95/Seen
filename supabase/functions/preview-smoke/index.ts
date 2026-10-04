// Deployment portability smoke only. No user data, service-role client, or vendor I/O.
import { rankScore, fitBradleyTerry } from './domain.bundle.js';
Deno.serve((request: Request) => {
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
  const fit = fitBradleyTerry(
    [
      { id: 'a', prior: 0 },
      { id: 'b', prior: 0 },
    ],
    [{ a: 'a', b: 'b', y: 1 }],
  );
  return Response.json({
    ok: fit.converged,
    model: 'bt-regularized-v1',
    scoreScale: 'bt-logistic-10-v1',
    score: rankScore(fit.scores.get('a')!),
    scope: 'synthetic-smoke-only',
  });
});
