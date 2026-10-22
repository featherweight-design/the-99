/**
 * Which news kinds a reader has on (`user_prefs.feed_kinds`: kind -> ISO `enabledAt`; a kind that is off is absent).
 * Turning a kind ON stamps it now, KEEPING an older stamp while it stays on; turning it OFF removes it. The feed
 * shows a kind only what arrived after its stamp (`read.ts`), so turning one on never backfills, and turning it off
 * and on again does not bring back what it held before.
 *
 * A DEFAULT-ON kind (`DEFAULT_ON_KINDS`, spare requests G4) is also on while it is absent from the map and not in
 * `user_prefs.feed_kinds_declined`, since always. Turning it OFF removes it from the map and adds it to the declined
 * list; turning it back ON takes it off that list and stamps it now (no backfill of what arrived while it was off);
 * a save that leaves it alone writes nothing for it. The SQL form of the same rule is `kindEnabledAt`.
 *
 * Written only when the map changes. `user_prefs` carries the stamp trigger, which moves on any UPDATE, so a save
 * that changes nothing must write nothing or it retires the reader's cached Home and `/decks` (the
 * `markUpcomingSeen` rule).
 */
import { and, eq, sql, type SQL } from "drizzle-orm";

import { db } from "../../db";
import { userPrefs } from "../../db/schema";
import { availableFeedKinds } from "./flag";
import { FEED_KINDS, isDefaultOn, isFeedKind, type FeedKind } from "./kinds";
import { markSeenQuery } from "./read";
import { markAnswersSeen } from "../social/spare-requests";

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

/** The stored declined list, keeping only known kinds, once each, in `FEED_KINDS` order. */
export function parseDeclined(raw: unknown): FeedKind[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set(raw.filter(isFeedKind));
  return FEED_KINDS.filter((k) => seen.has(k));
}

/** A reader's stored news choice: the stamps, and the default-on kinds they turned off. */
export type FeedPrefs = { map: FeedKindsMap; declined: readonly FeedKind[] };

/** Whether a kind is on for this reader: stamped, or default-on and not declined. */
export const isKindOn = (p: FeedPrefs, kind: FeedKind): boolean =>
  p.map[kind] !== undefined || (isDefaultOn(kind) && !p.declined.includes(kind));

/** The kinds on for this reader, in `FEED_KINDS` order: what Settings checks and Home reads. */
export const effectiveKinds = (p: FeedPrefs): FeedKind[] => FEED_KINDS.filter((k) => isKindOn(p, k));

/**
 * The stored choice after a save, or null when nothing changes. `on` is what the reader chose among `scope` (the kinds
 * the form offered them); a kind outside `scope` keeps whatever it had, so a kind hidden from this reader (its switch
 * off) is neither turned off nor on by a save that could not show it. In `FEED_KINDS` order.
 */
export function nextFeedPrefs(prev: FeedPrefs, on: readonly FeedKind[], now: Date, scope: readonly FeedKind[] = FEED_KINDS): FeedPrefs | null {
  const chosen = new Set(on.filter((k) => scope.includes(k)));
  const map: FeedKindsMap = {};
  const declined: FeedKind[] = [];
  let changed = false;
  for (const kind of FEED_KINDS) {
    const had = prev.map[kind];
    const wasDeclined = prev.declined.includes(kind);
    if (!scope.includes(kind) || chosen.has(kind) === isKindOn(prev, kind)) {
      // Untouched: as it was.
      if (had) map[kind] = had;
      if (wasDeclined) declined.push(kind);
      continue;
    }
    changed = true;
    if (chosen.has(kind)) {
      // Turned on: stamped now, and off the declined list.
      map[kind] = now.toISOString();
    } else if (isDefaultOn(kind)) {
      // A default-on kind turned off: remembered as declined, or it would read on again.
      declined.push(kind);
    }
  }
  return changed ? { map, declined } : null;
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

const prefsColumns = { feedKinds: userPrefs.feedKinds, declined: userPrefs.feedKindsDeclined };

/**
 * Saves the reader's choice. Read, decide (`nextFeedPrefs`), then write only if the row still holds BOTH columns as
 * read, so two saves racing each other never lose a kept `enabledAt` or a declined kind; the loser re-reads and
 * decides again. Returns whether it wrote.
 */
export async function setFeedKinds(
  userId: string,
  on: readonly FeedKind[],
  now = new Date(),
  scope: readonly FeedKind[] = FEED_KINDS,
  q: Q = db,
): Promise<boolean> {
  for (let i = 0; i < ATTEMPTS; i++) {
    const [row] = await q.select(prefsColumns).from(userPrefs).where(eq(userPrefs.userId, userId));
    const next = nextFeedPrefs({ map: parseFeedKinds(row?.feedKinds), declined: parseDeclined(row?.declined) }, on, now, scope);
    if (!next) return false;
    const values = { feedKinds: next.map, feedKindsDeclined: [...next.declined] };
    const done = row
      ? await feedKindsUpdate(userId, row, next, q).returning({ userId: userPrefs.userId })
      : await q.insert(userPrefs).values({ userId, ...values }).onConflictDoNothing().returning({ userId: userPrefs.userId });
    if (done.length > 0) return true;
  }
  throw new Error("setFeedKinds: the reader's news choices kept changing under the save");
}

/**
 * The guarded write, apart so a test can render it: only while the row still holds `seen` in both columns (jsonb
 * equality for the map, array equality for the declined list, both exactly as read).
 */
export function feedKindsUpdate(
  userId: string, seen: { feedKinds: unknown; declined: readonly string[] | null | undefined }, next: FeedPrefs,
  q: Pick<typeof db, "update"> = db,
) {
  return q
    .update(userPrefs)
    .set({ feedKinds: next.map, feedKindsDeclined: [...next.declined] })
    .where(and(
      eq(userPrefs.userId, userId),
      sql`${userPrefs.feedKinds} = ${JSON.stringify(seen.feedKinds ?? {})}::jsonb`,
      sql`${userPrefs.feedKindsDeclined} = ${sql.param([...(seen.declined ?? [])])}::text[]`,
    ));
}

/** The reader's stored choice. Absent row: no stamps and nothing declined (every default-on kind on). */
export async function readFeedPrefs(userId: string, q: Pick<typeof db, "select"> = db): Promise<FeedPrefs> {
  const [row] = await q.select(prefsColumns).from(userPrefs).where(eq(userPrefs.userId, userId));
  return { map: parseFeedKinds(row?.feedKinds), declined: parseDeclined(row?.declined) };
}

/** The reader's map as stored. Absent row: no stamps. */
export async function readFeedKinds(userId: string, q: Pick<typeof db, "select"> = db): Promise<FeedKindsMap> {
  return (await readFeedPrefs(userId, q)).map;
}

/** One row of Settings' news section: a kind this reader can be offered, and whether they have it on. */
export type NewsSetting = { kind: FeedKind; on: boolean };

/**
 * Settings' "What's new on Home" section: the kinds AVAILABLE to this reader (`availableFeedKinds`, in `FEED_KINDS`
 * order), each with whether it is on (`effectiveKinds`: a default-on kind never touched reads on). A kind that is not available is absent, never drawn disabled; its stored choice
 * is kept by the save's scope. Empty while `HOME_FEED_ENABLED` is off, and then nothing is read.
 */
export async function loadNewsSettings(userId: string, env: NodeJS.ProcessEnv, q: Pick<typeof db, "select"> = db): Promise<NewsSetting[]> {
  const available = availableFeedKinds(env);
  if (available.length === 0) return [];
  const on = effectiveKinds(await readFeedPrefs(userId, q));
  return available.map((kind) => ({ kind, on: on.includes(kind) }));
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

/**
 * A /friends visit: moves `friends_seen_at` only when an unseen trade match or an unseen answer to the reader's spare
 * request exists. Never touches `feed_seen_at`.
 */
export async function markFriendsSeen(userId: string, env: NodeJS.ProcessEnv, now = new Date(), q: Executor = db): Promise<boolean> {
  // In turn, never together: the second finds nothing newer than the cursor the first moved, so a visit writes once.
  const matches = await wrote(markSeenQuery(userId, availableFeedKinds(env).filter((k) => k === "trade-match"), now, "friends_seen_at"), q);
  const answers = await markAnswersSeen(userId, env, now, q);
  return matches || answers;
}

async function wrote(query: SQL | null, q: Executor): Promise<boolean> {
  if (!query) return false;
  const done = await q.execute(query);
  return (done.rowCount ?? 0) > 0;
}
