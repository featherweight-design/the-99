import { and, eq, sql } from "drizzle-orm";

import { db } from "../../db";
import { deckSuggestionItems, deckSuggestionRuns, decks } from "../../db/schema";
import { touchDeck } from "../decks/touch";
import { applySwap, planSwap, restoreSwap } from "../swaps/draft-swap";

/**
 * A suggestion's four verdicts, as transactions. SERVER-ONLY. Each takes the reader's id and
 * checks it through the run, so `probe:tuning-run` calls the real writes and the actions in
 * `tuning-actions.ts` add only the session and the revalidation.
 *
 * APPLY AND UNDO ARE LIST MUTATIONS and do everything one does: the deck row's lock first — the
 * order every deck write here takes — then the `deck_cards` changes, `pruneOrphanProxies` when a
 * row left, and `touchDeck`. A cut is ONE copy, as `removeCardFromDeck` removes one; an add is one
 * copy at `auto: false`, because the player chose it.
 *
 * Every verdict is guarded on the verdict it expects, so a second press changes nothing.
 * Each returns the deck id to revalidate, or null when it refused.
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The item and its run's deck, or null unless the reader owns the run — with the DECK row locked
 * and then the item's, in that order.
 *
 * The order is the whole point. Every deck write here locks the deck row first, and deleting a
 * deck locks it before cascading to its runs and their items; taking the item first would hold
 * it while waiting for a deck that a delete holds while waiting for the item. So the deck is
 * found by an unlocked read (an item's deck never changes: its run is fixed to one), locked, and
 * only then is the item locked and read.
 */
async function lockedItem(tx: Tx, itemId: string, userId: string) {
  const [owner] = await tx
    .select({ deckId: deckSuggestionRuns.deckId })
    .from(deckSuggestionItems)
    .innerJoin(deckSuggestionRuns, eq(deckSuggestionRuns.id, deckSuggestionItems.runId))
    .where(and(eq(deckSuggestionItems.id, itemId), eq(deckSuggestionRuns.userId, userId)));
  if (!owner) return null;
  await lockDeck(tx, owner.deckId);
  const [row] = await tx
    .select({
      addOracleId: deckSuggestionItems.addOracleId,
      cutOracleId: deckSuggestionItems.cutOracleId,
      verdict: deckSuggestionItems.verdict,
      undoSnapshot: deckSuggestionItems.undoSnapshot,
    })
    .from(deckSuggestionItems)
    .where(eq(deckSuggestionItems.id, itemId))
    .for("update");
  return row ? { ...row, deckId: owner.deckId } : null;
}

async function lockDeck(tx: Tx, deckId: string): Promise<void> {
  await tx.execute(sql`select 1 from ${decks} where ${decks.id} = ${deckId} for update`);
}

/**
 * Cut one copy, add one, in one transaction, with the verdict and the snapshot undo reads. The swap
 * itself is `draft-swap.ts`, shared with the swap tools' Take (brief ruling 7: one act, not two).
 *
 * Refused when the deck no longer holds the cut, when the add is a non-basic it already holds,
 * or when the add no longer fits the deck's commanders — the deck may have moved since the run.
 */
export async function applyItem(itemId: string, userId: string): Promise<string | null> {
  return db.transaction(async (tx) => {
    const item = await lockedItem(tx, itemId, userId);
    if (!item || item.verdict !== "pending" || item.cutOracleId === null) return null;
    const { deckId, addOracleId, cutOracleId } = item;

    const plan = await planSwap(tx, deckId, cutOracleId, addOracleId);
    if (!plan.ok) return null;

    // The verdict and the snapshot first, before the deck changes: undo can only ever read a
    // snapshot of the deck as it was before this very apply.
    await tx.update(deckSuggestionItems)
      .set({ verdict: "accepted", verdictAt: new Date(), undoSnapshot: plan.snapshot })
      .where(and(eq(deckSuggestionItems.id, itemId), eq(deckSuggestionItems.verdict, "pending")));

    await applySwap(tx, deckId, cutOracleId, addOracleId, plan.snapshot);
    await touchDeck(tx, deckId);
    return deckId;
  });
}

/**
 * The deck exactly as it was before the apply (`restoreSwap`), and only over the deck the apply
 * left. The item returns to pending and its snapshot is cleared.
 */
export async function undoItem(itemId: string, userId: string): Promise<string | null> {
  return db.transaction(async (tx) => {
    const item = await lockedItem(tx, itemId, userId);
    if (!item || item.verdict !== "accepted" || !item.undoSnapshot || item.cutOracleId === null) return null;
    const { deckId, addOracleId, cutOracleId, undoSnapshot: snap } = item;

    if (!(await restoreSwap(tx, deckId, cutOracleId, addOracleId, snap))) return null;

    await tx.update(deckSuggestionItems)
      .set({ verdict: "pending", verdictAt: null, undoSnapshot: null })
      .where(and(eq(deckSuggestionItems.id, itemId), eq(deckSuggestionItems.verdict, "accepted")));
    await touchDeck(tx, deckId);
    return deckId;
  });
}

/** Dismiss or restore: the verdict alone, with the deck untouched. */
export async function setDismissed(itemId: string, userId: string, dismissed: boolean): Promise<string | null> {
  return db.transaction(async (tx) => {
    const item = await lockedItem(tx, itemId, userId);
    const from = dismissed ? "pending" : "dismissed";
    if (!item || item.verdict !== from) return null;
    await tx.update(deckSuggestionItems)
      .set({ verdict: dismissed ? "dismissed" : "pending", verdictAt: dismissed ? new Date() : null })
      .where(and(eq(deckSuggestionItems.id, itemId), eq(deckSuggestionItems.verdict, from)));
    return item.deckId;
  });
}
