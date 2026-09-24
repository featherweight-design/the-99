/**
 * The swap tools' writes, as transactions (sub-project 4, PR 2): Take a stand-in, Undo swap, and
 * the Shopping limit. SERVER-ONLY. Each takes the reader's id and checks it against the deck, so
 * `probe:swap-take` calls the real writes and `actions.ts` adds only the session, the flag and the
 * revalidation.
 *
 * A take is tuning's Apply, through the same body (`draft-swap.ts`); what differs is where the
 * snapshot lives. Tuning writes it on the suggestion it applied, and a take writes a `deck_swaps`
 * row, because a Shopping take has no suggestion to write it on.
 */
import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "../../db";
import { cards, deckSwaps, decks } from "../../db/schema";
import { loadAvailability } from "../decks/availability-query";
import { touchDeck } from "../decks/touch";
import { applySwap, planSwap, restoreSwap, type SwapRefusal } from "./draft-swap";
import { freeAfterTake } from "./stand-ins";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** A deck row this reader owns, locked: every deck write locks the deck first. */
async function lockOwnDeck(tx: Tx, deckId: string, userId: string): Promise<boolean> {
  const rows = await tx.execute(sql`
    select 1 from ${decks} where ${decks.id} = ${deckId} and ${decks.userId} = ${userId} for update`);
  return rows.rows.length > 0;
}

export type TakeResult =
  | {
      ok: true;
      swapId: string;
      /** Whether the copy the take added was spare: the take's own read, never the list's. */
      addWasFree: boolean;
      /** Copies of the cut still in the draft: 0 when the row left, more for a basic or a multiple. */
      cutLeft: number;
    }
  | { ok: false; reason: SwapRefusal | "notFound" };

/**
 * Take `addOracleId` in place of one copy of `cutOracleId`. Refused, with the deck untouched, when
 * the deck has moved since the list was read (`SwapRefusal`), or when the deck is not the reader's.
 */
export async function takeStandIn(
  deckId: string, userId: string, cutOracleId: string, addOracleId: string,
): Promise<TakeResult> {
  return db.transaction(async (tx) => {
    if (!(await lockOwnDeck(tx, deckId, userId))) return { ok: false, reason: "notFound" };
    const plan = await planSwap(tx, deckId, cutOracleId, addOracleId);
    if (!plan.ok) return { ok: false, reason: plan.reason };

    // Before the swap moves anything: from this deck's vantage, is there a spare copy of the add?
    // Read inside the take's own transaction, so the receipt describes the copy this take used.
    const [card] = await tx.select({ typeLine: cards.typeLine }).from(cards).where(eq(cards.oracleId, addOracleId));
    const availability = (await loadAvailability(userId, { oracleIds: [addOracleId], excludeDeckId: deckId }, tx))
      .get(addOracleId);
    const addWasFree = freeAfterTake(card, availability?.owned ?? 0, availability?.free ?? null);

    const [swap] = await tx.insert(deckSwaps).values({
      deckId, userId, cutOracleId, addOracleId, addWasFree, snapshot: plan.snapshot,
    }).returning({ id: deckSwaps.id });

    await applySwap(tx, deckId, cutOracleId, addOracleId, plan.snapshot);
    await touchDeck(tx, deckId);
    return { ok: true, swapId: swap.id, addWasFree, cutLeft: plan.snapshot.cut!.quantity - 1 };
  });
}

/**
 * Undo a take: both rows exactly as they were, and only over the deck the take left. Returns the
 * deck id, or null when the swap is not the reader's, was already undone, or the deck has moved.
 */
export async function undoSwap(swapId: string, userId: string): Promise<string | null> {
  return db.transaction(async (tx) => {
    // The deck is found unlocked (a swap's deck never changes), locked, and only then is the swap
    // row locked and read: the order every deck write here takes.
    const [owner] = await tx.select({ deckId: deckSwaps.deckId }).from(deckSwaps)
      .where(and(eq(deckSwaps.id, swapId), eq(deckSwaps.userId, userId)));
    if (!owner || !(await lockOwnDeck(tx, owner.deckId, userId))) return null;
    const [swap] = await tx.select().from(deckSwaps)
      .where(and(eq(deckSwaps.id, swapId), isNull(deckSwaps.undoneAt))).for("update");
    if (!swap) return null;

    if (!(await restoreSwap(tx, swap.deckId, swap.cutOracleId, swap.addOracleId, swap.snapshot))) return null;
    await tx.update(deckSwaps).set({ undoneAt: new Date() }).where(eq(deckSwaps.id, swapId));
    await touchDeck(tx, swap.deckId);
    return swap.deckId;
  });
}

/** A limit the field can hold: whole dollars, $1 or more. Null is the $10 default. */
export function validLimit(cents: number | null): boolean {
  return cents === null || (Number.isInteger(cents) && cents >= 100 && cents % 100 === 0);
}

/** Remember the deck's Shopping limit. False when the value is not a whole dollar, or the deck is not the reader's. */
export async function setShoppingLimit(deckId: string, userId: string, cents: number | null): Promise<boolean> {
  if (!validLimit(cents)) return false;
  const updated = await db.update(decks).set({ shoppingLimitCents: cents })
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
    .returning({ id: decks.id });
  return updated.length > 0;
}
