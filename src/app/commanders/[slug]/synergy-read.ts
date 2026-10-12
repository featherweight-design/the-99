import { and, eq, inArray, max, sql } from "drizzle-orm";
import { db } from "../../../db";
import {
  cards,
  collectionItems,
  commanderPairSupportCards,
  commanderSupportCards,
} from "../../../db/schema";
import { canonicalPair } from "../../../lib/edhrec/pair";
import { cardFacet } from "../../../lib/cards/facet";
import { readCommittedDecks } from "../../../lib/decks/committed";
import {
  excludeCoveredRoleCards,
  orderBySynergy,
  type SynergyCard,
} from "../../../lib/commanders/synergy-cards";

/** The player's collection, summed per card once, as a joinable subquery.
 *
 *  Exported for the SQL test. A hand-rolled stand-in cannot substitute: Drizzle renders a
 *  non-subquery join target as a BIND PARAMETER (`left join $2 on $3 = …`), so the emitted SQL
 *  is not the SQL the app runs and an assertion over it proves nothing about the real query. */
export function buildOwnedTotals(userId: string) {
  return db
    .select({
      oracleId: collectionItems.oracleId,
      qty: sql<number>`sum(${collectionItems.quantity})::int`.as("qty"),
    })
    .from(collectionItems)
    .where(eq(collectionItems.userId, userId))
    .groupBy(collectionItems.oracleId)
    .as("owned_totals");
}

/** The commanders' full EDHREC support list, ranked by synergy, as the panel
 *  draws it. The support rows joined to the catalog for the name and type line, with ownership
 *  read per card from the collection.
 *
 *  ONE query for a single commander; a pair issues the pair select first and the merged-singles
 *  select only if that comes back empty.
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
   * OFF by default: a caller that draws no preview ships about 94 characters a row for nothing (25KB on an average
   * commander, 40KB at the widest). The deck's top-off list and `/commanders/[slug]` pass it ON (the latter since
   * 2026-10-12: every card row has a preview as well as a press, so the synergy rows draw one).
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
  const ownedTotals = buildOwnedTotals(userId);

  // THE PAIR'S OWN LIST, where one is stored. `commander_pair_support_cards` holds what
  // people actually play with the two commanders TOGETHER; the merged-singles query below is
  // an approximation of that — the better of what each wants alone — and the two rank the
  // same card differently often enough to matter.
  //
  // THIS CLOSES THE STORED-ROW HALF OF THE DIVERGENCE, AND NOT THE OTHER HALF. Said plainly
  // because an earlier draft of this comment claimed the whole of it.
  //
  // `suggestions-read` falls back through THREE rungs: the stored pair row, then a DEMAND
  // fetch of the real pair page (`resolvePairEdhrecData`, itself DB-cached), then the merged
  // singles. This reader has two — stored, then merged singles. So for a pair with no stored
  // row the Consider panel still reads the real pair page while this one reads the
  // approximation, and they still disagree.
  //
  // That gap is a FOLLOW-UP rather than a rider here: the demand path returns `EdhrecData`
  // keyed by NAME, so consuming it needs name resolution, a catalog join and an ownership
  // join — a third query path on a hot route, which is its own change with its own walk.
  //
  // CANONICAL ON THE READ, not only the write — the same rule `loadPairRow` records. `decks`
  // stores the pair in a meaningful order, primary commander first, while the table stores it
  // canonically, so passing the caller's order straight through misses every row whose
  // primary carries the larger id, silently and forever.
  const pairRows = commanderOracleIds.length === 2
    ? await pairSupportQuery(commanderOracleIds[0], commanderOracleIds[1], withImages, ownedTotals)
    : null;

  // Length rather than truthiness: an EMPTY pair list is a pair EDHREC has a header for and
  // no cards under, which is not a reason to draw nothing — the merged singles are still the
  // better answer than an empty panel.
  if (pairRows && pairRows.length > 0) return shapeRows(pairRows, userId, coveredOracleIds);

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
      //
      // THE FALLBACK, now that the pair query above exists. The merged-singles figure is an
      // APPROXIMATION of a pair: it says "the better of what each commander wants alone",
      // where the pair table says what people actually play with the two together. This
      // branch runs when no pair row is stored — which is every pair until a widened index
      // run reaches it, and every pair EDHREC has no page for.
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

  return shapeRows(rows, userId, coveredOracleIds);
}

/** The pre-aggregated collection subquery both branches join against. Inferred rather than
 *  spelled out, so it cannot drift from the builder above. */
type OwnedTotals = ReturnType<typeof buildOwnedTotals>;

/** One row as either query returns it. The two differ in WHERE the figures come from and
 *  nowhere else, which is what lets them share the shaping below. */
type SupportRow = {
  oracleId: string;
  name: string;
  typeLine: string;
  manaCost: string | null;
  imageUri: string | null;
  inclusion: number | null;
  synergy: number | null;
  ownedQuantity: number;
};

/**
 * The pair's own support list, as a QUERY rather than an awaited result.
 *
 * Exported and un-awaited so a test can read the emitted SQL. That is not a convenience: the
 * canonical ordering below is otherwise UNOBSERVABLE from a mocked `db`, whose `where` discards
 * its arguments — the first version of this shipped with a test named for the canonical key that
 * passed identically with `canonicalPair` replaced by the raw arguments.
 *
 * CANONICAL ON THE READ, not only the write. `decks` stores the pair in a meaningful order,
 * primary commander first, while the table stores it canonically — so passing the caller's order
 * straight through misses every row whose primary carries the larger id, silently and forever.
 *
 * Returns rows, never null: an EMPTY list is a pair EDHREC has a header for and no cards under,
 * and the caller decides what that means.
 *
 * NO AGGREGATION, unlike the merged-singles query: the pair table already holds one row per card
 * for the two commanders together, so there is nothing to take a `max` over and no `group by` to
 * get wrong.
 */
export function pairSupportQuery(a: string, b: string, withImages: boolean, ownedTotals: OwnedTotals) {
  const pair = canonicalPair(a, b);
  return db
    .select({
      oracleId: commanderPairSupportCards.oracleId,
      name: cards.name,
      typeLine: cards.typeLine,
      manaCost: cards.manaCost,
      imageUri: withImages ? cards.imageUri : sql<string | null>`null`,
      inclusion: commanderPairSupportCards.inclusion,
      synergy: commanderPairSupportCards.synergy,
      ownedQuantity: sql<number>`coalesce(${ownedTotals.qty}, 0)`,
    })
    .from(commanderPairSupportCards)
    .innerJoin(cards, eq(cards.oracleId, commanderPairSupportCards.oracleId))
    .leftJoin(ownedTotals, eq(ownedTotals.oracleId, commanderPairSupportCards.oracleId))
    .where(
      and(
        eq(commanderPairSupportCards.commanderOracleId, pair.commanderOracleId),
        eq(commanderPairSupportCards.partnerOracleId, pair.partnerOracleId),
      ),
    );
}

/** Shared by both branches, so a figure cannot be rounded one way for a pair and another for
 *  a single commander. */
async function shapeRows(
  rows: SupportRow[],
  userId: string,
  coveredOracleIds: string[],
): Promise<SynergyCard[]> {
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
    // `inclusion` is already a percentage on BOTH tables — parse.ts stores EDHREC's own
    // field, or derives one as num_decks / potential_decks * 100. Round only; do not scale.
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
