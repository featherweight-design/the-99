// Shopping for all decks v2: search and sort, pure (handoff `design_handoff_the99_all_decks_cart_v2`, calls 4 and 5;
// plan PR 8). Search narrows the same selected lines in every view; SORT IS PER VIEW, each view with its own closed set
// of orders whose first is the shipped default. The URL carries `?q` and one `?sort` for the view on screen, so a value
// from another view's set (A15) is no sort at all: it reads as that view's default.

import type { CartDeck, CartLine, SelectedLine } from "./cart";

export type CartView = "card" | "deck" | "friend";

/** The orders per view, default first (call 5). The strings are the URL's values. */
export const CART_SORTS = {
  card: ["decks", "price-high", "price-low", "spare", "name"],
  deck: ["largest", "cost", "name"],
  friend: ["spare", "cards", "name"],
} as const satisfies Record<CartView, readonly string[]>;

export type CardSort = (typeof CART_SORTS.card)[number];
export type DeckSort = (typeof CART_SORTS.deck)[number];
export type FriendSort = (typeof CART_SORTS.friend)[number];
export type CartSorts = { card: CardSort; deck: DeckSort; friend: FriendSort };

export const DEFAULT_SORTS: CartSorts = { card: "decks", deck: "largest", friend: "spare" };

/** `?sort=` read for the view on screen: a value that view does not offer is its default. */
export function parseSort<V extends CartView>(view: V, raw: string | null | undefined): CartSorts[V] {
  const offered: readonly string[] = CART_SORTS[view];
  return (raw && offered.includes(raw) ? raw : DEFAULT_SORTS[view]) as CartSorts[V];
}

/** The longest search the cart reads, so a pasted page cannot ride the URL. */
export const MAX_QUERY = 80;

/** `?q=` as the search it names: trimmed and capped; absent when empty. */
export function parseQuery(raw: string | null | undefined): string {
  return (raw ?? "").trim().slice(0, MAX_QUERY);
}

/** Does this card's name hold the search? Case-blind, on the oracle name (both faces of a two-faced card). */
export function matchesQuery(name: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  return needle === "" || name.toLowerCase().includes(needle);
}

/** By card's default: commanders first, then the cards most selected decks need, then A to Z (A2, A3). */
export function byCardOrder(a: SelectedLine, b: SelectedLine): number {
  return Number(b.commander) - Number(a.commander)
    || b.selectedRows.length - a.selectedRows.length
    || a.name.localeCompare(b.name);
}

/**
 * The figure a price sort reads (G4): the one `lineFact` draws, the priced copies' sum. Null when the line draws no
 * price (nothing priced, sold out, or a zero sum), and a null goes last in both directions.
 */
export function lineCents(line: Pick<SelectedLine, "pricedCopies" | "cents">): number | null {
  return line.pricedCopies > 0 && line.cents > 0 ? line.cents : null;
}

/** Larger first by `value`, a null last; `dir` flips the order of the numbers and never moves a null up. */
function byNumber<T>(value: (x: T) => number | null, dir: 1 | -1): (a: T, b: T) => number {
  return (a, b) => {
    const x = value(a);
    const y = value(b);
    if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
    return (y - x) * dir;
  };
}

/**
 * By card's comparator for an order. `spareOf` is the copies friends hold of a card (zero reads as none). Every order
 * falls back to the default, so a tie never leaves the list in an arbitrary order.
 */
export function cardCompare(
  sort: CardSort, spareOf: (oracleId: string) => number,
): (a: SelectedLine, b: SelectedLine) => number {
  switch (sort) {
    case "decks":
      return byCardOrder;
    case "name":
      return (a, b) => a.name.localeCompare(b.name);
    case "price-high": {
      const by = byNumber<SelectedLine>(lineCents, 1);
      return (a, b) => by(a, b) || byCardOrder(a, b);
    }
    case "price-low": {
      const by = byNumber<SelectedLine>(lineCents, -1);
      return (a, b) => by(a, b) || byCardOrder(a, b);
    }
    case "spare": {
      const by = byNumber<SelectedLine>((l) => spareOf(l.oracleId) || null, 1);
      return (a, b) => by(a, b) || byCardOrder(a, b);
    }
  }
}

/** A deck's cost for a sort: its roll-up cents, null when none of its copies is priced. */
export const deckCents = (d: Pick<CartDeck, "cents" | "pricedCopies">): number | null =>
  d.pricedCopies > 0 && d.cents > 0 ? d.cents : null;

/** By deck's decks in an order. "Largest first" is the read's own order, so it is the array as it came. */
export function sortDecks<D extends Pick<CartDeck, "name" | "cents" | "pricedCopies">>(decks: readonly D[], sort: DeckSort): D[] {
  if (sort === "largest") return [...decks];
  const by = sort === "cost" ? byNumber<D>(deckCents, 1) : null;
  return [...decks].sort((a, b) => (by ? by(a, b) : 0) || a.name.localeCompare(b.name));
}

/** The panel fields an order reads. */
export type SortableGroup = { friend: { displayName: string; publicId: string }; spares: number; lines: readonly unknown[] };

/** By friend's panels in an order (call 5). Ties fall back to most spares, then name, then id, as the panels have always. */
export function sortGroups<G extends SortableGroup>(groups: readonly G[], sort: FriendSort): G[] {
  const name = (a: G, b: G) =>
    a.friend.displayName.localeCompare(b.friend.displayName, "en-US", { sensitivity: "base" })
    || (a.friend.publicId < b.friend.publicId ? -1 : 1);
  const bySpare = (a: G, b: G) => b.spares - a.spares || name(a, b);
  return [...groups].sort(
    sort === "name" ? name
      : sort === "cards" ? (a, b) => b.lines.length - a.lines.length || bySpare(a, b)
        : bySpare,
  );
}

/** Lines of a read, narrowed by a search: for the pieces that hold raw `CartLine`s (By deck's groups). */
export function searchLines<L extends Pick<CartLine, "name">>(lines: readonly L[], query: string): L[] {
  return query.trim() === "" ? [...lines] : lines.filter((l) => matchesQuery(l.name, query));
}
