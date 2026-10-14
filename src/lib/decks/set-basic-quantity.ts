import { and, eq, sql } from "drizzle-orm";

import { db } from "../../db";
import { cards, deckCards, decks } from "../../db/schema";
import { isBasicLand } from "./grouping";
import { pruneOrphanLocks } from "./locks";
import { pruneOrphanProxies } from "./prune-proxies";
import { requireDeck } from "./read";
import { touchDeck } from "./touch";

/**
 * A sanity bound on one write, not a deck rule. The format's ninety-nine is never a refusal
 * (`add-validation.ts`: a deck may pass 99 and reads `Over`), so this exists only so a hand-built
 * request cannot store a figure no player could mean. The stepper's typed field stops well below it.
 */
export const BASIC_QUANTITY_MAX = 999;

/**
 * Why a set was refused. Every one is decided BEFORE anything is written, so a caller that draws a
 * refusal may say the deck is unchanged (`src/lib/copy/README.md`, the save-refusal shape).
 *
 * - `out-of-range`: not an integer, below 0, or above `BASIC_QUANTITY_MAX`.
 * - `not-basic`: the card's type line is not a basic land's. Every other card is singleton.
 * - `not-in-deck`: the deck holds no row for the card. The stepper draws only on a row that
 *   exists, so this is a row removed elsewhere since the page drew it; adding a basic stays the
 *   Add panel's job, which is where colour identity is checked.
 * - `moved`: the caller said what count it last saw (`expected`) and the row holds another. Some other writer on
 *   the page (an add, a trade, an undo, a restore) reached the row first, and an absolute figure computed from the
 *   old count would erase its change, so nothing is written and the caller re-reads.
 */
export type BasicQuantityRefusal = "out-of-range" | "not-basic" | "not-in-deck" | "moved";

export type BasicQuantityOutcome =
  | { ok: true; quantity: number; changed: boolean }
  | { ok: false; reason: BasicQuantityRefusal };

/** The figure's own rule, pure, so it is tested without a database. */
export function basicQuantityInRange(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= BASIC_QUANTITY_MAX;
}

/**
 * Sets a basic land's count in a deck's draft to `n`: the basics stepper's one write. Absolute
 * rather than one more or one fewer, so a burst of presses collapses to its last figure and a retry
 * is harmless.
 *
 * `n` above 0 writes the figure and CLEARS `auto`: a count the player chose is a claim on the row,
 * as the keep control's is, and a fill-added basic the player has re-counted must not be swept as
 * one they never touched. `n` of 0 deletes the row, prunes its proxy and leaves its lock dormant, exactly as
 * `removeOneCopy` does at the last copy. The stepper reaches 0 only by a typed figure; its ✕ at 1
 * stays on `removeCardFromDeck`, which is what #185's receipt and Undo hang off.
 */
export async function setBasicQuantityFor(
  userId: string,
  deckId: string,
  oracleId: string,
  n: number,
  /** The count the caller last saw confirmed. Given, the write is a compare-and-set against it. */
  expected?: number,
): Promise<BasicQuantityOutcome> {
  if (!basicQuantityInRange(n)) return { ok: false, reason: "out-of-range" };
  if (expected !== undefined && !basicQuantityInRange(expected)) return { ok: false, reason: "out-of-range" };
  await requireDeck(deckId, userId);

  const [card] = await db.select({ typeLine: cards.typeLine }).from(cards).where(eq(cards.oracleId, oracleId));
  if (!card || !isBasicLand(card.typeLine)) return { ok: false, reason: "not-basic" };

  return db.transaction(async (tx) => {
    // The DECK row first, then the card row: the order every deck write takes them in
    // (`removeOneCopy`, `addCardToDeckFor`, the fill, `restoreDraftFromVersion`).
    await tx.execute(sql`select 1 from ${decks} where ${decks.id} = ${deckId} for update`);
    const where = and(eq(deckCards.deckId, deckId), eq(deckCards.oracleId, oracleId));
    const [row] = await tx.select({ quantity: deckCards.quantity, auto: deckCards.auto })
      .from(deckCards).where(where).for("update");
    if (!row) return { ok: false, reason: "not-in-deck" } as const;
    if (expected !== undefined && row.quantity !== expected) return { ok: false, reason: "moved" } as const;

    if (n === 0) {
      await tx.delete(deckCards).where(where);
      await pruneOrphanProxies(tx, deckId);
      await pruneOrphanLocks(tx, deckId);
    } else if (row.quantity !== n || row.auto) {
      await tx.update(deckCards).set({ quantity: n, auto: false }).where(where);
    } else {
      // Nothing moved, so nothing is stamped: a stamp for a write that did not happen is the one lie
      // `last_edited_at` can tell (`removeOneCopy` keeps the same rule).
      return { ok: true, quantity: n, changed: false } as const;
    }
    await touchDeck(tx, deckId);
    return { ok: true, quantity: n, changed: true } as const;
  });
}
