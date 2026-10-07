import type { Library, UndoReceipt } from '@seen/contracts';
import { pairKey } from './ranking.ts';

const collections = [
  'opinions',
  'logs',
  'notes',
  'comparisons',
  'watchlist',
  'dismissals',
] as const;
type Collection = (typeof collections)[number];
const identity = (row: { id?: string; mediaId?: string }) => row.id ?? row.mediaId!;
const canonical = (rows: { id?: string; mediaId?: string }[]) =>
  JSON.stringify([...rows].sort((a, b) => identity(a).localeCompare(identity(b))));
export function withUndo(
  before: Library,
  after: Library,
  label: string,
  id: string,
  now: string,
): Library {
  let patches: UndoReceipt['patches'] = {};
  for (const collection of collections) {
    const a = new Map(before[collection].map((r) => [identity(r), r]));
    const b = new Map(after[collection].map((r) => [identity(r), r]));
    const keys = [...new Set([...a.keys(), ...b.keys()])].filter(
      (key) => JSON.stringify(a.get(key)) !== JSON.stringify(b.get(key)),
    );
    if (keys.length)
      patches = {
        ...patches,
        [collection]: {
          keys,
          before: before[collection].filter((r) => keys.includes(identity(r))),
          after: after[collection].filter((r) => keys.includes(identity(r))),
        },
      };
  }
  if (!Object.keys(patches).length) return after;
  const guardedMediaIds = [
    ...new Set([
      ...(patches.opinions?.keys ?? []),
      ...(patches.logs?.before ?? []).map((l) => l.mediaId),
      ...(patches.logs?.after ?? []).map((l) => l.mediaId),
    ]),
  ];
  const guardedPairKeys = [
    ...new Set(
      [...(patches.comparisons?.before ?? []), ...(patches.comparisons?.after ?? [])].map((c) =>
        pairKey(c.a, c.b),
      ),
    ),
  ];
  const opinionIds = new Set([
    ...guardedMediaIds,
    ...(patches.comparisons?.after ?? []).flatMap((c) => [c.a, c.b]),
  ]);
  const receipt: UndoReceipt = {
    id,
    label,
    createdAt: now,
    patches,
    guardedMediaIds,
    guardedPairKeys,
    opinionGuards: after.opinions.filter((o) => opinionIds.has(o.mediaId)),
    comparisonGuards: after.comparisons.filter(
      (c) =>
        guardedMediaIds.includes(c.a) ||
        guardedMediaIds.includes(c.b) ||
        guardedPairKeys.includes(pairKey(c.a, c.b)),
    ),
  };
  return { ...after, undoReceipts: [...after.undoReceipts, receipt].slice(-8) };
}
export function undoMutation(state: Library, id: string): Library {
  const receipt = state.undoReceipts.find((r) => r.id === id);
  if (!receipt) throw new Error('This undo is no longer available. Edit the title instead.');
  const conflict = () => {
    throw new Error(
      'This title changed since that action. Undo the newer action first, or edit the title.',
    );
  };
  for (const guard of receipt.opinionGuards) {
    if (
      JSON.stringify(state.opinions.find((o) => o.mediaId === guard.mediaId)) !==
      JSON.stringify(guard)
    )
      conflict();
  }
  const evidence = state.comparisons.filter(
    (c) =>
      receipt.guardedMediaIds.includes(c.a) ||
      receipt.guardedMediaIds.includes(c.b) ||
      receipt.guardedPairKeys.includes(pairKey(c.a, c.b)),
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
      inputKey: '',
      steps: Math.max(
        0,
        s.steps - (s.excluded.some((key) => receipt.guardedPairKeys.includes(key)) ? 1 : 0),
      ),
      excluded: s.excluded.filter((key) => !receipt.guardedPairKeys.includes(key)),
    })),
  };
}
function restoreCollection<K extends Collection>(
  state: Library,
  collection: K,
  receipt: UndoReceipt,
  conflict: () => never,
): Library {
  const patch = receipt.patches[collection];
  if (!patch) return state;
  if (
    canonical(state[collection].filter((r) => patch.keys.includes(identity(r)))) !==
    canonical(patch.after)
  )
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
    [collection]: [...rows, ...patch.before.filter((r) => !present.has(identity(r)))],
  };
}
