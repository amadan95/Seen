import type {
  ComparisonAnswer,
  ComparisonSession,
  Library,
  Media,
  MediaKind,
} from '@seen/contracts';
import { answerComparison } from './library.ts';
import { chooseComparison, pairKey, rankingInputKey, type RankingAnalysis } from './ranking.ts';

export function openComparisonSession(
  state: Library,
  kind: MediaKind,
  target: string | undefined,
  mode: 'placement' | 'refine',
  id: string,
): Library {
  const existing = state.comparisonSessions.find(
    (s) =>
      s.kind === kind &&
      s.target === target &&
      s.mode === mode &&
      (mode === 'placement' || s.steps < 3),
  );
  if (existing) return state;
  const session: ComparisonSession = {
    id,
    kind,
    target,
    mode,
    seed: id,
    steps: 0,
    served: 0,
    excluded: [],
    offered: null,
    inputKey: '',
    reason: '',
  };
  return { ...state, comparisonSessions: [...state.comparisonSessions, session].slice(-12) };
}
export function offerComparison(
  state: Library,
  catalog: Media[],
  sessionId: string,
  analysis: RankingAnalysis,
  now: string,
): Library {
  const session = state.comparisonSessions.find((s) => s.id === sessionId);
  if (!session || (session.mode === 'refine' && session.steps >= 3)) return state;
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
      mode: session.mode,
    },
  );
  if (!choice && !session.offered && session.inputKey === key) return state;
  return {
    ...state,
    comparisonServeCounts: {
      ...state.comparisonServeCounts,
      [session.kind]: state.comparisonServeCounts[session.kind] + (choice ? 1 : 0),
    },
    comparisonSessions: state.comparisonSessions.map((s) =>
      s.id !== sessionId
        ? s
        : {
            ...s,
            offered: choice ? [choice.pair[0].id, choice.pair[1].id] : null,
            inputKey: key,
            served: s.served + (choice ? 1 : 0),
            reason: choice?.reason ?? 'exhausted',
          },
    ),
  };
}
export function answerSession(
  state: Library,
  catalog: Media[],
  sessionId: string,
  answer: ComparisonAnswer,
  eventId: string,
  now: string,
): Library {
  const session = state.comparisonSessions.find((s) => s.id === sessionId);
  if (!session?.offered || session.inputKey !== rankingInputKey(catalog, state, session.kind))
    throw new Error('This comparison changed. Refresh the pair and try again.');
  const [a, b] = session.offered,
    key = pairKey(a, b);
  const answered = answerComparison(state, catalog, a, b, answer, eventId);
  const canonicalIds = [a, b].sort();
  const cooldown = {
    key,
    until: new Date(Date.parse(now) + 24 * 60 * 60 * 1000).toISOString(),
    aRevision: state.opinions.find((o) => o.mediaId === canonicalIds[0])!.revision,
    bRevision: state.opinions.find((o) => o.mediaId === canonicalIds[1])!.revision,
  };
  return {
    ...answered,
    comparisonCooldowns:
      answer === 'skip' || answer === 'undecided'
        ? [
            ...state.comparisonCooldowns.filter((c) => c.until > now && c.key !== key),
            cooldown,
          ].slice(-200)
        : state.comparisonCooldowns,
    comparisonSessions: state.comparisonSessions.map((s) =>
      s.id !== sessionId
        ? s
        : {
            ...s,
            steps: s.steps + 1,
            excluded: [...s.excluded, key],
            offered: null,
            inputKey: '',
          },
    ),
  };
}
export function retrySkippedPairs(state: Library, sessionId: string): Library {
  const session = state.comparisonSessions.find((s) => s.id === sessionId);
  if (!session) return state;
  return {
    ...state,
    comparisonCooldowns: state.comparisonCooldowns.filter((c) => !session.excluded.includes(c.key)),
    comparisonSessions: state.comparisonSessions.map((s) =>
      s.id === sessionId ? { ...s, excluded: [], offered: null, inputKey: '' } : s,
    ),
  };
}
