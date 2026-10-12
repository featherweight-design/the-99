import { and, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  cardAssignments, cards, collectionHistory, collectionItems, commanderScores, csvUploads, decks,
  type HistoryRow, type HistoryRowState,
} from "../../db/schema";
import { loadAvailability, loadDeckBuyRows } from "../decks/availability-query";
import type { Availability } from "../decks/availability";
import { allocateClaims } from "../decks/allocate";
import { assignCopyIn, lockCardClaims, type AssignRefusal } from "../decks/assign";
import { cartSourceDecks, regrant } from "../decks/mark-bought";
import { proxiedMembership } from "../decks/proxies";
import { collectionItemKey, type CollectionItemIdentity } from "./key";
import { mergeHolding, toCollectionItemValues, type PendingItem } from "./pending";
import type { OwnedCounts } from "./arrivals";
import { recordUploadTokens, type TokenHolding } from "../tokens/ownership";

/**
 * THE COLLECTION WRITE PATH (collection foundation, plan `2026-10-09-collection-write-path.md`).
 *
 * `applyCollectionChange` is the write path every collection write takes once
 * `COLLECTION_EDIT_ENABLED` is on; its callers (uploads, the edit and revert actions) arrive with
 * the plan's later PRs, and until then nothing calls it. Every write runs in one transaction under the per-user lock
 * `replaceCollection` takes, records its before and after in `collection_history`, and clears the
 * player's `commander_scores`. Every outcome but `applied` writes nothing.
 *
 * The rules that decide what a write does are pure functions below the transaction, each tested
 * on its own (`write.test.ts`); the transaction only reads, calls them and writes what they say.
 */

/** Entries older than this are hidden from history and pruned on the player's next write. */
import { HISTORY_RETENTION_DAYS } from "./retention";
export { HISTORY_RETENTION_DAYS };

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** A row as stored, keyed and carrying its two non-key columns. */
type Held = CollectionItemIdentity & HistoryRowState;

/** One holding as an editor drew it: its count and its condition, both of which an edit may rest on. */
export type SeenHolding = CollectionItemIdentity & { quantity: number; condition?: string | null };

/** A holding the player names by key; `quantity` is the new count, never a delta. */
export type EditRow = CollectionItemIdentity & {
  quantity: number;
  /** The count the player was looking at. A mismatch refuses the edit with `stale`. */
  expected?: number;
  /**
   * The non-key columns for a row this edit CREATES: a printing fixed by re-picking, or another
   * printing added beside the rest. Without them the new row stores a null `scryfall_id` and draws
   * the set's representative art. A row that already exists keeps its own columns.
   */
  scryfallId?: string | null;
  condition?: string | null;
  /**
   * An EXISTING row keeps its own condition on an edit, except when copies of another condition
   * were folded into it: then the rows disagree and the stored value is cleared, as every other
   * aggregation of rows does (`normalizeItems`).
   */
  clearCondition?: boolean;
};

export type CollectionChange =
  /**
   * The full new collection: an upload in Replace mode. With `uploadId`, that upload is stamped
   * confirmed in the same transaction, and a stamp already set returns `alreadyConfirmed`.
   */
  | { kind: "replace"; items: PendingItem[]; uploadId?: string; tokens?: TokenHolding[] }
  /** Quantities added: an upload in Add mode (`uploadId`, stamped as above), or the Add cards sheet. */
  | { kind: "add"; items: PendingItem[]; uploadId?: string; tokens?: TokenHolding[] }
  /**
   * Per-row new counts: card details, a row removed. `seen` is every holding of the card the
   * editor showed: a holding of that card the player has now and the editor never saw (another tab
   * added a printing) refuses with `stale`, so a removal never leaves an unseen holding behind.
   */
  | { kind: "edit"; rows: EditRow[]; seen?: SeenHolding[] }
  /**
   * Reverse entry `entryId` against today's collection. `expected` is the after-count per row
   * the confirmation showed, keyed by `collectionItemKey`; a difference refuses with `stale`.
   */
  | {
      kind: "revert";
      entryId: string;
      expected?: Record<string, number>;
      /**
       * I got it's undo, from the toast on the deck the copy was bought for: that deck is left out
       * of the deck check, because the player is looking at it and its returning row is the signal
       * (call B). Honoured only when the entry's own source is `shopping:<this id>`; any other
       * entry, or another deck, gets the whole check.
       */
      ignoreDeckId?: string;
      /**
       * The same for an undo from the all-decks cart: every deck the bought line listed. Honoured
       * only for a cart entry, and only for the decks that entry recorded (`cartSource`).
       */
      ignoreDeckIds?: string[];
      /**
       * Where an added copy goes (`undoPlacement`): the pick the purchase made, or that Change made
       * on its receipt, dropped in the same transaction, so Undo takes the copy back AND the
       * reservation it was given to. Honoured only for a card the entry itself wrote
       * (`placementToUndo`); without `deckId`, every reservation of that card goes.
       */
      undoPlacement?: { oracleId: string; deckId?: string };
    };

/**
 * The pick an undo may drop: only one on a card the reverted entry wrote. An undo naming any
 * other card drops nothing, so a revert can never be used to clear an unrelated reservation.
 */
export function placementToUndo(
  undo: { oracleId: string; deckId?: string } | undefined,
  entryRows: readonly { oracleId: string }[],
): { oracleId: string; deckId?: string } | null {
  if (!undo || !entryRows.some((r) => r.oracleId === undo.oracleId)) return null;
  return undo;
}

export type ChangeOptions = {
  /** The caller's idempotency id, minted once per action and reused on every retry. */
  id: string;
  /**
   * The deck warning the player saw and confirmed. The check still runs: the save goes through
   * only while that warning covers what the change would do now (`warningCovers`).
   */
  confirmShort?: ShortDeck[];
  /** Refuse when the player already owns anything (a first import's promise). */
  onlyIfEmpty?: boolean;
  /**
   * Run every step and roll it all back, answering `preview` with what the change would do: the
   * rows it moves and every committed deck it would leave short. The preview a confirmation is
   * drawn from, computed by the write itself so the two cannot disagree. The upload stamp rolls
   * back with everything else, so an upload previewed is still unconfirmed.
   */
  dryRun?: boolean;
  /**
   * Also return the whole collection's copies per oracle id either side of the write, read under
   * the lock, so they differ by exactly this write. What an upload's arrivals receipt compares;
   * read outside the lock, another write could land between either read and this one.
   */
  ownedCounts?: boolean;
  /**
   * Where the change came from, for history: `shopping:<deck id>`, or `cartSource(deck ids)` from
   * the all-decks cart. Uploads set their own.
   */
  source?: string;
  /**
   * I got it's receipt: one card's availability after the write, and before it as the same claims
   * snapshot less this write's copies. `before` and `after` are unexcluded (who holds each copy, by
   * seniority, the source deck in the queue); `afterFromDecks` is each of `deckIds`' own vantage,
   * the one its Shopping list draws, at one claim-model read per deck. The cart names none and reads
   * every deck off `after`'s allocation instead (`cartReceiptFacts`).
   */
  receipt?: {
    oracleId: string;
    deckIds: string[];
    /** The cart's line decks: what the roll-up still bills each of them, read under this write's locks. */
    owesFor?: string[];
  };
  /**
   * Refuse with `notInDeck` unless every one of `deckIds` holds `oracleId` (body or commander),
   * checked INSIDE the transaction with the deck rows locked `for update`, the lock every deck edit
   * takes first. A check before the transaction could pass, then see the card removed before the
   * write commits, and a purchase would be recorded for a deck that no longer wants it.
   */
  requireMember?: { deckIds: string[]; oracleId: string };
  /**
   * The cart's chooser (S1b): after the rows are written, give the copy to `deckId` by the same
   * reservation a pick writes (`assignCopyIn`, `set`), in this transaction. A refusal there refuses
   * the whole change with `assignRefused`, so a purchase never lands with a pick the player did not
   * get. The card's claim lock is taken before any deck row, the order a pick takes them in.
   */
  assign?: { oracleId: string; deckId: string };
  /**
   * Where an added copy goes, for Add Cards: every card this write RAISED, read in ONE
   * `loadAvailability` after the rows, inside this transaction, with each card's reservations
   * oldest first (the claim model's order), so the caller can say where each copy went
   * (`arrivalPlacement`) and build the chooser Change opens with no second read.
   */
  placements?: boolean;
};

/** One raised card as the write saw it: the claims after, the copies it added, and its reservations. */
export type RaisedCard = {
  after: Availability;
  brought: number;
  reservations: { deckId: string; copies: number }[];
};

export type ReceiptSnapshots = {
  /** `after`'s claims with this write's copies taken off `owned`: one snapshot, so the two cannot
   *  disagree about any other deck. Only `owned` and `claims`, which is all seniority reads. */
  before: Pick<Availability, "owned" | "claims"> | null;
  after: Availability | null;
  /** Keyed by each of `receipt.deckIds`. */
  afterFromDecks: Record<string, Availability | null>;
  /**
   * With `receipt.owesFor`: the copies of the card each of those decks is still billed (absent when
   * none), from its live list, in this same transaction, so it describes the instant `after` does.
   */
  owes?: Record<string, number>;
};

export type ShortDeck = {
  deckId: string;
  deckName: string;
  oracleId: string;
  cardName: string;
  /** How many more copies this deck is short of than before the change. */
  short: number;
};

export type AppliedEntry = {
  id: string;
  seq: number;
  kind: EntryKind;
  rows: HistoryRow[];
  raised: number;
  lowered: number;
};

export type ChangeResult =
  | {
      status: "applied";
      entry: AppliedEntry;
      owned?: { before: OwnedCounts; after: OwnedCounts };
      /**
       * The committed decks this change left shorter, by the same rule as the warning (`newlyShort`),
       * whether or not a warning was confirmed. Empty when nothing went down. The upload receipt
       * freezes it, so the player is told afterwards what they agreed to beforehand.
       */
      short: ShortDeck[];
      /** With `opts.receipt` alone. */
      receipt?: ReceiptSnapshots;
      /** With `opts.placements`: each raised card a deck claims, by oracle id. */
      raised?: Record<string, RaisedCard>;
    }
  /** Nothing would change. No entry is written. */
  | { status: "unchanged" }
  /**
   * This action's id already committed: the earlier write stands, and `entry` is it, so a retry
   * follows the same success path as the first submit. `rows` is empty once the entry is pruned.
   */
  | { status: "alreadyApplied"; entry: AppliedEntry }
  /** Another request already confirmed this upload. */
  | { status: "alreadyConfirmed" }
  /** `onlyIfEmpty` found a collection of `owned` copies. */
  | { status: "notEmpty"; owned: number }
  /** The collection moved since the player looked. `current` is each named row now. */
  | { status: "stale"; current: (CollectionItemIdentity & { quantity: number })[] }
  /** Committed decks the change would leave short. Resend with these as `confirmShort` to save anyway. */
  | { status: "wouldShort"; decks: ShortDeck[] }
  /** Cards the catalog no longer holds, by the name stored when they were written. */
  | { status: "missingCard"; names: string[] }
  /** The revert target is not the player's, aged out, or pruned. */
  | { status: "notFound" }
  /** One of `opts.requireMember`'s decks does not hold the card (any more). Nothing was written. */
  | { status: "notInDeck" }
  /** `opts.assign` was refused, for `reason`. Nothing was written. */
  | { status: "assignRefused"; reason: AssignRefusal }
  /** The revert target was already reverted, by `by`. */
  | { status: "alreadyReverted"; by: string }
  /** A `dryRun`: nothing was written. */
  | { status: "preview"; raised: number; lowered: number; rows: HistoryRow[]; decks: ShortDeck[] };

type EntryKind = (typeof collectionHistory.$inferSelect)["kind"];

// ---------------------------------------------------------------------------------------------
// The rules, pure.

const keyOf = (r: CollectionItemIdentity) => collectionItemKey(r);
const qty = (s: HistoryRowState | null) => s?.quantity ?? 0;
const stateOf = (h: Held): HistoryRowState =>
  ({ quantity: h.quantity, scryfallId: h.scryfallId, condition: h.condition });
const identityOf = (r: CollectionItemIdentity): CollectionItemIdentity =>
  ({ oracleId: r.oracleId, setCode: r.setCode, collectorNumber: r.collectorNumber, finish: r.finish });

/** Two sides equal in every stored column, `null` (no row) included. */
export function sameState(a: HistoryRowState | null, b: HistoryRowState | null): boolean {
  if (a === null || b === null) return a === b;
  return a.quantity === b.quantity && a.scryfallId === b.scryfallId && a.condition === b.condition;
}

/**
 * A row's after-state with the clamp applied: a count at or below zero is NO ROW. Readers infer
 * ownership from a row existing, so a stored zero would still read as owned.
 */
export function settle(quantity: number, attrs: Omit<HistoryRowState, "quantity">): HistoryRowState | null {
  return quantity > 0 ? { quantity, ...attrs } : null;
}

/** One planned row, or nothing when the two sides are identical. */
type Planned = CollectionItemIdentity & { before: HistoryRowState | null; after: HistoryRowState | null };

function planned(identity: CollectionItemIdentity, before: HistoryRowState | null, after: HistoryRowState | null): Planned[] {
  return sameState(before, after) ? [] : [{ ...identityOf(identity), before, after }];
}

/** Normalizes upload items exactly as the insert would, and folds them to one per key. */
export function normalizeItems<T extends PendingItem>(items: T[]): (Held & { name?: string })[] {
  const byKey = new Map<string, Held & { name?: string }>();
  toCollectionItemValues("", items).forEach((v, i) => {
    if (!Number.isInteger(v.quantity) || v.quantity <= 0) {
      throw new Error(`collection item quantity must be a positive integer, got ${v.quantity}`);
    }
    const row: Held & { name?: string } = {
      oracleId: v.oracleId, setCode: v.setCode, collectorNumber: v.collectorNumber, finish: v.finish,
      quantity: v.quantity, scryfallId: v.scryfallId, condition: v.condition,
      name: items[i].name,
    };
    const existing = byKey.get(keyOf(row));
    if (existing) mergeHolding(existing, row);
    else byKey.set(keyOf(row), row);
  });
  return [...byKey.values()];
}

/** Replace: every held row not named goes, every named row is set to exactly what was named. */
export function planReplace(current: Map<string, Held>, items: Held[]): Planned[] {
  const next = new Map(items.map((i) => [keyOf(i), i]));
  const keys = new Set([...current.keys(), ...next.keys()]);
  return [...keys].flatMap((k) => {
    const c = current.get(k) ?? null;
    const n = next.get(k) ?? null;
    return planned((c ?? n)!, c && stateOf(c), n && stateOf(n));
  });
}

/**
 * Add: counts add, and a stored row is one more member of the group the upload's own
 * aggregation folds (`mergeHolding`), so a printing or condition that disagrees falls to null.
 */
export function planAdd(current: Map<string, Held>, items: Held[]): Planned[] {
  return items.flatMap((i) => {
    const c = current.get(keyOf(i)) ?? null;
    if (!c) return planned(i, null, stateOf(i));
    const merged = stateOf(c);
    mergeHolding(merged, i);
    return planned(i, stateOf(c), merged);
  });
}

/**
 * Edit: each row is set to its new count. A row the player names that does not exist takes the
 * row's own `scryfallId` and `condition`, or starts bare without them.
 */
export function planEdit(current: Map<string, Held>, rows: EditRow[]): Planned[] {
  if (new Set(rows.map(keyOf)).size !== rows.length) {
    throw new Error("a collection edit names one row twice");
  }
  return rows.flatMap((r) => {
    if (!Number.isInteger(r.quantity) || r.quantity < 0) {
      throw new Error(`collection edit quantity must be a non-negative integer, got ${r.quantity}`);
    }
    const c = current.get(keyOf(r)) ?? null;
    const before = c && stateOf(c);
    const attrs = c
      ? { scryfallId: c.scryfallId, condition: r.clearCondition ? null : c.condition }
      : { scryfallId: r.scryfallId ?? null, condition: r.condition ?? null };
    return planned(r, before, settle(r.quantity, attrs));
  });
}

/**
 * Holdings the editor's picture of the card no longer matches (`seen` is every holding it drew,
 * with its count): one it never showed (another tab added a printing) or one whose count moved,
 * touched by this edit or not. So a removal never leaves an unseen holding behind and a toast never
 * reports a total the card no longer has. No `seen` means no claim.
 */
export function unseenHoldings(current: Map<string, Held>, seen: SeenHolding[] | undefined): CollectionItemIdentity[] {
  if (!seen) return [];
  const known = new Map(seen.map((s) => [keyOf(s), s]));
  const moved: CollectionItemIdentity[] = [...current.values()].filter((h) => {
    const s = known.get(keyOf(h));
    return !s || s.quantity !== h.quantity || (s.condition ?? null) !== (h.condition ?? null);
  });
  // A holding the editor drew that is gone now has no row in `current`, and is stale all the same.
  const gone = seen.filter((s) => s.quantity > 0 && !current.has(keyOf(s)));
  return [...moved, ...gone];
}

/** Rows an edit named with an `expected` that today's count does not match. */
export function staleEdits(current: Map<string, Held>, rows: EditRow[]): CollectionItemIdentity[] {
  return rows.filter((r) => r.expected !== undefined && (current.get(keyOf(r))?.quantity ?? 0) !== r.expected);
}

/**
 * Revert: the INVERSE of the entry's own change, applied to today's collection (brief §F). A
 * row the entry raised by n loses n now, clamped at zero, so a revert can do less than the
 * entry did. The two non-key columns go back only where nobody has changed them since: a row
 * the revert recreates takes the entry's before, and a row still holding exactly the entry's
 * after-columns takes its before-columns.
 */
export function planRevert(current: Map<string, Held>, rows: HistoryRow[]): (Planned & { name: string })[] {
  return rows.flatMap((r) => {
    const c = current.get(keyOf(r as CollectionItemIdentity)) ?? null;
    const delta = qty(r.after) - qty(r.before);
    const quantity = Math.max(0, (c?.quantity ?? 0) - delta);
    const source = r.before ?? r.after;
    const untouched = c !== null && r.after !== null
      && c.scryfallId === r.after.scryfallId && c.condition === r.after.condition;
    const attrs = c === null || untouched
      ? { scryfallId: source?.scryfallId ?? null, condition: source?.condition ?? null }
      : { scryfallId: c.scryfallId, condition: c.condition };
    return planned(r as CollectionItemIdentity, c && stateOf(c), settle(quantity, attrs))
      .map((p) => ({ ...p, name: r.name }));
  });
}

/** Rows a revert would set to a count other than the one its confirmation showed. */
export function staleRevert(plan: Planned[], expected: Record<string, number>): boolean {
  const planKeys = new Set(plan.map(keyOf));
  if (Object.keys(expected).some((k) => !planKeys.has(k))) return true;
  return plan.some((p) => expected[keyOf(p)] !== qty(p.after));
}

/** How many rows went up and how many went down, for the history list. */
export function countMoves(rows: { before: HistoryRowState | null; after: HistoryRowState | null }[]) {
  let raised = 0;
  let lowered = 0;
  for (const r of rows) {
    if (qty(r.after) > qty(r.before)) raised += 1;
    else if (qty(r.after) < qty(r.before)) lowered += 1;
  }
  return { raised, lowered };
}

/**
 * Per committed deck, how many copies of one card it is short, read off the claim model's own
 * allocation (`allocateClaims`: reservations first, then seniority) rather than a second copy of
 * it. COMMITTED claims only (plan Decision 5), never the draft-shaped buy rows; a brew was never
 * covered, so it is never named.
 */
export function committedShortfalls(a: Pick<Availability, "owned" | "claims">): Map<string, { name: string; short: number }> {
  // `allocateClaims` lists brews too, last; a shortfall names committed decks only.
  return new Map(allocateClaims(a)
    .filter((c) => !c.brew)
    .map((c) => [c.deckId, { name: c.deckName, short: Math.max(c.quantity - c.allocated, 0) }]));
}

/**
 * Whether the warning the player confirmed still covers what the change would do now: every deck
 * named now was named then, on the same card, short by no more. Anything else comes back as a
 * redrawn warning (brief §E: "a confirm re-checks against the collection as it is at that moment").
 */
export function warningCovers(acknowledged: ShortDeck[], now: ShortDeck[]): boolean {
  return now.every((d) => acknowledged.some((a) =>
    a.deckId === d.deckId && a.oracleId === d.oracleId && a.short >= d.short));
}

/**
 * A deck warning as a client sends it back with `confirmShort`. A Server Action's argument types
 * are a compile-time claim, so each entry is checked; a malformed one confirms nothing, and the
 * save then answers with the warning again.
 */
export function parseShortDecks(value: unknown): ShortDeck[] {
  if (!Array.isArray(value)) return [];
  return value.filter((d): d is ShortDeck =>
    typeof d === "object" && d !== null
    && typeof d.deckId === "string" && typeof d.oracleId === "string"
    && typeof d.deckName === "string" && typeof d.cardName === "string"
    && Number.isInteger(d.short));
}

/** The decks a change leaves shorter on a card than they were, and by how many. */
export function newlyShort(
  before: Map<string, Pick<Availability, "owned" | "claims">>,
  after: Map<string, Pick<Availability, "owned" | "claims">>,
  oracleIds: string[],
  names: Map<string, string>,
): ShortDeck[] {
  const out: ShortDeck[] = [];
  for (const oracleId of oracleIds) {
    const was = before.get(oracleId);
    const now = after.get(oracleId);
    if (!now) {
      // No row after the change: the card is no longer owned, and every committed claim on it
      // goes wholly short. A deck that was covered before reads that as its whole ask.
      if (!was) continue;
      for (const [deckId, b] of committedShortfalls(was)) {
        const claim = was.claims.find((c) => c.id === deckId)!;
        const whole = Math.max(claim.quantity, 0);
        if (whole > b.short) out.push({ deckId, deckName: b.name, oracleId, cardName: names.get(oracleId) ?? "", short: whole - b.short });
      }
      continue;
    }
    const prior = was ? committedShortfalls(was) : new Map<string, { short: number }>();
    for (const [deckId, n] of committedShortfalls(now)) {
      const grew = n.short - (prior.get(deckId)?.short ?? 0);
      if (grew > 0) out.push({ deckId, deckName: n.name, oracleId, cardName: names.get(oracleId) ?? "", short: grew });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// The transaction.

/** Thrown inside the transaction to roll it back and report `result` instead. */
class Refused extends Error {
  constructor(readonly result: ChangeResult) {
    super(result.status);
  }
}

const entryKind = (change: CollectionChange): EntryKind => {
  switch (change.kind) {
    case "replace": return "upload_replace";
    case "add": return change.uploadId ? "upload_add" : "add";
    case "edit": return "edit";
    case "revert": return "revert";
  }
};

const uploadOf = (change: CollectionChange) =>
  change.kind === "replace" || change.kind === "add" ? change.uploadId : undefined;

/**
 * Applies one change to `userId`'s collection, in one transaction, in this order:
 *
 *  1. the per-user lock every collection write takes, uploads included;
 *  2. the ledger entry, keyed on `opts.id`, so a retry of this exact action finds it;
 *  3. the change's upload stamped confirmed, and the first-import check when asked for;
 *  4. today's rows, read under the lock, and the `expected` checks against them;
 *  5. the deck check when anything goes down, passed only by a confirmed warning that still holds;
 *  6. the rows, the finished entry, the player's scores cleared, and old entries pruned.
 *
 * Callers invalidate (`invalidateCollectionReaders`) after an `applied`, outside this function,
 * because a script or probe has no request to revalidate in.
 */
export async function applyCollectionChange(
  userId: string,
  change: CollectionChange,
  opts: ChangeOptions,
): Promise<ChangeResult> {
  // Normalized before the transaction: a malformed item is the caller's bug, and it throws
  // without having taken the lock.
  const items = change.kind === "replace" || change.kind === "add" ? normalizeItems(change.items) : [];
  const uploadId = uploadOf(change);
  try {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${userId}, 0))`);

      // ---- 2. The entry, first. Its id is the action's, so a committed twin conflicts here.
      const [claimed] = await tx.insert(collectionHistory)
        .values({
          id: opts.id,
          userId,
          kind: entryKind(change),
          source: uploadId ? `csv_uploads:${uploadId}` : opts.source ?? null,
          raised: 0,
          lowered: 0,
          // The clock at the insert, AFTER the per-user lock, so entries' times order as their
          // writes did. `now()`, the column default, is frozen before the lock wait, and an entry
          // queued behind a switch-off upload would read as older than it (`editsSinceUpload`).
          createdAt: sql`clock_timestamp()`,
        })
        .onConflictDoNothing({ target: collectionHistory.id })
        .returning({ seq: collectionHistory.seq });
      if (!claimed) {
        const [twin] = await tx.select().from(collectionHistory).where(eq(collectionHistory.id, opts.id));
        // A retry only if the committed entry IS this action: same player, same kind, and for a
        // revert the same target. Any other match is an id reused for a different action (a
        // client bug, or a revert sent with its target's own id), and reporting the earlier
        // entry as this one's success would claim a write that never happened.
        const sameAction = twin?.userId === userId && twin.kind === entryKind(change)
          && (change.kind !== "revert" || twin.revertsId === change.entryId);
        if (sameAction) {
          throw new Refused({
            status: "alreadyApplied",
            entry: {
              id: twin.id, seq: Number(twin.seq), kind: twin.kind, rows: twin.rows ?? [],
              raised: twin.raised, lowered: twin.lowered,
            },
          });
        }
        // Never reported back as anything more specific: another player's id would confirm it exists.
        throw new Error("collection change id is already in use");
      }

      // The deck's membership, under the deck row's lock: the lock every deck edit takes first, so
      // no edit can remove the card between this check and the commit.
      if (opts.assign) await lockCardClaims(tx, userId, opts.assign.oracleId);
      if (opts.requireMember) {
        const ids = [...new Set(opts.requireMember.deckIds)].sort();
        const { oracleId } = opts.requireMember;
        // A statement per deck, in sorted order, so two writes naming overlapping decks lock them in
        // one order: Postgres does not promise `for update` takes its locks in `order by` order, so
        // the order has to be the statement sequence (as `pullCardFromDeck` does). Scoped to this
        // player: a deck id that is not theirs holds nothing of theirs.
        for (const id of ids) {
          const { rows: [own] } = await tx.execute(
            sql`select 1 from ${decks} where ${decks.id} = ${id} and ${decks.userId} = ${userId} for update`,
          );
          if (!own) throw new Refused({ status: "notInDeck" });
        }
        // And every one still holds the card, in one read.
        const { rows: [member] } = await tx.execute<{ held: boolean[] }>(sql`
          select array[${sql.join(ids.map((id) => proxiedMembership(id, oracleId)), sql`, `)}]::boolean[] as held
        `);
        if (!member || !member.held.every(Boolean)) throw new Refused({ status: "notInDeck" });
      }

      // ---- 3. The upload stamp is the upload's own lock, as in `replaceCollection`. The change's
      // own `uploadId` is the one id both the stamp and the entry's source read, so a write can
      // never confirm one upload while recording another.
      if (uploadId) {
        const stamped = await tx.update(csvUploads)
          // The clock at the stamp, AFTER the per-user lock, so uploads' stamps order as their
          // writes did. `now()` is frozen at the transaction's start, before the lock: two
          // concurrent confirms would commit in one order and stamp in the other, and every
          // reader of the newest upload (`editsSinceUpload`) would pick the wrong one.
          .set({ confirmedAt: sql`clock_timestamp()` })
          .where(and(
            eq(csvUploads.id, uploadId),
            eq(csvUploads.userId, userId),
            isNull(csvUploads.confirmedAt),
          ))
          .returning({ id: csvUploads.id });
        if (stamped.length === 0) throw new Refused({ status: "alreadyConfirmed" });
      }
      if (opts.onlyIfEmpty) {
        const [{ owned }] = await tx
          .select({ owned: sql<number>`coalesce(sum(${collectionItems.quantity}), 0)::int` })
          .from(collectionItems)
          .where(eq(collectionItems.userId, userId));
        if (owned > 0) throw new Refused({ status: "notEmpty", owned });
      }

      // ---- 4. Today's rows, and the plan against them.
      let target: { rows: HistoryRow[] | null } | undefined;
      const ignoredDecks = new Set<string>();
      if (change.kind === "revert") {
        const [row] = await tx.select({
          rows: collectionHistory.rows,
          revertedBy: collectionHistory.revertedBy,
          source: collectionHistory.source,
        })
          .from(collectionHistory)
          .where(and(
            eq(collectionHistory.id, change.entryId),
            eq(collectionHistory.userId, userId),
            sql`${collectionHistory.createdAt} >= now() - make_interval(days => ${HISTORY_RETENTION_DAYS})`,
          ));
        if (!row || row.rows === null) throw new Refused({ status: "notFound" });
        // ONE REVERT PER ENTRY, by a conditional stamp: no row back means another revert won.
        const won = await tx.update(collectionHistory)
          .set({ revertedBy: opts.id })
          .where(and(eq(collectionHistory.id, change.entryId), isNull(collectionHistory.revertedBy)))
          .returning({ id: collectionHistory.id });
        if (won.length === 0) throw new Refused({ status: "alreadyReverted", by: row.revertedBy ?? "" });
        // Set only now that the target is known to exist and be this player's; the column's
        // unique constraint then backs the stamp above.
        await tx.update(collectionHistory)
          .set({ revertsId: change.entryId })
          .where(eq(collectionHistory.id, opts.id));
        target = row;
        if (change.ignoreDeckId !== undefined && row.source === `shopping:${change.ignoreDeckId}`) {
          ignoredDecks.add(change.ignoreDeckId);
        }
        // Only decks the entry itself recorded: an undo naming any other deck exempts nothing.
        const listed = cartSourceDecks(row.source);
        if (change.ignoreDeckIds !== undefined && listed) {
          for (const id of change.ignoreDeckIds) if (listed.includes(id)) ignoredDecks.add(id);
        }
        // THE PICK GOES WITH THE COPY, before the deck check reads its "before": the undo puts back
        // the state before the press, and a pick left standing would hand a copy that is no longer
        // there to the deck the press chose (a cart pick, or a Change on the receipt). Under the
        // card's claim lock, which every reservation write takes.
        const drop = placementToUndo(change.undoPlacement, row.rows);
        if (drop) {
          await lockCardClaims(tx, userId, drop.oracleId);
          await tx.delete(cardAssignments).where(and(
            eq(cardAssignments.userId, userId),
            eq(cardAssignments.oracleId, drop.oracleId),
            ...(drop.deckId ? [eq(cardAssignments.deckId, drop.deckId)] : []),
          ));
        }
      }

      const named: CollectionItemIdentity[] =
        change.kind === "edit" ? change.rows
        : change.kind === "revert" ? (target!.rows as CollectionItemIdentity[])
        : items;
      const current = await readHeld(tx, userId, change.kind === "replace" ? null : named);

      let plan: (Planned & { name?: string })[];
      switch (change.kind) {
        case "replace": plan = planReplace(current, items); break;
        case "add": plan = planAdd(current, items); break;
        case "edit": {
          const stale = [...staleEdits(current, change.rows), ...unseenHoldings(current, change.seen)];
          if (stale.length > 0) throw new Refused({ status: "stale", current: currentOf(current, stale) });
          plan = planEdit(current, change.rows);
          break;
        }
        case "revert": {
          plan = planRevert(current, target!.rows!);
          if (change.expected && staleRevert(plan, change.expected)) {
            throw new Refused({ status: "stale", current: currentOf(current, target!.rows as CollectionItemIdentity[]) });
          }
          break;
        }
      }
      // A replace keeps its entry when nothing moved: it is still the record of that upload. So
      // does a revert, because the entry it reverts has to be marked reverted either way.
      if (plan.length === 0 && !uploadId && change.kind !== "revert") throw new Refused({ status: "unchanged" });

      // ---- Names, and the catalog check a revert or an add can fail.
      const ids = [...new Set(plan.map((p) => p.oracleId))];
      const catalog = new Map<string, string>(ids.length === 0 ? [] : (await tx
        .select({ oracleId: cards.oracleId, name: cards.name })
        .from(cards)
        .where(inArray(cards.oracleId, ids))).map((c) => [c.oracleId, c.name]));
      const given = new Map(items.filter((i) => i.name).map((i) => [i.oracleId, i.name!]));
      const nameOf = (p: Planned & { name?: string }) =>
        catalog.get(p.oracleId) ?? p.name ?? given.get(p.oracleId) ?? "";
      const missing = plan.filter((p) => p.after !== null && !catalog.has(p.oracleId));
      if (missing.length > 0) {
        throw new Refused({ status: "missingCard", names: [...new Set(missing.map(nameOf))] });
      }
      const rows: HistoryRow[] = plan.map((p) => ({
        oracleId: p.oracleId, setCode: p.setCode, collectorNumber: p.collectorNumber, finish: p.finish,
        name: nameOf(p), before: p.before, after: p.after,
      }));

      // ---- 5. The deck check brackets the write: claims before, the rows, claims after.
      const lowered = [...new Set(plan.filter((p) => qty(p.after) < qty(p.before)).map((p) => p.oracleId))];
      const ownedBefore = opts.ownedCounts && !opts.dryRun ? await readOwnedCounts(tx, userId) : null;
      const claimsBefore = lowered.length > 0 ? await loadAvailability(userId, { oracleIds: lowered }, tx) : null;
      // ONE claims snapshot for the receipt's before and after. Claim writers (a commit, a deck
      // edit) take no collection lock, so two reads either side of the write could straddle another
      // deck's commit and credit this purchase with it. `before` is that same snapshot less the
      // copies this write added, which is exactly what the write changed.
      //
      // With a pick, `opts.assign` also moved a reservation, which that snapshot carries and
      // `owned` cannot take back: `before` would credit the pick as already made. So the
      // reservations as they stood before the pick (read under the card's claim lock, which every
      // reservation write takes) are granted again over the same snapshot (`regrant`).
      const receiptSnapshots = async (oracleId: string): Promise<ReceiptSnapshots> => {
        const after = await receiptOf();
        const added = plan
          .filter((p) => p.oracleId === oracleId)
          .reduce((n, p) => n + qty(p.after) - qty(p.before), 0);
        return {
          before: after
            ? priorReservations
              ? regrant({ ...after, owned: after.owned - added }, priorReservations)
              : { ...after, owned: after.owned - added }
            : null,
          after,
          afterFromDecks: Object.fromEntries(await Promise.all(
            opts.receipt!.deckIds.map(async (id) => [id, await receiptOf(id)] as const),
          )),
          ...(opts.receipt!.owesFor
            ? {
                owes: Object.fromEntries((await loadDeckBuyRows(userId, opts.receipt!.owesFor, tx))
                  .filter((r) => r.oracleId === oracleId)
                  .map((r) => [r.deckId, r.quantity])),
              }
            : {}),
        };
      };
      const receiptOf = async (excludeDeckId?: string) => opts.receipt
        ? (await loadAvailability(userId, { oracleIds: [opts.receipt.oracleId], excludeDeckId }, tx))
          .get(opts.receipt.oracleId) ?? null
        : null;

      const priorReservations = opts.assign && opts.receipt && !opts.dryRun
        ? await tx.select({ deckId: cardAssignments.deckId, copies: cardAssignments.copies })
          .from(cardAssignments)
          .where(and(eq(cardAssignments.userId, userId), eq(cardAssignments.oracleId, opts.assign.oracleId)))
          .orderBy(cardAssignments.createdAt, cardAssignments.deckId)
        : null;

      // ---- 6. The rows.
      if (change.kind === "replace") {
        await tx.delete(collectionItems).where(eq(collectionItems.userId, userId));
        const values = items.map((i) => ({ userId, ...identityOf(i), ...stateOf(i) }));
        for (let i = 0; i < values.length; i += INSERT_BATCH) {
          await tx.insert(collectionItems).values(values.slice(i, i + INSERT_BATCH));
        }
      } else {
        await writeRows(tx, userId, plan);
      }
      if (opts.assign && !opts.dryRun) {
        const refused = await assignCopyIn(tx, userId, opts.assign.oracleId, opts.assign.deckId, "set");
        if (refused) throw new Refused({ status: "assignRefused", reason: refused });
      }
      // The tokens this UPLOAD read, and the marker that they were read, in the same transaction as the
      // rows: a failure rolls the whole confirm back. Only an upload (it carries an id) records tokens;
      // the Add cards sheet does not. An upload that read no token still writes the marker.
      if (change.kind === "replace" || change.kind === "add") {
        await recordUploadTokens(tx, userId, uploadId, change.kind, change.tokens);
      }

      const moves = countMoves(rows);
      let short: ShortDeck[] = [];
      if (claimsBefore) {
        const claimsAfter = await loadAvailability(userId, { oracleIds: lowered }, tx);
        const names = new Map(rows.map((r) => [r.oracleId, r.name]));
        const decks = newlyShort(claimsBefore, claimsAfter, lowered, names)
          .filter((d) => !ignoredDecks.has(d.deckId));
        if (opts.dryRun) throw new Refused({ status: "preview", ...moves, rows, decks });
        if (decks.length > 0 && !warningCovers(opts.confirmShort ?? [], decks)) {
          throw new Refused({ status: "wouldShort", decks });
        }
        short = decks;
      }
      if (opts.dryRun) throw new Refused({ status: "preview", ...moves, rows, decks: [] });

      await tx.update(collectionHistory)
        .set({ rows, ...moves })
        .where(eq(collectionHistory.id, opts.id));
      // Every score component derives from the collection (plan Decision 4).
      await tx.delete(commanderScores).where(eq(commanderScores.userId, userId));
      // Retention PRUNES rather than deletes: the entry's id is the only record that an action
      // applied, so deleting it would let a very late retry apply again.
      await tx.update(collectionHistory)
        .set({ rows: null, prunedAt: sql`now()` })
        .where(and(
          eq(collectionHistory.userId, userId),
          isNull(collectionHistory.prunedAt),
          lt(collectionHistory.createdAt, sql`now() - make_interval(days => ${HISTORY_RETENTION_DAYS})`),
        ));

      return {
        status: "applied" as const,
        entry: { id: opts.id, seq: Number(claimed.seq), kind: entryKind(change), rows, ...moves },
        short,
        ...(ownedBefore ? { owned: { before: ownedBefore, after: await readOwnedCounts(tx, userId) } } : {}),
        ...(opts.receipt ? { receipt: await receiptSnapshots(opts.receipt.oracleId) } : {}),
        ...(opts.placements ? { raised: await raisedCards(tx, userId, plan) } : {}),
      };
    });
  } catch (error) {
    if (error instanceof Refused) return error.result;
    throw error;
  }
}

/**
 * Every card `plan` raised, read after the write in one claim-model read, with its reservations in
 * the model's order. A card no deck claims is left out: it went nowhere.
 */
async function raisedCards(tx: Tx, userId: string, plan: Planned[]): Promise<Record<string, RaisedCard>> {
  const brought = new Map<string, number>();
  for (const p of plan) {
    const d = qty(p.after) - qty(p.before);
    if (d > 0) brought.set(p.oracleId, (brought.get(p.oracleId) ?? 0) + d);
  }
  if (brought.size === 0) return {};
  const ids = [...brought.keys()];
  const availability = await loadAvailability(userId, { oracleIds: ids }, tx);
  const reservations = new Map<string, { deckId: string; copies: number }[]>();
  for (const r of await tx.select({ oracleId: cardAssignments.oracleId, deckId: cardAssignments.deckId, copies: cardAssignments.copies })
    .from(cardAssignments)
    .where(and(eq(cardAssignments.userId, userId), inArray(cardAssignments.oracleId, ids)))
    .orderBy(cardAssignments.createdAt, cardAssignments.deckId)) {
    reservations.set(r.oracleId, [...(reservations.get(r.oracleId) ?? []), { deckId: r.deckId, copies: r.copies }]);
  }
  const out: Record<string, RaisedCard> = {};
  for (const [oracleId, after] of availability) {
    if (after.claims.length === 0) continue;
    out[oracleId] = { after, brought: brought.get(oracleId) ?? 0, reservations: reservations.get(oracleId) ?? [] };
  }
  return out;
}

/** Rows written in one statement each way: deletes for a zero, one upsert for the rest. */
const INSERT_BATCH = 500;

async function writeRows(tx: Tx, userId: string, plan: Planned[]): Promise<void> {
  const gone = plan.filter((p) => p.after === null);
  if (gone.length > 0) {
    // sql.param keeps each array ONE parameter; a bare array expands to a parameter list.
    await tx.execute(sql`
      delete from collection_items ci
      using unnest(
        ${sql.param(gone.map((g) => g.oracleId))}::uuid[],
        ${sql.param(gone.map((g) => g.setCode))}::text[],
        ${sql.param(gone.map((g) => g.collectorNumber))}::text[],
        ${sql.param(gone.map((g) => g.finish))}::text[]
      ) as k(oracle_id, set_code, collector_number, finish)
      where ci.user_id = ${userId}
        and ci.oracle_id = k.oracle_id and ci.set_code = k.set_code
        and ci.collector_number = k.collector_number and ci.finish = k.finish
    `);
  }
  const kept = plan.filter((p) => p.after !== null).map((p) => ({
    userId, ...identityOf(p), ...p.after!,
  }));
  for (let i = 0; i < kept.length; i += INSERT_BATCH) {
    // The after-states are absolute and were computed under the lock, so the upsert writes
    // them as they are rather than adding to whatever it finds.
    await tx.insert(collectionItems).values(kept.slice(i, i + INSERT_BATCH))
      .onConflictDoUpdate({
        target: [collectionItems.userId, collectionItems.oracleId, collectionItems.setCode,
          collectionItems.collectorNumber, collectionItems.finish],
        set: {
          quantity: sql`excluded.quantity`,
          scryfallId: sql`excluded.scryfall_id`,
          condition: sql`excluded.condition`,
        },
      });
  }
}

/**
 * Today's rows for `userId`, keyed by `collectionItemKey`: every row when `named` is null (a
 * replace), else the rows sharing an oracle id with one named.
 */
async function readHeld(tx: Tx, userId: string, named: CollectionItemIdentity[] | null): Promise<Map<string, Held>> {
  if (named && named.length === 0) return new Map();
  const oracleIds = named ? [...new Set(named.map((n) => n.oracleId))] : null;
  const rows = await tx.select({
    oracleId: collectionItems.oracleId,
    setCode: collectionItems.setCode,
    collectorNumber: collectionItems.collectorNumber,
    finish: collectionItems.finish,
    quantity: collectionItems.quantity,
    scryfallId: collectionItems.scryfallId,
    condition: collectionItems.condition,
  })
    .from(collectionItems)
    .where(oracleIds
      ? and(eq(collectionItems.userId, userId), inArray(collectionItems.oracleId, oracleIds))
      : eq(collectionItems.userId, userId));
  return new Map(rows.map((r) => [keyOf(r), r]));
}

async function readOwnedCounts(tx: Tx, userId: string): Promise<OwnedCounts> {
  const rows = await tx
    .select({ oracleId: collectionItems.oracleId, quantity: sql<number>`sum(${collectionItems.quantity})::int` })
    .from(collectionItems)
    .where(eq(collectionItems.userId, userId))
    .groupBy(collectionItems.oracleId);
  return Object.fromEntries(rows.map((r) => [r.oracleId, r.quantity]));
}

function currentOf(current: Map<string, Held>, named: CollectionItemIdentity[]) {
  return named.map((n) => ({ ...identityOf(n), quantity: current.get(keyOf(n))?.quantity ?? 0 }));
}
