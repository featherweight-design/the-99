// Which card details the demo opens a card from (5l-d): the exported `cardDetails`, one payload per card (collection-style),
// and, for a card opened from a deck's own row, the deck's role. One plain pure function, so every reader of "the details this
// press opens" (the frame's gate, the host, its neighbors' plates) asks the same question and an overlay for a deck's role
// joins in one place.

import type { DemoCardDetail } from "../../../lib/demo/project-cards";
import type { Projected } from "../../../lib/demo/projected";

/** The three decks the fixture holds: the one played to exactly 99, the one over and the one under. */
export type DemoDeckRole = "played" | "over" | "under";

/**
 * The details a press on `oracleId` opens, or undefined when the data holds none (a file exported before the card details
 * joined, or a card they do not carry): then the press opens nothing. `role` is the deck the press came from, null for a press
 * with no deck (the collection, Help me choose, Which deck needs it most?). The deck-scoped overlay is not read yet: it joins here.
 */
export function detailFor(data: Pick<Projected, "cardDetails">, oracleId: string, role: DemoDeckRole | null): DemoCardDetail | undefined {
  void role;
  return data.cardDetails?.[oracleId];
}
