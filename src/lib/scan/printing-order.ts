// The scanner's printing step (Normal mode): which printings it shows first, which one it selects, and whether it
// needs the step at all. Pure. The server scores the printings near the fingerprint (`Guess.printings`); the picker
// loads every printing of the card (`PrintingChoice[]`, newest set first). The step leads with the ones the scanner
// identified, best first, with the best selected, and keeps the rest behind `Show all printings`, never every
// printing up front. A card with one printing needs no step.
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
