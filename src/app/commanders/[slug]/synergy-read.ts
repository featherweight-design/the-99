import { eq, inArray, max, sql } from "drizzle-orm";
import { db } from "../../../db";
import { cards, collectionItems, commanderSupportCards } from "../../../db/schema";
import { cardFacet } from "../../../lib/cards/facet";
import { readCommittedDecks } from "../../../lib/decks/committed";
import {
  excludeCoveredRoleCards,
  orderBySynergy,
  type SynergyCard,
} from "../../../lib/commanders/synergy-cards";

/** The commanders' full EDHREC support list, ranked by synergy, as the panel
 *  draws it. One query: the support rows joined to the catalog for the name and
 *  type line, with ownership read per card from the collection.
 *
 *  Takes a list of commanders, one for most decks and two for a Partner pair.
 *  A card both commanders support is drawn once, carrying the better of their
 *  two figures.
 *
 *  Inner join to `cards` on purpose. A support row whose oracle id is not in
 *  the catalog has no name and no type line, so there is no row to draw — the
 *  same silent drop `commander_support.edhrec_total` documents, where the
 *  stored total counts names before unresolvable ones are dropped.
 *
 *  The exclusion is applied here rather than in the client because the facet
 *  counts are computed from this list: excluding on the client would count one
 *  list and render another. */
export async function readSynergyCards(
  userId: string,
  commanderOracleIds: string[],
  coveredOracleIds: string[],
  /**
   * Whether to carry each card's picture.
   *
   * OFF by default, because this reader serves two routes and only one of them
   * draws a preview. `/commanders/[slug]` passes the whole array across the RSC
   * boundary to its synergy panel, which calls no `usePreviewRow` — so at about
   * 94 characters a row it would ship 25KB on an average commander and 40KB at
   * the widest to draw nothing with.
   *
   * A row read WITHOUT images carries `imageUri: null`, which the preview reads
   * as "no preview" — the same answer it gives for a card the catalog has no
   * picture for, and the correct one either way: there is nothing to show.
   */
  withImages = false,
): Promise<SynergyCard[]> {
  // The player's collection, summed per card once and joined in — rather than a
  // correlated subselect, which the select list would evaluate per support row.
  // Pre-aggregating is also what keeps a pair honest: joining the raw items
  // against two support rows for the same card would fan out and count the
  // copies owned twice. One row per card cannot. `::int` because the driver
  // hands back `sum()` as a string.
  const ownedTotals = db
    .select({
      oracleId: collectionItems.oracleId,
      qty: sql<number>`sum(${collectionItems.quantity})::int`.as("qty"),
    })
    .from(collectionItems)
    .where(eq(collectionItems.userId, userId))
    .groupBy(collectionItems.oracleId)
    .as("owned_totals");

  const rows = await db
    .select({
      oracleId: commanderSupportCards.oracleId,
      name: cards.name,
      typeLine: cards.typeLine,
      manaCost: cards.manaCost,
      // For the hover preview on the deck's top-off list. One more column on a
      // join that is already here — no second query, no second join — and asked
      // for only by the route that draws it: see `withImages`.
      imageUri: withImages ? cards.imageUri : sql<string | null>`null`,
      // A card both commanders of a pair support has one support row each, so
      // the figures are aggregated rather than grouped by: a pair's advice is
      // the better of the two, exactly as `mergeEdhrecData` merges the live
      // lists. Over one id the grouped max is the row itself.
      inclusion: max(commanderSupportCards.inclusion),
      synergy: max(commanderSupportCards.synergy),
      ownedQuantity: sql<number>`coalesce(${ownedTotals.qty}, 0)`,
    })
    .from(commanderSupportCards)
    .innerJoin(cards, eq(cards.oracleId, commanderSupportCards.oracleId))
    .leftJoin(ownedTotals, eq(ownedTotals.oracleId, commanderSupportCards.oracleId))
    .where(inArray(commanderSupportCards.commanderOracleId, commanderOracleIds))
    // `owned_totals.qty` holds one value per card, so grouping by it splits
    // nothing — it is here because Postgres requires every ungrouped select
    // column to be aggregated, not because the figure varies within a group.
    // The image column is grouped ONLY when it is selected, and the two have to
    // move together. Postgres requires an ungrouped selected column to be
    // aggregated, so the group-by is mandatory when the column is real — and
    // when it is the literal `null` above, naming it here makes the database
    // read, hash and sort a column nothing asked for, which is most of the work
    // the opt-in exists to avoid.
    .groupBy(
      commanderSupportCards.oracleId,
      cards.name,
      cards.typeLine,
      cards.manaCost,
      ...(withImages ? [cards.imageUri] : []),
      ownedTotals.qty,
    );

  const committed = await readCommittedDecks(userId);

  const shaped: SynergyCard[] = rows.map((r) => ({
    oracleId: r.oracleId,
    name: r.name,
    // `cards.typeLine` is `.notNull()` (schema.ts:31) and the join is an inner
    // join, so there is no null to defend against here.
    typeLine: r.typeLine,
    // Nullable in the catalog — a land has no cost — and drawn only by the
    // top-off list, which renders an empty track rather than a placeholder.
    manaCost: r.manaCost,
    // Nullable in the catalog, and the hover preview treats null as "no
    // preview" rather than drawing an empty frame — `usePreviewRow` no-ops on it.
    imageUri: r.imageUri,
    facet: cardFacet(r.typeLine),
    // `commander_support_cards.inclusion` is already a percentage — parse.ts
    // stores EDHREC's own `inclusion` field, or derives one as
    // num_decks / potential_decks * 100. Round only; do not scale.
    inclusionPct: r.inclusion == null ? null : Math.round(r.inclusion),
    // Points, not the fraction. The product has stated synergy in points since
    // suggestion-tile.tsx's Evidence line, and formatting it once here means no
    // component multiplies by 100 a second time.
    synergyPts: r.synergy == null ? null : Math.round(r.synergy * 100),
    owned: r.ownedQuantity > 0,
    committedTo: committed.get(r.oracleId)?.name ?? null,
    // Stamped by the page, which owns the one claim read and the one price read
    // for the whole surface. Null here is "not yet joined", and the page's join
    // is what makes it mean anything.
    availability: null,
    price: null,
  }));

  return orderBySynergy(excludeCoveredRoleCards(shaped, new Set(coveredOracleIds)));
}
