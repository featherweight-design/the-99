import { sql } from "drizzle-orm";
import { db } from "../../db";
import { userPrefs } from "../../db/schema";
import type { MomentId } from "./registry";

type Writer = Pick<typeof db, "insert">;

/**
 * Records a moment as spent. Append-only, and it writes ONLY when it adds the id: `user_prefs` carries the
 * `user_data_touch` stamp trigger (0123), which fires on any UPDATE, a no-op one included, so a repeat spend would
 * otherwise retire the reader's cached Home and `/decks` for nothing. Apart so a test can render its SQL.
 */
export function spendMomentWrite(userId: string, id: MomentId, q: Writer = db) {
  return q
    .insert(userPrefs)
    .values({ userId, momentsSpent: [id] })
    .onConflictDoUpdate({
      target: userPrefs.userId,
      set: { momentsSpent: sql`array(select distinct unnest(${userPrefs.momentsSpent} || excluded.moments_spent))` },
      setWhere: sql`not (excluded.moments_spent <@ ${userPrefs}.moments_spent)`,
    });
}

export async function spendMoment(userId: string, id: MomentId): Promise<void> {
  await spendMomentWrite(userId, id);
}
