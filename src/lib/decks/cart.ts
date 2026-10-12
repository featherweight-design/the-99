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
export type CartRow = {
  deckId: string;
  quantity: number;
  cents: number | null;
  state: PriceState | null;
  /** The card is this deck's own unowned commander (H28), so the line leads while this deck is selected. */
  commander: boolean;
  /** Owned copies THIS deck holds of the card (a deck can hold some and buy the rest). */
  held: number;
  /**
   * Which finish a `foilOnly` price came from, since `foilOnly` covers both: `foil` when the fact
   * carried a foil price, `etched` when only an etched one. Null for every other state.
   */
  finish: "foil" | "etched" | null;
  /**
   * The printing this deck's figure was read from (its pick when priced, else the read's choice):
   * what I got it's confirm presets, never drawn. Absent on a failed read and in every fixture.
   */
  printing?: string | null;
};

export type CartLine = {
  oracleId: string;
  /** The oracle name: what the Mana Pool line carries, and what the line is merged by. */
  name: string;
  /** Some deck on the line buys it as its unowned commander (H28). Per selection: `selectLine`. */
  commander: boolean;
  /**
   * Copies the player owns (lock 4: an owned card can be a cart line, when other decks hold every
   * copy). Zero for a card they own none of, and the line then says nothing about ownership.
   */
  owned: number;
  /**
   * Owned copies held by decks NOT on this line (audit finding 4). The line's `all N in other
   * decks` form is true only when this equals `owned`; a deck on the line can hold some of its
   * own (Relentless Rats and the like), and then the two differ. Per selection: `selectLine` adds
   * what an unselected deck on the line holds, since that deck is then one of the others.
   */
  heldElsewhere: number;
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
  /** Every deck the player owns, for `7 of 21 decks are missing cards`. */
  totalDecks: number;
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
  // Read from the selected rows, never carried from the whole line: unselecting the deck that
  // leads with this card as its commander must not leave the line labelled and ordered as one.
  const commander = selectedRows.some((r) => r.commander);
  const heldElsewhere = line.heldElsewhere
    + line.rows.reduce((n, r) => n + (selected.has(r.deckId) ? 0 : r.held), 0);
  return { ...line, commander, heldElsewhere, selectedRows, ...figuresOf(selectedRows) };
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
