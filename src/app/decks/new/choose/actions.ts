"use server";

import { requireUserId } from "../../../../lib/auth";
import { deeperStatus, runDeeperRead, type DeeperReadOutcome, type DeeperStatus } from "../../../../lib/intake/deeper-read";
import { helpMeChooseEnabled } from "../../../../lib/intake/flag";
import { MAX_BUDGET_DOLLARS } from "../../../../lib/intake/answers";
import { READ_WORDS_MAX_CHARS } from "../../../../lib/intake/limits";
import { SLUG } from "../../../../lib/intake/params";
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

/** The player's themes and card BEFORE this press, checked; `null` for anything out of shape.
 *  This decides what the read adds (Hugh, 2026-10-06) — a shape failure here refuses the whole
 *  press rather than risk treating a malformed "existing" as empty and over-charging.
 *
 *  NO COUNT CAP (pre-open review): `resolveWords` never bounds the themes a player's own params
 *  accumulate — `MAX_THEMES` only trims what the CREATE path writes to the brief
 *  (`decks/new/page.tsx`) — so a player who matched more than eight theme labels, in one submit
 *  or across several deeper reads, legitimately carries more than `MAX_THEMES` in `params.themes`
 *  with nothing that ever shrinks it back down. Refusing on count would permanently lock such a
 *  player out of Look deeper. Only the per-entry slug shape is checked here.
 */
function checkedExisting(input: unknown): { themes: string[]; card: string | null } | null {
  if (typeof input !== "object" || input === null) return null;
  const { themes, card } = input as Record<string, unknown>;
  if (!Array.isArray(themes) || !themes.every((t) => typeof t === "string" && SLUG.test(t))) return null;
  if (!(card === null || (typeof card === "string" && isUuid(card)))) return null;
  return { themes, card };
}

export async function lookDeeper(input: {
  readId: string;
  words: string;
  budgetDollars: number | null;
  bracket: number | null;
  themes: string[];
  card: string | null;
}): Promise<LookDeeperResult> {
  const userId = await requireUserId();
  // An action stays callable when its page is hidden: with the feature off, nothing is reserved.
  if (!helpMeChooseEnabled()) throw new Error("not found");
  // The argument is whatever a caller sent: shape first, before any field is read.
  const ask = checkedAsk(input);
  const existing = checkedExisting(input);
  if (!ask || !existing || typeof input.readId !== "string" || !isUuid(input.readId)) return { kind: "refused" };
  return runDeeperRead(userId, { readId: input.readId, ...ask, existing });
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
