"use server";

// The commander write as a Server Action (plan decision 6), and the sheet's read. The write's
// transaction is `write.ts`'s.

import { after } from "next/server";
import { db } from "../../db";
import { requireUserId } from "../auth";
import { revalidateClaims } from "../decks/revalidate-claims";
import { isUuid } from "../uuid";
import { changeCommanderEnabled } from "./flag";
import { loadChangeCandidates, type ChangeCandidates } from "./candidates";
import type { CommanderPair } from "./pending";
import { writeCommanderChange, type ChangeCommanderResult } from "./write";

export async function changeCommander(deckId: string, to: CommanderPair): Promise<ChangeCommanderResult> {
  if (!changeCommanderEnabled()) return { ok: false, reason: "unavailable" };
  const userId = await requireUserId();
  // Request data: an id that is not a uuid would reach Postgres's cast and throw, where the caller
  // is owed the typed refusal.
  if (!isUuid(deckId)) return { ok: false, reason: "unavailable" };
  const partner = to?.partnerOracleId ?? null;
  if (!to || !isUuid(to.commanderOracleId) || (partner !== null && !isUuid(partner))) {
    return { ok: false, reason: "illegal" };
  }
  const result = await db.transaction((tx) => writeCommanderChange(tx, deckId, userId, {
    commanderOracleId: to.commanderOracleId, partnerOracleId: partner,
  }));
  // After the response: a Server Action that revalidates during its run re-renders its caller's
  // route into the reply.
  if (result.ok) {
    // `revalidateClaims` retires the user's list tag as well.
    after(() => revalidateClaims(deckId, userId));
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
