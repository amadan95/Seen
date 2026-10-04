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
function buildSnapshot(catalog, library, kind) {
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
    kind,
    sourceRevision: library.revision,
    modelVersion: MODEL.version,
    scoreScaleVersion: MODEL.scale,
    items
  };
}
function pickComparison(catalog, library, kind, excluded, target) {
  const snapshot = buildSnapshot(catalog, library, kind);
  const lookup = new Map(catalog.map((m) => [m.id, m]));
  const eligible = snapshot.items;
  const active = new Set(
    activeComparisons(library.opinions, library.comparisons).map(
      (c) => [c.a, c.b].sort().join("|")
    )
  );
  const focus = eligible.find((i) => i.mediaId === target) ?? eligible.find((i) => i.position === null) ?? [...eligible].sort((a, b) => a.opponents - b.opponents)[0];
  if (!focus) return null;
  const candidates = eligible.filter(
    (i) => i.mediaId !== focus.mediaId && !excluded.has([i.mediaId, focus.mediaId].sort().join("|")) && !active.has([i.mediaId, focus.mediaId].sort().join("|"))
  );
  candidates.sort((a, b) => {
    const gap = (x) => Math.abs((x.rankScore ?? 5) - (focus.rankScore ?? 5));
    return gap(a) - gap(b) || a.opponents - b.opponents || a.mediaId.localeCompare(b.mediaId);
  });
  const opponent = candidates[0];
  if (opponent) return [lookup.get(focus.mediaId), lookup.get(opponent.mediaId)];
  if (target) return null;
  for (const item of eligible) {
    if (item.mediaId === focus.mediaId) continue;
    const other = eligible.find(
      (i) => i.mediaId !== item.mediaId && !excluded.has([i.mediaId, item.mediaId].sort().join("|")) && !active.has([i.mediaId, item.mediaId].sort().join("|"))
    );
    if (other) return [lookup.get(item.mediaId), lookup.get(other.mediaId)];
  }
  return null;
}

// packages/domain/src/library.ts
var emptyLibrary = () => ({
  schemaVersion: 1,
  onboarded: false,
  revision: 0,
  opinions: [],
  logs: [],
  comparisons: [],
  watchlist: []
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
    note: input.note
  };
  const createsWatchEvent = media.kind === "movie" || input.sentiment !== null || input.status === "finished" || input.status === "caught_up";
  return {
    ...state,
    revision: state.revision + 1,
    opinions: [...state.opinions.filter((o) => o.mediaId !== media.id), opinion],
    logs: !createsWatchEvent ? state.logs : latest && !input.rewatch ? state.logs.map((l) => l.id === latest.id ? log : l) : [...state.logs, log],
    watchlist: state.watchlist.filter((w) => w.mediaId !== media.id)
  };
}
function setWatchlist(state, mediaId, present, now) {
  const exists = state.watchlist.some((w) => w.mediaId === mediaId);
  if (exists === present) return state;
  return {
    ...state,
    revision: state.revision + 1,
    watchlist: present ? [...state.watchlist, { mediaId, addedAt: now, priority: 0 }] : state.watchlist.filter((w) => w.mediaId !== mediaId)
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
  const seen = new Set(state.opinions.map((o) => o.mediaId));
  const liked = state.opinions.filter((o) => o.sentiment === "liked").map((o) => catalog.find((m) => m.id === o.mediaId));
  return catalog.filter((m) => !seen.has(m.id)).map((media) => {
    const source = liked.find(
      (m) => m && m.kind === media.kind && m.genres.some((g) => media.genres.includes(g))
    );
    return {
      media,
      reason: source ? `Because you liked ${source.title}` : "From the sample catalog"
    };
  });
}
export {
  MODEL,
  activeComparisons,
  answerComparison,
  buildSnapshot,
  discoveryPicks,
  emptyLibrary,
  filterCatalog,
  fitBradleyTerry,
  isEligible,
  pickComparison,
  rankScore,
  removeHistory,
  saveLog,
  setPriority,
  setWatchlist,
  sigmoid
};
