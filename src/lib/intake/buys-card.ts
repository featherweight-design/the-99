/**
 * THE CHARGE RULE, once: placing a card means buying it when the player does not own it, or owns
 * it with every copy held by a committed deck (`Availability.free <= 0`). No availability row for
 * an owned card means nothing claims it. The fill's gate (`loadFillGate`), its trial (`trialFill`)
 * and the build-around card's row (`loadCardRow`) all ask this, so the chip, the hand-off and the
 * ranking cannot price a card differently from the fill that places it. Basics are never bought,
 * and each caller rules them out before asking.
 */
export function buysCopy(owned: boolean, availability: { free: number } | undefined): boolean {
  return !owned || (availability !== undefined && availability.free <= 0);
}

/** `buysCopy` for a card already read: not owned, or owned with every copy held. */
export function buysCard(card: { owned: boolean; held: { deck: string | null } | null }): boolean {
  return !card.owned || card.held !== null;
}
