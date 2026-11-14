// The scanner's printing step (Normal mode): which printings it shows first, which one it selects, and whether it
// needs the step at all. Pure. The server scores the printings near the fingerprint (`Guess.printings`); the picker
// loads every printing of the card (`PrintingChoice[]`, newest set first). The step leads with the ones the scanner
// identified, best first, with the best selected, and keeps the rest behind `Show all printings`, never every
// printing up front. A card with one printing needs no step, nor does a sure card whose best printing clearly beat
// the next (`PRINTING_SURE_MARGIN`).
import type { PrintingChoice } from "../collection/catalog-read";
import type { ScoredPrinting } from "../card-scan/match";

export type PrintingOrder = {
  /** The identified printings, best first: what the step shows before `Show all printings`. */
  short: PrintingChoice[];
  /** The printing selected when the step opens: the best identified one, or the only one. Null when none was. */
  preselected: PrintingChoice | null;
  /** True when the step is skipped and `preselected` is taken: the card has exactly one printing, or (a sure card) the
   * scan's best printing clears the next by `PRINTING_SURE_MARGIN`. */
  autoPick: boolean;
  /** Every other printing, in the loaded order: what `Show all printings` adds after the short list. */
  rest: PrintingChoice[];
};

/**
 * Normal's printing gate (lane 58, Hugh 2026-11-13: a direct image match adds by itself, as Auto does): a sure card
 * goes on at its best scored printing with no step when that printing's score clears the next scored one by this much,
 * the same bar as the card's own `SURE_MARGIN`. Printings that look the same (one picture, one frame, only the set
 * symbol differs) score about equal and keep asking. Measured on staging's scan index (2026-11-13, 3,450 printings
 * each against its card's nearest other printing, split by Scryfall's illustration id; the gap is 1 minus the two
 * rows' cosine similarity): of 2,848 pairs sharing an illustration, 141 are under 0.005 and 222 under 0.1, the median
 * 0.44 (most reprint one picture in another frame, which the embedder tells apart); of 602 pairs with different art, 3
 * are under 0.1, the median 0.66.
 */
export const PRINTING_SURE_MARGIN = 0.1;

/**
 * `sure`: the card itself cleared `SURE_MARGIN` (the scanner's own take, or Add another copy of it). A card picked from
 * Not sure, or one with fewer than two scored printings, is auto-picked only when it has one printing.
 */
export function orderPrintings(printings: readonly PrintingChoice[], scored: readonly ScoredPrinting[], sure = false): PrintingOrder {
  if (printings.length === 1) return { short: [printings[0]], preselected: printings[0], autoPick: true, rest: [] };
  const byId = new Map(printings.map((p) => [p.scryfallId, p]));
  const seen = new Set<string>();
  const short: PrintingChoice[] = [];
  const ranked = [...scored].sort((a, b) => b.score - a.score);
  for (const s of ranked) {
    const p = byId.get(s.scryfallId);
    if (!p || seen.has(p.scryfallId)) continue;
    seen.add(p.scryfallId);
    short.push(p);
  }
  // The gap is measured against every other scored printing, one the loaded list lacks included: a close runner-up
  // the catalog does not hold still means the scan could not tell them apart.
  const best = short[0] ? ranked.find((s) => s.scryfallId === short[0].scryfallId)!.score : null;
  const next = best === null ? undefined : ranked.find((s) => s.scryfallId !== short[0].scryfallId);
  return {
    short,
    preselected: short[0] ?? null,
    autoPick: sure && best !== null && next !== undefined && best - next.score >= PRINTING_SURE_MARGIN,
    rest: printings.filter((p) => !seen.has(p.scryfallId)),
  };
}

/**
 * The printing Auto adds a card at, with no printing step: the one the scan matched (the best identified printing),
 * else the first loaded. Never simply the first loaded when the scan named one: that is the newest set's, which put a
 * full-art basic on the list as an arbitrary basic.
 */
export function matchedPrinting(printings: readonly PrintingChoice[], scored: readonly ScoredPrinting[]): PrintingChoice | null {
  return orderPrintings(printings, scored).preselected ?? printings[0] ?? null;
}
