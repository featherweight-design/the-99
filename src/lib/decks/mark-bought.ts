// I got it's receipt (plan `2026-10-10-i-got-it.md`, audit gap 5): what a purchase did, read from
// the card's availability either side of the write (`ReceiptSnapshots`, taken under the write's
// lock). Pure.
import { allocateClaims } from "./allocate";
import { availabilityState, type Availability } from "./availability";

/** The most copies one press records (call D). */
export const MARK_BOUGHT_MAX = 20;

export type ReceiptFacts = {
  /**
   * The OTHER committed decks whose allocated copies rose: seniority gave them the new copy. The
   * source deck is in the queue (a source deck senior to the rest takes the copy and this is empty)
   * and dropped only here, from the names the receipt prints.
   */
  tookCopy: { deckId: string; deckName: string; copies: number }[];
  /** Copies the source deck still needs, from its own vantage: the figure its Shopping row draws. */
  stillNeeds: number;
};

type Snap = Pick<Availability, "owned" | "claims"> | null;

export function receiptFacts(
  before: Snap,
  after: Snap,
  afterFromDeck: Pick<Availability, "owned" | "free" | "soft"> | null,
  sourceDeckId: string,
): ReceiptFacts {
  const allocated = (a: Snap) =>
    new Map(a ? allocateClaims(a).map((c) => [c.deckId, c]) : []);
  const was = allocated(before);
  const tookCopy = [...allocated(after).values()]
    .filter((c) => c.deckId !== sourceDeckId)
    .map((c) => ({ deckId: c.deckId, deckName: c.deckName, copies: c.allocated - (was.get(c.deckId)?.allocated ?? 0) }))
    .filter((c) => c.copies > 0);
  const stillNeeds = afterFromDeck && availabilityState(afterFromDeck, { selfExcluded: true }) === "over"
    ? -afterFromDeck.free
    : 0;
  return { tookCopy, stillNeeds };
}
