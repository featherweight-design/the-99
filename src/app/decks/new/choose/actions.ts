"use server";

import { requireUserId } from "../../../../lib/auth";
import { runDeeperRead, type DeeperReadOutcome } from "../../../../lib/intake/deeper-read";
import { READ_WORDS_MAX_CHARS } from "../../../../lib/intake/limits";
import { cancelRead } from "../../../../lib/intake/run-store";
import { isUuid } from "../../../../lib/uuid";

/**
 * *Look deeper* and its Stop (plan, PR 4). Both take the id the panel chose for the press, so a
 * Stop cancels exactly the read it started and never another tab's.
 *
 * Everything that arrives here is checked before anything is reserved: an id that is not a uuid,
 * words that are empty or over the cap, and controls out of range are refused as `refused`, which
 * spends nothing. The controls travel with the press because the control beats the words
 * (plan, decision 2), and the validator needs to know what the player set.
 */
export type LookDeeperResult = DeeperReadOutcome | { kind: "refused" };

export async function lookDeeper(input: {
  readId: string;
  words: string;
  budgetDollars: number | null;
  bracket: number | null;
}): Promise<LookDeeperResult> {
  const userId = await requireUserId();
  const words = typeof input.words === "string" ? input.words.trim() : "";
  const { budgetDollars, bracket } = input;
  if (
    !isUuid(input.readId)
    || words.length === 0
    || words.length > READ_WORDS_MAX_CHARS
    || !(budgetDollars === null || (Number.isInteger(budgetDollars) && budgetDollars >= 1))
    || !(bracket === null || (Number.isInteger(bracket) && bracket >= 1 && bracket <= 5))
  ) return { kind: "refused" };
  return runDeeperRead(userId, { readId: input.readId, words, controls: { budgetDollars, bracket } });
}

/** False when there was nothing pending to stop: the read had already settled. */
export async function stopDeeperRead(readId: string): Promise<boolean> {
  const userId = await requireUserId();
  if (!isUuid(readId)) return false;
  return cancelRead(readId, userId);
}
