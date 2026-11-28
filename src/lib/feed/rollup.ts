// The trade-match roll-up (Cart on your wishlist handoff #3399, README Q1, board `Notices` N1): a friend's matches on one
// reader-day are one What's new row. The writer keeps one stored item per card and friend (its dedupe key, "told once");
// the fold is read-time only, so the push resolver and the Friends page's Waiting on you list still see one item per card.
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

/** The fold's group for one row: the friend and the instant their reader-day began. Null for a row that never folds. */
function groupOf(v: FeedView, zone: string): string | null {
  if (v.kind !== "trade-match" || !v.friend) return null;
  return `${v.friend.publicId} ${readerDayStart(new Date(v.at), zone).toISOString()}`;
}

/**
 * The views with each friend's trade matches on one reader-day folded into the first of them in the list's order (the
 * newest, `feedOrder`): its key, time and place, unseen when any member is, `rollup` carrying every member's key (the ✕
 * dismisses them all) and card (the picture fans them, the line names them). A group of one is left exactly as it was
 * (the shipped row). The press goes to the friend's spares, with no card named. Pure.
 */
export function rollTradeMatches(views: readonly FeedView[], zone: string): FeedView[] {
  const groups = new Map<string, FeedView[]>();
  for (const v of views) {
    const g = groupOf(v, zone);
    if (g !== null) groups.set(g, [...(groups.get(g) ?? []), v]);
  }
  const out: FeedView[] = [];
  for (const v of views) {
    const g = groupOf(v, zone);
    const members = g === null ? undefined : groups.get(g);
    if (!members || members.length < 2) {
      out.push(v);
      continue;
    }
    if (members[0] !== v) continue;
    const friend = v.friend!;
    const cards = members.flatMap((m): FeedCard[] => (m.card ? [m.card] : []));
    out.push({
      ...v,
      unseen: members.some((m) => m.unseen),
      card: cards[0] ?? null,
      askable: false,
      href: `/friends/${encodeURIComponent(friend.publicId)}/spares`,
      rollup: { keys: members.map((m) => m.key), cards },
    });
  }
  return out;
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
