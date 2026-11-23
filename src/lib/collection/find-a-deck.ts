import { sql, type SQL } from "drizzle-orm";
import { db } from "../../db";
import { userPrefs } from "../../db/schema";

/**
 * The collection's Find a deck call-out and buttons (tool discovery call 1, handoff `Find.dc.html`): what the page
 * needs beyond the list it already ships.
 *
 * - `hasDeck`: the reader has a deck with a commander, the Fits door's own rule (`fitsGate`), so a button never opens a
 *   view with no deck to name.
 * - `closed`: the reader closed the call-out with its ✕; it never draws again.
 * - `illegal`: the reader's cards that are not Commander-legal. The list's cards do not carry legality, and no button
 *   draws on such a card (the door would refuse it), so the page ships this short set instead.
 */
export type FindADeckState = { hasDeck: boolean; closed: boolean; illegal: string[] };

/** The read, apart so a test can render it. One statement, every part scoped to the caller. */
export function findADeckStateQuery(userId: string): SQL {
  // The illegal set is read only for a reader with a deck: with none, no button draws and the join is skipped.
  return sql`
    with d as (
      select exists (select 1 from decks d where d.user_id = ${userId} and d.commander_oracle_id is not null) as has_deck
    )
    select
      d.has_deck,
      exists (select 1 from user_prefs p where p.user_id = ${userId} and p.find_a_deck_closed_at is not null) as closed,
      case when d.has_deck then coalesce(
        (select array_agg(distinct ci.oracle_id::text)
           from collection_items ci join cards c on c.oracle_id = ci.oracle_id
          where ci.user_id = ${userId} and not c.commander_legal),
        '{}'
      ) else '{}' end as illegal
    from d
  `;
}

type Row = { has_deck: boolean; closed: boolean; illegal: string[] | null };

export async function loadFindADeckState(
  userId: string,
  q: { execute: (s: SQL) => Promise<{ rows: unknown[] }> } = db,
): Promise<FindADeckState> {
  const { rows } = await q.execute(findADeckStateQuery(userId));
  const r = rows[0] as Row | undefined;
  return { hasDeck: r?.has_deck === true, closed: r?.closed === true, illegal: r?.illegal ?? [] };
}

/** The ✕: stamps the caller's column once. True when this call wrote it, false on a repeat. */
export async function closeFindADeck(userId: string, now = new Date(), q: Pick<typeof db, "insert"> = db): Promise<boolean> {
  const done = await closeFindADeckQuery(userId, now, q).returning({ userId: userPrefs.userId });
  return done.length > 0;
}

/** The ✕'s upsert, apart so a test can render it: the conflict's update is guarded on the stored row's own column. */
export function closeFindADeckQuery(userId: string, now: Date, q: Pick<typeof db, "insert"> = db) {
  return q
    .insert(userPrefs)
    .values({ userId, findADeckClosedAt: now })
    .onConflictDoUpdate({
      target: userPrefs.userId,
      set: { findADeckClosedAt: now },
      // Qualified by the table: unqualified, the column is ambiguous beside `excluded` in ON CONFLICT.
      setWhere: sql`${userPrefs}.find_a_deck_closed_at is null`,
    });
}
