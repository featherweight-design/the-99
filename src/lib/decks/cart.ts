// The all-decks shopping cart's pure half (handoff `design_handoff_the99_all_decks_cart`).
//
// The cart is the roll-up's rows shown whole: every (deck, card) purchase `loadDeckBuyRows`
// bills, priced through that deck's own printing pick. One copy per deck (Hugh's ruling 2): two
// decks that need Sol Ring is two copies, so a card's line is the SUM of its decks' rows and
// carries the breakdown it came from. Selections are a view (lock 8): unselecting a deck changes
// what this file sums and nothing anywhere else.
//
// Read on the server (`cart-read.ts`) and summed on the client as decks are selected, so every
// figure here is a plain sum over rows and nothing is re-derived. A row's `cents` came from the
// same `priceState` / `priceOf` the roll-up's `summarisePrices` uses, so a deck's figure here is
// the tile's figure by construction.

import { manapoolAddDeckUrls } from "../manapool/links";
import type { PriceState } from "./price";

/**
 * One deck's bill for one card. `cents` is null when that copy has no price (never zero); `state`
 * says why (`soldOut`, `absent`), the same states the per-deck buy tag reads, and is null when the
 * price read failed outright.
 */
export type CartRow = { deckId: string; quantity: number; cents: number | null; state: PriceState | null };

export type CartLine = {
  oracleId: string;
  /** The oracle name: what the Mana Pool line carries, and what the line is merged by. */
  name: string;
  /** An unowned commander, which leads its own deck's list (H28). */
  commander: boolean;
  rows: CartRow[];
};

export type CartDeck = {
  id: string;
  name: string;
  /** No committed version. Brews are in the cart by ruling 1. */
  brew: boolean;
  copies: number;
  cents: number;
  pricedCopies: number;
};

export type CartPayload = {
  decks: CartDeck[];
  lines: CartLine[];
  /** False when the price read failed (T2): rows still load, and no figure is drawn. */
  priced: boolean;
  /** The feed's newest `as_of`, ISO, for the provenance line. Null with no prices. */
  newestAsOf: string | null;
};

export type CartFigures = { copies: number; cents: number; pricedCopies: number };

/** A line, read through the decks the player has selected. Null when no selected deck needs it. */
export type SelectedLine = CartLine & { selectedRows: CartRow[] } & CartFigures;

export function selectLine(line: CartLine, selected: ReadonlySet<string>): SelectedLine | null {
  const selectedRows = line.rows.filter((r) => selected.has(r.deckId));
  if (selectedRows.length === 0) return null;
  return { ...line, selectedRows, ...figuresOf(selectedRows) };
}

export function figuresOf(rows: readonly CartRow[]): CartFigures {
  let copies = 0;
  let cents = 0;
  let pricedCopies = 0;
  for (const r of rows) {
    copies += r.quantity;
    if (r.cents === null) continue;
    cents += r.cents * r.quantity;
    pricedCopies += r.quantity;
  }
  return { copies, cents, pricedCopies };
}

/** The cart's total over the selected decks: the sum of their roll-up figures. */
export function cartTotal(decks: readonly CartDeck[], selected: ReadonlySet<string>): CartFigures {
  const out = { copies: 0, cents: 0, pricedCopies: 0 };
  for (const d of decks) {
    if (!selected.has(d.id)) continue;
    out.copies += d.copies;
    out.cents += d.cents;
    out.pricedCopies += d.pricedCopies;
  }
  return out;
}

/**
 * What goes to Mana Pool: the selected lines MERGED BY CARD NAME with quantities added (lock 5),
 * so Sol Ring for three decks is one line, `3 Sol Ring`. Names and quantities only, as the
 * per-deck link sends; the printing is chosen on Mana Pool. In the cart's own line order.
 */
export function checkoutLines(lines: readonly CartLine[], selected: ReadonlySet<string>): { name: string; quantity: number }[] {
  const byName = new Map<string, number>();
  for (const line of lines) {
    const picked = selectLine(line, selected);
    if (!picked) continue;
    byName.set(line.name, (byName.get(line.name) ?? 0) + picked.copies);
  }
  return [...byName].map(([name, quantity]) => ({ name, quantity }));
}

/**
 * The cart's checkout as links: one when it fits, several when it does not (Hugh's answer 3,
 * `part 1 of 2`), each with the number of lines it sends. Empty when nothing is selected.
 */
export function checkoutLinks(lines: readonly CartLine[], selected: ReadonlySet<string>): { href: string; lineCount: number }[] {
  return manapoolAddDeckUrls(checkoutLines(lines, selected));
}
