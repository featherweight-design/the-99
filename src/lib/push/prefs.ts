/**
 * Which news kinds a reader has PUSH on (`user_prefs.push_kinds` and `push_kinds_declined`): the feed's own choice rule
 * over the same closed set, so `nextFeedPrefs`, `isKindOn` and `effectiveKinds` (`lib/feed/prefs.ts`) decide it and this
 * file only owns the two columns. Turning a kind on stamps it now (a push kind sends only what arrives after its stamp);
 * `spare-request` is on until declined. Written only when the choice changes (the `user_prefs` stamp trigger moves on any
 * UPDATE), and only while the row still holds both columns as read.
 */
import { and, eq, sql } from "drizzle-orm";

import { db } from "../../db";
import { userPrefs } from "../../db/schema";
import { nextFeedPrefs, parseDeclined, parseFeedKinds, type FeedPrefs } from "../feed/prefs";
import { FEED_KINDS, type FeedKind } from "../feed/kinds";

type Q = Pick<typeof db, "select" | "insert" | "update">;

const ATTEMPTS = 3;
const columns = { pushKinds: userPrefs.pushKinds, declined: userPrefs.pushKindsDeclined };

export async function readPushPrefs(userId: string, q: Pick<typeof db, "select"> = db): Promise<FeedPrefs> {
  const [row] = await q.select(columns).from(userPrefs).where(eq(userPrefs.userId, userId));
  return { map: parseFeedKinds(row?.pushKinds), declined: parseDeclined(row?.declined) };
}

/** The guarded write, apart so a test can render it: only while the row still holds both columns as `seen`. */
export function pushKindsUpdate(
  userId: string, seen: { pushKinds: unknown; declined: readonly string[] | null | undefined }, next: FeedPrefs,
  q: Pick<typeof db, "update"> = db,
) {
  return q
    .update(userPrefs)
    .set({ pushKinds: next.map, pushKindsDeclined: [...next.declined] })
    .where(and(
      eq(userPrefs.userId, userId),
      sql`${userPrefs.pushKinds} = ${JSON.stringify(seen.pushKinds ?? {})}::jsonb`,
      sql`${userPrefs.pushKindsDeclined} = ${sql.param([...(seen.declined ?? [])])}::text[]`,
    ));
}

/** Saves the reader's push choice among `scope`. Returns whether it wrote. Re-reads and decides again if a racing save got there first. */
export async function setPushKinds(userId: string, on: readonly FeedKind[], now = new Date(), scope: readonly FeedKind[] = FEED_KINDS, q: Q = db): Promise<boolean> {
  for (let i = 0; i < ATTEMPTS; i++) {
    const [row] = await q.select(columns).from(userPrefs).where(eq(userPrefs.userId, userId));
    const next = nextFeedPrefs({ map: parseFeedKinds(row?.pushKinds), declined: parseDeclined(row?.declined) }, on, now, scope);
    if (!next) return false;
    const done = row
      ? await pushKindsUpdate(userId, row, next, q).returning({ userId: userPrefs.userId })
      : await q.insert(userPrefs).values({ userId, pushKinds: next.map, pushKindsDeclined: [...next.declined] }).onConflictDoNothing().returning({ userId: userPrefs.userId });
    if (done.length > 0) return true;
  }
  throw new Error("setPushKinds: the reader's push choices kept changing under the save");
}
