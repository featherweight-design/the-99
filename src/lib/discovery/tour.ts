import { eq, isNull, sql } from "drizzle-orm";
import { db } from "../../db";
import { userPrefs } from "../../db/schema";
import { firstRunTourEnabled } from "./onboarding-flag";

type Writer = Pick<typeof db, "insert">;

/**
 * Whether Home opens the first-run tour (plan `2026-10-16-discovery-r2-r3.md`, R3·1a): `FIRST_RUN_TOUR_ENABLED` on for
 * the reader, the first-run checklist drawn, and the tour never spent. Ruling 4: a first-run Home only, no back-fill, so
 * an account past first run is never due whatever its stamp says. Pure.
 */
export function tourDue(env: NodeJS.ProcessEnv, firstRun: boolean, seenAt: Date | null): boolean {
  return firstRunTourEnabled(env) && firstRun && seenAt === null;
}

/** When this reader's tour was spent (`user_prefs.tour_seen_at`), or null. No row reads as never. */
export async function readTourSeen(userId: string): Promise<Date | null> {
  const rows = await db
    .select({ seenAt: userPrefs.tourSeenAt })
    .from(userPrefs)
    .where(eq(userPrefs.userId, userId))
    .limit(1);
  return rows[0]?.seenAt ?? null;
}

/**
 * Records the tour as spent. Written ONLY while `tour_seen_at` is null: `user_prefs` carries the `user_data_touch`
 * stamp trigger (0123), which fires on any UPDATE, a no-op one included, so a second spend (the tour taken again)
 * would otherwise retire the reader's cached Home and `/decks` for nothing, and would move the first date. Apart so a
 * test can render its SQL.
 */
export function spendTourWrite(userId: string, q: Writer = db) {
  return q
    .insert(userPrefs)
    .values({ userId, tourSeenAt: sql`now()` })
    .onConflictDoUpdate({
      target: userPrefs.userId,
      set: { tourSeenAt: sql`now()` },
      setWhere: isNull(userPrefs.tourSeenAt),
    });
}

export async function spendTour(userId: string): Promise<void> {
  await spendTourWrite(userId);
}
