// Where each step's press ring goes (public landing, 5l). Its own small module with no imports beyond a type: the card (`demo.tsx`)
// reads these on every render, and the steps (`demo-steps.tsx`) are a chunk that loads when Start is pressed, so the card cannot
// import them from there without the whole drawing half riding in the landing's first load.

import type { DemoCardData } from "../../../lib/demo/project-cards";
import type { Projected } from "../../../lib/demo/projected";
import type { RingPlace } from "./demo-ring";

/**
 * The control each step's press ring floats over (`PressRing`): a selector for the first match inside the app panel. A ring
 * is drawn only where the press it promises does something: step 2 the first row's Fit chip ("Why it fits", the board's), step 4
 * the mark key, which decodes the marks the rows below carry, step 5 the first finding that opens its receipt, steps 7 and 8 the
 * tab not yet open, and on steps 1, 3 and 6 a card, when `cardsOpen` (every card the step draws has its details in the loaded card data:
 * `stepOpensCards`). A card press with no details behind it opens nothing, so with `cardsOpen` false those steps draw no ring.
 * A step with no entry draws no ring.
 */
export function ringTarget(index: number, cardsOpen = false): string | null {
  switch (index) {
    case 0:
      return cardsOpen ? "[data-collection-tile]" : null;
    case 1:
      return "[data-fit-chip]";
    case 2:
      return cardsOpen ? "[data-testid='best-fit'], [data-testid='result-row']" : null;
    case 3:
      // The mark key (the first group in the step), near the top of the step: the first marked row sits ~1,850px down. The key's
      // entries are not controls, so the key as a whole is ringed.
      return "[data-testid='demo-deck'] [role='group']";
    case 4:
      return "[data-testid^='finding-']:has(button)";
    case 5:
      // The first card name a suggestion line opens: the line is an `article` and its name button is named "Open <card>"
      // (`deckTuningCopy.card.open`); its thumbnail beside it is `aria-hidden`, so the name button is the first match. Scoped to
      // the lines so no other "Open ..." control in the step can take the ring.
      return cardsOpen ? "[data-testid='demo-suggested'] article button[aria-label^='Open ']" : null;
    case 6:
    case 7:
      return "[role='tab'][aria-selected='false']";
    default:
      return null;
  }
}

/** The oracle ids of the cards a step's presses open, for the steps that carry a card ring (1, 3 and 6). Empty for any other step. */
function stepCardIds(data: Projected, index: number): string[] {
  switch (index) {
    case 0:
      return data.collection.cards.map((c) => c.oracleId);
    case 2:
      return (data.choose?.page.rows ?? []).map((r) => r.oracleId);
    case 5:
      // The line items only: `StepSuggested` draws `state.items.filter(isLineItem)` and no legacy pair, so a pair's cards are no
      // press (`isLineItem`, `demo-step-analysis.tsx`, is the same test: a line carries its side).
      return (data.suggested?.state.items ?? []).flatMap((item) => ("side" in item && item.side !== undefined && "cardOracleId" in item ? [item.cardOracleId] : []));
    default:
      return [];
  }
}

/**
 * Whether a card press on this step opens a card: the step draws at least one card, and the loaded card data holds details for every
 * card it draws. All of them, not the first: a ring promises a press, and the first card the selector finds is whichever the step
 * draws first. `cards` is null until the card chunk has loaded (and for good in a file with none): no data, no press that opens
 * anything, so no ring and no promising sentence. The step's lines and the ring both ask this.
 */
export function stepOpensCards(data: Projected, cards: DemoCardData | null, index: number): boolean {
  const ids = stepCardIds(data, index);
  return cards !== null && ids.length > 0 && ids.every((id) => Object.hasOwn(cards.cardDetails, id));
}

/** Where each step's ring label sits (`RingPlace`): a tab's ring sits right under the panel label, so its label goes under it; step 1's tile has the legend row above; every other target is wide, with a label straddling its top edge. */
export function ringPlace(index: number): RingPlace {
  switch (index) {
    case 0:
      return "inside";
    case 6:
    case 7:
      return "bottom";
    default:
      return "top";
  }
}
