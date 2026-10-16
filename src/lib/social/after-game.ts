import { sql } from "drizzle-orm";
import { db } from "../../db";
import { deckGames, friendLinks } from "../../db/schema";

/**
 * M11's condition (discovery R1, "Friends after a game"): the reader has logged a game, on any deck, and has no friend
 * yet. One statement over the reader's own rows: `friend_links` is read by the viewer's own id, so it says nothing
 * about anyone else. Apart so a test can render its SQL.
 */
export function friendsAfterGameSql(viewerId: string) {
  return sql`
    select exists (select 1 from ${deckGames} g where g.user_id = ${viewerId})
       and not exists (select 1 from ${friendLinks} f where f.user_id = ${viewerId}) as due
  `;
}

export async function friendsAfterGameDue(viewerId: string): Promise<boolean> {
  const result = await db.execute<{ due: boolean }>(friendsAfterGameSql(viewerId));
  return result.rows[0]?.due === true;
}
