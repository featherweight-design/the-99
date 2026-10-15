"use server";

import { requireUserId } from "../../../../lib/auth";
import { requestSwitchEnv } from "../../../../lib/switches/request";
import { helpMeChooseEnabled } from "../../../../lib/intake/flag";
import { plainText, tagCount } from "../../../../lib/decks/notes-body";
import { resolveTaggedText } from "../../../../lib/cards/tagged-text";
import { READ_TAGS_MAX, READ_WORDS_MAX_CHARS, READ_WORDS_URL_MAX, wordsLength } from "../../../../lib/intake/limits";
import { isUuid } from "../../../../lib/uuid";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { answersOf, parseLiveParams } from "../../../../lib/intake/params";
import { askOf, resultsTarget } from "../../../../lib/intake/submit";
import { beginTheRead } from "../../../../lib/intake/the-read-run";
import { loadIntakeThemes } from "../../../../lib/intake/search";
import { loadCommanderPrintings } from "../../../../lib/sets/printed-in-read";
import { loadTheRead, type TheReadState } from "../../../../lib/intake/run-store";

/**
 * The form's submit (rework plan PR 3; F8: the read starts here, never on the results page's load,
 * so a reload or Back cannot press again). It takes the form's answers as the address it would
 * have navigated to, parsed by the page's own parser, so nothing out of range survives.
 *
 * - Words over the cap are REFUSED, never trimmed: a read of half the words is not the ask.
 * - An empty box makes no reservation and lands on the free results.
 * - `from` is where the press was made: the form (the default, and anything else a caller sends) or
 *   the results' own retry, which changes only what the page draws while the read is pending.
 * - Otherwise the read is begun: its inputs read and its credit reserved before the redirect, its
 *   two calls run after the response (`after`), and the results attach to it by `r`. A repeat lands
 *   on the stored read, charged nothing. No credit left, the app paused, the owner's share used, or
 *   a read already running: the free results, with the words kept and unread (7l, 7n).
 */
export async function submitChoose(query: string, from: "form" | "results" = "form"): Promise<{ kind: "refused" }> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!helpMeChooseEnabled(env)) throw new Error("not found");
  // A bound on what a caller may send, far past any real form: 800 words percent-encoded as three
  // bytes each run to 7,200 characters, and every theme and set comes on top.
  if (typeof query !== "string" || query.length > 64_000) return { kind: "refused" };
  const raw = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
  // The parser cuts `w` to the cap, so it is checked first, in the parser's own unit (code points, as the
  // prompt boundary counts) on what the words DRAW (a card tag counts as its name), on the raw value's
  // length for the ids a body carries, and on the tags: anything the parser would cut is refused.
  const rawWords = raw.get("w") ?? "";
  if (rawWords.length > READ_WORDS_URL_MAX || wordsLength(plainText(rawWords)) > READ_WORDS_MAX_CHARS || tagCount(rawWords) > READ_TAGS_MAX) return { kind: "refused" };
  const parsed = parseLiveParams(raw);
  // The cards tagged in the words, looked up: a tag is the catalog's name for its id, and an id the
  // catalog does not hold is plain words. The address keeps the canonical body.
  const resolved = await resolveTaggedText(parsed.words, { commanderLegalOnly: true });
  const p = { ...parsed, words: resolved.body };
  const words = resolved.text.trim();
  // The catalog's name can be longer than the one the address carried: measure again, on the text the prompt gets.
  if (wordsLength(resolved.text) > READ_WORDS_MAX_CHARS) return { kind: "refused" };
  if (!words) redirect(resultsTarget(p, null));
  // Themes and sets reach both prompts as filter lines, outside the player-text boundary. The parser
  // checks their shape only, so a value either picker would not offer refuses the read: the free
  // results, nothing reserved. A failed vocabulary read refuses it the same way.
  if (!(await filtersKnown(p.themes, p.sets))) redirect(resultsTarget(p, null));
  // The card is null (above), so the answers are exactly the read's filters.
  const begun = await beginTheRead(userId, { readId: randomUUID(), words, tagged: resolved.tagged, filters: answersOf(p), env, ask: askOf(p) });
  if (begun.kind === "started") {
    after(begun.finish);
    // From the form the free list was never seen, so the page holds its loading state until the read
    // settles; from the results (a retry) the list is already on screen and stays under the panel.
    redirect(resultsTarget(p, begun.readId, from === "results" ? null : "form"));
  }
  // A repeat lands on the stored read, marked so its line says no credit was used (7m).
  if (begun.kind === "read" || begun.kind === "nothing") redirect(resultsTarget(p, begun.readId, "repeat"));
  redirect(resultsTarget(p, null, begun.kind === "in_flight" ? "busy" : null));
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
  const env = await requestSwitchEnv(userId);
  if (!helpMeChooseEnabled(env)) throw new Error("not found");
  if (typeof readId !== "string" || !isUuid(readId)) return { kind: "none" };
  return loadTheRead(readId, userId);
}
