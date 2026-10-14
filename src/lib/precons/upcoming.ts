/**
 * Upcoming Commander sets: the engineering half of "what precons are coming" (no caller yet but its
 * tests and `pnpm probe:upcoming-precons`; the screen that reads it is Design's to draw).
 *
 * An upcoming precon is not a `precons` row: MTGJSON lists a deck at release, and Scryfall lists its set
 * weeks earlier (Star Trek Commander, 2026-11-13, was in `sets` with 41 cards a month before). So the
 * answer comes from `sets`, by type `commander` and a release date after today, with the set it belongs
 * to (`parent_set_code`) named beside it.
 *
 * Whether a set is NEW to a reader is two facts kept apart: when the catalog first showed it
 * (`catalog_first_seen`, null when it was already there before stamping began) and whether this reader
 * has been shown it (`user_prefs.upcoming_seen_codes`).
 */
import { and, eq, gt, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "../../db";
import { catalogFirstSeen, sets, userPrefs } from "../../db/schema";

export type UpcomingSet = {
  code: string;
  name: string;
  /** `YYYY-MM-DD`. */
  releasesOn: string;
  cardCount: number;
  /** The expansion this deck set comes with, when Scryfall names one and the catalog holds it. */
  parentName: string | null;
  /** When the catalog first showed this set; null when it was there before stamping began. */
  arrivedAt: Date | null;
  /** The reader has been shown this set (`markUpcomingSeen`). */
  seen: boolean;
};

export type Reader = Pick<typeof db, "select">;
type Writer = Pick<typeof db, "insert">;

const CODE = /^[a-z0-9]{2,8}$/;
const MAX_CODES = 50;

/** Today as the `date` column compares it: a UTC calendar day. */
export const utcDay = (now: Date) => now.toISOString().slice(0, 10);

/** The read, apart so a test can render its SQL. */
export function upcomingSetsQuery(userId: string, now: Date, q: Reader = db) {
  const parent = alias(sets, "parent");
  return q
    .select({
      code: sets.code,
      name: sets.name,
      releasedAt: sets.releasedAt,
      cardCount: sets.cardCount,
      parentName: parent.name,
      firstSeenAt: catalogFirstSeen.firstSeenAt,
      baseline: catalogFirstSeen.baseline,
      seen: sql<boolean>`coalesce(${sets.code} = any(${userPrefs.upcomingSeenCodes}), false)`,
    })
    .from(sets)
    .leftJoin(parent, eq(parent.code, sets.parentSetCode))
    .leftJoin(catalogFirstSeen, and(eq(catalogFirstSeen.kind, "set"), eq(catalogFirstSeen.key, sets.code)))
    .leftJoin(userPrefs, eq(userPrefs.userId, userId))
    .where(and(eq(sets.setType, "commander"), eq(sets.digital, false), gt(sets.releasedAt, utcDay(now))))
    .orderBy(sets.releasedAt, sets.code);
}

/** The Commander sets releasing after `now`, soonest first, each with whether `userId` has seen it. */
export async function loadUpcomingSets(userId: string, now = new Date(), q: Reader = db): Promise<UpcomingSet[]> {
  const rows = await upcomingSetsQuery(userId, now, q);
  return rows.map((r) => ({
    code: r.code,
    name: r.name,
    releasesOn: r.releasedAt as string,
    cardCount: r.cardCount,
    parentName: r.parentName,
    arrivedAt: r.firstSeenAt !== null && r.baseline === false ? r.firstSeenAt : null,
    seen: r.seen,
  }));
}

/**
 * Records that `userId` has been shown these sets. A code that is not a set code is dropped, and more
 * than `MAX_CODES` in one call is refused: the caller passes the sets it drew, which are never that many.
 */
export async function markUpcomingSeen(userId: string, codes: readonly string[], q: Writer = db): Promise<void> {
  const valid = [...new Set(codes.filter((c) => CODE.test(c)))];
  if (valid.length > MAX_CODES) throw new Error(`markUpcomingSeen: ${valid.length} codes, at most ${MAX_CODES}`);
  if (valid.length === 0) return;
  await q
    .insert(userPrefs)
    .values({ userId, upcomingSeenCodes: valid })
    .onConflictDoUpdate({
      target: userPrefs.userId,
      // Union with what the row holds, once each: a row is written on the first press and read as absent before it.
      set: { upcomingSeenCodes: sql`array(select distinct unnest(${userPrefs.upcomingSeenCodes} || excluded.upcoming_seen_codes))` },
    });
}
