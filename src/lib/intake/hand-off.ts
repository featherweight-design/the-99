import { parseChooseParams, serializeChooseParams, type ChooseParams } from "./params";
import { CHOOSE_PATH } from "./submit";

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

/** *Back to results*: the results screen the press came from, answers and all. */
export function resultsHref(p: ChooseParams): string {
  return `${CHOOSE_PATH}${serializeChooseParams({ ...p, results: true })}`;
}
