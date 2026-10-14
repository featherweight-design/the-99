// Deck Stats card (b), PR 4b (R2). Proposed strings for /copy-review. Extends deckStatsCopy.colors.
// Placeholders: Design draws the role; words are settled in the build lane. Facts only, never a nudge.

export const deckStatsManaCopy = {
  /** CHANGED. Was "Colors, asked for and made". */
  title: "Mana colors", // PLACEHOLDER
  /** CHANGED. Was `${pips} pips · ${lands} lands`. */
  denom: (pips: number, sources: number) => `${pips} pips · ${sources} sources`, // PLACEHOLDER
  /** CHANGED. Were "ASKS FOR · PIPS" / "MAKES · LAND SOURCES". */
  pips: "PIPS", // PLACEHOLDER
  sources: "SOURCES", // PLACEHOLDER
  /** NEW. Accessible name of the ⓘ button. */
  infoLabel: "How this is counted", // PLACEHOLDER
  /** NEW. The tooltip, two lines. Replaces colors.caption. A one-color deck prefixes colors.monoLead to line 1. */
  tip: [
    "A source counts once for each color it can add, so a dual land or a two-color mana rock counts twice. Land search counts the basics in this deck it can find.",
    "Shares are of all pips and all sources. A card that makes mana in a color we can’t read isn’t counted.",
  ], // PLACEHOLDER
  /** NEW. Legend, drawn when any non-land source exists. */
  legendLand: "Land", // PLACEHOLDER
  legendOther: "Mana rock, dork or land search", // PLACEHOLDER
  /** NEW. Replaces the legend when every source is a land. */
  onlyLands: "Every source is a land. This deck has no mana rocks, dorks or land search.", // PLACEHOLDER
} as const;

// REUSED, unchanged: colors.monoLead, colors.noLands.
// RETIRED in 4b: colors.title, colors.asks, colors.makes, colors.caption, colors.nonlandOne, colors.nonlandMany.
// No "weighted" string exists.
