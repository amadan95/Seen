// packages/domain/src/ranking.ts
var MODEL = Object.freeze({
  version: "bt-regularized-v1",
  scale: "bt-logistic-10-v1",
  lambda: 0.25,
  maxIterations: 300,
  tolerance: 1e-5,
  nearEqual: 0.15
});
function sigmoid(x) {
  if (x >= 0) return 1 / (1 + Math.exp(-x));
  const e = Math.exp(x);
  return e / (1 + e);
}
var softplus = (x) => Math.max(x, 0) + Math.log1p(Math.exp(-Math.abs(x)));
function rankScore(latent) {
  if (!Number.isFinite(latent)) throw new Error("Nonfinite ranking score");
  return Math.max(0, Math.min(100, Math.floor(100 * sigmoid(latent) + 0.5))) / 10;
}
function isEligible(opinion, media) {
  return opinion.sentiment !== null && (media.kind === "movie" || opinion.seenEnough);
}
function fitBradleyTerry(inputTitles, inputEdges) {
  const titles = [...inputTitles].sort((a, b) => a.id.localeCompare(b.id));
  const index = new Map(titles.map((t, i) => [t.id, i]));
  if (index.size !== titles.length) throw new Error("Duplicate ranking identity");
  const edges = [...inputEdges].sort((a, b) => a.a.localeCompare(b.a) || a.b.localeCompare(b.b)).map((e) => {
    const a = index.get(e.a), b = index.get(e.b);
    if (a === void 0 || b === void 0 || a === b || !Number.isFinite(e.y) || e.y < 0 || e.y > 1)
      throw new Error("Invalid comparison");
    return { a, b, y: e.y };
  });
  if (titles.some((t) => !Number.isFinite(t.prior))) throw new Error("Invalid prior");
  const evaluate = (s2) => {
    const gradient = titles.map((t, i) => MODEL.lambda * (s2[i] - t.prior));
    let objective = titles.reduce(
      (sum, t, i) => sum + MODEL.lambda / 2 * (s2[i] - t.prior) ** 2,
      0
    );
    for (const edge of edges) {
      const diff = s2[edge.a] - s2[edge.b];
      objective += softplus(diff) - edge.y * diff;
      const g = sigmoid(diff) - edge.y;
      gradient[edge.a] += g;
      gradient[edge.b] -= g;
    }
    return { objective, gradient };
  };
  let s = titles.map((t) => t.prior), iterations = 0, gradientNorm;
  for (; iterations < MODEL.maxIterations; iterations++) {
    const current = evaluate(s);
    gradientNorm = current.gradient.reduce((max, g) => Math.max(max, Math.abs(g)), 0);
    if (gradientNorm < MODEL.tolerance) break;
    const norm2 = current.gradient.reduce((sum, g) => sum + g * g, 0);
    let step = 1, accepted = false;
    for (let backtrack = 0; backtrack < 40; backtrack++) {
      const candidate = s.map((value, i) => value - step * current.gradient[i]);
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
    scores: new Map(titles.map((t, i) => [t.id, s[i]])),
    iterations,
    converged: gradientNorm < MODEL.tolerance && s.every(Number.isFinite),
    gradientNorm
  };
}
function activeComparisons(opinions, comparisons) {
  const lookup = new Map(opinions.map((o) => [o.mediaId, o]));
  const latest = /* @__PURE__ */ new Map();
  for (const c of comparisons) {
    const a = lookup.get(c.a), b = lookup.get(c.b);
    if (a?.revision === c.aRevision && b?.revision === c.bRevision && c.a !== c.b) {
      latest.set([c.a, c.b].sort().join("|"), c);
    }
  }
  return [...latest.values()];
}
function analyzeRanking(catalog, library, kind) {
  const media = new Map(catalog.filter((m) => m.kind === kind).map((m) => [m.id, m]));
  const opinions = library.opinions.filter(
    (o) => media.has(o.mediaId) && isEligible(o, media.get(o.mediaId))
  );
  const ids = new Set(opinions.map((o) => o.mediaId));
  const comparisons = activeComparisons(opinions, library.comparisons).filter(
    (c) => ids.has(c.a) && ids.has(c.b)
  );
  const edges = comparisons.map((c) => ({
    a: c.a,
    b: c.b,
    y: c.outcome === "similar" ? 0.5 : c.outcome === "a_wins" ? 1 : 0
  }));
  const fit = fitBradleyTerry(
    opinions.map((o) => ({
      id: o.mediaId,
      prior: o.sentiment === "liked" ? 1 : o.sentiment === "disliked" ? -1 : 0
    })),
    edges
  );
  if (!fit.converged) throw new Error("Ranking fit did not converge; preserve the prior snapshot");
  const neighbors = new Map(opinions.map((o) => [o.mediaId, /* @__PURE__ */ new Set()]));
  for (const edge of edges) {
    neighbors.get(edge.a).add(edge.b);
    neighbors.get(edge.b).add(edge.a);
  }
  const components = [], visited = /* @__PURE__ */ new Set();
  for (const id of [...ids].sort()) {
    if (visited.has(id)) continue;
    const component = /* @__PURE__ */ new Set(), pending = [id];
    while (pending.length) {
      const next = pending.pop();
      if (visited.has(next)) continue;
      visited.add(next);
      component.add(next);
      pending.push(...neighbors.get(next));
    }
    components.push(component);
  }
  components.sort((a, b) => b.size - a.size);
  const main = components[0] ?? /* @__PURE__ */ new Set();
  const placed = opinions.filter((o) => neighbors.get(o.mediaId).size > 0).sort(
    (a, b) => fit.scores.get(b.mediaId) - fit.scores.get(a.mediaId) || a.mediaId.localeCompare(b.mediaId)
  );
  const items = placed.map((o, index) => {
    const score = fit.scores.get(o.mediaId);
    const close = [placed[index - 1], placed[index + 1]].some(
      (other) => other && Math.abs(score - fit.scores.get(other.mediaId)) < MODEL.nearEqual
    );
    const opponents = neighbors.get(o.mediaId).size;
    return {
      mediaId: o.mediaId,
      position: index + 1,
      rankScore: rankScore(score),
      opponents,
      evidence: opponents < 5 || !main.has(o.mediaId) || close ? "provisional" : "refined"
    };
  });
  const order = { liked: 2, fine: 1, disliked: 0 };
  opinions.filter((o) => neighbors.get(o.mediaId).size === 0).sort((a, b) => order[b.sentiment] - order[a.sentiment] || a.mediaId.localeCompare(b.mediaId)).forEach(
    (o) => items.push({
      mediaId: o.mediaId,
      position: null,
      rankScore: null,
      evidence: "unplaced",
      opponents: 0
    })
  );
  return {
    scores: fit.scores,
    components: new Map(
      components.flatMap((component, index) => [...component].map((id) => [id, index]))
    ),
    snapshot: {
      kind,
      sourceRevision: library.revision,
      modelVersion: MODEL.version,
      scoreScaleVersion: MODEL.scale,
      items
    }
  };
}
function buildSnapshot(catalog, library, kind) {
  return analyzeRanking(catalog, library, kind).snapshot;
}
function rankingInputKey(catalog, library, kind) {
  const media = new Map(
    catalog.filter((item) => item.kind === kind).map((item) => [item.id, item])
  );
  const opinions = library.opinions.filter(
    (o) => media.has(o.mediaId) && isEligible(o, media.get(o.mediaId))
  );
  const ids = new Set(opinions.map((o) => o.mediaId));
  return JSON.stringify([
    MODEL.version,
    MODEL.scale,
    opinions.map((o) => [o.mediaId, o.sentiment, o.revision]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    activeComparisons(opinions, library.comparisons).filter((c) => ids.has(c.a) && ids.has(c.b)).map((c) => [c.a, c.b, c.aRevision, c.bRevision, c.outcome]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
  ]);
}
var RankingCache = class {
  constructor(fit = analyzeRanking) {
    this.fit = fit;
  }
  fit;
  states = /* @__PURE__ */ new Map();
  update(catalog, library, retry = false) {
    for (const kind of ["movie", "tv"]) {
      const key = rankingInputKey(catalog, library, kind), previous = this.states.get(kind);
      if (previous?.key === key && (!retry || !previous.error)) continue;
      try {
        this.states.set(kind, { key, analysis: this.fit(catalog, library, kind), error: null });
      } catch {
        const lookup = new Map(catalog.map((m) => [m.id, m]));
        const eligible = library.opinions.filter(
          (o) => lookup.get(o.mediaId)?.kind === kind && isEligible(o, lookup.get(o.mediaId))
        );
        const edges = activeComparisons(eligible, library.comparisons);
        const compared = new Set(edges.flatMap((c) => [c.a, c.b]));
        const old = previous?.analysis.snapshot;
        const items = eligible.map((o) => {
          const confirmed = old?.items.find((item) => item.mediaId === o.mediaId);
          return compared.has(o.mediaId) && confirmed ? confirmed : {
            mediaId: o.mediaId,
            position: null,
            rankScore: null,
            opponents: 0,
            evidence: "unplaced"
          };
        }).sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity));
        let position = 0;
        const snapshot = {
          kind,
          sourceRevision: old?.sourceRevision ?? library.revision,
          modelVersion: MODEL.version,
          scoreScaleVersion: MODEL.scale,
          items: items.map(
            (item) => item.position === null ? item : { ...item, position: ++position }
          )
        };
        this.states.set(kind, {
          key,
          analysis: { snapshot, scores: /* @__PURE__ */ new Map(), components: /* @__PURE__ */ new Map() },
          error: "Your watch is saved. Ranking could not update. Retry to finish placing it."
        });
      }
    }
  }
  get(kind) {
    const result = this.states.get(kind);
    if (!result) throw new Error("Rankings are still loading");
    return result;
  }
};
var PICKER_VERSION = "adaptive-preview-v2";
var pairKey = (a, b) => [a, b].sort().join("|");
function seededNumber(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return (hash >>> 0) / 4294967296;
}
function chooseComparison(catalog, library, kind, excluded, target, options = {}) {
  const analysis = options.analysis ?? analyzeRanking(catalog, library, kind);
  const eligible = analysis.snapshot.items, lookup = new Map(catalog.map((m) => [m.id, m]));
  if (target && !eligible.some((item) => item.mediaId === target)) return null;
  const opinions = new Map(library.opinions.map((o) => [o.mediaId, o]));
  const active = new Set(
    activeComparisons(library.opinions, library.comparisons).map((c) => pairKey(c.a, c.b))
  );
  const cooling = new Set(
    library.comparisonCooldowns.filter((c) => {
      const [a, b] = c.key.split("|");
      return options.now && c.until > options.now && opinions.get(a)?.revision === c.aRevision && opinions.get(b)?.revision === c.bRevision;
    }).map((c) => c.key)
  );
  const score = (id) => analysis.scores.get(id) ?? (opinions.get(id)?.sentiment === "liked" ? 1 : opinions.get(id)?.sentiment === "disliked" ? -1 : 0);
  const allowed = (a, b) => a !== b && !excluded.has(pairKey(a, b)) && (options.reconsider || !active.has(pairKey(a, b)) && !cooling.has(pairKey(a, b)));
  const bridge = (a, b) => analysis.components.get(a) !== analysis.components.get(b);
  const finish = (a, b, reason) => ({
    pair: options.seed && seededNumber(`${options.seed}:${options.served ?? 0}:${pairKey(a, b)}`) < 0.5 ? [lookup.get(b), lookup.get(a)] : [lookup.get(a), lookup.get(b)],
    reason
  });
  const priority = (a, b) => {
    const p = sigmoid(score(a.mediaId) - score(b.mediaId));
    const coverage = 0.5 / (1 + a.opponents) + 0.5 / (1 + b.opponents);
    const boundary = [a, b].some((i) => i.position !== null && Math.abs(i.position - 10) <= 2) ? 1 : 0;
    return 0.65 * 4 * p * (1 - p) + 0.25 * coverage + 0.1 * boundary;
  };
  const focusOrder = target ? eligible.filter((i) => i.mediaId === target) : [...eligible].sort(
    (a, b) => Number(b.position === null) - Number(a.position === null) || a.opponents - b.opponents || a.mediaId.localeCompare(b.mediaId)
  );
  const anchors = [...eligible].sort(
    (a, b) => score(a.mediaId) - score(b.mediaId) || a.mediaId.localeCompare(b.mediaId)
  );
  const bridgeTurn = ((options.served ?? 0) + 1) % 5 === 0;
  for (const bridgeOnly of bridgeTurn ? [true, false] : [false]) {
    for (const focus of focusOrder.slice(0, target ? 1 : 24)) {
      const nearby = eligible.filter((i) => allowed(focus.mediaId, i.mediaId)).sort(
        (a, b) => Math.abs(score(a.mediaId) - score(focus.mediaId)) - Math.abs(score(b.mediaId) - score(focus.mediaId)) || a.mediaId.localeCompare(b.mediaId)
      );
      const pool = new Map(nearby.slice(0, 12).map((i) => [i.mediaId, i]));
      for (let q = 0; q < 8; q++) {
        const anchor = anchors[Math.floor(q * (anchors.length - 1) / 7)];
        if (anchor && allowed(focus.mediaId, anchor.mediaId)) pool.set(anchor.mediaId, anchor);
      }
      for (const item of nearby.filter((i) => bridge(focus.mediaId, i.mediaId)).slice(0, 4))
        pool.set(item.mediaId, item);
      const candidates = [...pool.values()];
      if (!candidates.length) continue;
      if (bridgeOnly) {
        const other = candidates.filter((i) => bridge(focus.mediaId, i.mediaId)).sort(
          (a, b) => Math.abs(score(a.mediaId) - score(focus.mediaId)) - Math.abs(score(b.mediaId) - score(focus.mediaId)) || a.mediaId.localeCompare(b.mediaId)
        )[0];
        if (other) return finish(focus.mediaId, other.mediaId, "component_bridge");
        continue;
      }
      if (target && options.mode !== "refine") {
        const genres = new Set(lookup.get(target).genres);
        const shared = (i) => lookup.get(i.mediaId).genres.filter((g) => genres.has(g)).length;
        candidates.sort(
          (a, b) => Number(b.position !== null) - Number(a.position !== null) || shared(b) - shared(a) || Math.abs(score(a.mediaId) - score(target)) - Math.abs(score(b.mediaId) - score(target)) || a.mediaId.localeCompare(b.mediaId)
        );
      } else
        candidates.sort(
          (a, b) => priority(focus, b) - priority(focus, a) || a.mediaId.localeCompare(b.mediaId)
        );
      return finish(
        focus.mediaId,
        candidates[0].mediaId,
        target ? "targeted_placement" : "ambiguity_coverage"
      );
    }
  }
  return null;
}
function pickComparison(catalog, library, kind, excluded, target, options = {}) {
  return chooseComparison(catalog, library, kind, excluded, target, options)?.pair ?? null;
}

// packages/domain/src/recommendations.ts
var RECOMMENDATION_VERSION = "content-preview-v2";
var names = (m) => [
  .../* @__PURE__ */ new Set([
    ...m.directors ?? [],
    ...m.creators ?? [],
    ...(m.cast ?? []).slice(0, 5).map((c) => c.name)
  ])
];
var overlap = (a, b) => {
  const set = new Set(a);
  return b.filter((value) => set.has(value)).length / Math.max(1, (/* @__PURE__ */ new Set([...a, ...b])).size);
};
function recommend(catalog, state, options) {
  const lookup = new Map(catalog.map((m) => [m.id, m]));
  const seen = new Set(state.opinions.map((o) => o.mediaId));
  const dismissed = new Set(state.dismissals.map((d) => d.mediaId));
  const saved = new Set(state.watchlist.map((w) => w.mediaId));
  const ranks = new Map(
    (options.snapshots ?? []).flatMap((s) => s.items.map((i) => [i.mediaId, i]))
  );
  const inputs = state.opinions.flatMap((opinion) => {
    const media = lookup.get(opinion.mediaId);
    if (!media || !opinion.sentiment || opinion.sentiment === "fine") return [];
    const rank = ranks.get(media.id);
    const support = Math.min(1, (rank?.opponents ?? 0) / 5);
    return [
      {
        media,
        sign: opinion.sentiment === "liked" ? 1 : -1,
        weight: 1 + 0.1 * support * ((rank?.rankScore ?? 5) / 10)
      }
    ];
  });
  const preferences = inputs.map((i) => [i.media.id, i.sign, i.weight]);
  const requestId = `rec-${Math.floor(
    seededNumber(
      JSON.stringify([
        RECOMMENDATION_VERSION,
        preferences,
        state.dismissals,
        options.kind,
        options.maxRuntime,
        options.genre,
        [...options.exclude ?? []].sort(),
        options.providerIds,
        options.watchlistOnly,
        options.seed,
        options.now?.slice(0, 10),
        catalog.map((m) => [m.id, m.fetchedAt]).sort((a, b) => String(a[0]).localeCompare(String(b[0])))
      ])
    ) * 4294967296
  ).toString(36)}`;
  const date = options.now?.slice(0, 10);
  const candidates = [...lookup.values()].filter((m) => {
    if (seen.has(m.id) || dismissed.has(m.id) || options.exclude?.has(m.id)) return false;
    if (options.kind !== "all" && m.kind !== options.kind) return false;
    if (options.genre && !m.genres.includes(options.genre)) return false;
    if (options.watchlistOnly && !saved.has(m.id)) return false;
    if (m.releaseDate && date && m.releaseDate > date) return false;
    if (m.catalogStatus && ["Planned", "In Production", "Pilot"].includes(m.catalogStatus))
      return false;
    if (m.source === "tmdb" && (!m.releaseDate || !date)) return false;
    if (options.maxRuntime != null && (m.kind !== "movie" || m.runtimeMinutes === null || m.runtimeMinutes > options.maxRuntime))
      return false;
    if (options.providerIds?.length) {
      const availability = m.availability;
      if (!availability || availability.region !== "US" || availability.stale || availability.status !== "available")
        return false;
      if (!options.now || Date.parse(options.now) - Date.parse(availability.checkedAt) > 6 * 60 * 60 * 1e3 || Date.parse(availability.checkedAt) > Date.parse(options.now))
        return false;
      if (!availability.offers.some(
        (o) => o.type === "subscription" && options.providerIds.includes(o.providerId)
      ))
        return false;
    }
    return true;
  }).sort((a, b) => a.id.localeCompare(b.id)).slice(0, 500);
  const scored = candidates.map((media) => {
    const signals = inputs.filter((i) => i.media.kind === media.kind);
    const liked = signals.filter((i) => i.sign > 0), disliked = signals.filter((i) => i.sign < 0);
    const feature = (seeds, extract) => seeds.reduce((sum, i) => sum + i.weight * overlap(extract(media), extract(i.media)), 0) / Math.max(
      1,
      seeds.reduce((sum, i) => sum + i.weight, 0)
    );
    const genre = feature(liked, (m) => m.genres), creator = feature(liked, names);
    let weight = 0, positive = 0;
    if (liked.some((i) => i.media.genres.length) && media.genres.length) {
      weight += 0.35;
      positive += 0.35 * genre;
    }
    if (liked.some((i) => names(i.media).length) && names(media).length) {
      weight += 0.15;
      positive += 0.15 * creator;
    }
    if (options.providerIds?.length) {
      weight += 0.1;
      positive += 0.1;
    }
    const score = (weight ? positive / weight : 0) - 0.4 * feature(disliked, (m) => m.genres) - 0.2 * feature(disliked, names);
    const seed = [...liked].sort(
      (a, b) => overlap(media.genres, b.media.genres) - overlap(media.genres, a.media.genres) || a.media.id.localeCompare(b.media.id)
    )[0];
    const creatorSeed = liked.find(
      (i) => names(media).some((name) => names(i.media).includes(name))
    );
    return {
      media,
      score,
      requestId,
      itemId: `${requestId}:${media.id}`,
      reasonCode: creatorSeed && creator > genre ? "creator" : seed && genre > 0 ? "genre" : "catalog",
      sourceMediaId: creatorSeed && creator > genre ? creatorSeed.media.id : seed && genre > 0 ? seed.media.id : null,
      reason: creatorSeed && creator > genre ? `Shares cast or creators with ${creatorSeed.media.title}` : seed && genre > 0 ? `Because you liked ${seed.media.title}` : media.source === "tmdb" ? "Explore the TMDB catalog" : "Explore the sample catalog"
    };
  }).sort(
    (a, b) => b.score - a.score || seededNumber(`${options.seed}:${a.media.id}`) - seededNumber(`${options.seed}:${b.media.id}`)
  );
  const selected = [], remaining = [...scored];
  const limit = Math.min(50, options.limit ?? 50);
  while (remaining.length && selected.length < limit) {
    const explore = selected.length % 5 === 4;
    remaining.sort((a, b) => {
      const variety = (i) => Math.max(
        0,
        ...selected.map(
          (s) => 0.15 * overlap(s.media.genres, i.media.genres) + 0.25 * overlap(names(s.media), names(i.media))
        )
      );
      const utility = (i) => (explore ? 0.5 : 1) * i.score - variety(i);
      return utility(b) - utility(a) || seededNumber(`${options.seed}:${a.media.id}`) - seededNumber(`${options.seed}:${b.media.id}`);
    });
    selected.push(remaining.shift());
  }
  return { requestId, algorithmVersion: RECOMMENDATION_VERSION, items: selected };
}
function dismissRecommendation(state, item, now) {
  if (state.dismissals.some((d) => d.mediaId === item.media.id)) return state;
  return {
    ...state,
    revision: state.revision + 1,
    dismissals: [
      ...state.dismissals,
      { mediaId: item.media.id, createdAt: now, requestId: item.requestId, itemId: item.itemId }
    ]
  };
}

// packages/domain/src/library.ts
var emptyLibrary = () => ({
  schemaVersion: 1,
  onboarded: false,
  revision: 0,
  opinions: [],
  logs: [],
  notes: [],
  collections: [],
  comparisons: [],
  watchlist: [],
  catalogEntries: [],
  dismissals: [],
  selectedProviders: [],
  logDrafts: [],
  comparisonSessions: [],
  comparisonCooldowns: [],
  comparisonServeCounts: { movie: 0, tv: 0 },
  undoReceipts: []
});
function saveLog(state, catalog, input, eventId, now) {
  if (state.logs.some((l) => l.id === eventId)) return state;
  const media = catalog.find((m) => m.id === input.mediaId);
  if (!media) throw new Error("Title unavailable");
  if (input.note.length > 280) throw new Error("Private notes are limited to 280 characters");
  if (input.watchedOn !== null) {
    const parsedDate = new Date(input.watchedOn);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.watchedOn) || !Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== input.watchedOn)
      throw new Error("Use a valid YYYY-MM-DD date");
    if (input.watchedOn > now.slice(0, 10)) throw new Error("Watch date cannot be in the future");
  }
  if (media.kind === "movie" && !input.sentiment)
    throw new Error("Choose how you felt about this movie");
  if (media.kind === "tv" && !input.status) throw new Error("Choose your show status");
  const previous = state.opinions.find((o) => o.mediaId === media.id);
  const opinionChanged = previous && (previous.sentiment !== input.sentiment || previous.seenEnough !== input.seenEnough);
  const opinion = {
    mediaId: media.id,
    sentiment: input.sentiment,
    status: media.kind === "tv" ? input.status : null,
    seenEnough: media.kind === "movie" || input.seenEnough,
    revision: previous ? previous.revision + (opinionChanged ? 1 : 0) : 1
  };
  const latest = [...state.logs].reverse().find((l) => l.mediaId === media.id);
  const log = {
    id: latest && !input.rewatch ? latest.id : eventId,
    mediaId: media.id,
    createdAt: latest && !input.rewatch ? latest.createdAt : now,
    watchedOn: input.watchedOn,
    historical: input.historical,
    rewatch: input.rewatch,
    note: input.note,
    recommendation: latest && !input.rewatch ? latest.recommendation : input.rewatch || input.historical || previous ? void 0 : input.recommendation ?? state.watchlist.find((w) => w.mediaId === media.id)?.recommendation
  };
  const createsWatchEvent = media.kind === "movie" || input.sentiment !== null || input.status === "finished" || input.status === "caught_up";
  return {
    ...state,
    revision: state.revision + 1,
    logDrafts: state.logDrafts.filter((draft) => draft.mediaId !== media.id),
    opinions: [...state.opinions.filter((o) => o.mediaId !== media.id), opinion],
    notes: [
      ...(state.notes ?? []).filter((note) => note.mediaId !== media.id),
      { mediaId: media.id, text: input.note.trim(), updatedAt: now }
    ],
    logs: !createsWatchEvent ? state.logs : latest && !input.rewatch ? state.logs.map((l) => l.id === latest.id ? log : l) : [...state.logs, log],
    watchlist: state.watchlist.filter((w) => w.mediaId !== media.id)
  };
}
function setTitleNote(state, catalog, mediaId, text, now) {
  if (!catalog.some((media) => media.id === mediaId)) throw new Error("Title unavailable");
  if (text.length > 280) throw new Error("Private notes are limited to 280 characters");
  const cleaned = text.trim();
  const notes = state.notes ?? [];
  const previous = notes.find((note) => note.mediaId === mediaId);
  if (previous?.text === cleaned) return state;
  return {
    ...state,
    revision: state.revision + 1,
    // Keep an empty override when clearing a note so legacy watch notes don't reappear.
    notes: [
      ...notes.filter((note) => note.mediaId !== mediaId),
      { mediaId, text: cleaned, updatedAt: now }
    ]
  };
}
function confirmSeenEnough(state, catalog, mediaId) {
  const media = catalog.find((item) => item.id === mediaId);
  const opinion = state.opinions.find((item) => item.mediaId === mediaId);
  if (media?.kind !== "tv" || !opinion?.sentiment)
    throw new Error("Save a sentiment for this show before ranking it");
  if (opinion.seenEnough) return state;
  return {
    ...state,
    revision: state.revision + 1,
    opinions: state.opinions.map(
      (item) => item.mediaId === mediaId ? { ...item, seenEnough: true, revision: item.revision + 1 } : item
    )
  };
}
function setWatchlist(state, mediaId, present, now, recommendation) {
  const exists = state.watchlist.some((w) => w.mediaId === mediaId);
  if (exists === present) return state;
  return {
    ...state,
    revision: state.revision + 1,
    watchlist: present ? [...state.watchlist, { mediaId, addedAt: now, priority: 0, recommendation }] : state.watchlist.filter((w) => w.mediaId !== mediaId)
  };
}
function setPriority(state, mediaId, priority) {
  if (![0, 1, 2].includes(priority)) throw new Error("Invalid priority");
  return {
    ...state,
    revision: state.revision + 1,
    watchlist: state.watchlist.map((w) => w.mediaId === mediaId ? { ...w, priority } : w)
  };
}
function answerComparison(state, catalog, left, right, answer, eventId) {
  if (answer === "skip" || answer === "undecided" || state.comparisons.some((c) => c.id === eventId))
    return state;
  const a = left < right ? left : right, b = left < right ? right : left;
  const ma = catalog.find((m) => m.id === a), mb = catalog.find((m) => m.id === b);
  const oa = state.opinions.find((o) => o.mediaId === a), ob = state.opinions.find((o) => o.mediaId === b);
  if (!ma || !mb || !oa || !ob || ma.kind !== mb.kind || a === b || !isEligible(oa, ma) || !isEligible(ob, mb))
    throw new Error("Compare two seen titles of the same format");
  const outcome = left === a || answer === "similar" ? answer : answer === "a_wins" ? "b_wins" : "a_wins";
  return {
    ...state,
    revision: state.revision + 1,
    comparisons: [
      ...state.comparisons,
      { id: eventId, a, b, aRevision: oa.revision, bRevision: ob.revision, outcome }
    ]
  };
}
function removeHistory(state, mediaId) {
  return {
    ...state,
    revision: state.revision + 1,
    opinions: state.opinions.filter((o) => o.mediaId !== mediaId),
    logs: state.logs.filter((l) => l.mediaId !== mediaId),
    notes: (state.notes ?? []).filter((note) => note.mediaId !== mediaId),
    comparisons: state.comparisons.filter((c) => c.a !== mediaId && c.b !== mediaId)
  };
}
function filterCatalog(catalog, filter, query = "") {
  const q = query.trim().toLocaleLowerCase();
  return catalog.filter(
    (m) => (filter.kind === "all" || m.kind === filter.kind) && (!filter.genre || m.genres.includes(filter.genre)) && (filter.maxRuntime === null || m.kind === "movie" && m.runtimeMinutes !== null && m.runtimeMinutes <= filter.maxRuntime) && (!q || `${m.title} ${m.year} ${m.genres.join(" ")}`.toLocaleLowerCase().includes(q))
  );
}
function discoveryPicks(catalog, state) {
  return recommend(catalog, state, { kind: "all", seed: "home" }).items;
}

// packages/domain/src/availability.ts
var brands = [
  [/^paramount\s*(?:\+|plus)(?:\s|$)/i, "Paramount+"],
  [/^peacock(?:\s|$)/i, "Peacock"],
  [/^netflix(?:\s|$)/i, "Netflix"],
  [/^(?:hbo\s+)?max(?:\s|$)/i, "Max"],
  [/^disney\s*(?:\+|plus)(?:\s|$)/i, "Disney+"],
  [/^hulu(?:\s|$)/i, "Hulu"],
  [/^apple\s+tv(?:\s|\+|$)/i, "Apple TV"],
  [/^(?:amazon\s+)?prime\s+video(?:\s|$)/i, "Prime Video"],
  [/^crunchyroll(?:\s|$)/i, "Crunchyroll"],
  [/^discovery\s*(?:\+|plus)(?:\s|$)/i, "Discovery+"],
  [/^starz(?:\s|$)/i, "Starz"],
  [/^amc\s*(?:\+|plus)(?:\s|$)/i, "AMC+"],
  [/^britbox(?:\s|$)/i, "BritBox"],
  [/^mgm\s*(?:\+|plus)(?:\s|$)/i, "MGM+"],
  [/^shudder(?:\s|$)/i, "Shudder"]
];
function providerCompany(name) {
  const cleaned = name.trim().replace(/\s+/g, " ");
  return brands.find(([pattern]) => pattern.test(cleaned))?.[1] ?? cleaned;
}
function groupViewingProviders(offers, group) {
  const providers = /* @__PURE__ */ new Map();
  for (const offer of offers) {
    if (group === "stream" ? !["subscription", "free", "ads"].includes(offer.type) : offer.type !== group)
      continue;
    const name = providerCompany(offer.name);
    const key = name.toLocaleLowerCase("en-US");
    const existing = providers.get(key);
    if (existing) {
      if (!existing.types.includes(offer.type)) existing.types.push(offer.type);
      if (offer.logoUrl && (!existing.logoUrl || offer.name.trim() === name))
        existing.logoUrl = offer.logoUrl;
    } else providers.set(key, { name, logoUrl: offer.logoUrl, types: [offer.type] });
  }
  return [...providers.values()];
}

// packages/domain/src/recovery.ts
var collections = [
  "opinions",
  "logs",
  "notes",
  "collections",
  "comparisons",
  "watchlist",
  "dismissals"
];
var identity = (row) => row.id ?? row.mediaId;
var canonical = (rows) => JSON.stringify([...rows].sort((a, b) => identity(a).localeCompare(identity(b))));
function withUndo(before, after, label, id, now) {
  let patches = {};
  for (const collection of collections) {
    const a = new Map(before[collection].map((r) => [identity(r), r]));
    const b = new Map(after[collection].map((r) => [identity(r), r]));
    const keys = [.../* @__PURE__ */ new Set([...a.keys(), ...b.keys()])].filter(
      (key) => JSON.stringify(a.get(key)) !== JSON.stringify(b.get(key))
    );
    if (keys.length)
      patches = {
        ...patches,
        [collection]: {
          keys,
          before: before[collection].filter((r) => keys.includes(identity(r))),
          after: after[collection].filter((r) => keys.includes(identity(r)))
        }
      };
  }
  if (!Object.keys(patches).length) return after;
  const guardedMediaIds = [
    .../* @__PURE__ */ new Set([
      ...patches.opinions?.keys ?? [],
      ...(patches.logs?.before ?? []).map((l) => l.mediaId),
      ...(patches.logs?.after ?? []).map((l) => l.mediaId)
    ])
  ];
  const guardedPairKeys = [
    ...new Set(
      [...patches.comparisons?.before ?? [], ...patches.comparisons?.after ?? []].map(
        (c) => pairKey(c.a, c.b)
      )
    )
  ];
  const opinionIds = /* @__PURE__ */ new Set([
    ...guardedMediaIds,
    ...(patches.comparisons?.after ?? []).flatMap((c) => [c.a, c.b])
  ]);
  const receipt = {
    id,
    label,
    createdAt: now,
    patches,
    guardedMediaIds,
    guardedPairKeys,
    opinionGuards: after.opinions.filter((o) => opinionIds.has(o.mediaId)),
    comparisonGuards: after.comparisons.filter(
      (c) => guardedMediaIds.includes(c.a) || guardedMediaIds.includes(c.b) || guardedPairKeys.includes(pairKey(c.a, c.b))
    )
  };
  return { ...after, undoReceipts: [...after.undoReceipts, receipt].slice(-8) };
}
function undoMutation(state, id) {
  const receipt = state.undoReceipts.find((r) => r.id === id);
  if (!receipt) throw new Error("This undo is no longer available. Edit the title instead.");
  const conflict = () => {
    throw new Error(
      "This title changed since that action. Undo the newer action first, or edit the title."
    );
  };
  for (const guard of receipt.opinionGuards) {
    if (JSON.stringify(state.opinions.find((o) => o.mediaId === guard.mediaId)) !== JSON.stringify(guard))
      conflict();
  }
  const evidence = state.comparisons.filter(
    (c) => receipt.guardedMediaIds.includes(c.a) || receipt.guardedMediaIds.includes(c.b) || receipt.guardedPairKeys.includes(pairKey(c.a, c.b))
  );
  if (canonical(evidence) !== canonical(receipt.comparisonGuards)) conflict();
  let restored = state;
  for (const collection of collections)
    restored = restoreCollection(restored, collection, receipt, conflict);
  return {
    ...restored,
    revision: state.revision + 1,
    undoReceipts: state.undoReceipts.filter((r) => r.id !== id),
    // Offered pairs are rebuilt from current revisions when reopening.
    comparisonSessions: state.comparisonSessions.map((s) => ({
      ...s,
      offered: null,
      inputKey: "",
      steps: Math.max(
        0,
        s.steps - (s.excluded.some((key) => receipt.guardedPairKeys.includes(key)) ? 1 : 0)
      ),
      excluded: s.excluded.filter((key) => !receipt.guardedPairKeys.includes(key))
    }))
  };
}
function restoreCollection(state, collection, receipt, conflict) {
  const patch = receipt.patches[collection];
  if (!patch) return state;
  if (canonical(state[collection].filter((r) => patch.keys.includes(identity(r)))) !== canonical(patch.after))
    conflict();
  const originals = new Map(patch.before.map((r) => [identity(r), r]));
  const present = new Set(state[collection].map(identity));
  const rows = state[collection].flatMap((r) => {
    if (!patch.keys.includes(identity(r))) return [r];
    const original = originals.get(identity(r));
    return original ? [original] : [];
  });
  return {
    ...state,
    [collection]: [...rows, ...patch.before.filter((r) => !present.has(identity(r)))]
  };
}

// packages/domain/src/sessions.ts
function openComparisonSession(state, kind, target, mode, id) {
  const existing = state.comparisonSessions.find(
    (s) => s.kind === kind && s.target === target && s.mode === mode && (mode === "placement" || s.steps < 3)
  );
  if (existing) return state;
  const session = {
    id,
    kind,
    target,
    mode,
    seed: id,
    steps: 0,
    served: 0,
    excluded: [],
    offered: null,
    inputKey: "",
    reason: ""
  };
  return { ...state, comparisonSessions: [...state.comparisonSessions, session].slice(-12) };
}
function offerComparison(state, catalog, sessionId, analysis, now) {
  const session = state.comparisonSessions.find((s) => s.id === sessionId);
  if (!session || session.mode === "refine" && session.steps >= 3) return state;
  const key = rankingInputKey(catalog, state, session.kind);
  if (session.offered && session.inputKey === key) return state;
  const choice = chooseComparison(
    catalog,
    state,
    session.kind,
    new Set(session.excluded),
    session.target,
    {
      analysis,
      now,
      seed: session.seed,
      served: state.comparisonServeCounts[session.kind],
      mode: session.mode
    }
  );
  if (!choice && !session.offered && session.inputKey === key) return state;
  return {
    ...state,
    comparisonServeCounts: {
      ...state.comparisonServeCounts,
      [session.kind]: state.comparisonServeCounts[session.kind] + (choice ? 1 : 0)
    },
    comparisonSessions: state.comparisonSessions.map(
      (s) => s.id !== sessionId ? s : {
        ...s,
        offered: choice ? [choice.pair[0].id, choice.pair[1].id] : null,
        inputKey: key,
        served: s.served + (choice ? 1 : 0),
        reason: choice?.reason ?? "exhausted"
      }
    )
  };
}
function answerSession(state, catalog, sessionId, answer, eventId, now) {
  const session = state.comparisonSessions.find((s) => s.id === sessionId);
  if (!session?.offered || session.inputKey !== rankingInputKey(catalog, state, session.kind))
    throw new Error("This comparison changed. Refresh the pair and try again.");
  const [a, b] = session.offered, key = pairKey(a, b);
  const answered = answerComparison(state, catalog, a, b, answer, eventId);
  const canonicalIds = [a, b].sort();
  const cooldown = {
    key,
    until: new Date(Date.parse(now) + 24 * 60 * 60 * 1e3).toISOString(),
    aRevision: state.opinions.find((o) => o.mediaId === canonicalIds[0]).revision,
    bRevision: state.opinions.find((o) => o.mediaId === canonicalIds[1]).revision
  };
  return {
    ...answered,
    comparisonCooldowns: answer === "skip" || answer === "undecided" ? [
      ...state.comparisonCooldowns.filter((c) => c.until > now && c.key !== key),
      cooldown
    ].slice(-200) : state.comparisonCooldowns,
    comparisonSessions: state.comparisonSessions.map(
      (s) => s.id !== sessionId ? s : {
        ...s,
        steps: s.steps + 1,
        excluded: [...s.excluded, key],
        offered: null,
        inputKey: ""
      }
    )
  };
}
function retrySkippedPairs(state, sessionId) {
  const session = state.comparisonSessions.find((s) => s.id === sessionId);
  if (!session) return state;
  return {
    ...state,
    comparisonCooldowns: state.comparisonCooldowns.filter((c) => !session.excluded.includes(c.key)),
    comparisonSessions: state.comparisonSessions.map(
      (s) => s.id === sessionId ? { ...s, excluded: [], offered: null, inputKey: "" } : s
    )
  };
}

// packages/domain/src/journal.ts
function saveCollection(state, id, name) {
  const cleaned = name.trim();
  if (!cleaned || cleaned.length > 40) throw new Error("Use a collection name of 1\u201340 characters");
  if (state.collections.some(
    (item) => item.id !== id && item.name.toLowerCase() === cleaned.toLowerCase()
  ))
    throw new Error("A collection with this name already exists");
  const previous = state.collections.find((item) => item.id === id);
  if (previous?.name === cleaned) return state;
  return {
    ...state,
    revision: state.revision + 1,
    collections: previous ? state.collections.map((item) => item.id === id ? { ...item, name: cleaned } : item) : [...state.collections, { id, name: cleaned, mediaIds: [] }]
  };
}
function removeCollection(state, id) {
  return {
    ...state,
    revision: state.revision + 1,
    collections: state.collections.filter((item) => item.id !== id)
  };
}
function setCollectionTitle(state, catalog, collectionId, mediaId, present) {
  if (!catalog.some((media) => media.id === mediaId)) throw new Error("Title unavailable");
  const collection = state.collections.find((item) => item.id === collectionId);
  if (!collection) throw new Error("Collection unavailable");
  if (collection.mediaIds.includes(mediaId) === present) return state;
  return {
    ...state,
    revision: state.revision + 1,
    collections: state.collections.map(
      (item) => item.id === collectionId ? {
        ...item,
        mediaIds: present ? [...item.mediaIds, mediaId] : item.mediaIds.filter((id) => id !== mediaId)
      } : item
    )
  };
}
function journalEntries(state, catalog, query = "") {
  const media = new Map(catalog.map((item) => [item.id, item]));
  const titleNotes = new Map(state.notes.map((note) => [note.mediaId, note.text]));
  const entries = [...state.logs].sort(
    (a, b) => (b.watchedOn ?? "").localeCompare(a.watchedOn ?? "") || b.createdAt.localeCompare(a.createdAt)
  ).map((log) => ({
    key: log.id,
    mediaId: log.mediaId,
    month: log.watchedOn?.slice(0, 7) ?? "Undated watches",
    watchedOn: log.watchedOn,
    note: titleNotes.get(log.mediaId) ?? "",
    watchNote: log.note,
    rewatch: log.rewatch,
    noteOnly: false
  }));
  const logged = new Set(state.logs.map((log) => log.mediaId));
  entries.push(
    ...state.notes.filter((note) => note.text && !logged.has(note.mediaId)).map((note) => ({
      key: `note:${note.mediaId}`,
      mediaId: note.mediaId,
      month: "Notes before watching",
      watchedOn: null,
      note: note.text,
      watchNote: "",
      rewatch: false,
      noteOnly: true
    }))
  );
  const q = query.trim().toLowerCase();
  return entries.filter(
    (entry) => media.has(entry.mediaId) && (!q || `${media.get(entry.mediaId).title} ${entry.watchedOn ?? ""} ${entry.note} ${entry.watchNote}`.toLowerCase().includes(q))
  );
}
function viewingRecap(state, catalog, year) {
  const media = new Map(catalog.map((item) => [item.id, item]));
  const logs = state.logs.filter((log) => log.watchedOn?.slice(0, 4) === year);
  return {
    movies: logs.filter((log) => media.get(log.mediaId)?.kind === "movie").length,
    tv: logs.filter((log) => media.get(log.mediaId)?.kind === "tv").length,
    rewatches: logs.filter((log) => log.rewatch).length,
    undated: state.logs.filter((log) => !log.watchedOn).length,
    mediaIds: [...new Set(logs.map((log) => log.mediaId))]
  };
}
export {
  MODEL,
  PICKER_VERSION,
  RECOMMENDATION_VERSION,
  RankingCache,
  activeComparisons,
  analyzeRanking,
  answerComparison,
  answerSession,
  buildSnapshot,
  chooseComparison,
  confirmSeenEnough,
  discoveryPicks,
  dismissRecommendation,
  emptyLibrary,
  filterCatalog,
  fitBradleyTerry,
  groupViewingProviders,
  isEligible,
  journalEntries,
  offerComparison,
  openComparisonSession,
  pairKey,
  pickComparison,
  providerCompany,
  rankScore,
  rankingInputKey,
  recommend,
  removeCollection,
  removeHistory,
  retrySkippedPairs,
  saveCollection,
  saveLog,
  seededNumber,
  setCollectionTitle,
  setPriority,
  setTitleNote,
  setWatchlist,
  sigmoid,
  undoMutation,
  viewingRecap,
  withUndo
};
