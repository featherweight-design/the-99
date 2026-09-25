"use server";

import { requireUserId } from "../../../../lib/auth";
import { deeperStatus, runDeeperRead, type DeeperReadOutcome, type DeeperStatus } from "../../../../lib/intake/deeper-read";
import { helpMeChooseEnabled } from "../../../../lib/intake/flag";
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

/** The controls and words a press carries, checked; `null` for anything out of shape or range. */
function checkedAsk(input: unknown): { words: string; controls: { budgetDollars: number | null; bracket: number | null } } | null {
  if (typeof input !== "object" || input === null) return null;
  const { words: raw, budgetDollars, bracket } = input as Record<string, unknown>;
  const words = typeof raw === "string" ? raw.trim() : "";
  if (
    words.length === 0
    || words.length > READ_WORDS_MAX_CHARS
    || !(budgetDollars === null || (Number.isInteger(budgetDollars) && (budgetDollars as number) >= 1 && (budgetDollars as number) <= MAX_BUDGET_DOLLARS))
    || !(bracket === null || (Number.isInteger(bracket) && (bracket as number) >= 1 && (bracket as number) <= 5))
  ) return null;
  return { words, controls: { budgetDollars: budgetDollars as number | null, bracket: bracket as number | null } };
}

export async function lookDeeper(input: {
  readId: string;
  words: string;
  budgetDollars: number | null;
  bracket: number | null;
}): Promise<LookDeeperResult> {
  const userId = await requireUserId();
  // An action stays callable when its page is hidden: with the feature off, nothing is reserved.
  if (!helpMeChooseEnabled()) throw new Error("not found");
  // The argument is whatever a caller sent: shape first, before any field is read.
  const ask = checkedAsk(input);
  if (!ask || typeof input.readId !== "string" || !isUuid(input.readId)) return { kind: "refused" };
  return runDeeperRead(userId, { readId: input.readId, ...ask });
}

/**
 * A press that found another look already running (`in_flight`, `reused`) waits on it by asking
 * this: the ask's own settled read once there is one, `running` while a look of the player's is
 * pending, and `idle` when neither, which spent nothing. Read only, so polling it is free.
 */
export async function lookStatus(input: {
  words: string;
  budgetDollars: number | null;
  bracket: number | null;
}): Promise<DeeperStatus | { kind: "refused" }> {
  const userId = await requireUserId();
  if (!helpMeChooseEnabled()) throw new Error("not found");
  const ask = checkedAsk(input);
  return ask ? deeperStatus(userId, ask) : { kind: "refused" };
}
