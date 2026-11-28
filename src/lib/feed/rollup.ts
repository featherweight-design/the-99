// The trade-match roll-up (Cart on your wishlist handoff #3399, README Q1, board `Notices` N1): a friend's matches on one
// reader-day are one What's new row. The writer keeps one stored item per card and friend (its dedupe key, "told once");
// the fold is read-time only, so the push resolver still sees one item per card. The Friends page's Waiting on you list
// folds its rows the same way (`waiting.ts`, #3441), and both badges count the folded rows (`rollCountKey`).
import { sql, type SQL } from "drizzle-orm";
import { db } from "../../db";
import { judgedZone } from "../push/hold";
import { readerDayStart, readerZoneQuery } from "../social/trade-match";
import type { FeedCard, FeedView } from "./home";

/**
 * The zone a reader's day is judged in for the fold: the push cap's (`readerZoneQuery`, the most recently refreshed
 * device), checked by the runtime (`judgedZone`, UTC for an unknown or missing one), so the badge's SQL and the list's
 * JS bucket one day the same way.
 */
export const rollZone = (stored: string | null): string => judgedZone(stored ?? "UTC");

/** The zone the reader's day is judged in (`readerZoneQuery`), or null with no device. One indexed read. */
export async function readerZone(userId: string, q: Pick<typeof db, "execute"> = db): Promise<string | null> {
  const { rows } = await q.execute<{ time_zone: string | null }>(readerZoneQuery(userId));
  return (rows as { time_zone: string | null }[])[0]?.time_zone ?? null;
}

/** The fold's group: the friend and the instant their reader-day began. Shared with Waiting on you's fold (`waiting.ts`). */
export const rollGroup = (friendPublicId: string, at: Date, zone: string): string =>
  `${friendPublicId} ${readerDayStart(at, zone).toISOString()}`;

/**
 * The fold itself, shared by What's new (`rollTradeMatches`) and Waiting on you (`foldTradeMatchRows`) so the two lists
 * cannot drift: items whose group has two or more members are folded into the first of them (`roll`), the rest are
 * left exactly as they were. Order is kept. Pure.
 */
export function foldGroups<T>(items: readonly T[], groupKey: (item: T) => string | null, roll: (members: T[]) => T): T[] {
  const keys = items.map(groupKey);
  const groups = new Map<string, T[]>();
  items.forEach((item, i) => {
    const g = keys[i];
    if (g === null) return;
    const members = groups.get(g);
    if (members) members.push(item);
    else groups.set(g, [item]);
  });
  return items.flatMap((item, i) => {
    const g = keys[i];
    const members = g === null ? undefined : groups.get(g);
    if (!members || members.length < 2) return [item];
    return members[0] === item ? [roll(members)] : [];
  });
}

/** The fold's group for one row (`rollGroup`). Null for a row that never folds. */
function groupOf(v: FeedView, zone: string): string | null {
  if (v.kind !== "trade-match" || !v.friend) return null;
  return rollGroup(v.friend.publicId, new Date(v.at), zone);
}

/**
 * The views with each friend's trade matches on one reader-day folded into the first of them in the list's order (the
 * newest, `feedOrder`): its key, time and place, unseen when any member is, `rollup` carrying every member's key (the ✕
 * dismisses them all) and card (the picture fans them, the line names them). A group of one is left exactly as it was
 * (the shipped row). The press goes to the friend's spares, with no card named. Pure.
 */
export function rollTradeMatches(views: readonly FeedView[], zone: string): FeedView[] {
  return foldGroups(views, (v) => groupOf(v, zone), (members) => {
    const v = members[0];
    const cards = members.flatMap((m): FeedCard[] => (m.card ? [m.card] : []));
    return {
      ...v,
      unseen: members.some((m) => m.unseen),
      card: cards[0] ?? null,
      askable: false,
      href: `/friends/${encodeURIComponent(v.friend!.publicId)}/spares`,
      rollup: { keys: members.map((m) => m.key), cards },
    };
  });
}

/**
 * The reader's zone as the badge's statement reads it, in the same statement (no round trip of its own): the push
 * cap's (`readerZoneQuery`), UTC with no device. Postgres judges it, not `judgedZone`; a zone it refuses fails the
 * statement, and `unseenCount` counts again in UTC.
 */
export const rollZoneSql = (viewerId: string): SQL => sql`coalesce((${readerZoneQuery(viewerId)}), 'UTC')`;

/**
 * The badge's count key for one row of the feed's union (alias `f`), the SQL twin of `groupOf`: a trade match with a
 * friend counts once per friend and reader-day, every other row by its own key. `zone` is a zone name, sent bound, or
 * `rollZoneSql`.
 */
export function rollCountKey(zone: string | SQL): SQL {
  return sql`case when f.kind = 'trade-match' and f.friend_public_id is not null
    then 'roll:' || f.friend_public_id || ':' || ((f.created_at at time zone ${zone})::date)::text
    else f.key end`;
}
