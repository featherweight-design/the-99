/**
 * COLLECTED leaves the wishlist (Social R2 G5, Hugh, 2026-10-15, reversing Q9's "stays until cleared"). A line
 * whose card the collection holds as many copies of as the player wants, deck copies included, is deleted by the
 * write that got it there, in that write's own transaction, and recorded in `wishlist_collected` for the tab's
 * one-time strip. A read never deletes: it filters such a line out (`wishlist.ts`), so a line a path outside the
 * chokepoints left behind is hidden until the next collection write sweeps it.
 *
 * The chokepoints: `applyCollectionChange` (every ledger write: an upload's Add and Sync, Add cards, an edited
 * count, a precon add, a deck imported as owned, a Revert) and `replaceCollection` (an upload's Replace). A want SET
 * at or below what is held (`setWishlistQuantity`) leaves no line either, but is not recorded here: the player made
 * that change themselves, and the strip names what was collected since they last looked.
 */
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, wishlistCollected } from "../../db/schema";

type Executor = Pick<typeof db, "execute">;

/**
 * Deletes every line of the player's wishlist the collection now reaches, and records each in
 * `wishlist_collected` (a card collected again re-dates its row). Run INSIDE the collection write's transaction,
 * after its rows are written, so the line leaves exactly when the copies arrive and a rolled-back write takes the
 * delete back with it. Answers the cards that left.
 */
export async function sweepCollectedIn(tx: Executor, userId: string): Promise<string[]> {
  const { rows } = await tx.execute<{ oracle_id: string }>(sql`
    with gone as (
      delete from wishlist_items w
      where w.user_id = ${userId}
        and w.quantity <= (
          select coalesce(sum(ci.quantity), 0) from collection_items ci
          where ci.user_id = ${userId} and ci.oracle_id = w.oracle_id
        )
      returning w.oracle_id, w.quantity
    )
    insert into wishlist_collected (user_id, oracle_id, quantity)
    select ${userId}, g.oracle_id, g.quantity from gone g
    on conflict (user_id, oracle_id) do update set quantity = excluded.quantity, collected_at = now()
    returning oracle_id
  `);
  return rows.map((r) => r.oracle_id);
}

export type CollectedNotice = { oracleId: string; name: string; quantity: number; collectedAt: Date };

/** What has left the viewer's wishlist as collected since the strip was last dismissed, newest first. */
export async function loadCollectedNotices(viewerId: string): Promise<CollectedNotice[]> {
  return db
    .select({
      oracleId: wishlistCollected.oracleId,
      name: cards.name,
      quantity: wishlistCollected.quantity,
      collectedAt: wishlistCollected.collectedAt,
    })
    .from(wishlistCollected)
    .innerJoin(cards, eq(cards.oracleId, wishlistCollected.oracleId))
    .where(eq(wishlistCollected.userId, viewerId))
    .orderBy(desc(wishlistCollected.collectedAt), wishlistCollected.oracleId);
}

/**
 * The strip's ✕: forgets what the viewer was shown. `through` is the newest `collectedAt` the strip drew, so a
 * card collected after the read (in another tab, or by an upload still landing) stays for the next strip.
 */
export async function dismissCollected(viewerId: string, through: Date): Promise<number> {
  const gone = await db
    .delete(wishlistCollected)
    // To the millisecond, in UTC. The column holds microseconds and a Date carries milliseconds, so the row the strip
    // read as `through` would otherwise compare as later than itself and stay. And the column is a UTC wall clock with
    // no zone, while a raw Date parameter reaches Postgres in the server process's LOCAL time: sent as an ISO
    // instant and turned back into a UTC wall clock, the two compare like for like.
    .where(and(
      eq(wishlistCollected.userId, viewerId),
      sql`date_trunc('milliseconds', ${wishlistCollected.collectedAt}) <= (${through.toISOString()}::timestamptz at time zone 'UTC')`,
    ))
    .returning({ oracleId: wishlistCollected.oracleId });
  return gone.length;
}
