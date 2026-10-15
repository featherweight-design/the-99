import type { HistoryRowState } from "../../db/schema";
import { collectionItemKey, type CollectionItemIdentity } from "./key";
import { toCollectionItemValues, type PendingItem } from "./pending";

/**
 * COLLECTION SYNC, the merge (plan `2026-10-15-collection-sync.md`, §The merge). Pure: the write
 * (`applyCollectionChange`, kind `sync`) reads the base under its lock and calls this, and so does
 * `pnpm measure:sync`, so the two cannot disagree.
 *
 * Three sides per holding key `(oracle id, set, collector number, finish)`:
 *   - `b`, the BASE: the last file the collection was reconciled to (`readSyncBase`);
 *   - `a`, the APP: the collection now;
 *   - `f`, the FILE: the upload being synced.
 * A side that has no row reads as 0.
 *
 *   f = b                    keep a   kept (a ≠ b) or unchanged
 *   a = b, f ≠ b             take f   taken
 *   a ≠ b, f ≠ b, a = f      nothing  agreed
 *   a ≠ b, f ≠ b, a ≠ f      answer   conflict (app keeps a, file takes f, none is undecided)
 *
 * Only QUANTITIES decide the bucket. Printing attributes (`scryfallId`, `condition`) ride with the side
 * that wins, so a holding that differs only in condition keeps `a`, and is never a conflict.
 */

/** How an upload is synced: every change, only what it adds, or only its tokens. */
export type SyncPick = "everything" | "additions" | "tokens";
export const SYNC_PICKS: readonly SyncPick[] = ["everything", "additions", "tokens"];

export type SyncSide = "app" | "file";

/** What the review lists at most of each kind of row (conflicts, kept); the counts always cover every row. */
export const SYNC_REVIEW_CAP = 500;

/**
 * The player's answers to the conflicts. RULES, never row ids (G11): `all` answers every conflict,
 * shown or not, and `byKey` overrides it per holding (`collectionItemKey`). A conflict neither
 * names is undecided.
 */
export type SyncAnswers = { all?: SyncSide; byKey?: Record<string, SyncSide> };

/**
 * A sync's choices as a client sends them. A Server Action's argument types are a compile-time claim, so each
 * part is checked: an unknown pick throws, and an answer that is not `app` or `file` decides nothing.
 */
export function parseSyncOptions(value: unknown): { pick: SyncPick; answers: SyncAnswers } {
  const v = (typeof value === "object" && value !== null ? value : {}) as { pick?: unknown; answers?: unknown };
  if (v.pick !== undefined && !SYNC_PICKS.includes(v.pick as SyncPick)) throw new Error("unknown sync pick");
  const pick = (v.pick as SyncPick | undefined) ?? "everything";
  const side = (x: unknown): x is SyncSide => x === "app" || x === "file";
  const a = (typeof v.answers === "object" && v.answers !== null ? v.answers : {}) as { all?: unknown; byKey?: unknown };
  const answers: SyncAnswers = {};
  if (side(a.all)) answers.all = a.all;
  if (typeof a.byKey === "object" && a.byKey !== null && !Array.isArray(a.byKey)) {
    const byKey: Record<string, SyncSide> = {};
    for (const [k, x] of Object.entries(a.byKey)) if (k.length <= 200 && side(x)) byKey[k] = x;
    answers.byKey = byKey;
  }
  return { pick, answers };
}

/** One holding as a side holds it. */
export type SyncHolding = CollectionItemIdentity & HistoryRowState & { name?: string };

/** One planned row, the shape `applyCollectionChange` writes (as `planReplace` returns it). */
export type SyncPlanned = CollectionItemIdentity & {
  before: HistoryRowState | null;
  after: HistoryRowState | null;
  name?: string;
};

export type SyncCounts = {
  /** File-only changes taken. */
  taken: number;
  /** App-only changes kept (the file still says what the base said). */
  kept: number;
  /** Both sides moved, to the same count: nothing to do. */
  agreed: number;
  /** Nobody moved, or the app moved back to the base. */
  unchanged: number;
  /** Both sides moved, to different counts. */
  conflicts: number;
  /** Conflicts no answer decides. */
  undecided: number;
  /** Conflicts answered File, which are written. */
  answeredFile: number;
  /**
   * File changes a partial pick leaves alone: under **Only what it adds**, a removal or a lowering
   * taken, or a conflict whose file count is lower; under **Only its tokens**, every file change.
   */
  ignored: number;
};

/**
 * Whether a sync has nothing to do: no card row to write, no token row to change, and no conflict left
 * unanswered (an unanswered conflict is something to sync: the review has to ask it). What the preview's
 * `nothing` and the confirm's `nothingToSync` read, and `measure:sync` prints.
 */
export function nothingToSync(plan: Pick<SyncPlan, "rows" | "counts">, tokenChanges: number): boolean {
  return plan.rows.length === 0 && tokenChanges === 0 && plan.counts.undecided === 0;
}

/** A conflict or a kept holding, as the review lists it. */
export type SyncReviewRow = CollectionItemIdentity & {
  key: string;
  name?: string;
  base: number;
  app: number;
  file: number;
  /** A conflict's answer, when one decides it. */
  answer?: SyncSide;
};

export type SyncPlan = {
  rows: SyncPlanned[];
  counts: SyncCounts;
  /** Every conflict the partial pick still asks, sorted by key. */
  conflicts: SyncReviewRow[];
  /** Every holding kept at the app's count, sorted by key. */
  kept: SyncReviewRow[];
};

const stateOf = (h: SyncHolding): HistoryRowState =>
  ({ quantity: h.quantity, scryfallId: h.scryfallId, condition: h.condition });
const identityOf = (r: CollectionItemIdentity): CollectionItemIdentity =>
  ({ oracleId: r.oracleId, setCode: r.setCode, collectorNumber: r.collectorNumber, finish: r.finish });

/** A count at or below zero is NO ROW (`settle` in write.ts). */
function fileState(f: SyncHolding | undefined): HistoryRowState | null {
  return f && f.quantity > 0 ? stateOf(f) : null;
}

/** Per holding key, the copies an upload's stored items hold, folded as the insert folds them. */
export function quantitiesOf(items: readonly PendingItem[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const v of toCollectionItemValues("", [...items])) {
    const k = collectionItemKey(v);
    out.set(k, (out.get(k) ?? 0) + v.quantity);
  }
  return out;
}

/** The answer that decides a conflict on `key`, or none. */
export function answerFor(answers: SyncAnswers | undefined, key: string): SyncSide | undefined {
  return answers?.byKey?.[key] ?? answers?.all;
}

export function planSync(input: {
  base: ReadonlyMap<string, number>;
  app: ReadonlyMap<string, SyncHolding>;
  file: readonly SyncHolding[];
  pick: SyncPick;
  answers?: SyncAnswers;
}): SyncPlan {
  const { base, app, pick, answers } = input;
  const file = new Map(input.file.map((f) => [collectionItemKey(f), f]));
  const counts: SyncCounts = { taken: 0, kept: 0, agreed: 0, unchanged: 0, conflicts: 0, undecided: 0, answeredFile: 0, ignored: 0 };
  const rows: SyncPlanned[] = [];
  const conflicts: SyncReviewRow[] = [];
  const kept: SyncReviewRow[] = [];
  const keys = [...new Set([...base.keys(), ...app.keys(), ...file.keys()])].sort();

  for (const key of keys) {
    const appRow = app.get(key);
    const fileRow = file.get(key);
    const identity = identityOf((appRow ?? fileRow ?? parseKey(key))!);
    const b = base.get(key) ?? 0;
    const a = appRow?.quantity ?? 0;
    const f = fileRow?.quantity ?? 0;
    const review = (): SyncReviewRow => ({ ...identity, key, name: fileRow?.name ?? appRow?.name, base: b, app: a, file: f });
    const take = () => rows.push({
      ...identity, before: appRow ? stateOf(appRow) : null, after: fileState(fileRow), name: fileRow?.name ?? appRow?.name,
    });

    if (f === b) {
      if (a !== b) { counts.kept += 1; kept.push(review()); } else counts.unchanged += 1;
      continue;
    }
    // Only its tokens: every card change is the file's and none is taken.
    if (pick === "tokens") { counts.ignored += 1; continue; }
    if (a === b) {
      // Only what it adds: a removal or a lowering is not taken.
      if (pick === "additions" && f < a) { counts.ignored += 1; continue; }
      counts.taken += 1;
      take();
      continue;
    }
    if (a === f) { counts.agreed += 1; continue; }
    // Only what it adds asks a conflict only when the file would raise the count.
    if (pick === "additions" && f < a) { counts.ignored += 1; continue; }
    counts.conflicts += 1;
    const answer = answerFor(answers, key);
    conflicts.push({ ...review(), ...(answer ? { answer } : {}) });
    if (!answer) { counts.undecided += 1; continue; }
    if (answer === "file") { counts.answeredFile += 1; take(); }
  }
  return { rows, counts, conflicts, kept };
}

/** A key's identity, for a base-only holding with no row on either side. */
function parseKey(key: string): CollectionItemIdentity {
  const [oracleId, setCode, collectorNumber, finish] = key.split("|");
  return { oracleId, setCode, collectorNumber, finish: finish as CollectionItemIdentity["finish"] };
}

// ---------------------------------------------------------------------------------------------
// Staleness: whether the file is older than the one the collection was last reconciled to.

/**
 * `older` when, of the file's holdings that differ from the anchor's, more than this share put back
 * what the anchor changed from its predecessor. Unmeasured (G2): pinned by the test, printed by the probe
 * and by `measure:sync`.
 */
export const STALE_REVERSAL_SHARE = 0.5;

export type Staleness = "noNewer" | "older" | null;

/** How many holdings two files hold at different counts. */
export function holdingDistance(x: ReadonlyMap<string, number>, y: ReadonlyMap<string, number>): number {
  let n = 0;
  for (const k of new Set([...x.keys(), ...y.keys()])) if ((x.get(k) ?? 0) !== (y.get(k) ?? 0)) n += 1;
  return n;
}

/**
 * `noNewer`: the file's cards equal the anchor's (S1). `older`: the file is nearer, by holdings that
 * differ, to an earlier confirmed upload than to the anchor; or more than `STALE_REVERSAL_SHARE` of its
 * differences from the anchor put back the anchor's own changes from its predecessor (`earlier[0]`).
 * Otherwise null. `earlier` is newest first.
 */
export function staleness(
  file: ReadonlyMap<string, number>,
  anchor: ReadonlyMap<string, number>,
  earlier: readonly ReadonlyMap<string, number>[],
): Staleness {
  const fromAnchor = holdingDistance(file, anchor);
  if (fromAnchor === 0) return "noNewer";
  if (earlier.some((e) => holdingDistance(file, e) < fromAnchor)) return "older";
  const predecessor = earlier[0];
  if (predecessor) {
    let reversed = 0;
    for (const k of new Set([...file.keys(), ...anchor.keys()])) {
      const f = file.get(k) ?? 0;
      const an = anchor.get(k) ?? 0;
      const p = predecessor.get(k) ?? 0;
      if (f !== an && an !== p && f === p) reversed += 1;
    }
    if (reversed / fromAnchor > STALE_REVERSAL_SHARE) return "older";
  }
  return null;
}
