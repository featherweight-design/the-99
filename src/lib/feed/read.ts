/**
 * The news feed as one reader sees it (menu and Home, G1; plan `2026-10-22-menu-home.md`, "The feed model"). Read
 * PER REQUEST, never inside a cached payload: Home calls it outside `cachePageForUser` (PR 6 registers it in
 * `check:list-cache`'s `PER_REQUEST_READS` when it does).
 *
 * One union, three branches, each only for a kind that is AVAILABLE to the reader (`availableFeedKinds`) and newer
 * than that kind's own `enabledAt` in `user_prefs.feed_kinds` (a kind that is off has none, so it reads nothing, and
 * turning one on never backfills):
 * - New set: a `catalog_first_seen` set stamp that is not the BASELINE, of a release type (`RELEASE_SET_TYPES`),
 *   not digital, released by today. Its moment is the later of the stamp and the release day: a set the catalog
 *   showed before it released is news when it is out, and that same moment is what the kind's `enabledAt` is
  compared with (a reader who opts in while a set is upcoming still hears of its release).
 * - New precon: the same for a `precons` row (the stamp's key is its `file_name`), released by today, no twin. A
 *   precon is listed by MTGJSON only at release, so this is the released one; announced sets stay on /decks/precons.
 * - The stored kinds, from the stored items, with the live friend grant re-joined (`lib/social/feed-items.ts`).
 *
 * Every item is inside the window (`FEED_WINDOW_DAYS`) and at or before `now`. Unseen is created after the cursor:
 * `feed_seen_at` for Home, `friends_seen_at` for the Friends badge (trade matches only). Null is never seen.
 */
import { sql, type SQL } from "drizzle-orm";

import { db } from "../../db";
import { catalogFirstSeen, precons, sets, userPrefs } from "../../db/schema";
import { RELEASE_SET_TYPES } from "../catalog/index-due";
import { storedFeedBranch } from "../social/feed-items";
import { unseenAnswersCount } from "../social/spare-requests";
import { availableFeedKinds } from "./flag";
import { feedOrder, isStoredKind, windowFloor, type FeedKind, type StoredKind } from "./kinds";

type Executor = Pick<typeof db, "execute">;

/** Today as a `date` column compares it: a UTC calendar day. */
const utcDay = (now: Date) => now.toISOString().slice(0, 10);

/** Which cursor an unseen test reads. */
export type FeedCursor = "feed_seen_at" | "friends_seen_at";

/**
 * The union of every branch for these kinds, or null when none is left. Each catalog branch joins the reader's own
 * prefs row, so a reader with no row reads nothing of those; the stored branch LEFT JOINS it, so a default-on kind
 * reaches a reader with no row (`kindEnabledAt`, spare requests G4).
 */
export function feedUnion(viewerId: string, kinds: readonly FeedKind[], now: Date): SQL | null {
  const today = utcDay(now);
  const branches: SQL[] = [];
  if (kinds.includes("new-set")) {
    branches.push(sql`select 'new-set'::text as kind, 'set:' || s.code as key,
        greatest(sf.first_seen_at at time zone 'UTC', s.released_at::timestamp at time zone 'UTC') as created_at,
        s.code as code, s.name as name, null::text as file_name,
        null::uuid as oracle_id, null::text as variant_id, null::text as friend_public_id, null::text as friend_name,
        '{}'::jsonb as data
      from ${sets} s
      join ${catalogFirstSeen} sf on sf.kind = 'set' and sf.key = s.code
      join ${userPrefs} sup on sup.user_id = ${viewerId}
      where sf.baseline = false and s.digital = false
        and s.set_type = any(${sql.param([...RELEASE_SET_TYPES])}::text[])
        and s.released_at <= ${today}::date
        and greatest(sf.first_seen_at at time zone 'UTC', s.released_at::timestamp at time zone 'UTC')
          > (sup.feed_kinds ->> 'new-set')::timestamptz`);
  }
  if (kinds.includes("new-precon")) {
    branches.push(sql`select 'new-precon'::text as kind, 'precon:' || p.file_name as key,
        greatest(pf.first_seen_at at time zone 'UTC', p.release_date::timestamp at time zone 'UTC') as created_at,
        lower(p.set_code) as code, p.name as name, p.file_name as file_name,
        null::uuid as oracle_id, null::text as variant_id, null::text as friend_public_id, null::text as friend_name,
        '{}'::jsonb as data
      from ${precons} p
      join ${catalogFirstSeen} pf on pf.kind = 'precon' and pf.key = p.file_name
      join ${userPrefs} pup on pup.user_id = ${viewerId}
      where pf.baseline = false and p.twin_of is null
        and p.release_date <= ${today}::date
        and greatest(pf.first_seen_at at time zone 'UTC', p.release_date::timestamp at time zone 'UTC')
          > (pup.feed_kinds ->> 'new-precon')::timestamptz`);
  }
  const stored = kinds.filter(isStoredKind);
  if (stored.length > 0) branches.push(storedFeedBranch(viewerId, stored, now));
  if (branches.length === 0) return null;
  return sql.join(branches, sql` union all `);
}

/** The window both reads share: inside `FEED_WINDOW_DAYS`, never after `now`. On the union's alias `f`. */
const inWindow = (now: Date) => sql`f.created_at > ${windowFloor(now).toISOString()}::timestamptz and f.created_at <= ${now.toISOString()}::timestamptz`;

/** The cursor column on the reader's prefs row `up`. A closed pair, never a caller's string. */
const cursorOf = (cursor: FeedCursor) => (cursor === "feed_seen_at" ? sql`up.feed_seen_at` : sql`up.friends_seen_at`);

/** The feed read, apart so a test can render it. `unseen` is measured against `cursor`: Home's, or the Friends badge's. */
export function feedQuery(viewerId: string, kinds: readonly FeedKind[], now: Date, cursor: FeedCursor = "feed_seen_at"): SQL | null {
  const union = feedUnion(viewerId, kinds, now);
  if (!union) return null;
  return sql`select f.kind, f.key, f.created_at, f.code, f.name, f.file_name, f.oracle_id, f.variant_id,
      f.friend_public_id, f.friend_name, f.data,
      f.created_at > coalesce(${cursorOf(cursor)}, '-infinity'::timestamptz) as unseen
    from (${union}) f
    left join ${userPrefs} up on up.user_id = ${viewerId}
    where ${inWindow(now)}
    order by f.created_at desc, f.key`;
}

/** The unseen count, apart so a test can render it: one statement over the same union. */
export function unseenCountQuery(viewerId: string, kinds: readonly FeedKind[], now: Date, cursor: FeedCursor): SQL | null {
  const union = feedUnion(viewerId, kinds, now);
  if (!union) return null;
  return sql`select count(*)::int as n
    from (${union}) f
    left join ${userPrefs} up on up.user_id = ${viewerId}
    where ${inWindow(now)} and f.created_at > coalesce(${cursorOf(cursor)}, '-infinity'::timestamptz)`;
}

/**
 * Moves the cursor to `now`, ONLY while an unseen item exists under it, and never backwards. `user_prefs` carries
 * the stamp trigger, which moves on any UPDATE, so an unconditional write would retire the reader's cached Home and
 * `/decks` on every visit (the `markUpcomingSeen` rule). One statement: the test and the write cannot disagree.
 * An UPSERT, because a reader with no prefs row can still have an unseen item (a default-on kind, G4); the shape of
 * `markAnswersSeenQuery`.
 */
export function markSeenQuery(viewerId: string, kinds: readonly FeedKind[], now: Date, cursor: FeedCursor): SQL | null {
  const union = feedUnion(viewerId, kinds, now);
  if (!union) return null;
  const column = cursor === "feed_seen_at" ? sql`feed_seen_at` : sql`friends_seen_at`;
  const stored = sql`(select cup.${column} from ${userPrefs} cup where cup.user_id = ${viewerId})`;
  return sql`insert into ${userPrefs} as up (user_id, ${column})
    select ${viewerId}, ${now.toISOString()}::timestamptz
    where exists (
      select 1 from (${union}) f
      where ${inWindow(now)} and f.created_at > coalesce(${stored}, '-infinity'::timestamptz))
    on conflict (user_id) do update set ${column} = excluded.${column}
      where ${cursorOf(cursor)} is null or ${cursorOf(cursor)} < excluded.${column}`;
}

type FeedBase = { key: string; createdAt: Date; unseen: boolean };

export type FeedItem =
  | (FeedBase & { kind: "new-set"; code: string; name: string; href: string })
  | (FeedBase & { kind: "new-precon"; fileName: string; name: string; setCode: string; href: string })
  | (FeedBase & {
      kind: StoredKind;
      oracleId: string | null;
      variantId: string | null;
      /** The friend the item is about, by public id: never a Clerk id. */
      friend: { publicId: string; displayName: string } | null;
      data: Record<string, unknown>;
    });

type Row = {
  kind: FeedKind;
  key: string;
  created_at: Date | string;
  code: string | null;
  name: string | null;
  file_name: string | null;
  oracle_id: string | null;
  variant_id: string | null;
  friend_public_id: string | null;
  friend_name: string | null;
  data: Record<string, unknown> | null;
  unseen: boolean;
};

/** A row as the reader draws it. Exported for the tests. */
export function toFeedItem(r: Row): FeedItem {
  const base = { key: r.key, createdAt: new Date(r.created_at), unseen: r.unseen === true };
  if (r.kind === "new-set") return { ...base, kind: r.kind, code: r.code!, name: r.name!, href: `/collection/sets/${encodeURIComponent(r.code!)}` };
  if (r.kind === "new-precon") {
    return { ...base, kind: r.kind, fileName: r.file_name!, name: r.name!, setCode: r.code!, href: `/decks/precons/${encodeURIComponent(r.file_name!)}` };
  }
  return {
    ...base,
    kind: r.kind,
    oracleId: r.oracle_id,
    variantId: r.variant_id,
    friend: r.friend_public_id ? { publicId: r.friend_public_id, displayName: r.friend_name ?? "" } : null,
    data: r.data ?? {},
  };
}

/** The reader's feed: every item in the window, waiting on you first, then newest, each with `unseen`. */
export async function loadFeed(userId: string, env: NodeJS.ProcessEnv, now = new Date(), q: Executor = db): Promise<FeedItem[]> {
  const query = feedQuery(userId, availableFeedKinds(env), now);
  if (!query) return [];
  const { rows } = await q.execute<Row>(query);
  return (rows as Row[]).map(toFeedItem).sort(feedOrder);
}

/** Home's badge: unseen items in the window. One statement; 0 while the feed is off. */
export async function unseenCount(userId: string, env: NodeJS.ProcessEnv, now = new Date(), q: Executor = db): Promise<number> {
  return countUnder(unseenCountQuery(userId, availableFeedKinds(env), now, "feed_seen_at"), q);
}

/**
 * The Friends badge's SEEN half: unseen trade matches (by `friends_seen_at`, the grant re-joined; 0 while the kind is
 * unavailable) and answers to the reader's spare requests not yet seen (`unseenAnswersCount`). Both clear on a `/friends`
 * visit. The asks waiting on the reader's own answer are the other half (`waitingAsksCount`), cleared by answering.
 */
export async function unseenFriendsCount(userId: string, env: NodeJS.ProcessEnv, now = new Date(), q: Executor = db): Promise<number> {
  const [matches, answers] = await Promise.all([
    countUnder(unseenCountQuery(userId, tradeMatchOnly(env), now, "friends_seen_at"), q),
    unseenAnswersCount(userId, env, now, q),
  ]);
  return matches + answers;
}

const tradeMatchOnly = (env: NodeJS.ProcessEnv): FeedKind[] => availableFeedKinds(env).filter((k) => k === "trade-match");

async function countUnder(query: SQL | null, q: Executor): Promise<number> {
  if (!query) return 0;
  const { rows } = await q.execute<{ n: number }>(query);
  return Number((rows as { n: number }[])[0]?.n ?? 0);
}
