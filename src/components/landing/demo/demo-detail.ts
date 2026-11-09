// Which card details the demo opens a card from (5l-d): the loaded card data (`DemoCardData`, its own chunk, `card-details.ts`),
// one payload per card, and, for a card opened from a deck's own row, the deck's role. One plain pure function, so every reader of
// "the details this press opens" (the host, its neighbors' plates, the frame's gate) asks the same question.

import { demoCardDetail } from "../../../lib/demo/card-details";
import type { DemoCardData, DemoCardDetail, DemoCardStep, DemoDeckCombos } from "../../../lib/demo/project-cards";

/** The three decks the fixture holds: the one played to exactly 99, the one over and the one under. */
export type DemoDeckRole = keyof DemoDeckCombos;

/**
 * The details a press on `oracleId` opens, or undefined when the data holds none (a card the chunk does not carry): then the press
 * opens nothing. `role` is the deck the press came from, null for a press with no deck (the collection, Help me choose, Which
 * deck needs it most?). A press from a deck step opens the card with that deck's own combos laid over it (`demoCardDetail`).
 */
export function detailFor(data: DemoCardData, oracleId: string, role: DemoDeckRole | null): DemoCardDetail | undefined {
  return demoCardDetail(data, oracleId, role ?? undefined);
}

/**
 * The card-details chunks a step on screen needs, by the step's index (0-based; `shopping` is the deck whose list step 8 draws, as
 * `deckRoleOf` names it): a press on the step can open only a card these hold (with `shared`, which every step's load adds).
 *   - steps 1 to 3 (the collection, the commanders, Help me choose): the binder;
 *   - steps 4 to 6 (the played deck): the played deck's chunk;
 *   - step 7 (Get it to 99): the over deck's (Look deeper) and the under deck's (Top off, Mana Balance). The tab is the step's own
 *     state, so both are loaded together: whichever tab is open, a press finds its card;
 *   - step 8 (Buy only what's missing): Which deck's card (the binder) and the Shopping list's deck.
 * Any other index needs none.
 */
export function cardStepsFor(index: number, shopping: DemoCardStep | null): DemoCardStep[] {
  switch (index) {
    case 0:
    case 1:
    case 2:
      return ["binder"];
    case 3:
    case 4:
    case 5:
      return ["played"];
    case 6:
      return ["over", "under"];
    case 7:
      return shopping === null ? ["binder"] : ["binder", shopping];
    default:
      return [];
  }
}
