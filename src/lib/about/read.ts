// The acknowledged-version read and write. One primary-key lookup either side.

import { eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { userPrefs } from "../../db/schema";

/**
 * The highest ABOUT_VERSION this account has acknowledged. No row means 0 —
 * never seen — which is every account at launch, and is not an error state.
 */
export async function aboutVersionSeen(userId: string): Promise<number> {
  const [row] = await db
    .select({ seen: userPrefs.aboutVersionSeen })
    .from(userPrefs)
    .where(eq(userPrefs.userId, userId))
    .limit(1);
  return row?.seen ?? 0;
}

/**
 * Record the acknowledgement. `greatest` rather than a plain assignment so a
 * stale tab pressing an older page's dismiss cannot walk the marker backwards
 * and re-show a version the reader has already acknowledged elsewhere.
 */
export async function markAboutSeen(userId: string, version: number): Promise<void> {
  await db
    .insert(userPrefs)
    .values({ userId, aboutVersionSeen: version })
    .onConflictDoUpdate({
      target: userPrefs.userId,
      set: {
        aboutVersionSeen: sql`greatest(${userPrefs.aboutVersionSeen}, ${version})`,
      },
    });
}
