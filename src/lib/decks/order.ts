import { sql } from "drizzle-orm";
import { db } from "../../db";
import { planReorder, type OrderRow } from "./order-plan";

/**
 * One transaction, scoped to the caller. Every one of the caller's deck rows is locked in id
 * order first (`for update`): two concurrent reorders take the same rows in the same order and
 * cannot deadlock, and the plan reads the rows it is about to write. `moveDeck` takes a folder
 * row and then a deck; this takes decks only, so the two cannot form a cycle.
 *
 * The write is to `decks`, so the `user_data_touch` trigger retires the /decks and Home cache.
 */
export async function reorderDecksFor(userId: string, ids: readonly string[]): Promise<boolean> {
  return db.transaction(async (tx) => {
    const locked = await tx.execute<{
      id: string;
      folder_id: string | null;
      created_at: Date | string;
      sort_position: number | null;
    }>(sql`
      select id, folder_id, created_at, sort_position from decks
      where user_id = ${userId}
      order by id
      for update
    `);
    const rows: OrderRow[] = locked.rows.map((r) => ({
      id: r.id,
      folderId: r.folder_id,
      createdAt: new Date(r.created_at),
      sortPosition: r.sort_position,
    }));
    const plan = planReorder(rows, ids);
    if (!plan) return false;

    const idList = sql.join(plan.map((p) => sql`${p.id}::uuid`), sql`, `);
    const posList = sql.join(plan.map((p) => sql`${p.position}::int`), sql`, `);
    await tx.execute(sql`
      update decks set sort_position = v.pos
      from unnest(array[${idList}], array[${posList}]) as v(id, pos)
      where decks.id = v.id and decks.user_id = ${userId}
    `);
    return true;
  });
}
