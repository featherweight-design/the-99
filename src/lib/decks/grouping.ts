// Pure grouping helpers + card shapes shared by client components.
// Must stay free of db/server imports — client components import these as values.

import { addPanelCopy } from "../copy/decks-builder";
import type { Availability } from "./availability";

export type CardTypeGroup =
  | "Creatures" | "Instants" | "Sorceries"
  | "Artifacts" | "Enchantments" | "Planeswalkers" | "Lands" | "Other";

export type DeckDetailCard = {
  oracleId: string;
  name: string;
  typeLine: string;
  cardTypeGroup: CardTypeGroup;
  role: "ramp" | "draw" | "removal" | "wipes" | "land" | "other";
  owned: boolean;
  quantity: number;
  auto: boolean;
  /**
   * Optional because six sites build this literal (optimistic reducers, tests,
   * fixtures) and none of them can reach the database. Absent and null both mean
   * "no marker": a failed availability read degrades to the free rendering
   * rather than to an error surface.
   */
  availability?: Availability | null;
};

/**
 * Basic lands are the only multi-copy exception this app supports. Commander's
 * rules also exempt cards that name themselves ("A deck can have any number of
 * cards named…"), which we do not read — so this is a deliberate implementation
 * limit, not a statement of the rules. Widening it means parsing oracle text,
 * and every behaviour below would follow from this one function.
 *
 * It is the hinge for three of them: the server increments quantity instead of
 * no-op'ing, the search row stays addable after the first add, and the
 * optimistic reducer merges rather than ignores. Those three were testing the
 * type line independently; one definition keeps them from drifting apart.
 */
export function isBasicLand(typeLine: string): boolean {
  return /\bBasic\b/.test(typeLine);
}

/**
 * A line the import could not put a card to. Typed here rather than beside the
 * query in read.ts, which imports the Drizzle client — client components render
 * these rows and must not pull the db into the browser bundle.
 */
export type DeckUnresolvedRow = {
  id: string;
  rawName: string;
  quantity: number;
  sourceLine: number;
};

/**
 * Copies, not rows. Only basic lands stack today, so anywhere basics are
 * filtered out this returns the row count — but `isBasicLand` documents its
 * exception as an implementation limit that may widen to self-naming cards,
 * and every count that says "cards" has to follow it when it does.
 */
export function cardCopies(cards: Pick<DeckDetailCard, "quantity">[]): number {
  return cards.reduce((sum, c) => sum + c.quantity, 0);
}

/**
 * Unresolved rows are counted in cards rather than lines, because the figure
 * they feed is `total`, which sits beside `built` — and `built` sums
 * quantities. The prose surfaces report line counts instead, and say "lines" —
 * they are describing the import, not the ledger.
 */
export function unresolvedCardCount(rows: DeckUnresolvedRow[]): number {
  return rows.reduce((sum, r) => sum + r.quantity, 0);
}

/**
 * The deck's headline counts, derived from the card list plus the number of
 * cards sitting on lines the import could not identify.
 *
 * The only definition, because the builder now renders these from an optimistic
 * client-side card list as well as from the server's. Two implementations would
 * let the counter strip and the decklist disagree mid-mutation.
 *
 * `total` is the only figure unresolved rows move: they are cards the deck
 * wants but cannot name, so nothing about them is built, owned, or buyable.
 */
export function deckCounts(
  cards: DeckDetailCard[],
  unresolvedCount = 0,
): {
  built: number;
  ownedCount: number;
  toBuyCount: number;
  total: number;
} {
  const built = cards.reduce((sum, c) => sum + c.quantity, 0);
  const ownedCount = cards.reduce((sum, c) => sum + (c.owned ? c.quantity : 0), 0);
  return { built, ownedCount, toBuyCount: built - ownedCount, total: built + unresolvedCount };
}

const CARD_TYPE_GROUP_ORDER: CardTypeGroup[] = [
  "Creatures", "Instants", "Sorceries", "Artifacts", "Enchantments", "Planeswalkers", "Lands", "Other",
];

const ROLE_GROUP_ORDER: Array<"ramp" | "draw" | "removal" | "wipes" | "land" | "other"> = [
  "ramp", "draw", "removal", "wipes", "land", "other",
];

// The decklist's role groups and the Consider view's shelves name the same six
// buckets, so they read from one map. The "other" bucket is the role bucket,
// not the card-type group — CARD_TYPE_GROUP_ORDER's "Other" above is a
// different taxonomy of the same name, and the `role` value on the payload is
// still "other".
// Keyed off ROLE_GROUP_ORDER rather than spread, so `edhrec` — a template for
// the EDHREC shelf, not a role — stays out of a map groupByRole tests
// membership of.
const ROLE_GROUP_LABELS = Object.fromEntries(
  ROLE_GROUP_ORDER.map((r) => [r, addPanelCopy.shelf.labels[r]]),
) as Record<(typeof ROLE_GROUP_ORDER)[number], string>;

export function groupByCardType(cards: DeckDetailCard[]): [CardTypeGroup, DeckDetailCard[]][] {
  const map = new Map<CardTypeGroup, DeckDetailCard[]>();
  for (const g of CARD_TYPE_GROUP_ORDER) map.set(g, []);
  for (const c of cards) {
    map.get(c.cardTypeGroup)!.push(c);
  }
  const result: [CardTypeGroup, DeckDetailCard[]][] = [];
  for (const g of CARD_TYPE_GROUP_ORDER) {
    const group = map.get(g)!;
    if (group.length > 0) {
      result.push([g, group.slice().sort((a, b) => a.name.localeCompare(b.name))]);
    }
  }
  return result;
}

export function groupByRole(cards: DeckDetailCard[]): [string, DeckDetailCard[]][] {
  const map = new Map<string, DeckDetailCard[]>();
  for (const r of ROLE_GROUP_ORDER) map.set(r, []);
  for (const c of cards) {
    const key = c.role in ROLE_GROUP_LABELS ? c.role : "other";
    map.get(key)!.push(c);
  }
  const result: [string, DeckDetailCard[]][] = [];
  for (const r of ROLE_GROUP_ORDER) {
    const group = map.get(r)!;
    if (group.length > 0) {
      result.push([ROLE_GROUP_LABELS[r], group.slice().sort((a, b) => a.name.localeCompare(b.name))]);
    }
  }
  return result;
}
