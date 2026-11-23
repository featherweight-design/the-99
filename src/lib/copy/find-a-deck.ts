import { swapToolsCopy } from "./swap-tools";
import { welcomeCreditsCopy } from "./welcome-credits";

/**
 * The collection's Find a deck call-out and buttons (tool discovery call 1), verbatim from the handoff's
 * `copy strings.ts` (`findADeckCalloutCopy`). `bodyFreeRowsPhone` is not carried: it belongs to Q8 B, the glyph
 * button beside the phone row, and Q8 A (the strip under the row) was chosen, whose call-out reads as the tiles'.
 */
export const findADeckCopy = {
  eyebrow: "Find a deck",
  title: (n: number) => `${n.toLocaleString("en-US")} of your cards are in no deck`,
  bodyAll: "See which of your decks each one could go in.",
  show: "Show them",
  bodyFree: "Press Find a deck under a card to see which of your decks it fits.",
  /** The row view from md, where the button sits beside the row. */
  bodyFreeRows: "Press Find a deck beside a card to see which of your decks it fits.",
  dismiss: welcomeCreditsCopy.strip.dismiss,
  button: "Find a deck",
  buttonAria: swapToolsCopy.fits.calloutAria,
};
