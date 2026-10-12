"use server";

import { requireUserId } from "../../../../lib/auth";
import { helpMeChooseEnabled } from "../../../../lib/intake/flag";
import { READ_WORDS_MAX_CHARS } from "../../../../lib/intake/limits";
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
  if (!helpMeChooseEnabled()) throw new Error("not found");
  if (typeof readId !== "string" || !isUuid(readId)) return { kind: "none" };
  return loadTheRead(readId, userId);
}
