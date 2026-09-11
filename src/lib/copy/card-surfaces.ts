// Card surfaces — the strings behind #349, #350, #351 and #363.
//
// From `design/design_handoff_the99_card_surfaces/card-surfaces · copy strings.ts`.
// The mana mapper lives here rather than in `CostPips` because it is words, and
// because the pip cap must never reach the spoken form: a six-plus-symbol cost
// draws four pips and a `+N` but speaks every symbol. A reader who cannot see
// the pips is the one reader for whom truncation is not a trade.

import { frontFaceCost } from "../cards/faces";

const SYMBOL: Record<string, string> = {
  W: "white",
  U: "blue",
  B: "black",
  R: "red",
  G: "green",
  C: "colourless",
  X: "X",
};

const HYBRID_JOINER = " or ";
const PHYREXIAN = "2 life";

export const manaCopy = {
  /** "{2}{W}{W}" → "mana cost 2 white white" */
  costAria: (spokenSymbols: string) => `mana cost ${spokenSymbols}`,
  /** A card with no cost — lands, and the back faces of some transforms. */
  costNone: "no mana cost",
  /**
   * The overflow pip's drawn text only. It has no accessible name of its own:
   * `costAria` already speaks the whole cost, and a spoken "+7" beside it would
   * count the symbols twice.
   */
  pipOverflow: (omitted: number) => `+${omitted}`,
} as const;

/**
 * The view well's two segments, on both surfaces it appears. The glyph is drawn
 * and the name is spoken, so these strings are the whole accessible name of the
 * control — there is no visible label to fall back on.
 */
export const viewToggleCopy = {
  deck: { list: "List view", card: "Card view" },
  collection: { rows: "Rows view", grid: "Grid view" },
} as const;

/**
 * The card view tile. Two strings only — everything else the tile says is a
 * string it shares with the row it replaces.
 */
export const cardTileCopy = {
  /**
   * The availability slot when the player owns no copies. The tile draws the
   * same collapsed `$` the All row draws, but says something different: on the
   * row the chip is the shop, here it is the floor, and a tile carries no price
   * for the figure to belong to.
   */
  slotUnownedAria: "not owned",
  /**
   * Appended to the art trigger's name where the badge draws `×N`. The badge is
   * aria-hidden, and the trigger is the only label a tile has, so the count has
   * to ride it or go unsaid.
   */
  copiesAria: (copies: number) => `${copies} copies in deck`,
} as const;

/**
 * #363 — the two-faced mark and the modal's flip control.
 *
 * `mark` is drawn text, aria-hidden; `markAria` is the sr-only sibling. The
 * flip control names the FACE IT TURNS TO, not the act: "Turn over" tells the
 * reader nothing they cannot see, and the other face's name is the fact they
 * are actually reaching for.
 */
export const twoFacedCopy = {
  mark: "//",
  markAria: "two-faced card",
  flipToAria: (otherFaceName: string) => `Turn over to ${otherFaceName}`,
  /** Announced on the swap, since the image change is silent by design. */
  flippedAria: (faceName: string) => `Showing ${faceName}`,
} as const;

/**
 * The printed name (#467 follow-on). One string — everything else this feature
 * shows is an existing string re-sourced from the resolved printing.
 */
export const printedNameCopy = {
  /**
   * The modal header's oracle-name label. Mono, lowercase, 10.5px, --fg-faint.
   *
   * One word on purpose: the modal's meta grid already carries a `Set` field
   * naming the set and collector number, so the line does not have to explain
   * itself. Lowercase mono is the shipped field-label register (`no number ·
   * ×1`, `SLD · 2208`) — not the uppercase letterspaced register, which is
   * reserved for section labels.
   *
   * Never rendered when the printing prints the oracle name: the whole line is
   * absent in that case, label included.
   */
  oracleLabel: "oracle",
} as const;

/** "U/B" → "blue or black"; "2/W" → "2 or white"; "G/P" → "green or 2 life". */
function speakSymbol(symbol: string): string {
  return symbol
    .split("/")
    .map((part) => (part === "P" ? PHYREXIAN : (SYMBOL[part] ?? part.toLowerCase())))
    .join(HYBRID_JOINER);
}

/**
 * Every symbol of the FRONT FACE's cost, in order and never capped.
 *
 * Front face because that is what the pips beside it draw: an `adventure`,
 * `split` or `prepare` card carries both halves in one string, and a label that
 * spoke both would describe a cost no run on screen shows. `frontFaceCost` holds
 * that rule for both.
 *
 * Never capped, though — the pip run caps at four and a `+N`, and a reader who
 * cannot see the pips is the one reader for whom truncation is not a trade.
 *
 * Returns `costNone` for a card with no cost at all, so a land reads as having
 * no cost rather than falling silent — silence is indistinguishable from a
 * missing label.
 */
export function spokenManaCost(cost: string | null | undefined): string {
  // The same half the pips draw. A label that spoke both halves of an Adventure
  // would describe a cost the run beside it does not show.
  const symbols = [...frontFaceCost(cost ?? "").matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
  if (symbols.length === 0) return manaCopy.costNone;
  return manaCopy.costAria(symbols.map(speakSymbol).join(" "));
}
