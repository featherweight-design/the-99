// The acknowledged-version read and write. One primary-key lookup either side.

import { eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { userPrefs } from "../../db/schema";
import { NEVER_SEEN, type SeenState } from "./visible";

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
 * Everything this account has seen: the version floor and the switched entries it has met
 * by id. One primary-key lookup, the same as `aboutVersionSeen`. No row is a brand-new
 * account.
 */
export async function aboutSeen(userId: string): Promise<SeenState> {
  const [row] = await db
    .select({ version: userPrefs.aboutVersionSeen, ids: userPrefs.aboutSeenIds })
    .from(userPrefs)
    .where(eq(userPrefs.userId, userId))
    .limit(1);
  return row ? { version: row.version, ids: row.ids } : NEVER_SEEN;
}

/**
 * Record a visit to the page: the version floor, as the dismiss does, and every switched
 * entry the page drew. The ids are a UNION with what is stored, never a replacement, so a
 * visit made while a switch is off cannot forget an entry the reader met while it was on.
 */
export function markAboutVisitedQuery(userId: string, version: number, ids: readonly string[]) {
  // Built element by element: a JS array interpolated into `sql` expands to a bare
  // comma list, not an array. `array[]::text[]` is valid for none.
  const incoming = sql`array[${sql.join(ids.map((id) => sql`${id}`), sql`, `)}]::text[]`;
  return db
    .insert(userPrefs)
    .values({ userId, aboutVersionSeen: version, aboutSeenIds: [...ids] })
    .onConflictDoUpdate({
      target: userPrefs.userId,
      set: {
        aboutVersionSeen: sql`greatest(${userPrefs.aboutVersionSeen}, ${version})`,
        aboutSeenIds: sql`array(select distinct unnest(${userPrefs.aboutSeenIds} || ${incoming}) order by 1)`,
      },
      // Only when the visit moves something: `user_prefs` carries the stamp trigger (0123), which fires on any
      // UPDATE, so a repeat visit would otherwise retire the reader's cached Home and /decks for nothing.
      setWhere: sql`${userPrefs.aboutVersionSeen} < ${version} or not (${incoming} <@ ${userPrefs.aboutSeenIds})`,
    });
}

export async function markAboutVisited(userId: string, version: number, ids: readonly string[]): Promise<void> {
  await markAboutVisitedQuery(userId, version, ids);
}

/**
 * Record the acknowledgement. `greatest` rather than a plain assignment so a
 * stale tab pressing an older page's dismiss cannot walk the marker backwards
 * and re-show a version the reader has already acknowledged elsewhere.
 */
export function markAboutSeenQuery(userId: string, version: number) {
  return db
    .insert(userPrefs)
    .values({ userId, aboutVersionSeen: version })
    .onConflictDoUpdate({
      target: userPrefs.userId,
      set: {
        aboutVersionSeen: sql`greatest(${userPrefs.aboutVersionSeen}, ${version})`,
      },
      // Only when it raises the floor: a no-op UPDATE would still move the reader's stamp (0123).
      setWhere: sql`${userPrefs.aboutVersionSeen} < ${version}`,
    });
}

export async function markAboutSeen(userId: string, version: number): Promise<void> {
  await markAboutSeenQuery(userId, version);
}
