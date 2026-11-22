"use server";

// The commander write as a Server Action (plan decision 6), and the sheet's read. The write's
// transaction is `write.ts`'s.

import { db } from "../../db";
import { requireUserId } from "../auth";
import { revalidateClaims } from "../decks/revalidate-claims";
import { isUuid } from "../uuid";
import { loadChangeCandidates, type ChangeCandidates } from "./candidates";
import { loadOpenedCards } from "./opened-cards";
import type { CommanderPair } from "./pending";
import { writeUndoPartnerAdd, type UndoPartnerAddResult } from "./undo-write";
import { writeCommanderChange, type ChangeCommanderResult } from "./write";

export async function changeCommander(
  deckId: string, to: CommanderPair, staysOracleId: string | null = null,
  /** A partner arriving from outside the 99 (`pairAdd`): the card that leaves to keep the deck at 100. */
  cutOracleId: string | null = null,
): Promise<ChangeCommanderResult> {
  const userId = await requireUserId();
  // Request data: an id that is not a uuid would reach Postgres's cast and throw, where the caller
  // is owed the typed refusal.
  if (!isUuid(deckId)) return { ok: false, reason: "unavailable" };
  const partner = to?.partnerOracleId ?? null;
  if (!to || !isUuid(to.commanderOracleId) || (partner !== null && !isUuid(partner))) {
    return { ok: false, reason: "illegal" };
  }
  const stays = staysOracleId ?? null;
  if (stays !== null && !isUuid(stays)) return { ok: false, reason: "illegal" };
  const cut = cutOracleId ?? null;
  if (cut !== null && !isUuid(cut)) return { ok: false, reason: "illegal" };
  const result = await db.transaction((tx) => writeCommanderChange(tx, deckId, userId, {
    commanderOracleId: to.commanderOracleId, partnerOracleId: partner,
  }, stays, cut));
  if (result.ok) {
    // IN the action, not deferred into `after()`: a Server Action that revalidates the route it
    // was called from returns that route's new payload, so the deck page redraws under the new
    // commander with no second request. Deferred, the sheet had to `router.refresh()`, and that
    // request could reach the server before the deferred invalidation ran and draw the old
    // commander from the cache. The payload is the page the reader is about to look at anyway.
    // `revalidateClaims` retires the user's list tag as well.
    revalidateClaims(deckId, userId);
  }
  return result;
}

/**
 * The toast's Undo for a partner add (#491): the pair goes back to the single that stayed and the
 * cut card comes back, in one write. The transaction is `undo-write.ts`'s, which reads the live
 * rows; the ids here are the toast's memory of the add and are checked against them.
 */
export async function undoPartnerAdd(
  deckId: string, staysOracleId: string, partnerOracleId: string, cutOracleId: string | null,
): Promise<UndoPartnerAddResult> {
  const userId = await requireUserId();
  if (!isUuid(deckId)) return { ok: false, reason: "unavailable" };
  const cut = cutOracleId ?? null;
  if (!isUuid(staysOracleId) || !isUuid(partnerOracleId) || (cut !== null && !isUuid(cut))) {
    return { ok: false, reason: "changed" };
  }
  const result = await db.transaction((tx) => writeUndoPartnerAdd(tx, deckId, userId, staysOracleId, partnerOracleId, cut));
  // In the action, as `changeCommander` does: the reply carries the deck page under the single.
  if (result.ok) revalidateClaims(deckId, userId);
  return result;
}

/**
 * The candidates for the sheet, read when it opens rather than shipped with the deck page: most
 * visits never open it, and the read costs a support join over every candidate. Null when the
 * deck is not the reader's.
 */
export async function readChangeCandidates(deckId: string): Promise<ChangeCandidates | null> {
  const userId = await requireUserId();
  if (!isUuid(deckId)) return null;
  return loadChangeCandidates(deckId, userId);
}

/**
 * The colors a partner opens and the reader's own cards in them that the pair's decks run, read when the
 * add's confirm opens. Null when the deck is not the reader's or the two cannot pair.
 */
export async function readOpenedCards(
  deckId: string, partnerOracleId: string,
): Promise<Awaited<ReturnType<typeof loadOpenedCards>>> {
  const userId = await requireUserId();
  if (!isUuid(deckId) || !isUuid(partnerOracleId)) return null;
  return loadOpenedCards(deckId, userId, partnerOracleId);
}
