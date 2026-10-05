import type { Comparison, Library, Media, MediaKind, Opinion, RankSnapshot } from '@seen/contracts';

export const MODEL = Object.freeze({
  version: 'bt-regularized-v1',
  scale: 'bt-logistic-10-v1',
  lambda: 0.25,
  maxIterations: 300,
  tolerance: 1e-5,
  nearEqual: 0.15,
});
export function sigmoid(x: number): number {
  if (x >= 0) return 1 / (1 + Math.exp(-x));
  const e = Math.exp(x);
  return e / (1 + e);
}
const softplus = (x: number): number => Math.max(x, 0) + Math.log1p(Math.exp(-Math.abs(x)));
export function rankScore(latent: number): number {
  if (!Number.isFinite(latent)) throw new Error('Nonfinite ranking score');
  return Math.max(0, Math.min(100, Math.floor(100 * sigmoid(latent) + 0.5))) / 10;
}
export function isEligible(opinion: Opinion, media: Media): boolean {
  return opinion.sentiment !== null && (media.kind === 'movie' || opinion.seenEnough);
}
export interface FitTitle {
  id: string;
  prior: number;
}
export interface FitEdge {
  a: string;
  b: string;
  y: number;
}
export interface FitResult {
  scores: Map<string, number>;
  iterations: number;
  converged: boolean;
  gradientNorm: number;
}

/** No I/O, globals, native modules, dense matrices, or order-dependent updates. */
export function fitBradleyTerry(inputTitles: FitTitle[], inputEdges: FitEdge[]): FitResult {
  const titles = [...inputTitles].sort((a, b) => a.id.localeCompare(b.id));
  const index = new Map(titles.map((t, i) => [t.id, i]));
  if (index.size !== titles.length) throw new Error('Duplicate ranking identity');
  const edges = [...inputEdges]
    .sort((a, b) => a.a.localeCompare(b.a) || a.b.localeCompare(b.b))
    .map((e) => {
      const a = index.get(e.a),
        b = index.get(e.b);
      if (
        a === undefined ||
        b === undefined ||
        a === b ||
        !Number.isFinite(e.y) ||
        e.y < 0 ||
        e.y > 1
      )
        throw new Error('Invalid comparison');
      return { a, b, y: e.y };
    });
  if (titles.some((t) => !Number.isFinite(t.prior))) throw new Error('Invalid prior');
  const evaluate = (s: number[]) => {
    const gradient = titles.map((t, i) => MODEL.lambda * (s[i]! - t.prior));
    let objective = titles.reduce(
      (sum, t, i) => sum + (MODEL.lambda / 2) * (s[i]! - t.prior) ** 2,
      0,
    );
    for (const edge of edges) {
      const diff = s[edge.a]! - s[edge.b]!;
      objective += softplus(diff) - edge.y * diff;
      const g = sigmoid(diff) - edge.y;
      gradient[edge.a]! += g;
      gradient[edge.b]! -= g;
    }
    return { objective, gradient };
  };
  let s = titles.map((t) => t.prior),
    iterations = 0,
    gradientNorm: number;
  for (; iterations < MODEL.maxIterations; iterations++) {
    const current = evaluate(s);
    gradientNorm = current.gradient.reduce((max, g) => Math.max(max, Math.abs(g)), 0);
    if (gradientNorm < MODEL.tolerance) break;
    const norm2 = current.gradient.reduce((sum, g) => sum + g * g, 0);
    let step = 1,
      accepted = false;
    for (let backtrack = 0; backtrack < 40; backtrack++) {
      const candidate = s.map((value, i) => value - step * current.gradient[i]!);
      if (evaluate(candidate).objective <= current.objective - 1e-4 * step * norm2) {
        s = candidate;
        accepted = true;
        break;
      }
      step *= 0.5;
    }
    if (!accepted) break;
  }
  gradientNorm = evaluate(s).gradient.reduce((max, g) => Math.max(max, Math.abs(g)), 0);
  return {
    scores: new Map(titles.map((t, i) => [t.id, s[i]!])),
    iterations,
    converged: gradientNorm < MODEL.tolerance && s.every(Number.isFinite),
    gradientNorm,
  };
}

export function activeComparisons(opinions: Opinion[], comparisons: Comparison[]): Comparison[] {
  const lookup = new Map(opinions.map((o) => [o.mediaId, o]));
  const latest = new Map<string, Comparison>();
  for (const c of comparisons) {
    const a = lookup.get(c.a),
      b = lookup.get(c.b);
    if (a?.revision === c.aRevision && b?.revision === c.bRevision && c.a !== c.b) {
      latest.set([c.a, c.b].sort().join('|'), c);
    }
  }
  return [...latest.values()];
}

export function buildSnapshot(catalog: Media[], library: Library, kind: MediaKind): RankSnapshot {
  const media = new Map(catalog.filter((m) => m.kind === kind).map((m) => [m.id, m]));
  const opinions = library.opinions.filter(
    (o) => media.has(o.mediaId) && isEligible(o, media.get(o.mediaId)!),
  );
  const ids = new Set(opinions.map((o) => o.mediaId));
  const comparisons = activeComparisons(opinions, library.comparisons).filter(
    (c) => ids.has(c.a) && ids.has(c.b),
  );
  const edges = comparisons.map((c) => ({
    a: c.a,
    b: c.b,
    y: c.outcome === 'similar' ? 0.5 : c.outcome === 'a_wins' ? 1 : 0,
  }));
  const fit = fitBradleyTerry(
    opinions.map((o) => ({
      id: o.mediaId,
      prior: o.sentiment === 'liked' ? 1 : o.sentiment === 'disliked' ? -1 : 0,
    })),
    edges,
  );
  if (!fit.converged) throw new Error('Ranking fit did not converge; preserve the prior snapshot');
  const neighbors = new Map(opinions.map((o) => [o.mediaId, new Set<string>()]));
  for (const edge of edges) {
    neighbors.get(edge.a)!.add(edge.b);
    neighbors.get(edge.b)!.add(edge.a);
  }
  const components: Set<string>[] = [],
    visited = new Set<string>();
  for (const id of [...ids].sort()) {
    if (visited.has(id)) continue;
    const component = new Set<string>(),
      pending = [id];
    while (pending.length) {
      const next = pending.pop()!;
      if (visited.has(next)) continue;
      visited.add(next);
      component.add(next);
      pending.push(...neighbors.get(next)!);
    }
    components.push(component);
  }
  components.sort((a, b) => b.size - a.size);
  const main = components[0] ?? new Set<string>();
  const placed = opinions
    .filter((o) => neighbors.get(o.mediaId)!.size > 0)
    .sort(
      (a, b) =>
        fit.scores.get(b.mediaId)! - fit.scores.get(a.mediaId)! ||
        a.mediaId.localeCompare(b.mediaId),
    );
  const items: RankSnapshot['items'] = placed.map((o, index) => {
    const score = fit.scores.get(o.mediaId)!;
    const close = [placed[index - 1], placed[index + 1]].some(
      (other) => other && Math.abs(score - fit.scores.get(other.mediaId)!) < MODEL.nearEqual,
    );
    const opponents = neighbors.get(o.mediaId)!.size;
    return {
      mediaId: o.mediaId,
      position: index + 1,
      rankScore: rankScore(score),
      opponents,
      evidence: opponents < 5 || !main.has(o.mediaId) || close ? 'provisional' : 'refined',
    };
  });
  const order = { liked: 2, fine: 1, disliked: 0 };
  opinions
    .filter((o) => neighbors.get(o.mediaId)!.size === 0)
    .sort((a, b) => order[b.sentiment!] - order[a.sentiment!] || a.mediaId.localeCompare(b.mediaId))
    .forEach((o) =>
      items.push({
        mediaId: o.mediaId,
        position: null,
        rankScore: null,
        evidence: 'unplaced',
        opponents: 0,
      }),
    );
  return {
    kind,
    sourceRevision: library.revision,
    modelVersion: MODEL.version,
    scoreScaleVersion: MODEL.scale,
    items,
  };
}

/** Preview picker: bounded pool, current evidence exclusions, same-format eligibility. Server sessions are task 11. */
export function pickComparison(
  catalog: Media[],
  library: Library,
  kind: MediaKind,
  excluded: Set<string>,
  target?: string,
): [Media, Media] | null {
  const snapshot = buildSnapshot(catalog, library, kind);
  const lookup = new Map(catalog.map((m) => [m.id, m]));
  const eligible = snapshot.items;
  if (target && !eligible.some((item) => item.mediaId === target)) return null;
  const active = new Set(
    activeComparisons(library.opinions, library.comparisons).map((c) =>
      [c.a, c.b].sort().join('|'),
    ),
  );
  const focus =
    eligible.find((i) => i.mediaId === target) ??
    eligible.find((i) => i.position === null) ??
    [...eligible].sort((a, b) => a.opponents - b.opponents)[0];
  if (!focus) return null;
  function candidatesFor(focus: (typeof eligible)[number]) {
    const candidates = eligible.filter(
      (i) =>
        i.mediaId !== focus.mediaId &&
        !excluded.has([i.mediaId, focus.mediaId].sort().join('|')) &&
        !active.has([i.mediaId, focus.mediaId].sort().join('|')),
    );
    candidates.sort((a, b) => {
      const sentiment = library.opinions.find((item) => item.mediaId === focus.mediaId)?.sentiment;
      const expected =
        focus.rankScore ?? rankScore(sentiment === 'liked' ? 1 : sentiment === 'disliked' ? -1 : 0);
      const genres = new Set(lookup.get(focus.mediaId)!.genres);
      const shared = (item: typeof a) =>
        lookup.get(item.mediaId)!.genres.filter((genre) => genres.has(genre)).length;
      const gap = (item: typeof a) => Math.abs((item.rankScore ?? expected) - expected);
      return (
        Number(b.rankScore !== null) - Number(a.rankScore !== null) ||
        shared(b) - shared(a) ||
        gap(a) - gap(b) ||
        a.opponents - b.opponents ||
        a.mediaId.localeCompare(b.mediaId)
      );
    });
    return candidates;
  }
  const opponent = candidatesFor(focus)[0];
  if (opponent) return [lookup.get(focus.mediaId)!, lookup.get(opponent.mediaId)!];
  if (target) return null;
  for (const item of eligible) {
    if (item.mediaId === focus.mediaId) continue;
    const other = candidatesFor(item)[0];
    if (other) return [lookup.get(item.mediaId)!, lookup.get(other.mediaId)!];
  }
  return null;
}
