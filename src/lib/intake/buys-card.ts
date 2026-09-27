/**
 * Whether placing the build-around card means buying it: not owned, or owned with every copy held
 * by a committed deck. The fill charges exactly these (`loadFillGate`, `trialFill`), so every
 * surface that draws or prices the card asks this rather than `owned` alone.
 */
export function buysCard(card: { owned: boolean; held: { deck: string | null } | null }): boolean {
  return !card.owned || card.held !== null;
}
