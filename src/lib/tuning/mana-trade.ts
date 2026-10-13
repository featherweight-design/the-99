import { and, eq, lt, sql } from "drizzle-orm";

import { db } from "../../db";
import { deckCards, decks, manaTradeApplies } from "../../db/schema";
import { touchDeck } from "../decks/touch";
import { applySwap, planSwap, restoreSwap } from "../swaps/draft-swap";
import { listKeyOf } from "./list-key";

/**
 * Improve my mana's trade, applied and undone, as transactions. SERVER-ONLY. The same list mutation
 * Suggested changes' Apply makes (`verdicts.ts`): the deck row locked first, `planSwap`'s refusals,
 * one copy of the card the trade names cut (a basic, an off-plan land or a named cut) and one copy of the staple added at `auto: false`, and `touchDeck`. The
 * snapshot Undo reads is written before the deck changes, into `mana_trade_applies`.
 *
 * The caller found the trade in a read made BEFORE the lock (a full read inside it would hold the lock,
 * and a pooled connection, across many more pooled queries), and passes the key of the list that read
 * saw. Under the lock the list is keyed again from this transaction (`listKeyOf`, the one definition):
 * every deck write takes that lock first, so a key that still matches means the deck being written is
 * the deck the offer was read from, and one that moved is refused rather than written. Beyond that it
 * checks what a write must: who owns the deck, and what `planSwap` refuses (the cut card gone or locked,
 * the staple already held or no longer legal).
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * How long an applied trade's snapshot is kept. Its Undo lives in the deck VISIT (the client drops every
 * receipt when the player leaves the deck), and a kept trade is otherwise never deleted, so each apply
 * clears the player's snapshots older than this, on any deck: no visit lasts a day, and an Undo pressed in a tab left
 * open that long refuses, as any Undo over a moved deck does.
 */
export const TRADE_SNAPSHOT_RETENTION = "1 day";

async function lockOwnedDeck(tx: Tx, deckId: string, userId: string) {
  const [row] = await tx.select({ commanderOracleId: decks.commanderOracleId, partnerOracleId: decks.partnerOracleId }).from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
    .for("update");
  return row ?? null;
}

export type OfferedTrade = { cutOracleId: string; addOracleId: string };

/** The apply's id, for its Undo, or null when it refused. */
export async function applyTrade(
  deckId: string, userId: string, trade: OfferedTrade, listKey: string, env: NodeJS.ProcessEnv,
): Promise<string | null> {
  return db.transaction(async (tx) => {
    const deck = await lockOwnedDeck(tx, deckId, userId);
    if (!deck) return null;
    const rows = await tx.select({ oracleId: deckCards.oracleId, quantity: deckCards.quantity }).from(deckCards).where(eq(deckCards.deckId, deckId));
    if (listKeyOf({ ...deck, cards: rows }) !== listKey) return null;
    const { cutOracleId, addOracleId } = trade;
    const plan = await planSwap(tx, deckId, cutOracleId, addOracleId, env);
    if (!plan.ok) return null;
    await tx.delete(manaTradeApplies).where(and(
      eq(manaTradeApplies.userId, userId),
      lt(manaTradeApplies.createdAt, sql`now() - ${TRADE_SNAPSHOT_RETENTION}::interval`),
    ));
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
export async function undoTrade(applyId: string, userId: string, env: NodeJS.ProcessEnv): Promise<string | null> {
  return db.transaction(async (tx) => {
    // The deck first, as every deck write here takes its locks: found by an unlocked read (an apply's
    // deck never changes), locked, and only then the row.
    const [owner] = await tx.select({ deckId: manaTradeApplies.deckId }).from(manaTradeApplies)
      .where(and(eq(manaTradeApplies.id, applyId), eq(manaTradeApplies.userId, userId)));
    if (!owner || !(await lockOwnedDeck(tx, owner.deckId, userId))) return null;
    const [row] = await tx.select().from(manaTradeApplies).where(eq(manaTradeApplies.id, applyId)).for("update");
    if (!row) return null;
    if (!(await restoreSwap(tx, row.deckId, row.cutOracleId, row.addOracleId, row.undoSnapshot, env))) return null;
    await tx.delete(manaTradeApplies).where(eq(manaTradeApplies.id, applyId));
    await touchDeck(tx, row.deckId);
    return row.deckId;
  });
}
