// A Commander deck is 100 cards including its commanders, so the body is
// 100 minus however many commanders the deck has. 99 is not a rule of the
// format; 100 is.

const DECK_TOTAL = 100;

export function deckBodySize(hasPartner: boolean): number {
  return DECK_TOTAL - (hasPartner ? 2 : 1);
}

// The pair's missing slot comes out of the elastic lands and never out of a
// role target: a deck does not need less removal because it has two
// commanders, and it does need one fewer land because it draws one fewer.
export function landTarget(hasPartner: boolean): number {
  return hasPartner ? 36 : 37;
}
