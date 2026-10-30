// Shopping for all decks v2: search and sort, pure (handoff `design_handoff_the99_all_decks_cart_v2`, calls 4 and 5;
// plan PR 8). Search narrows the same selected lines in every view; SORT IS PER VIEW, each view with its own closed set
// of orders whose first is the shipped default. The URL carries `?q` and one `?sort` for the view on screen, so a value
// from another view's set (A15) is no sort at all: it reads as that view's default.

import type { CartDeck, CartLine, SelectedLine } from "./cart";
import { compareNames } from "../person-name";
import type { ThirdPartyName } from "../person-name/brand";

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
export type SortableGroup = { friend: { displayName: string | ThirdPartyName; publicId: string }; spares: number; lines: readonly unknown[] };

/** By friend's panels in an order (call 5). Ties fall back to most spares, then name, then id, as the panels have always. */
export function sortGroups<G extends SortableGroup>(groups: readonly G[], sort: FriendSort): G[] {
  const name = (a: G, b: G) =>
    compareNames(a.friend.displayName, b.friend.displayName, "en-US", { sensitivity: "base" })
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

// The two filters (call 6, D3; plan PR 9). Both narrow the same lines in every view (D4), so they live beside search.

/**
 * The Friend filter, three states (engineering decision 2): off (`?friend` absent) keeps every line; `any`
 * (`?friend=any`) keeps the lines some friend has a spare of; a list of public ids (`?friend=a,b`) keeps the lines
 * those friends have a spare of. Off is null, so clearing it is a plain absence.
 */
export type FriendFilter = null | "any" | readonly string[];

/** The Owned filter: Any (off), You own some, None. The strings are the URL's values; `any` is an absence. */
export const OWNED_FILTERS = ["any", "some", "none"] as const;
export type OwnedFilter = (typeof OWNED_FILTERS)[number];

/** The most friends a `?friend` names, so a pasted list cannot ride the URL. */
export const MAX_FRIEND_IDS = 24;
const PUBLIC_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** `?friend=` as a filter: `any`, or the well-formed ids it names (deduped, capped); anything else is off. */
export function parseFriend(raw: string | null | undefined): FriendFilter {
  const value = (raw ?? "").trim();
  if (value === "any") return "any";
  const ids = [...new Set(value.split(",").map((s) => s.trim()).filter((s) => PUBLIC_ID.test(s)))].slice(0, MAX_FRIEND_IDS);
  return ids.length > 0 ? ids : null;
}

/** The filter as `?friend=`'s value, or null for off. */
export const friendParam = (f: FriendFilter): string | null => (f === null ? null : f === "any" ? "any" : f.join(","));

/** `?owned=` as a filter: a value the filter offers, else Any. */
export function parseOwned(raw: string | null | undefined): OwnedFilter {
  return (OWNED_FILTERS as readonly string[]).includes(raw ?? "") ? (raw as OwnedFilter) : "any";
}

/** Does a line the reader owns `owned` copies of pass the Owned filter? */
export function ownedKeeps(filter: OwnedFilter, owned: number): boolean {
  return filter === "any" || (filter === "some" ? owned > 0 : owned <= 0);
}

/**
 * Does a card pass the Friend filter? `holders` are the public ids of the friends with a spare of it, or undefined
 * while its read is out: a card not yet read is kept, so the list narrows as the read lands rather than flashing empty.
 */
export function friendKeeps(filter: FriendFilter, holders: readonly string[] | undefined): boolean {
  if (filter === null || holders === undefined) return true;
  return filter === "any" ? holders.length > 0 : holders.some((id) => filter.includes(id));
}

/**
 * A press on the Friend panel's row or the sheet's pill. `any` toggles Any friend (off, or replacing the named
 * friends); a friend's id toggles that friend in the named list (replacing Any), and the last one off is off. A friend
 * past `MAX_FRIEND_IDS` is not added, so every filter a press builds survives `parseFriend` on a reload.
 */
export function toggleFriend(filter: FriendFilter, code: string): FriendFilter {
  if (code === "any") return filter === "any" ? null : "any";
  const named = filter === null || filter === "any" ? [] : filter;
  if (!named.includes(code) && named.length >= MAX_FRIEND_IDS) return filter; // one cap with `parseFriend`
  const next = named.includes(code) ? named.filter((id) => id !== code) : [...named, code];
  return next.length > 0 ? next : null;
}

/**
 * The filter once the read has landed: a named id no friend with a spare answers to is dropped (decision 2), and a
 * filter left naming nobody, or Any with no friend holding a spare, is off. The same value back when nothing changed.
 */
export function settleFriend(filter: FriendFilter, known: ReadonlySet<string>): FriendFilter {
  if (filter === null) return filter;
  if (filter === "any") return known.size > 0 ? filter : null;
  const kept = filter.filter((id) => known.has(id));
  return kept.length === filter.length ? filter : kept.length > 0 ? kept : null;
}
