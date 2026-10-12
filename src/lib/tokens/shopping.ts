import type { ManapoolLine } from "../manapool/links";
import { priceOf, priceState } from "../decks/price";
import type { DeckToken, DeckTokensRead } from "./read";
import { tokenManapoolLine } from "./price-line";

/**
 * What a deck's joined tokens are, for Shopping: the rows, how many of them have a figure, what those figures
 * sum to, and the lines a Mana Pool link sends for them. Pure over the loader's read, so the client box and
 * the row group draw from one definition. A token NEVER enters the deck's card counts, money, status or
 * roll-up (plan lock 7): this is its own figure, added only to the buy box.
 */
export type TokenShopping = {
  /** Joined to this deck, not held, in the group's order. */
  rows: DeckToken[];
  /** How many have a live figure (a sold-out or unpriced token is left out of the sum, as a card is). */
  priced: number;
  cents: number;
  /** One line per joined token: Mana Pool's product where it has one, else the name alone. */
  lines: ManapoolLine[];
};

export function tokenShopping(read: DeckTokensRead | null | undefined): TokenShopping | null {
  if (!read || read.status !== "ok") return null;
  const rows = read.tokens.filter((t) => t.joined && t.state !== "owned");
  if (rows.length === 0) return null;
  let priced = 0;
  let cents = 0;
  for (const t of rows) {
    if (!t.price) continue;
    const figure = priceOf(t.price, priceState(t.price, read.newestPriceAsOf));
    if (figure === null) continue;
    priced += 1;
    cents += figure;
  }
  return {
    rows,
    priced,
    cents,
    lines: rows.map((t) => (t.price ? tokenManapoolLine(t.name, 1, t.price) : { name: t.name, quantity: 1 })),
  };
}
