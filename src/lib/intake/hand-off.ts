import { parseChooseParams, serializeChooseParams, type ChooseParams } from "./params";
import { CHOOSE_PATH, PAST_PARAM } from "./submit";

/**
 * Help me choose's hand-off, read on `/decks/new` (HANDOFF §6). Pure and client-safe.
 *
 * A result's press carries the results screen's own params beside `commander` (`handOffHref`), so
 * this page reads them with the results screen's own parser. Only the results screen sends
 * `v=results`, which is what marks a hand-off: a picker press, a Home link or a hand-typed URL
 * carries no answers and draws today's page, unchanged.
 */
export function handOffFrom(sp: URLSearchParams): ChooseParams | null {
  const p = parseChooseParams(sp);
  return p.results ? p : null;
}

/** Whether the press came from a past run opened from History (`h=1`), which *Back to results* keeps. */
export function pastFrom(sp: URLSearchParams): boolean {
  return sp.get(PAST_PARAM) === "1";
}

/** *Back to results*: the results screen the press came from, answers and all (a past run stays one). */
export function resultsHref(p: ChooseParams, past = false): string {
  return `${CHOOSE_PATH}${serializeChooseParams({ ...p, results: true })}${past ? `&${PAST_PARAM}=1` : ""}`;
}
