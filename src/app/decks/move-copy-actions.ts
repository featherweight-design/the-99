"use server";
// Move a copy to another deck later (#2980): the card details door's server actions.
//
// Every export is a callable endpoint, so each authorizes with the CALLER's own id (`requireUserId`) and checks its wire
// input before touching a table. The guarded writes live in `src/lib/decks/`.
//
// A PICK IN THE OTHER DECKS GROUP IS TWO WRITES, in this order, in two transactions that never nest:
//   1. `addCardToDeckFor`: the card goes into the deck's DRAFT (it takes the deck row lock alone, and validates colors).
//   2. `assignPendingFor`: the pick waits in `pending_assignments` until the deck's commit (it takes the card lock, then
//      the deck row lock: the order pending-picks.ts documents).
// Because the first transaction has ended before the second begins, neither lock order can invert the other. A step 2
// that refuses takes the draft add back out when this press made it, so a refused pick leaves the deck as it was.

import { requireUserId } from "../../lib/auth";
import { isUuid } from "../../lib/uuid";
import { db } from "../../db";
import { pendingAssignments } from "../../db/schema";
import { and, eq } from "drizzle-orm";
import { loadChooserCards, type ContestedCard } from "../../lib/collection/summary-read";
import { loadOtherDecks, type OtherDecks } from "../../lib/decks/other-decks-read";
import { addCardToDeckFor, revalidateAdd } from "../../lib/decks/add-card";
import { assignPendingFor, type PendingRefusal } from "../../lib/decks/pending-picks";
import { lockCardClaims } from "../../lib/decks/assign";
import { removeOneCopy } from "../../lib/decks/remove-card";
import { requireDeck } from "../../lib/decks/read";
import { revalidateClaims } from "../../lib/decks/revalidate-claims";

/**
 * The door's card, read live. `loadContestedCard` stamps `arrived: 0` (a placeholder for a receipt's frozen fact), which
 * would draw `0 copies` and drop the holder's row here, where no import is behind the card. `loadChooserCards` reads the
 * collection's own supply as the copy count, with no `isContested` gate; the receipt paths keep `loadContestedCard`.
 */
async function loadDoorCard(oracleId: string, userId: string): Promise<ContestedCard | null> {
  return (await loadChooserCards([oracleId], userId))[0] ?? null;
}

export type MoveCopyView = { card: ContestedCard | null; other: OtherDecks };

/** The chooser's live read, on open (never with card details): the contested card and the Other decks. */
export async function openMoveCopy(oracleId: string): Promise<MoveCopyView | null> {
  const userId = await requireUserId();
  if (typeof oracleId !== "string" || !isUuid(oracleId)) return null;
  const [card, other] = await Promise.all([
    loadDoorCard(oracleId, userId).catch(() => null),
    loadOtherDecks(userId, oracleId),
  ]);
  return { card, other };
}

export type PickOtherResult =
  | { ok: true; /** This press put the card into the draft: its undo takes it back out. */ added: boolean; card: ContestedCard | null }
  | { ok: false; cause: PendingRefusal | "add-refused" | "failed"; card: ContestedCard | null };

export async function pickOtherDeck(oracleId: string, deckId: string): Promise<PickOtherResult> {
  const userId = await requireUserId();
  if (typeof oracleId !== "string" || typeof deckId !== "string" || !isUuid(oracleId) || !isUuid(deckId)) {
    return { ok: false, cause: "not-your-deck", card: null };
  }
  try {
    // Throws for a deck that is not this player's; nothing is written then.
    await requireDeck(deckId, userId);
  } catch {
    return { ok: false, cause: "not-your-deck", card: null };
  }
  let added = false;
  try {
    const outcome = await addCardToDeckFor(userId, deckId, oracleId, { relock: false });
    if (!outcome.result.ok) return { ok: false, cause: "add-refused", card: null };
    added = outcome.wrote === "added";
    revalidateAdd(deckId, userId, outcome);
    const cause = await assignPendingFor(userId, deckId, oracleId);
    if (cause) {
      if (added) await removeOneCopy(deckId, oracleId);
      revalidateClaims(deckId, userId);
      return { ok: false, cause, card: await loadDoorCard(oracleId, userId).catch(() => null) };
    }
  } catch {
    // A write that threw after the draft add leaves the deck as it was, as a refusal does.
    if (added) await removeOneCopy(deckId, oracleId).catch(() => undefined);
    return { ok: false, cause: "failed", card: null };
  }
  revalidateClaims(deckId, userId);
  return { ok: true, added, card: await loadDoorCard(oracleId, userId).catch(() => null) };
}

/**
 * Take a pending pick back (the same row tapped again, or the player choosing a listed deck instead). `removeFromDraft`
 * is the caller's own word that THIS session put the card into the draft: it is honoured only while the deck's newest
 * version does not list the card, so it can never cut a card the deck committed.
 */
export async function dropOtherDeckPick(oracleId: string, deckId: string, removeFromDraft: boolean): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  if (typeof oracleId !== "string" || typeof deckId !== "string" || !isUuid(oracleId) || !isUuid(deckId)) return { ok: false };
  try {
    await requireDeck(deckId, userId);
    await db.transaction(async (tx) => {
      // The card's lock first, as every pick write takes it, so a commit converting this pick cannot interleave.
      await lockCardClaims(tx, userId, oracleId);
      await tx.delete(pendingAssignments).where(and(
        eq(pendingAssignments.userId, userId),
        eq(pendingAssignments.oracleId, oracleId),
        eq(pendingAssignments.deckId, deckId),
      ));
    });
    if (removeFromDraft === true) {
      const other = await loadOtherDecks(userId, oracleId);
      // Offered means its newest version does not list the card, which is the condition for taking the add back.
      if (other.decks.some((d) => d.id === deckId)) await removeOneCopy(deckId, oracleId);
    }
    revalidateClaims(deckId, userId);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
