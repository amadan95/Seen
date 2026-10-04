export function rankScore(latent: number): number;
export function fitBradleyTerry(
  titles: { id: string; prior: number }[],
  edges: { a: string; b: string; y: number }[],
): {
  scores: Map<string, number>;
  iterations: number;
  converged: boolean;
  gradientNorm: number;
};
