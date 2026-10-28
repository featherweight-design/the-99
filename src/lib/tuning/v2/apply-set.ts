import { and, eq, isNotNull, isNull, max, ne, sql } from "drizzle-orm";

import { db } from "../../../db";
import { deckSuggestionItems, deckSuggestionRuns, decks, deckVersions } from "../../../db/schema";
import { touchDeck } from "../../decks/touch";
import { readProfileHead } from "../../profile/load";
import { applySwap, planSwap, restoreSwap } from "../../swaps/draft-swap";
import { planPicks, type PickRefusal } from "./picks";
import { deckTotal, V2_DECK_TOTAL } from "./run";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Why a set was not applied or undone. `picks` names the pure rule's own reason (`planPicks`); the rest are what the deck
 * or the run says under the locks.
 */
export type ApplySetRefusal =
  | { kind: "notFound" }
  /** Not a finished v2 run (still being made, failed, or a v10 run, which keeps per-card apply). */
  | { kind: "notV2" }
  | { kind: "picks"; reason: PickRefusal }
  /** The deck is not at its size, so equal counts would not keep it there (spec §3). */
  | { kind: "notAtSize" }
  /** A version was committed since the run read the deck: its lines were made for a list that is no longer the base. */
  | { kind: "stale" }
  /** A line no longer applies to the deck as it is (`planSwap`: the cut is gone, the add is already in, it is locked). */
  | { kind: "swap"; itemId: string };

export type ApplySetResult = { ok: true; deckId: string; applySet: string; itemIds: string[] } | { ok: false; refusal: ApplySetRefusal };

class Refused extends Error {
  constructor(readonly refusal: ApplySetRefusal) {
    super(refusal.kind);
  }
}

async function lockDeck(tx: Tx, deckId: string): Promise<void> {
  await tx.execute(sql`select 1 from ${decks} where ${decks.id} = ${deckId} for update`);
}

/**
 * The run's deck, by an unlocked read scoped to the reader (a run's deck never changes), then the deck locked before any
 * item: the order every deck write and a deck delete take (`verdicts.ts`'s `lockedItem`).
 */
async function lockRunDeck(tx: Tx, runId: string, userId: string) {
  const [run] = await tx.select({
    deckId: deckSuggestionRuns.deckId,
    status: deckSuggestionRuns.status,
    requestedCount: deckSuggestionRuns.requestedCount,
    readVersion: deckSuggestionRuns.readVersion,
  }).from(deckSuggestionRuns)
    .where(and(eq(deckSuggestionRuns.id, runId), eq(deckSuggestionRuns.userId, userId)));
  if (!run) return null;
  await lockDeck(tx, run.deckId);
  return run;
}

/**
 * A version committed since the run read the deck retires the run (spec §8): its lines were made for a list that is no
 * longer the base, so neither an apply nor an undo may touch it. Read under the deck lock, which a commit also takes.
 */
async function refuseIfRetired(tx: Tx, run: { deckId: string; readVersion: number | null }): Promise<void> {
  const [v] = await tx.select({ n: max(deckVersions.number) }).from(deckVersions).where(eq(deckVersions.deckId, run.deckId));
  if ((v?.n ?? null) !== run.readVersion) throw new Refused({ kind: "stale" });
}

/** The run's lines, locked `for update`, in the order the run saved them. */
async function lockedLines(tx: Tx, runId: string) {
  return tx.select({
    id: deckSuggestionItems.id,
    addOracleId: deckSuggestionItems.addOracleId,
    cutOracleId: deckSuggestionItems.cutOracleId,
    verdict: deckSuggestionItems.verdict,
    applySet: deckSuggestionItems.applySet,
    undoSnapshot: deckSuggestionItems.undoSnapshot,
  }).from(deckSuggestionItems)
    .where(eq(deckSuggestionItems.runId, runId))
    .orderBy(deckSuggestionItems.position, deckSuggestionItems.id)
    .for("update");
}

/**
 * Apply M picked additions and M picked cuts of one v2 run as ONE set, in one transaction (spec §7, plan PR 4). The set's
 * id is the caller's `actionId`, so a repeat of the same press (a double tap, a retried request) finds its set already
 * applied and answers with it rather than applying twice. Each line is planned and applied against the deck as the lines
 * before it left it, cuts first, with its own snapshot, so `undoSet` can put each back in reverse. Any line that no longer
 * applies refuses the whole set: nothing is written. Unpicked lines stay open for a later set.
 */
export async function applyPicks(args: {
  runId: string; addIds: readonly string[]; cutIds: readonly string[]; actionId: string; userId: string; env: NodeJS.ProcessEnv;
}): Promise<ApplySetResult> {
  const { runId, actionId, userId, env } = args;
  try {
    return await db.transaction(async (tx) => {
      const run = await lockRunDeck(tx, runId, userId);
      if (!run) throw new Refused({ kind: "notFound" });
      const lines = await lockedLines(tx, runId);
      const done = lines.filter((l) => l.applySet === actionId);
      if (done.length > 0) return { ok: true as const, deckId: run.deckId, applySet: actionId, itemIds: done.map((l) => l.id) };
      if (run.status !== "ok" || run.requestedCount === null) throw new Refused({ kind: "notV2" });

      const plan = planPicks({ requestedCount: run.requestedCount, lines, addIds: args.addIds, cutIds: args.cutIds });
      if (!plan.ok) throw new Refused({ kind: "picks", reason: plan.reason });

      await refuseIfRetired(tx, run);
      const head = await readProfileHead(tx, run.deckId, userId);
      if (!head) throw new Refused({ kind: "notFound" });
      if (deckTotal(head) !== V2_DECK_TOTAL) throw new Refused({ kind: "notAtSize" });

      const now = new Date();
      for (const line of [...plan.cuts, ...plan.adds]) {
        const swap = await planSwap(tx, run.deckId, line.cutOracleId, line.addOracleId, env);
        if (!swap.ok) throw new Refused({ kind: "swap", itemId: line.id });
        // The verdict and the snapshot first, as `applyItem` writes them: the snapshot is the deck before this line.
        await tx.update(deckSuggestionItems)
          .set({ verdict: "accepted", verdictAt: now, undoSnapshot: swap.snapshot, applySet: actionId, picked: true })
          .where(eq(deckSuggestionItems.id, line.id));
        await applySwap(tx, run.deckId, line.cutOracleId, line.addOracleId, swap.snapshot);
      }
      await touchDeck(tx, run.deckId);
      return { ok: true as const, deckId: run.deckId, applySet: actionId, itemIds: [...plan.cuts, ...plan.adds].map((l) => l.id) };
    });
  } catch (error) {
    if (error instanceof Refused) return { ok: false, refusal: error.refusal };
    throw error;
  }
}

/**
 * Undo a whole set (spec §7a): each line restored over the deck the set left, in the reverse of the order it was applied,
 * back to open and still picked (H4: an Undo keeps the picks). Any line whose restore no longer fits the deck refuses the
 * whole undo, so a set is never half undone. Returns the set's item ids for the panel to re-select.
 */
export async function undoSet(args: { applySet: string; userId: string; env: NodeJS.ProcessEnv }): Promise<ApplySetResult> {
  const { applySet, userId, env } = args;
  try {
    return await db.transaction(async (tx) => {
      const [owner] = await tx.select({ runId: deckSuggestionItems.runId })
        .from(deckSuggestionItems)
        .innerJoin(deckSuggestionRuns, eq(deckSuggestionRuns.id, deckSuggestionItems.runId))
        .where(and(eq(deckSuggestionItems.applySet, applySet), eq(deckSuggestionRuns.userId, userId), isNotNull(deckSuggestionRuns.requestedCount)))
        .limit(1);
      if (!owner) throw new Refused({ kind: "notFound" });
      const run = await lockRunDeck(tx, owner.runId, userId);
      if (!run) throw new Refused({ kind: "notFound" });
      await refuseIfRetired(tx, run);
      const set = (await lockedLines(tx, owner.runId)).filter((l) => l.applySet === applySet && l.verdict === "accepted");
      if (set.length === 0) throw new Refused({ kind: "notFound" });

      // The apply wrote cuts, then additions; undo walks that back, additions first. No two lines of a run name the same
      // card (the engine keeps one line per card), so within a side the order cannot change what a restore finds.
      const order = [...set.filter((l) => l.cutOracleId !== null), ...set.filter((l) => l.addOracleId !== null)].reverse();
      for (const line of order) {
        if (!line.undoSnapshot || !(await restoreSwap(tx, run.deckId, line.cutOracleId, line.addOracleId, line.undoSnapshot, env))) {
          throw new Refused({ kind: "swap", itemId: line.id });
        }
        await tx.update(deckSuggestionItems)
          .set({ verdict: "pending", verdictAt: null, undoSnapshot: null, applySet: null })
          .where(eq(deckSuggestionItems.id, line.id));
      }
      await touchDeck(tx, run.deckId);
      return { ok: true as const, deckId: run.deckId, applySet, itemIds: set.map((l) => l.id) };
    });
  } catch (error) {
    if (error instanceof Refused) return { ok: false, refusal: error.refusal };
    throw error;
  }
}

/**
 * Mark or unmark one open line of a finished v2 run as picked (H4: picks survive leaving and coming back). Free, and
 * written only on a change. The deck id when the line is an open v2 line of the reader's (picked or not), else null.
 */
export async function setPicked(itemId: string, userId: string, picked: boolean): Promise<string | null> {
  const [line] = await db.select({ deckId: deckSuggestionRuns.deckId })
    .from(deckSuggestionItems)
    .innerJoin(deckSuggestionRuns, eq(deckSuggestionRuns.id, deckSuggestionItems.runId))
    .where(and(
      eq(deckSuggestionItems.id, itemId),
      eq(deckSuggestionRuns.userId, userId),
      eq(deckSuggestionRuns.status, "ok"),
      isNotNull(deckSuggestionRuns.requestedCount),
      eq(deckSuggestionItems.verdict, "pending"),
      isNull(deckSuggestionItems.applySet),
    ));
  if (!line) return null;
  // The change test is in the UPDATE itself, against the row as it is now, so two overlapping presses cannot both read
  // the old value and lose one of them; a press that changes nothing still writes nothing.
  await db.update(deckSuggestionItems).set({ picked })
    .where(and(
      eq(deckSuggestionItems.id, itemId),
      eq(deckSuggestionItems.verdict, "pending"),
      isNull(deckSuggestionItems.applySet),
      ne(deckSuggestionItems.picked, picked),
    ));
  return line.deckId;
}
