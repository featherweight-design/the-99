// The deck's average mana value, for the what-changed strip's sixth cell.
//
// Pure and separate from `mix.ts` because that module owns the five roles and
// their targets, and this figure has neither: there is no recommended mana
// value, which is why its cell draws a movement and never a bar.

import { isBasicLand } from "./grouping";

export type ManaValueCard = { cmc: number; quantity: number; typeLine: string };

/**
 * Quantity-weighted, lands excluded, rounded to one decimal — null when the
 * list is all land or empty.
 *
 * Lands are out because a land's mana value is 0 by definition, not by choice:
 * averaging 37 zeroes into the figure would report every Commander deck as a
 * cheap one and would move the number when the land count moved, which is the
 * one thing the strip's land cell already says.
 */
export function averageManaValue(cards: ManaValueCard[]): number | null {
  let spells = 0;
  let total = 0;
  for (const card of cards) {
    if (isBasicLand(card.typeLine) || /\bLand\b/.test(card.typeLine)) continue;
    spells += card.quantity;
    total += card.cmc * card.quantity;
  }
  if (spells === 0) return null;
  return Math.round((total / spells) * 10) / 10;
}
