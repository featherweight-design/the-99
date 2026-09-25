"use server";

import { requireUserId } from "../../../../lib/auth";
import { runDeeperRead, type DeeperReadOutcome } from "../../../../lib/intake/deeper-read";
import { MAX_BUDGET_DOLLARS } from "../../../../lib/intake/answers";
import { READ_WORDS_MAX_CHARS } from "../../../../lib/intake/limits";
import { isUuid } from "../../../../lib/uuid";

/**
 * *Look deeper* (plan, PR 4). It takes the id the panel chose for the press, so the Stop (a route
 * handler, `stop/route.ts`, since Server Actions are dispatched one at a time) cancels exactly the
 * read it started and never another tab's.
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
  // The argument is whatever a caller sent: shape first, before any field is read.
  if (typeof input !== "object" || input === null) return { kind: "refused" };
  const words = typeof input.words === "string" ? input.words.trim() : "";
  const { budgetDollars, bracket } = input;
  if (
    typeof input.readId !== "string"
    || !isUuid(input.readId)
    || words.length === 0
    || words.length > READ_WORDS_MAX_CHARS
    || !(budgetDollars === null || (Number.isInteger(budgetDollars) && budgetDollars >= 1 && budgetDollars <= MAX_BUDGET_DOLLARS))
    || !(bracket === null || (Number.isInteger(bracket) && bracket >= 1 && bracket <= 5))
  ) return { kind: "refused" };
  return runDeeperRead(userId, { readId: input.readId, words, controls: { budgetDollars, bracket } });
}
