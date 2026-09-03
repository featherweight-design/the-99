import type { CardFacet } from "../cards/facet";

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
  owned: boolean;
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
