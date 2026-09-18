import type { CardFacet } from "../cards/facet";
import type { Availability } from "../decks/availability";
import type { PriceFact } from "../decks/price";

/** One row of the commander's synergy ranking, as the panel draws it.
 *
 *  `synergyPts` is EDHREC's fraction already multiplied by 100 and rounded:
 *  the product states synergy in points everywhere (suggestion-tile.tsx's
 *  Evidence line shipped first), so the fraction never reaches the client and
 *  no component formats one twice.
 *
 *  The two figures are independently nullable. A card EDHREC ranks but reports
 *  no inclusion for is a real row with one em dash in it — a null synergy must
 *  never suppress a real inclusion, or the panel invents an outage per row. */
export type SynergyCard = {
  oracleId: string;
  name: string;
  typeLine: string;
  facet: CardFacet;
  inclusionPct: number | null;
  synergyPts: number | null;
  /** The card's own picture, for the top-off list's hover preview. Nullable in
   *  the catalog; the preview treats null as "no preview" rather than drawing an
   *  empty frame. */
  imageUri: string | null;
  owned: boolean;
  /**
   * The deck this card already sits in, or null.
   *
   * NOTHING ON THIS SURFACE DRAWS IT any more — the dot is ownership and the
   * marker carries the claim, both read from `availability` below. It is kept
   * because the read that fills it is `cache()`d and already made for
   * `committedSupport`, so it costs no query, and because removing it is a sweep
   * across both card types rather than a line. Do not add a reader: a card can
   * sit in a deck and still have a spare copy, which is the false certainty this
   * round was filed about.
   */
  committedTo: string | null;
  /**
   * This card's claim picture, or null.
   *
   * **Null means NO ROW, never "unowned."** `loadAvailability` is driven by its
   * `owned` CTE and excludes basics model-wide, so an unowned card, a basic and
   * an unreachable read all arrive the same way. The buy branch reads `owned`
   * above — never this being null — or a basic land renders as a purchase.
   */
  availability: Availability | null;
  /**
   * What one copy costs, or null. Joined by whichever surface draws the card.
   *
   * `newestAsOf` is deliberately NOT here: liveness is a property of the price
   * table, not of a card, so it rides one prop per list — the shape
   * `top-off-list.tsx` already uses. `BuyTag` owns every reading of the pair,
   * so nothing here decides what a missing figure means.
   */
  price: PriceFact | null;
  /** Scryfall's cost string ("{2}{U}"), carried whole rather than as a mana
   *  value: `CostPips` draws hybrid and Phyrexian symbols from their halves,
   *  and an integer cannot be taken back apart into them. */
  manaCost: string | null;
};

/** Synergy descending, absent last, then inclusion descending, then name.
 *
 *  Name rather than insertion order as the final tiebreak: the read's row order
 *  is Postgres's, which is not stable across plans, and an unstable ranking
 *  re-orders under the player's cursor between one visit and the next.
 *
 *  A negative figure sorts on its value and lands above the nulls. "Runs it
 *  less often than average" is information; "we have no figure" is not.
 *
 *  The inclusion step is state 11, the degraded-EDHREC case: when synergy came
 *  back null for every row there is nothing to rank on, and the states doc
 *  requires the panel fall back to inclusion rather than to the alphabet. It is
 *  written as a tiebreak between two nulls rather than as a separate degraded
 *  branch, because that is the same thing — on a degraded commander every pair
 *  is a null pair — and it needs no flag threaded in from the read. */
export function orderBySynergy(cards: SynergyCard[]): SynergyCard[] {
  return [...cards].sort((a, b) => {
    if (a.synergyPts == null && b.synergyPts == null) {
      if (a.inclusionPct == null && b.inclusionPct == null) return a.name.localeCompare(b.name);
      if (a.inclusionPct == null) return 1;
      if (b.inclusionPct == null) return -1;
      if (a.inclusionPct !== b.inclusionPct) return b.inclusionPct - a.inclusionPct;
      return a.name.localeCompare(b.name);
    }
    if (a.synergyPts == null) return 1;
    if (b.synergyPts == null) return -1;
    if (a.synergyPts !== b.synergyPts) return b.synergyPts - a.synergyPts;
    return a.name.localeCompare(b.name);
  });
}

/** Ruling 3's exclusion: an owned card Role Coverage already draws for ramp,
 *  draw, removal or wipes does not appear here a second time.
 *
 *  Ownership is the whole condition. Role Coverage draws the player's own
 *  cards, so an unowned role staple — Mana Crypt is ramp, and unowned — is
 *  drawn nowhere else and stays. Silent by design: a "12 hidden" note invites
 *  a control to reveal them, which is the ownership audit returning by the
 *  side door. */
export function excludeCoveredRoleCards(
  cards: SynergyCard[],
  coveredOracleIds: Set<string>,
): SynergyCard[] {
  return cards.filter((c) => !(c.owned && coveredOracleIds.has(c.oracleId)));
}

/** Facet counts are post-exclusion, so a pill states the number of rows that
 *  exist behind it. The headline's `of top {n}` is a different number on
 *  purpose — it is what EDHREC associates, which ruling 1 locked. */
export function facetCounts(cards: SynergyCard[]): Record<CardFacet | "all", number> {
  const counts: Record<CardFacet | "all", number> = {
    creature: 0,
    spell: 0,
    artifact: 0,
    enchantment: 0,
    land: 0,
    other: 0,
    all: cards.length,
  };
  for (const c of cards) counts[c.facet]++;
  return counts;
}
