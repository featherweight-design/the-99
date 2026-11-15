// The scanner's printing step (Normal mode): which printings it shows first, which one it selects, and whether it
// needs the step at all. Pure. The server scores the printings near the fingerprint (`Guess.printings`); the picker
// loads every printing of the card (`PrintingChoice[]`, newest set first). The step leads with the ones the scanner
// identified, best first, with the best selected, and keeps the rest behind `Show all printings`, never every
// printing up front. Only a card with one printing needs no step.
//
// There is no score margin that skips the step. #2915 added one (0.10) on the claim that printings sharing one picture
// score about equal; they do not. Staging's index holds Command Tower's C18 and C19 rows, the same art, at cosine 0.556
// to each other, so a photo of the C19 card scored C18 more than 0.10 ahead and Normal filed it as C18 with no step
// (2026-11-14). The score orders the list; the player picks.
import type { PrintingChoice } from "../collection/catalog-read";
import type { ScoredPrinting } from "../card-scan/match";

export type PrintingOrder = {
  /** The identified printings, best first: what the step shows before `Show all printings`. */
  short: PrintingChoice[];
  /** The printing selected when the step opens: the best identified one, or the only one. Null when none was. */
  preselected: PrintingChoice | null;
  /** True when the card has exactly one printing: the step is skipped and that printing is taken. */
  autoPick: boolean;
  /** Every other printing, in the loaded order: what `Show all printings` adds after the short list. */
  rest: PrintingChoice[];
};

export function orderPrintings(printings: readonly PrintingChoice[], scored: readonly ScoredPrinting[]): PrintingOrder {
  if (printings.length === 1) return { short: [printings[0]], preselected: printings[0], autoPick: true, rest: [] };
  const byId = new Map(printings.map((p) => [p.scryfallId, p]));
  const seen = new Set<string>();
  const short: PrintingChoice[] = [];
  for (const s of [...scored].sort((a, b) => b.score - a.score)) {
    const p = byId.get(s.scryfallId);
    if (!p || seen.has(p.scryfallId)) continue;
    seen.add(p.scryfallId);
    short.push(p);
  }
  return {
    short,
    preselected: short[0] ?? null,
    autoPick: false,
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
