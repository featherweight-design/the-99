/**
 * The wishlist as one set of lines (cart on your wishlist, G1): the lines the player added by hand (`wishlist_items`)
 * and the lines their decks put there (`wishlist_synced`), one row per card. Readers of wanted lines move onto this
 * union instead of `wishlist_items` alone (card search, spares, spare offers, trade match and card details follow in
 * later PRs, before anything writes a synced line); the owner through `ownerLinesQuery` here, a friend through
 * `src/lib/social/wishlist.ts`, which supplies its own synced side (only the decks that friend can see, H1) and the
 * friendship grant.
 *
 * Held is tested per side, never across: a hand line by its printing (`heldCopies` with its `scryfall_id`, as before),
 * a synced line by any printing. A card stands when either side is still wanted. Its want is the larger of the
 * still-wanted sides, and `owned` is that same side's count, so a hand line pinned to one printing never takes the
 * synced side's any-printing count or the reverse. `source` is `hand` whenever the hand line stands (call 4: the card
 * is drawn in Added by you), else `deck`; the printing comes only from a standing hand line.
 *
 * Every fragment is aliased and qualified (code rules: Drizzle drops qualification in a single-table select).
 */
import { sql, type SQL } from "drizzle-orm";
import { wishlistItems, wishlistSynced, wishlistSyncedDecks } from "../../db/schema";
import { heldCopies } from "./held";

/**
 * One side of the union, as SQL selecting exactly: `user_id`, `oracle_id`, `scryfall_id` (uuid or null), `quantity`,
 * `owned` (held as this side counts it), `created_at`, `deck_ids` (text[] or null).
 */
export type LineSide = SQL;

/** Narrows a side to the cards `oracleIds` names, inside the side so the planner never builds the whole union. */
export function oracleFilter(column: SQL, oracleIds?: readonly string[]): SQL {
  if (!oracleIds) return sql``;
  // An empty list matches nothing (`in ()` is not valid SQL).
  if (oracleIds.length === 0) return sql` and false`;
  return sql` and ${column} in (${sql.join(oracleIds.map((id) => sql`${id}::uuid`), sql`, `)})`;
}

/**
 * The hand-added lines of the owners `owners` selects (a subquery yielding user ids), optionally only `oracleIds`.
 * `wishlist_items.created_at` is a naive UTC timestamp; it is read as UTC so it orders with the synced side's timestamptz.
 */
export function handSide(owners: SQL, oracleIds?: readonly string[]): LineSide {
  return sql`select hw.user_id, hw.oracle_id, hw.scryfall_id, hw.quantity, hw.created_at at time zone 'UTC' as created_at,
      ${heldCopies(sql`hw.user_id`, sql`hw.oracle_id`, sql`hw.scryfall_id`)} as owned, null::text[] as deck_ids
    from ${wishlistItems} hw where hw.user_id in (${owners})${oracleFilter(sql`hw.oracle_id`, oracleIds)}`;
}

/** The owner's own synced lines: every deck that put the line there, whoever could see it. */
export function ownerSyncedSide(owners: SQL): LineSide {
  return sql`select sw.user_id, sw.oracle_id, null::uuid as scryfall_id, sw.quantity, sw.created_at,
      ${heldCopies(sql`sw.user_id`, sql`sw.oracle_id`, sql`null`)} as owned,
      (select array_agg(sd.deck_id::text order by sd.deck_id) from ${wishlistSyncedDecks} sd
        where sd.user_id = sw.user_id and sd.oracle_id = sw.oracle_id) as deck_ids
    from ${wishlistSynced} sw where sw.user_id in (${owners})`;
}

/**
 * The two sides joined into one row per (owner, card), still-wanted only. Columns: `user_id`, `oracle_id`,
 * `scryfall_id`, `quantity`, `owned`, `gap` (the larger copies-short of the still-wanted sides, each by its own held
 * test), `added_at`, `source` ('hand' | 'deck'), `deck_ids` (text[], empty for a hand-only line). A read never deletes: a line the collection already reaches is left out here and swept at the collection
 * write (`collected.ts`).
 */
export function unionLines(hand: LineSide, synced: LineSide): SQL {
  // The synced side decides the want when only it stands, or when both stand and it wants more.
  const syncedLeads = sql`(us.wanted and (uh.wanted is not true or us.quantity > uh.quantity))`;
  return sql`select coalesce(uh.user_id, us.user_id) as user_id, coalesce(uh.oracle_id, us.oracle_id) as oracle_id,
      case when uh.wanted then uh.scryfall_id end as scryfall_id,
      case when ${syncedLeads} then us.quantity else uh.quantity end as quantity,
      case when ${syncedLeads} then us.owned else uh.owned end as owned,
      greatest(case when uh.wanted then uh.quantity - uh.owned end, case when us.wanted then us.quantity - us.owned end) as gap,
      case when uh.wanted then uh.created_at else us.created_at end as added_at,
      case when uh.wanted then 'hand' else 'deck' end as source,
      case when us.wanted then coalesce(us.deck_ids, '{}'::text[]) else '{}'::text[] end as deck_ids
    from (select hs.*, hs.owned < hs.quantity as wanted from (${hand}) hs) uh
    full join (select ss.*, ss.owned < ss.quantity as wanted from (${synced}) ss) us
      on us.user_id = uh.user_id and us.oracle_id = uh.oracle_id
    where uh.wanted or us.wanted`;
}

/** Where a line came from: added by hand (or converted from a deck line), or put there by the player's decks. */
export type LineSource = "hand" | "deck";

export type UnionRow = {
  oracle_id: string; scryfall_id: string | null; quantity: number; owned: number; added_at: Date | string;
  source: LineSource; deck_ids: string[];
};

/** One owner's still-wanted lines, newest first. Apart so a test can render it. */
export function ownerLinesQuery(ownerId: string): SQL {
  const owners = sql`select ${ownerId}::text`;
  return sql`select ul.oracle_id, ul.scryfall_id, ul.quantity, ul.owned, ul.added_at, ul.source, ul.deck_ids
    from (${unionLines(handSide(owners), ownerSyncedSide(owners))}) ul
    order by ul.added_at desc, ul.oracle_id`;
}
