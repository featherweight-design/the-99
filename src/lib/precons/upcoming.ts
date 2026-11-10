/**
 * Upcoming Commander sets: the engineering half of "what precons are coming" (no caller yet but its
 * tests and `pnpm probe:upcoming-precons`; the screen that reads it is Design's to draw).
 *
 * An upcoming precon is not a `precons` row: MTGJSON lists a deck at release, and Scryfall lists its set
 * weeks earlier (Star Trek Commander, 2026-11-13, was in `sets` with 41 cards a month before). So the
 * answer comes from `sets`, by type `commander` and a release date after today, with the set it belongs
 * to (`parent_set_code`) named beside it. Announced lists only what is not yet released (Hugh, 2026-11-10): a set
 * leaves from the start of its release day, the UTC day the countdown and the page's cache key count in, whether or
 * not a `precons` row lists it yet. Release day comes before MTGJSON's decklists do (E1), so for a day or two a
 * released set is in neither Announced nor the list.
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

/**
 * A key `upcoming_seen_codes` holds: a set code (`trc`, the set was announced), `lists:` and a set code
 * (`lists:trc`, its decklists were listed), or `early:`, a set code and a count (`early:trc:3`, the reader was shown
 * three of its early lists; announcements G2). Exactly those three forms, lowercase, as `sets.code` is.
 */
export const SEEN_KEY = /^(?:(?:lists:)?[a-z0-9]{2,8}|early:[a-z0-9]{2,8}:\d{1,3})$/;
const MAX_CODES = 50;

/**
 * How long after its release the early lists of a Commander set stay worth posting (`EARLY_POST_WINDOW_DAYS`). It no
 * longer holds the set in Announced, which leaves on release day.
 */
export const RELEASED_GRACE_DAYS = 30;

/** Today as the `date` column compares it: a UTC calendar day. */
export const utcDay = (now: Date) => now.toISOString().slice(0, 10);

/** The one `sets.set_type` the Announced group draws. */
export const ANNOUNCED_SET_TYPE = "commander";

/**
 * Whether the Announced group draws this paper set (`upcomingSetsQuery`'s rule, in code): a Commander set releasing after
 * today (the UTC day), so out from the start of its release day. Home's See the lists links a set's block
 * (`#announced-<code>`) only when it holds (Announcements UI 6b).
 */
export function drawnInAnnounced(set: { setType: string; releasedAt: string }, now: Date): boolean {
  return set.setType === ANNOUNCED_SET_TYPE && set.releasedAt > utcDay(now);
}

/** The read, apart so a test can render its SQL. */
export function upcomingSetsQuery(userId: string, now: Date, q: Reader = db) {
  const parent = alias(sets, "parent");
  const today = utcDay(now);
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
    .where(and(
      eq(sets.setType, ANNOUNCED_SET_TYPE),
      eq(sets.digital, false),
      gt(sets.releasedAt, today),
    ))
    .orderBy(sets.releasedAt, sets.code);
}

/**
 * The Commander sets releasing after `now`'s UTC day, soonest first, each with whether `userId` has seen it.
 */
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

/** The write, apart so a test can render its SQL. `keys` are already checked. */
export function upcomingSeenWrite(userId: string, keys: string[], q: Writer = db) {
  return q
    .insert(userPrefs)
    .values({ userId, upcomingSeenCodes: keys })
    .onConflictDoUpdate({
      target: userPrefs.userId,
      // Union with what the row holds, once each: a row is written on the first press and read as absent before it.
      set: { upcomingSeenCodes: sql`array(select distinct unnest(${userPrefs.upcomingSeenCodes} || excluded.upcoming_seen_codes))` },
      // Only when it ADDS a key. `user_prefs` carries the stamp trigger (0123), which fires on any UPDATE, a
      // no-op one included, so a repeat Precons visit would otherwise retire the reader's cached Home for nothing.
      setWhere: sql`not (excluded.upcoming_seen_codes <@ ${userPrefs}.upcoming_seen_codes)`,
    });
}

/**
 * Records that `userId` has been shown these sets (`trc`), their decklists (`lists:trc`) or their early lists
 * (`early:trc:3`). A key of none of these forms is dropped. Every key already held writes nothing. The keys are written `MAX_CODES` to a statement, so a
 * reader with many arrivals (each lists line is two keys) is never refused a dismiss: a refusal here was swallowed
 * by the ✕ and the banner came back on every load.
 */
export async function markUpcomingSeen(userId: string, codes: readonly string[], q: Writer = db): Promise<void> {
  const valid = [...new Set(codes.filter((c) => SEEN_KEY.test(c)))];
  for (let i = 0; i < valid.length; i += MAX_CODES) await upcomingSeenWrite(userId, valid.slice(i, i + MAX_CODES), q);
}
