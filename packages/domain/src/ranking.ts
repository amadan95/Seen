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

export interface RankingAnalysis {
  snapshot: RankSnapshot;
  scores: Map<string, number>;
  components: Map<string, number>;
}
export function analyzeRanking(
  catalog: Media[],
  library: Library,
  kind: MediaKind,
): RankingAnalysis {
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
    scores: fit.scores,
    components: new Map(
      components.flatMap((component, index) => [...component].map((id) => [id, index] as const)),
    ),
    snapshot: {
      kind,
      sourceRevision: library.revision,
      modelVersion: MODEL.version,
      scoreScaleVersion: MODEL.scale,
      items,
    },
  };
}

export function buildSnapshot(catalog: Media[], library: Library, kind: MediaKind): RankSnapshot {
  return analyzeRanking(catalog, library, kind).snapshot;
}

/** Metadata and unrelated library mutations are deliberately absent from this key. */
export function rankingInputKey(catalog: Media[], library: Library, kind: MediaKind): string {
  const media = new Map(
    catalog.filter((item) => item.kind === kind).map((item) => [item.id, item]),
  );
  const opinions = library.opinions.filter(
    (o) => media.has(o.mediaId) && isEligible(o, media.get(o.mediaId)!),
  );
  const ids = new Set(opinions.map((o) => o.mediaId));
  return JSON.stringify([
    MODEL.version,
    MODEL.scale,
    opinions
      .map((o) => [o.mediaId, o.sentiment, o.revision])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    activeComparisons(opinions, library.comparisons)
      .filter((c) => ids.has(c.a) && ids.has(c.b))
      .map((c) => [c.a, c.b, c.aRevision, c.bRevision, c.outcome])
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  ]);
}

export interface RankingState {
  analysis: RankingAnalysis;
  key: string;
  error: string | null;
}
export class RankingCache {
  private states = new Map<MediaKind, RankingState>();
  constructor(private fit = analyzeRanking) {}
  update(catalog: Media[], library: Library, retry = false): void {
    for (const kind of ['movie', 'tv'] as const) {
      const key = rankingInputKey(catalog, library, kind),
        previous = this.states.get(kind);
      if (previous?.key === key && (!retry || !previous.error)) continue;
      try {
        this.states.set(kind, { key, analysis: this.fit(catalog, library, kind), error: null });
      } catch {
        const lookup = new Map(catalog.map((m) => [m.id, m]));
        const eligible = library.opinions.filter(
          (o) => lookup.get(o.mediaId)?.kind === kind && isEligible(o, lookup.get(o.mediaId)!),
        );
        const edges = activeComparisons(eligible, library.comparisons);
        const compared = new Set(edges.flatMap((c) => [c.a, c.b]));
        const old = previous?.analysis.snapshot;
        const items = eligible
          .map((o) => {
            const confirmed = old?.items.find((item) => item.mediaId === o.mediaId);
            return compared.has(o.mediaId) && confirmed
              ? confirmed
              : {
                  mediaId: o.mediaId,
                  position: null,
                  rankScore: null,
                  opponents: 0,
                  evidence: 'unplaced' as const,
                };
          })
          .sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity));
        let position = 0;
        const snapshot = {
          kind,
          sourceRevision: old?.sourceRevision ?? library.revision,
          modelVersion: MODEL.version,
          scoreScaleVersion: MODEL.scale,
          items: items.map((item) =>
            item.position === null ? item : { ...item, position: ++position },
          ),
        };
        this.states.set(kind, {
          key,
          analysis: { snapshot, scores: new Map(), components: new Map() },
          error: 'Your watch is saved. Ranking could not update. Retry to finish placing it.',
        });
      }
    }
  }
  get(kind: MediaKind): RankingState {
    const result = this.states.get(kind);
    if (!result) throw new Error('Rankings are still loading');
    return result;
  }
}

export const PICKER_VERSION = 'adaptive-preview-v2';
export const pairKey = (a: string, b: string): string => [a, b].sort().join('|');
export function seededNumber(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return (hash >>> 0) / 4294967296;
}
export interface PickerOptions {
  analysis?: RankingAnalysis;
  seed?: string;
  served?: number;
  now?: string;
  reconsider?: boolean;
  mode?: 'placement' | 'refine';
}
export interface PickedComparison {
  pair: [Media, Media];
  reason: string;
}
/** Bounded candidates; same-format eligibility. Server-offered sessions remain a production gate. */
export function chooseComparison(
  catalog: Media[],
  library: Library,
  kind: MediaKind,
  excluded: Set<string>,
  target?: string,
  options: PickerOptions = {},
): PickedComparison | null {
  const analysis = options.analysis ?? analyzeRanking(catalog, library, kind);
  const eligible = analysis.snapshot.items,
    lookup = new Map(catalog.map((m) => [m.id, m]));
  if (target && !eligible.some((item) => item.mediaId === target)) return null;
  const opinions = new Map(library.opinions.map((o) => [o.mediaId, o]));
  const active = new Set(
    activeComparisons(library.opinions, library.comparisons).map((c) => pairKey(c.a, c.b)),
  );
  const cooling = new Set(
    library.comparisonCooldowns
      .filter((c) => {
        const [a, b] = c.key.split('|');
        return (
          options.now &&
          c.until > options.now &&
          opinions.get(a!)?.revision === c.aRevision &&
          opinions.get(b!)?.revision === c.bRevision
        );
      })
      .map((c) => c.key),
  );
  const score = (id: string) =>
    analysis.scores.get(id) ??
    (opinions.get(id)?.sentiment === 'liked'
      ? 1
      : opinions.get(id)?.sentiment === 'disliked'
        ? -1
        : 0);
  const allowed = (a: string, b: string) =>
    a !== b &&
    !excluded.has(pairKey(a, b)) &&
    (options.reconsider || (!active.has(pairKey(a, b)) && !cooling.has(pairKey(a, b))));
  const bridge = (a: string, b: string) =>
    analysis.components.get(a) !== analysis.components.get(b);
  const finish = (a: string, b: string, reason: string): PickedComparison => ({
    pair:
      options.seed && seededNumber(`${options.seed}:${options.served ?? 0}:${pairKey(a, b)}`) < 0.5
        ? [lookup.get(b)!, lookup.get(a)!]
        : [lookup.get(a)!, lookup.get(b)!],
    reason,
  });
  const priority = (a: (typeof eligible)[number], b: (typeof eligible)[number]) => {
    const p = sigmoid(score(a.mediaId) - score(b.mediaId));
    const coverage = 0.5 / (1 + a.opponents) + 0.5 / (1 + b.opponents);
    const boundary = [a, b].some((i) => i.position !== null && Math.abs(i.position - 10) <= 2)
      ? 1
      : 0;
    return 0.65 * 4 * p * (1 - p) + 0.25 * coverage + 0.1 * boundary;
  };
  const focusOrder = target
    ? eligible.filter((i) => i.mediaId === target)
    : [...eligible].sort(
        (a, b) =>
          Number(b.position === null) - Number(a.position === null) ||
          a.opponents - b.opponents ||
          a.mediaId.localeCompare(b.mediaId),
      );
  const anchors = [...eligible].sort(
    (a, b) => score(a.mediaId) - score(b.mediaId) || a.mediaId.localeCompare(b.mediaId),
  );
  // Up to 24 candidate opponents per focus, and 24 focus probes for general refinement.
  const bridgeTurn = ((options.served ?? 0) + 1) % 5 === 0;
  for (const bridgeOnly of bridgeTurn ? [true, false] : [false]) {
    for (const focus of focusOrder.slice(0, target ? 1 : 24)) {
      const nearby = eligible
        .filter((i) => allowed(focus.mediaId, i.mediaId))
        .sort(
          (a, b) =>
            Math.abs(score(a.mediaId) - score(focus.mediaId)) -
              Math.abs(score(b.mediaId) - score(focus.mediaId)) ||
            a.mediaId.localeCompare(b.mediaId),
        );
      const pool = new Map(nearby.slice(0, 12).map((i) => [i.mediaId, i]));
      for (let q = 0; q < 8; q++) {
        const anchor = anchors[Math.floor((q * (anchors.length - 1)) / 7)];
        if (anchor && allowed(focus.mediaId, anchor.mediaId)) pool.set(anchor.mediaId, anchor);
      }
      for (const item of nearby.filter((i) => bridge(focus.mediaId, i.mediaId)).slice(0, 4))
        pool.set(item.mediaId, item);
      const candidates = [...pool.values()];
      if (!candidates.length) continue;
      if (bridgeOnly) {
        const other = candidates
          .filter((i) => bridge(focus.mediaId, i.mediaId))
          .sort(
            (a, b) =>
              Math.abs(score(a.mediaId) - score(focus.mediaId)) -
                Math.abs(score(b.mediaId) - score(focus.mediaId)) ||
              a.mediaId.localeCompare(b.mediaId),
          )[0];
        if (other) return finish(focus.mediaId, other.mediaId, 'component_bridge');
        continue;
      }
      if (target && options.mode !== 'refine') {
        const genres = new Set(lookup.get(target)!.genres);
        const shared = (i: typeof focus) =>
          lookup.get(i.mediaId)!.genres.filter((g) => genres.has(g)).length;
        candidates.sort(
          (a, b) =>
            Number(b.position !== null) - Number(a.position !== null) ||
            shared(b) - shared(a) ||
            Math.abs(score(a.mediaId) - score(target)) -
              Math.abs(score(b.mediaId) - score(target)) ||
            a.mediaId.localeCompare(b.mediaId),
        );
      } else
        candidates.sort(
          (a, b) => priority(focus, b) - priority(focus, a) || a.mediaId.localeCompare(b.mediaId),
        );
      return finish(
        focus.mediaId,
        candidates[0]!.mediaId,
        target ? 'targeted_placement' : 'ambiguity_coverage',
      );
    }
  }
  return null;
}
export function pickComparison(
  catalog: Media[],
  library: Library,
  kind: MediaKind,
  excluded: Set<string>,
  target?: string,
  options: PickerOptions = {},
): [Media, Media] | null {
  return chooseComparison(catalog, library, kind, excluded, target, options)?.pair ?? null;
}
