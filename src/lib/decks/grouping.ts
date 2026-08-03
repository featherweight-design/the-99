// Pure grouping helpers + card shapes shared by client components.
// Must stay free of db/server imports — client components import these as values.

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
};

/**
 * Basic lands are the only card a Commander deck may run copies of, which makes
 * this the hinge for three separate behaviours: the server increments quantity
 * instead of no-op'ing, the search row stays addable after the first add, and
 * the optimistic reducer merges rather than ignores. Those three were testing
 * the type line independently; one definition keeps them from drifting apart.
 */
export function isBasicLand(typeLine: string): boolean {
  return /\bBasic\b/.test(typeLine);
}

/**
 * The deck's three headline counts, derived from the card list alone.
 *
 * The only definition, because the builder now renders these from an optimistic
 * client-side card list as well as from the server's. Two implementations would
 * let the counter strip and the decklist disagree mid-mutation.
 */
export function deckCounts(cards: DeckDetailCard[]): {
  built: number;
  ownedCount: number;
  toBuyCount: number;
} {
  const built = cards.reduce((sum, c) => sum + c.quantity, 0);
  const ownedCount = cards.reduce((sum, c) => sum + (c.owned ? c.quantity : 0), 0);
  return { built, ownedCount, toBuyCount: built - ownedCount };
}

const CARD_TYPE_GROUP_ORDER: CardTypeGroup[] = [
  "Creatures", "Instants", "Sorceries", "Artifacts", "Enchantments", "Planeswalkers", "Lands", "Other",
];

const ROLE_GROUP_ORDER: Array<"ramp" | "draw" | "removal" | "wipes" | "land" | "other"> = [
  "ramp", "draw", "removal", "wipes", "land", "other",
];

const ROLE_GROUP_LABELS: Record<"ramp" | "draw" | "removal" | "wipes" | "land" | "other", string> = {
  ramp: "Ramp",
  draw: "Draw",
  removal: "Removal",
  wipes: "Wipes",
  land: "Land",
  other: "Other",
};

/**
 * Returns true when a card should render a "+N more" meta row below its primary row.
 * Only basic lands with quantity > 1 qualify.
 */
export function shouldShowMetaRow(card: Pick<DeckDetailCard, "quantity" | "typeLine">): boolean {
  return card.quantity > 1 && isBasicLand(card.typeLine);
}

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
