/**
 * Which news kinds a reader has on (`user_prefs.feed_kinds`: kind -> ISO `enabledAt`; a kind that is off is absent).
 * Turning a kind ON stamps it now, KEEPING an older stamp while it stays on; turning it OFF removes it. The feed
 * shows a kind only what arrived after its stamp (`read.ts`), so turning one on never backfills, and turning it off
 * and on again does not bring back what it held before.
 *
 * Written only when the map changes. `user_prefs` carries the stamp trigger, which moves on any UPDATE, so a save
 * that changes nothing must write nothing or it retires the reader's cached Home and `/decks` (the
 * `markUpcomingSeen` rule).
 */
import { and, eq, sql, type SQL } from "drizzle-orm";

import { db } from "../../db";
import { userPrefs } from "../../db/schema";
import { availableFeedKinds } from "./flag";
import { FEED_KINDS, isFeedKind, type FeedKind } from "./kinds";
import { markSeenQuery } from "./read";

export type FeedKindsMap = Partial<Record<FeedKind, string>>;

/** The stored map, keeping only known kinds with a readable instant. Anything else reads as off. */
export function parseFeedKinds(raw: unknown): FeedKindsMap {
  const out: FeedKindsMap = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (isFeedKind(k) && typeof v === "string" && !Number.isNaN(Date.parse(v))) out[k] = v;
  }
  return out;
}

/**
 * The map after a save, or null when nothing changes. `on` is what the reader chose among `scope` (the kinds the
 * form offered them); a kind outside `scope` keeps whatever it had, so a kind hidden from this reader (its switch
 * off) is neither turned off nor on by a save that could not show it. In `FEED_KINDS` order.
 */
export function nextFeedKinds(prev: FeedKindsMap, on: readonly FeedKind[], now: Date, scope: readonly FeedKind[] = FEED_KINDS): FeedKindsMap | null {
  const chosen = new Set(on.filter((k) => scope.includes(k)));
  const next: FeedKindsMap = {};
  let changed = false;
  for (const kind of FEED_KINDS) {
    const had = prev[kind];
    if (!scope.includes(kind)) {
      if (had) next[kind] = had;
      continue;
    }
    if (chosen.has(kind)) {
      next[kind] = had ?? now.toISOString();
      if (!had) changed = true;
    } else if (had) {
      changed = true;
    }
  }
  return changed ? next : null;
}

/**
 * A form's checked kinds, once each, or null when the value is not a list or names any kind that is unknown or not
 * available to this reader: a refusal writes nothing, never a partial save.
 */
export function parseChosenKinds(on: unknown, available: readonly FeedKind[]): FeedKind[] | null {
  if (!Array.isArray(on) || on.length > FEED_KINDS.length * 2) return null;
  const out = new Set<FeedKind>();
  for (const k of on) {
    if (!isFeedKind(k) || !available.includes(k)) return null;
    out.add(k);
  }
  return FEED_KINDS.filter((k) => out.has(k));
}

/** The kinds on in a map, in `FEED_KINDS` order. */
export const kindsOn = (map: FeedKindsMap): FeedKind[] => FEED_KINDS.filter((k) => map[k] !== undefined);

type Q = Pick<typeof db, "select" | "insert" | "update">;

const ATTEMPTS = 3;

/**
 * Saves the reader's choice. Read, decide (`nextFeedKinds`), then write only if the row still holds what was read, so
 * two saves racing each other never lose a kept `enabledAt`; the loser re-reads and decides again. Returns whether it
 * wrote.
 */
export async function setFeedKinds(
  userId: string,
  on: readonly FeedKind[],
  now = new Date(),
  scope: readonly FeedKind[] = FEED_KINDS,
  q: Q = db,
): Promise<boolean> {
  for (let i = 0; i < ATTEMPTS; i++) {
    const [row] = await q.select({ feedKinds: userPrefs.feedKinds }).from(userPrefs).where(eq(userPrefs.userId, userId));
    const next = nextFeedKinds(parseFeedKinds(row?.feedKinds), on, now, scope);
    if (!next) return false;
    const done = row
      ? await feedKindsUpdate(userId, row.feedKinds, next, q).returning({ userId: userPrefs.userId })
      : await q.insert(userPrefs).values({ userId, feedKinds: next }).onConflictDoNothing().returning({ userId: userPrefs.userId });
    if (done.length > 0) return true;
  }
  throw new Error("setFeedKinds: the reader's news choices kept changing under the save");
}

/** The guarded write, apart so a test can render it: only while the row still holds `seen` (jsonb equality). */
export function feedKindsUpdate(userId: string, seen: unknown, next: FeedKindsMap, q: Pick<typeof db, "update"> = db) {
  return q
    .update(userPrefs)
    .set({ feedKinds: next })
    .where(and(eq(userPrefs.userId, userId), sql`${userPrefs.feedKinds} = ${JSON.stringify(seen ?? {})}::jsonb`));
}

/** The reader's map as stored, for Settings. Absent row: every kind off. */
export async function readFeedKinds(userId: string, q: Pick<typeof db, "select"> = db): Promise<FeedKindsMap> {
  const [row] = await q.select({ feedKinds: userPrefs.feedKinds }).from(userPrefs).where(eq(userPrefs.userId, userId));
  return parseFeedKinds(row?.feedKinds);
}

/** One row of Settings' news section: a kind this reader can be offered, and whether they have it on. */
export type NewsSetting = { kind: FeedKind; on: boolean };

/**
 * Settings' "What's new on Home" section: the kinds AVAILABLE to this reader (`availableFeedKinds`, in `FEED_KINDS`
 * order), each with whether it is on. A kind that is not available is absent, never drawn disabled; its stored choice
 * is kept by the save's scope. Empty while `HOME_FEED_ENABLED` is off, and then nothing is read.
 */
export async function loadNewsSettings(userId: string, env: NodeJS.ProcessEnv, q: Pick<typeof db, "select"> = db): Promise<NewsSetting[]> {
  const available = availableFeedKinds(env);
  if (available.length === 0) return [];
  const map = await readFeedKinds(userId, q);
  return available.map((kind) => ({ kind, on: map[kind] !== undefined }));
}

type Executor = Pick<typeof db, "execute">;

/**
 * A Home visit: moves `feed_seen_at` to `now` only when an unseen item exists. Never touches `friends_seen_at`. Home
 * calls it through `after()`, never during the render, with the `now` it rendered at, so an item arriving after the
 * render stays unseen. Returns whether it wrote.
 */
export async function markFeedSeen(userId: string, env: NodeJS.ProcessEnv, now = new Date(), q: Executor = db): Promise<boolean> {
  return wrote(markSeenQuery(userId, availableFeedKinds(env), now, "feed_seen_at"), q);
}

/** A /friends visit: moves `friends_seen_at` only when an unseen trade match exists. Never touches `feed_seen_at`. */
export async function markFriendsSeen(userId: string, env: NodeJS.ProcessEnv, now = new Date(), q: Executor = db): Promise<boolean> {
  return wrote(markSeenQuery(userId, availableFeedKinds(env).filter((k) => k === "trade-match"), now, "friends_seen_at"), q);
}

async function wrote(query: SQL | null, q: Executor): Promise<boolean> {
  if (!query) return false;
  const done = await q.execute(query);
  return (done.rowCount ?? 0) > 0;
}
