import { parseChooseParams, serializeChooseParams, type ChooseParams } from "./params";
import { PAST_PARAM } from "./submit";
import { MAX_SETS } from "./answers";
import { matchWords, type PhraseIndex } from "./match";

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

/**
 * The sets a create fills toward: the picked sets, then the sets the typed words NAME (the free
 * match, deterministic, no model), lower-case, each once, at most `MAX_SETS`. The words reach the
 * hand-off on `asked` alone and are never matched into answers on the way (`resultsTarget`), so
 * "mostly Bloomburrow" would otherwise steer nothing. Pure over the index; a null index (the
 * catalog failed to load) is the picked sets alone.
 */
export function handOffSets(picked: readonly string[], words: string, index: PhraseIndex | null): string[] {
  const named = index && words.trim() !== ""
    ? matchWords(words, index).chips.flatMap((c) => (c.kind === "set" ? [c.code] : []))
    : [];
  return [...new Set([...picked, ...named].map((c) => c.trim().toLowerCase()).filter((c) => c !== ""))].slice(0, MAX_SETS);
}

/** Whether the press came from a past run opened from History (`h=1`), which *Back to results* keeps. */
export function pastFrom(sp: URLSearchParams): boolean {
  return sp.get(PAST_PARAM) === "1";
}

/** *Back to results*: the results screen the press came from, answers and all (a past run stays one). */
export function resultsHref(path: string, p: ChooseParams, past = false): string {
  return `${path}${serializeChooseParams({ ...p, results: true })}${past ? `&${PAST_PARAM}=1` : ""}`;
}
