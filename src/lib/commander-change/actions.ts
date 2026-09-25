"use server";

// The commander write as a Server Action (plan decision 6), and the sheet's read. The write's
// transaction is `write.ts`'s.

import { db } from "../../db";
import { requireUserId } from "../auth";
import { revalidateClaims } from "../decks/revalidate-claims";
import { isUuid } from "../uuid";
import { changeCommanderEnabled } from "./flag";
import { loadChangeCandidates, type ChangeCandidates } from "./candidates";
import type { CommanderPair } from "./pending";
import { writeCommanderChange, type ChangeCommanderResult } from "./write";

export async function changeCommander(
  deckId: string, to: CommanderPair, staysOracleId: string | null = null,
): Promise<ChangeCommanderResult> {
  if (!changeCommanderEnabled()) return { ok: false, reason: "unavailable" };
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
  const result = await db.transaction((tx) => writeCommanderChange(tx, deckId, userId, {
    commanderOracleId: to.commanderOracleId, partnerOracleId: partner,
  }, stays));
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
 * The candidates for the sheet, read when it opens rather than shipped with the deck page: most
 * visits never open it, and the read costs a support join over every candidate. Null when the
 * switch is off or the deck is not the reader's.
 */
export async function readChangeCandidates(deckId: string): Promise<ChangeCandidates | null> {
  if (!changeCommanderEnabled()) return null;
  const userId = await requireUserId();
  if (!isUuid(deckId)) return null;
  return loadChangeCandidates(deckId, userId);
}
