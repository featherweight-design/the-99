/**
 * The reader's data stamp: a counter the DATABASE moves at commit whenever a table Home or
 * `/decks` reads changes for them (the `user_data_touch` trigger on `user_data_stamps`).
 *
 * Read fresh on every request, never cached: it is the thing that says whether a cached page
 * is still true, and a reader's own write has to show on the very next load.
 *
 * `null` when it cannot be read — a database the migration has not reached (a preview deploy
 * runs none), or an error. The caller then renders uncached, which is slower and never wrong.
 */
import { eq } from "drizzle-orm";

import { db } from "../../db";
import { userDataStamps } from "../../db/schema";

export async function userDataStamp(userId: string): Promise<number | null> {
  try {
    const [row] = await db
      .select({ stamp: userDataStamps.stamp })
      .from(userDataStamps)
      .where(eq(userDataStamps.userId, userId));
    // No row means no write since the trigger shipped.
    return row?.stamp ?? 0;
  } catch {
    // not a fallback: an unreadable stamp makes the caller render uncached.
    return null;
  }
}
