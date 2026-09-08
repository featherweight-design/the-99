// Card surfaces — the strings behind #349, #350, #351 and #363.
//
// From `design/design_handoff_the99_card_surfaces/card-surfaces · copy strings.ts`.
// The mana mapper lives here rather than in `CostPips` because it is words, and
// because the pip cap must never reach the spoken form: a six-plus-symbol cost
// draws four pips and a `+N` but speaks every symbol. A reader who cannot see
// the pips is the one reader for whom truncation is not a trade.

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

/** "U/B" → "blue or black"; "2/W" → "2 or white"; "G/P" → "green or 2 life". */
function speakSymbol(symbol: string): string {
  return symbol
    .split("/")
    .map((part) => (part === "P" ? PHYREXIAN : (SYMBOL[part] ?? part.toLowerCase())))
    .join(HYBRID_JOINER);
}

/**
 * Every symbol in the cost, in order and never capped.
 *
 * Returns `costNone` for a card with no cost at all, so a land reads as having
 * no cost rather than falling silent — silence is indistinguishable from a
 * missing label.
 */
export function spokenManaCost(cost: string | null | undefined): string {
  const symbols = [...(cost ?? "").matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
  if (symbols.length === 0) return manaCopy.costNone;
  return manaCopy.costAria(symbols.map(speakSymbol).join(" "));
}
