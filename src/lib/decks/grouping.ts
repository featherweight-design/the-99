import { frontFace } from "../cards/facet";
import type { CardFact } from "../copy/card-mark";
// Pure grouping helpers + card shapes shared by client components.
// Must stay free of db/server imports — client components import these as values.

import { addPanelCopy } from "../copy/decks-builder";
import type { Availability } from "./availability";
import type { PriceFact } from "./price";

export type CardTypeGroup =
  | "Creatures" | "Instants" | "Sorceries"
  | "Artifacts" | "Enchantments" | "Planeswalkers" | "Lands" | "Other";

export type DeckDetailCard = {
  oracleId: string;
  name: string;
  typeLine: string;
  cardTypeGroup: CardTypeGroup;
  role: "ramp" | "draw" | "removal" | "wipes" | "land" | "other";
  /**
   * Scryfall's converted cost, for the what-changed strip's mana value cell.
   * Required rather than optional, unlike `manaCost`: a literal that omitted it
   * would average as a zero and quietly pull the deck's figure down. `cards.cmc`
   * is `notNull` with a default of 0, so there is no null to model.
   */
  cmc: number;
  /**
   * The standing bracket facts this card carries — Game Changer, mass land denial, extra
   * turns. Optional and OMITTED WHEN EMPTY, like `availability` beside it and for the same
   * reasons: six sites build this literal without a catalog to ask, and most cards carry
   * nothing.
   *
   * Absent is silence, never a claim the card is clear. Detection on two of the three is
   * measured and partial.
   */
  facts?: CardFact[];
  owned: boolean;
  /**
   * This deck prints its copy of the card. **Never folded into `owned`**, which
   * stays a fact about the collection: a proxied row draws a hollow ownership
   * dot and a proxy mark, and the two disagreeing is the honest reading —
   * *not in your collection · this deck's slot is filled*.
   *
   * Optional for the reason `availability` is: six sites build this literal and
   * none of them can reach the database. Absent means not proxied.
   */
  proxied?: boolean;
  /**
   * The player locked this card in this deck (Locked, sub-project 5.1): never offered as a cut.
   * Optional for the reason `proxied` is; absent means unlocked. Always false with the switch off.
   */
  locked?: boolean;
  quantity: number;
  auto: boolean;
  /**
   * Optional because six sites build this literal (optimistic reducers, tests,
   * fixtures) and none of them can reach the database. Absent and null both mean
   * "no marker": a failed availability read degrades to the free rendering
   * rather than to an error surface.
   */
  availability?: Availability | null;
  /** Optional for the same reason `availability` is, and degrading the same
   * way: absent and null both mean the bare `buy` tag. */
  price?: PriceFact | null;
  /**
   * The printed cost, for the row's mana pips (#350) and the card tile (#349).
   * Optional for the same reason `availability` is — six sites build this
   * literal and none can reach the database. Absent and null both mean no pips
   * are drawn, which is also what a land legitimately draws.
   */
  manaCost?: string | null;
  /**
   * The card's face, for the card view's tile and the hover preview. Null is a
   * real state the catalog produces, not only an unwidened caller: a card with
   * no image draws the tile's empty plate rather than a broken one.
   */
  imageUri?: string | null;
  /**
   * The name printed on the copy this player owns, when it differs from the
   * oracle name — otherwise null. Resolved through the collection's own
   * `primaryPrinting()`, so the deck row calls a card what the player's copy
   * calls it. Always null on a card they do not own: there is no printing in
   * hand to print a name.
   *
   * Required rather than optional, unlike the fields above: every surface that
   * names a card reads it through `printedNameOf()` / `printedFaceName()`, whose
   * `Pick` includes exactly this field — a literal allowed to omit it would
   * quietly go on naming the card something the player's copy does not say.
   */
  printedName: string | null;
  /**
   * The printing this player's copy is, resolved through the same preference the
   * art follows; null on a card they do not own. It rides along so the decklist
   * export can name the printing it exports without resolving that preference a
   * second time — two resolutions are how the name and the printing come to
   * disagree.
   */
  printedSetCode: string | null;
  printedCollectorNumber: string | null;
  /**
   * The printing is foil: a precon's read-only list says so beside its `SET number`, because a
   * Collector's Edition can be the same printing as its plain edition in foil alone. Absent elsewhere.
   */
  printedFoil?: boolean;
  /**
   * Scryfall's layout word, for the `//` mark (#363). Optional for the same
   * reason the three above are; absent means no mark, which is the right way
   * for this to fail — see `lib/cards/faces.ts`.
   */
  layout?: string | null;
  /**
   * This row is the deck's COMMANDER (or partner), not a `deck_cards` row. Only the Shopping
   * list builds one, through `commanderShoppingRows`, so an unowned or spoken-for commander is
   * billed beside the list it leads (H28). Such a row is never removable and offers no swap
   * tools: a deck cannot cut its commander from a buying list. Absent on every list row.
   */
  commander?: true;
};

/**
 * Which group a type line belongs to. Lives here rather than beside the query
 * that first used it, because the review page's diff rows group by type in a
 * `"use client"` component — and `read.ts` imports `db`, which throws at module
 * init in the browser bundle.
 *
 * Order matters: a card is filed under the first word that matches, so a
 * "Land Creature" is a land. Only the front face counts (the first-named half
 * of a split card): a Sorcery // Land modal DFC is a Sorcery.
 */
export function cardTypeGroup(typeLine: string): CardTypeGroup {
  const t = frontFace(typeLine).toLowerCase();
  if (t.includes("land")) return "Lands";
  if (t.includes("creature")) return "Creatures";
  if (t.includes("planeswalker")) return "Planeswalkers";
  if (t.includes("instant")) return "Instants";
  if (t.includes("sorcery")) return "Sorceries";
  if (t.includes("artifact")) return "Artifacts";
  if (t.includes("enchantment")) return "Enchantments";
  return "Other";
}

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
  coveredCount: number;
  toBuyCount: number;
  total: number;
} {
  const built = cards.reduce((sum, c) => sum + c.quantity, 0);
  const ownedCount = cards.reduce((sum, c) => sum + (c.owned ? c.quantity : 0), 0);
  // COVERED IS NOT OWNED, and both figures exist because the app must be able to
  // say each without implying the other. `ownedCount` answers "how much of this
  // list is in your collection"; `coveredCount` answers "how many slots are
  // filled", which a printed card fills without the collection moving. The
  // status pill reads the second — a deck whose only gaps are proxies IS
  // Complete — while every ownership figure keeps reading the first.
  const coveredCount = cards.reduce(
    (sum, c) => sum + (c.owned || c.proxied ? c.quantity : 0),
    0,
  );
  return {
    built,
    ownedCount,
    coveredCount,
    // What the player would still have to ACQUIRE, which is what this figure has
    // always meant on screen — and a printed card is acquired. `ownedCount` is
    // the ownership figure and stays beside it untouched; the two answer
    // different questions and the deck list uses the same definition as this.
    toBuyCount: built - coveredCount,
    total: built + unresolvedCount,
  };
}

/** The deck view's type groups, in the order it draws them; the export writes its sections in it too. */
export const CARD_TYPE_GROUP_ORDER: CardTypeGroup[] = [
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

// Generic over the row so a caller grouping a richer shape — a draft row
// carrying its direction and quantity move — gets that shape back rather than
// the narrowed card.
/** The order these groups have always had, kept for every caller that takes no
 *  comparator of its own. */
const byName = <T extends Pick<DeckDetailCard, "name">>(a: T, b: T) =>
  a.name.localeCompare(b.name);

/**
 * `compare` is the deck list's chosen order, applied INSIDE each group. Absent,
 * the groups keep the alphabetical order they have always had — which is what
 * every other caller (the review screen, the version diff, the what-changed
 * strip) wants, and why this is an option rather than a parameter.
 */
export function groupByCardType<T extends Pick<DeckDetailCard, "cardTypeGroup" | "name">>(
  cards: T[],
  compare?: (a: T, b: T) => number,
): [CardTypeGroup, T[]][] {
  const map = new Map<CardTypeGroup, T[]>();
  for (const g of CARD_TYPE_GROUP_ORDER) map.set(g, []);
  for (const c of cards) {
    map.get(c.cardTypeGroup)!.push(c);
  }
  const result: [CardTypeGroup, T[]][] = [];
  for (const g of CARD_TYPE_GROUP_ORDER) {
    const group = map.get(g)!;
    if (group.length > 0) {
      result.push([g, group.slice().sort(compare ?? byName)]);
    }
  }
  return result;
}

/** Same `compare` contract as `groupByCardType`. */
export function groupByRole(
  cards: DeckDetailCard[],
  compare?: (a: DeckDetailCard, b: DeckDetailCard) => number,
): [string, DeckDetailCard[]][] {
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
      result.push([ROLE_GROUP_LABELS[r], group.slice().sort(compare ?? byName)]);
    }
  }
  return result;
}
