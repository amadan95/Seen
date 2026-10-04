import { fitBradleyTerry, rankScore } from './domain.bundle.js';
Deno.test('shared bundled domain executes under Deno', () => {
  const fit = fitBradleyTerry(
    [
      { id: 'a', prior: 0 },
      { id: 'b', prior: 0 },
    ],
    [{ a: 'a', b: 'b', y: 1 }],
  );
  if (!fit.converged || rankScore(fit.scores.get('a')!) <= rankScore(fit.scores.get('b')!))
    throw new Error('Shared runtime smoke failed');
});
