/**
 * How many copies of a wishlist line's card the collection holds, as the line counts them (wishlist printing, Hugh,
 * 2026-11-22). A line that names a printing is reached only by THAT printing's copies: another printing of the card
 * leaves it on the list. A line with no printing ("any printing") counts every copy of the card, as every line did
 * before the column. Every "is this line collected" test reads this one expression: the sweep (`collected.ts`), the
 * wanted-lines read, a card's want, the want writes and the price-drop writer.
 *
 * A holding names its printing by `scryfall_id` when the export told us, and by (set, collector number) when it did
 * not (the column is null then), so a holding with no id still counts toward the printing it spells.
 *
 * The caller passes the line's three columns as SQL: `sql\`w.user_id\`` in a raw statement, the table's columns in a
 * builder select with a join (a single-table Drizzle select drops the qualification and the subquery would read its
 * own columns).
 */
import { sql, type SQLWrapper } from "drizzle-orm";

/** A column or SQL fragment, or a plain value that is sent as a bound parameter. */
type Ref = SQLWrapper | string | null;

export function heldCopies(userId: Ref, oracleId: Ref, scryfallId: Ref) {
  return sql<number>`(
    select coalesce(sum(ci.quantity), 0)::int from collection_items ci
    where ci.user_id = ${userId} and ci.oracle_id = ${oracleId}
      and (${scryfallId}::uuid is null
        or ci.scryfall_id = ${scryfallId}::uuid
        or (ci.scryfall_id is null and exists (
          select 1 from printings hp
          where hp.scryfall_id = ${scryfallId}::uuid and hp.set_code = ci.set_code and hp.collector_number = ci.collector_number
        )))
  )`;
}
