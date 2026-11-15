import { isNull, sql } from "drizzle-orm";
import { db } from "../../db";
import { userPrefs } from "../../db/schema";

type Writer = Pick<typeof db, "insert">;

/**
 * Records that this reader has opened the installed app (install onboarding call 7, Hugh 2026-11-15): the stamp that
 * keeps the header's Install slot away in every browser of the account. Written ONLY while `installed_at` is null:
 * `user_prefs` carries the `user_data_touch` stamp trigger (0123), which fires on any UPDATE, a no-op one included, so
 * every later launch would otherwise retire the reader's cached Home and `/decks` for nothing, and move the first date.
 * Apart so a test can render its SQL.
 */
export function markInstalledWrite(userId: string, q: Writer = db) {
  return q
    .insert(userPrefs)
    .values({ userId, installedAt: sql`now()` })
    .onConflictDoUpdate({
      target: userPrefs.userId,
      set: { installedAt: sql`now()` },
      setWhere: isNull(userPrefs.installedAt),
    });
}

export async function markInstalled(userId: string): Promise<void> {
  await markInstalledWrite(userId);
}
