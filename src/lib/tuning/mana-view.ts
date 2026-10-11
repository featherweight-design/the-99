// Mana Balance's view model (Tuning hub handoff R3b): what the panel reads, shaped on the server,
// and the small derivations its pieces share. Pure and client-safe, so every rule is unit tested.

import { deckStatsCopy } from "../copy/deck-stats";
import { colorRows } from "../mana/color-rows";
import type { ManaSupply } from "../mana/supply";
import type { BalanceColor, ColorEvidence, ManaBalance, NeededEvidence } from "./mana-balance";

/** The balance as the client gets it: the supply WITHOUT `sources`, which holds an id per copy and
 *  draws nothing. */
export type ClientManaBalance = Omit<ManaBalance, "supply"> & { supply: Omit<ManaSupply, "sources"> };

export type ManaPanelData = {
  balance: ClientManaBalance;
  /** The commander's short name (`Gishath`); the first one's, with a partner. */
  commander: string;
  /** Every card in the deck, commanders included: the Lands row's denominator. */
  cards: number;
  /** A card name to its oracle id, for every card a pattern row names, so a name opens card detail. */
  ids: Record<string, string>;
};

export function toClientBalance(b: ManaBalance): ClientManaBalance {
  const supply: Omit<ManaSupply, "sources"> & { sources?: unknown } = { ...b.supply };
  delete supply.sources;
  return { ...b, supply };
}

/** History's record of a free count: the Colors card's own totals, and never a verdict. */
export type ManaCountSummary = { pips: number; sources: number };

export function manaCountSummary(b: Pick<ManaBalance, "supply">): ManaCountSummary {
  const { pipTotal, sourceTotal } = colorRows(b.supply);
  return { pips: pipTotal, sources: sourceTotal };
}

export function isManaCountSummary(s: unknown): s is ManaCountSummary {
  if (!s || typeof s !== "object") return false;
  const o = s as Record<string, unknown>;
  return typeof o.pips === "number" && typeof o.sources === "number" && Object.keys(o).length === 2;
}

/** Lowercase in prose (`white, red, green`), as the Colors card names them. */
export const colorWord = (c: BalanceColor) => deckStatsCopy.colors.names[c];
/** Capitalized in a control or a table cell (`White`). */
export const colorName = (c: BalanceColor) => colorWord(c)[0].toUpperCase() + colorWord(c).slice(1);

/** The Needed cell's sub-line: the first card by name, and how many OTHER distinct cards share the
 *  cost (copies are not cards: a card run twice is still one name). */
export function neededFor(n: NeededEvidence): { card: string; more: number; code: string } {
  return { card: n.cards[0]?.name ?? "", more: Math.max(0, n.cards.length - 1), code: n.pattern };
}

/** Colors whose costs Hardest costs lists: every color with a pip, W U B R G. */
export function pippedColors(colors: readonly ColorEvidence[]): BalanceColor[] {
  return colors.filter((c) => c.pips.withCommander > 0 && c.patterns.length > 0).map((c) => c.color);
}

/** The chip selected on opening: the color with the most pips, commander counted; a tie goes to the
 *  first in W U B R G. Null with no pipped color. */
export function defaultPatternColor(colors: readonly ColorEvidence[]): BalanceColor | null {
  const pipped = colors.filter((c) => c.pips.withCommander > 0 && c.patterns.length > 0);
  return pipped.reduce<ColorEvidence | null>((best, c) => (best === null || c.pips.withCommander > best.pips.withCommander ? c : best), null)?.color ?? null;
}

/** The lands clause's tapped figure: every land that can enter tapped. */
export const tappedTotal = (t: ManaBalance["lands"]["tapped"]) => t.always + t.unless + t.fetch;
