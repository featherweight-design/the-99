// Which card details the demo opens a card from (5l-d): the loaded card data (`DemoCardData`, its own chunk, `card-details.ts`),
// one payload per card, and, for a card opened from a deck's own row, the deck's role. One plain pure function, so every reader of
// "the details this press opens" (the host, its neighbors' plates, the frame's gate) asks the same question.

import { demoCardDetail } from "../../../lib/demo/card-details";
import type { DemoCardData, DemoCardDetail, DemoDeckCombos } from "../../../lib/demo/project-cards";

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
