"use server";

import { requireUserId } from "../../../../lib/auth";
import { deeperStatus, runDeeperRead, type DeeperReadOutcome, type DeeperStatus } from "../../../../lib/intake/deeper-read";
import { helpMeChooseEnabled } from "../../../../lib/intake/flag";
import { MAX_BUDGET_DOLLARS } from "../../../../lib/intake/answers";
import { READ_WORDS_MAX_CHARS } from "../../../../lib/intake/limits";
import { SLUG } from "../../../../lib/intake/params";
import { isUuid } from "../../../../lib/uuid";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { answersOf, parseLiveParams } from "../../../../lib/intake/params";
import { resultsTarget } from "../../../../lib/intake/submit";
import { beginTheRead } from "../../../../lib/intake/the-read-run";
import { loadIntakeThemes } from "../../../../lib/intake/search";
import { loadCommanderPrintings } from "../../../../lib/sets/printed-in-read";
import { loadTheRead, type TheReadState } from "../../../../lib/intake/run-store";

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

/**
 * The form's submit (rework plan PR 3; F8: the read starts here, never on the results page's load,
 * so a reload or Back cannot press again). It takes the form's answers as the address it would
 * have navigated to, parsed by the page's own parser, so nothing out of range survives.
 *
 * - Words over the cap are REFUSED, never trimmed: a read of half the words is not the ask.
 * - An empty box makes no reservation and lands on the free results.
 * - Otherwise the read is begun: its inputs read and its credit reserved before the redirect, its
 *   two calls run after the response (`after`), and the results attach to it by `r`. A repeat lands
 *   on the stored read, charged nothing. No credit left, the app paused, the owner's share used, or
 *   a read already running: the free results, with the words kept and unread (7l, 7n).
 */
export async function submitChoose(query: string): Promise<{ kind: "refused" }> {
  const userId = await requireUserId();
  if (!helpMeChooseEnabled()) throw new Error("not found");
  // A bound on what a caller may send, far past any real form: 800 words percent-encoded as three
  // bytes each run to 7,200 characters, and every theme and set comes on top.
  if (typeof query !== "string" || query.length > 64_000) return { kind: "refused" };
  const raw = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
  // The parser cuts `w` to the cap, so it is checked first, on the raw value and in the parser's own
  // unit (UTF-16, as the box's `maxLength` counts): anything the parser would cut is refused.
  if ((raw.get("w") ?? "").length > READ_WORDS_MAX_CHARS) return { kind: "refused" };
  const p = parseLiveParams(raw);
  const words = p.words.trim();
  if (!words) redirect(resultsTarget(p, null));
  // Themes and sets reach both prompts as filter lines, outside the player-text boundary. The parser
  // checks their shape only, so a value either picker would not offer refuses the read: the free
  // results, nothing reserved. A failed vocabulary read refuses it the same way.
  if (!(await filtersKnown(p.themes, p.sets))) redirect(resultsTarget(p, null));
  // The card is null (above), so the answers are exactly the read's filters.
  const begun = await beginTheRead(userId, { readId: randomUUID(), words, filters: answersOf(p) });
  if (begun.kind === "started") {
    after(begun.finish);
    redirect(resultsTarget(p, begun.readId));
  }
  redirect(resultsTarget(p, begun.kind === "read" || begun.kind === "nothing" ? begun.readId : null));
}

/** Whether every theme and set is one the form's pickers offer now. */
async function filtersKnown(themes: readonly string[], sets: readonly string[]): Promise<boolean> {
  try {
    const [vocabulary, printings] = await Promise.all([
      themes.length > 0 ? loadIntakeThemes() : [],
      sets.length > 0 ? loadCommanderPrintings().then((x) => x.sets) : [],
    ]);
    const slugs = new Set(vocabulary.map((t) => t.slug));
    const codes = new Set(printings.map((s) => s.code));
    return themes.every((t) => slugs.has(t)) && sets.every((c) => codes.has(c));
  } catch {
    return false;
  }
}

/**
 * Where the read `r` names stands (rework plan PR 4, F2): the panel polls this while a read runs, to
 * move its step from the shortlist to the judgement and to learn when it settled. Read only, scoped
 * to the reader, so polling it costs nothing and reveals nothing of anyone else's.
 */
export async function theReadState(readId: string): Promise<TheReadState> {
  const userId = await requireUserId();
  if (!helpMeChooseEnabled()) throw new Error("not found");
  if (typeof readId !== "string" || !isUuid(readId)) return { kind: "none" };
  return loadTheRead(readId, userId);
}
