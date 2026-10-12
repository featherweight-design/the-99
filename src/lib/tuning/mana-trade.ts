import { and, eq } from "drizzle-orm";

import { db } from "../../db";
import { decks, manaTradeApplies } from "../../db/schema";
import { touchDeck } from "../decks/touch";
import { applySwap, planSwap, restoreSwap } from "../swaps/draft-swap";

/**
 * Improve my mana's trade, applied and undone, as transactions. SERVER-ONLY. The same list mutation
 * Suggested changes' Apply makes (`verdicts.ts`): the deck row locked first, `planSwap`'s refusals,
 * one copy of the basic cut and one copy of the staple added at `auto: false`, and `touchDeck`. The
 * snapshot Undo reads is written before the deck changes, into `mana_trade_applies`.
 *
 * The caller has already found the trade in a fresh read of Improve my mana for this deck, so these
 * take the two oracle ids as given and check only what a write must: who owns the deck, and what
 * `planSwap` refuses (the basic gone or locked, the staple already held or no longer legal).
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function lockOwnedDeck(tx: Tx, deckId: string, userId: string): Promise<boolean> {
  const [row] = await tx.select({ id: decks.id }).from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
    .for("update");
  return !!row;
}

/** The apply's id, for its Undo, or null when it refused. */
export async function applyTrade(deckId: string, userId: string, cutOracleId: string, addOracleId: string): Promise<string | null> {
  return db.transaction(async (tx) => {
    if (!(await lockOwnedDeck(tx, deckId, userId))) return null;
    const plan = await planSwap(tx, deckId, cutOracleId, addOracleId);
    if (!plan.ok) return null;
    const [row] = await tx.insert(manaTradeApplies)
      .values({ deckId, userId, cutOracleId, addOracleId, undoSnapshot: plan.snapshot })
      .returning({ id: manaTradeApplies.id });
    await applySwap(tx, deckId, cutOracleId, addOracleId, plan.snapshot);
    await touchDeck(tx, deckId);
    return row.id;
  });
}

/** The deck exactly as the apply found it (`restoreSwap`), and only over the deck the apply left. The
 *  row goes with it, so a second press refuses. Returns the deck id, or null when it refused. */
export async function undoTrade(applyId: string, userId: string): Promise<string | null> {
  return db.transaction(async (tx) => {
    // The deck first, as every deck write here takes its locks: found by an unlocked read (an apply's
    // deck never changes), locked, and only then the row.
    const [owner] = await tx.select({ deckId: manaTradeApplies.deckId }).from(manaTradeApplies)
      .where(and(eq(manaTradeApplies.id, applyId), eq(manaTradeApplies.userId, userId)));
    if (!owner || !(await lockOwnedDeck(tx, owner.deckId, userId))) return null;
    const [row] = await tx.select().from(manaTradeApplies).where(eq(manaTradeApplies.id, applyId)).for("update");
    if (!row) return null;
    if (!(await restoreSwap(tx, row.deckId, row.cutOracleId, row.addOracleId, row.undoSnapshot))) return null;
    await tx.delete(manaTradeApplies).where(eq(manaTradeApplies.id, applyId));
    await touchDeck(tx, row.deckId);
    return row.deckId;
  });
}
