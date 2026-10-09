import { and, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  cards, collectionHistory, collectionItems, commanderScores, csvUploads,
  type HistoryRow, type HistoryRowState,
} from "../../db/schema";
import { loadAvailability } from "../decks/availability-query";
import type { Availability } from "../decks/availability";
import { collectionItemKey, type CollectionItemIdentity } from "./key";
import { mergeHolding, toCollectionItemValues, type PendingItem } from "./pending";

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
export const HISTORY_RETENTION_DAYS = 90;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** A row as stored, keyed and carrying its two non-key columns. */
type Held = CollectionItemIdentity & HistoryRowState;

/** A holding the player names by key; `quantity` is the new count, never a delta. */
export type EditRow = CollectionItemIdentity & {
  quantity: number;
  /** The count the player was looking at. A mismatch refuses the edit with `stale`. */
  expected?: number;
};

/** An item to add. `name` names the card if the catalog no longer holds it. */
export type AddItem = PendingItem & { name?: string };

export type CollectionChange =
  /** The full new collection: an upload in Replace mode. */
  | { kind: "replace"; items: PendingItem[]; uploadId?: string }
  /** Quantities added: an upload in Add mode (`uploadId`), or the Add cards sheet. */
  | { kind: "add"; items: AddItem[]; uploadId?: string }
  /** Per-row new counts: card details, a row removed. */
  | { kind: "edit"; rows: EditRow[] }
  /**
   * Reverse entry `entryId` against today's collection. `expected` is the after-count per row
   * the confirmation showed, keyed by `collectionItemKey`; a difference refuses with `stale`.
   */
  | { kind: "revert"; entryId: string; expected?: Record<string, number> };

export type ChangeOptions = {
  /** The caller's idempotency id, minted once per action and reused on every retry. */
  id: string;
  /** The player has seen the deck warning and saves anyway. */
  confirmShort?: boolean;
  /** Stamp this upload confirmed in the same transaction; a stamp already set wins. */
  confirmUploadId?: string;
  /** Refuse when the player already owns anything (a first import's promise). */
  onlyIfEmpty?: boolean;
  /** Where the change came from, for history: `shopping:<deck id>`. Uploads set their own. */
  source?: string;
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
  | { status: "applied"; entry: AppliedEntry }
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
  /** Committed decks the change would leave short. Resend with `confirmShort` to save anyway. */
  | { status: "wouldShort"; decks: ShortDeck[] }
  /** Cards the catalog no longer holds, by the name stored when they were written. */
  | { status: "missingCard"; names: string[] }
  /** The revert target is not the player's, aged out, or pruned. */
  | { status: "notFound" }
  /** The revert target was already reverted, by `by`. */
  | { status: "alreadyReverted"; by: string };

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
      name: (items[i] as { name?: string }).name,
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

/** Edit: each row is set to its new count; a row the player names that does not exist starts bare. */
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
    return planned(r, before, settle(r.quantity, { scryfallId: c?.scryfallId ?? null, condition: c?.condition ?? null }));
  });
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
 * figures (plan Decision 5: COMMITTED claims, never the draft-shaped buy rows).
 *
 * Reservations are granted first, as the model granted them (`granted`); what is left goes to
 * the sleeved decks in seniority order, longest held first and the deck id breaking a tie,
 * which is `senior_hard`'s own order. A brew claims nothing here: it was never covered.
 */
export function committedShortfalls(a: Pick<Availability, "owned" | "claims">): Map<string, { name: string; short: number }> {
  const sleeved = a.claims.filter((c) => c.mature);
  let supply = a.owned - sleeved.reduce((n, c) => n + (c.granted ?? 0), 0);
  const queue = [...sleeved].sort((x, y) => {
    const sx = x.since ?? Number.POSITIVE_INFINITY;
    const sy = y.since ?? Number.POSITIVE_INFINITY;
    return sx !== sy ? sx - sy : x.id < y.id ? -1 : x.id > y.id ? 1 : 0;
  });
  const out = new Map<string, { name: string; short: number }>();
  for (const c of queue) {
    const want = Math.max(c.quantity - (c.granted ?? 0), 0);
    const take = Math.min(want, Math.max(supply, 0));
    supply -= want;
    out.set(c.id, { name: c.name, short: want - take });
  }
  return out;
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
 *  3. the upload stamp and the first-import check, when asked for;
 *  4. today's rows, read under the lock, and the `expected` checks against them;
 *  5. the deck check when anything goes down, unless `confirmShort`;
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
        })
        .onConflictDoNothing({ target: collectionHistory.id })
        .returning({ seq: collectionHistory.seq });
      if (!claimed) {
        const [twin] = await tx.select().from(collectionHistory).where(eq(collectionHistory.id, opts.id));
        if (twin?.userId === userId) {
          throw new Refused({
            status: "alreadyApplied",
            entry: {
              id: twin.id, seq: Number(twin.seq), kind: twin.kind, rows: twin.rows ?? [],
              raised: twin.raised, lowered: twin.lowered,
            },
          });
        }
        // Another player's id: never reported back, since that would confirm it exists.
        throw new Error("collection change id is already in use");
      }

      // ---- 3. The upload stamp is the upload's own lock, as in `replaceCollection`.
      if (opts.confirmUploadId) {
        const stamped = await tx.update(csvUploads)
          .set({ confirmedAt: new Date() })
          .where(and(
            eq(csvUploads.id, opts.confirmUploadId),
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
      if (change.kind === "revert") {
        const [row] = await tx.select({
          rows: collectionHistory.rows,
          revertedBy: collectionHistory.revertedBy,
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
          const stale = staleEdits(current, change.rows);
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
      // A replace keeps its entry when nothing moved: it is still the record of that upload.
      if (plan.length === 0 && !uploadId) throw new Refused({ status: "unchanged" });

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
      const checkDecks = lowered.length > 0 && !opts.confirmShort;
      const claimsBefore = checkDecks ? await loadAvailability(userId, { oracleIds: lowered }, tx) : null;

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

      if (claimsBefore) {
        const claimsAfter = await loadAvailability(userId, { oracleIds: lowered }, tx);
        const names = new Map(rows.map((r) => [r.oracleId, r.name]));
        const decks = newlyShort(claimsBefore, claimsAfter, lowered, names);
        if (decks.length > 0) throw new Refused({ status: "wouldShort", decks });
      }

      const moves = countMoves(rows);
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
      };
    });
  } catch (error) {
    if (error instanceof Refused) return error.result;
    throw error;
  }
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

function currentOf(current: Map<string, Held>, named: CollectionItemIdentity[]) {
  return named.map((n) => ({ ...identityOf(n), quantity: current.get(keyOf(n))?.quantity ?? 0 }));
}
