import { eq, and, sql } from "drizzle-orm";
import { db } from "../../../db";
import { cards, collectionItems, commanderSupportCards } from "../../../db/schema";
import { cardFacet } from "../../../lib/cards/facet";
import { readCommittedDecks } from "../../../lib/decks/committed";
import {
  excludeCoveredRoleCards,
  orderBySynergy,
  type SynergyCard,
} from "../../../lib/commanders/synergy-cards";

/** The commander's full EDHREC support list, ranked by synergy, as the panel
 *  draws it. One query: the support rows joined to the catalog for the name and
 *  type line, and left-joined to the collection for ownership.
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
  commanderOracleId: string,
  coveredOracleIds: string[],
): Promise<SynergyCard[]> {
  const rows = await db
    .select({
      oracleId: commanderSupportCards.oracleId,
      name: cards.name,
      typeLine: cards.typeLine,
      inclusion: commanderSupportCards.inclusion,
      synergy: commanderSupportCards.synergy,
      ownedQuantity: sql<number>`coalesce(sum(${collectionItems.quantity}), 0)::int`,
    })
    .from(commanderSupportCards)
    .innerJoin(cards, eq(cards.oracleId, commanderSupportCards.oracleId))
    .leftJoin(
      collectionItems,
      and(
        eq(collectionItems.oracleId, commanderSupportCards.oracleId),
        eq(collectionItems.userId, userId),
      ),
    )
    .where(eq(commanderSupportCards.commanderOracleId, commanderOracleId))
    .groupBy(
      commanderSupportCards.oracleId,
      cards.name,
      cards.typeLine,
      commanderSupportCards.inclusion,
      commanderSupportCards.synergy,
    );

  const committed = await readCommittedDecks(userId);

  const shaped: SynergyCard[] = rows.map((r) => ({
    oracleId: r.oracleId,
    name: r.name,
    // `cards.typeLine` is `.notNull()` (schema.ts:31) and the join is an inner
    // join, so there is no null to defend against here.
    typeLine: r.typeLine,
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
    committedTo: committed.get(r.oracleId) ?? null,
  }));

  return orderBySynergy(excludeCoveredRoleCards(shaped, new Set(coveredOracleIds)));
}
