/**
 * Upcoming drops (drop alerts): the Secret Lair posts whose sale has not started, soonest first, for Home's group and
 * Archive's lines. Its own read, not the feed window's: a drop announced three weeks ahead is still upcoming. Same gates as the
 * feed's Secret Lair branch (not the baseline, not dismissed, newer than the reader's stamp or default-on), so the reader's
 * In app tick decides it. A drop stays until an hour after its `on_sale_at`; a day-only drop until its day ends in the store's zone.
 */
import { sql, type SQL } from "drizzle-orm";

import { db } from "../../db";
import { feedDismissals, userPrefs, wizardsAnnouncements } from "../../db/schema";
import { STORE_ZONE } from "../time/clock";
import { SALE_LINES_AFTER_MS } from "./drop-lines";
import { kindEnabledAt } from "./kind-gate";
import { toViews, type FeedView, type HomeFeed } from "./home";
import type { FeedItem } from "./read";

type Executor = Pick<typeof db, "execute">;


/** The most the group draws: more announced drops than this is not a state the page has a design for. */
const UPCOMING_LIMIT = 8;

export type UpcomingRow = {
  id: string;
  title: string;
  excerpt: string | null;
  hero: string | null;
  url: string;
  first_seen_at: Date | string;
  unseen: boolean;
  on_sale_date: string | null;
  on_sale_at: Date | string | null;
  on_sale_zone: string | null;
  pre_queue_at: Date | string | null;
};

/** The read, apart so a test can render it. Over the alias `wa`: qualified, since Drizzle drops a table's name in a single-table select. */
export function upcomingQuery(viewerId: string, now: Date): SQL {
  const at = sql`${now.toISOString()}::timestamptz`;
  return sql`select wa.contentful_id as id, wa.title as title, wa.excerpt as excerpt, wa.hero_image_url as hero, wa.url as url,
      wa.first_seen_at as first_seen_at, (wa.first_seen_at > coalesce(aup.feed_seen_at, '-infinity'::timestamptz)) as unseen,
      wa.on_sale_date::text as on_sale_date, wa.on_sale_at as on_sale_at, wa.on_sale_zone as on_sale_zone, wa.pre_queue_at as pre_queue_at
    from ${wizardsAnnouncements} wa
    left join ${userPrefs} aup on aup.user_id = ${viewerId}
    where wa.kind = 'secret-lair' and wa.baseline = false and wa.first_seen_at <= ${at}
      and (
        (wa.on_sale_at is not null and wa.on_sale_at + ${sql.raw(String(SALE_LINES_AFTER_MS))} * interval '1 millisecond' > ${at})
        or (wa.on_sale_at is null and wa.on_sale_date is not null and wa.on_sale_date >= (${at} at time zone ${STORE_ZONE})::date)
      )
      and not exists (select 1 from ${feedDismissals} afd where afd.user_id = ${viewerId} and afd.key = 'post:' || wa.contentful_id)
      and wa.first_seen_at > ${kindEnabledAt(sql`aup`, sql`'secret-lair'::text`)}
    order by coalesce(wa.on_sale_at, wa.on_sale_date::timestamp at time zone ${STORE_ZONE}), wa.contentful_id
    limit ${sql.raw(String(UPCOMING_LIMIT))}`;
}

const iso = (v: Date | string | null): string | null => (v === null ? null : new Date(v).toISOString());

/** A row as the feed draws a Secret Lair post (`toViews`: its hero, its press through the app's out route), with its sale. */
export function toUpcoming(r: UpcomingRow): FeedView {
  const sale = { date: r.on_sale_date, at: iso(r.on_sale_at), preQueueAt: iso(r.pre_queue_at), zone: r.on_sale_zone };
  const item: FeedItem = {
    kind: "secret-lair",
    key: `post:${r.id}`,
    createdAt: new Date(r.first_seen_at),
    unseen: r.unseen === true,
    post: { title: r.title, excerpt: r.excerpt, hero: r.hero, url: r.url, promised: null, lists: 0, sale },
  };
  return toViews([item], { sets: new Map(), precons: new Map(), owned: new Map(), cards: new Map() })[0];
}

export async function loadUpcomingDrops(userId: string, now: Date, q: Executor = db): Promise<FeedView[]> {
  const { rows } = await q.execute<UpcomingRow>(upcomingQuery(userId, now));
  return (rows as UpcomingRow[]).map(toUpcoming);
}

/**
 * The feed with its Upcoming drops group (`upcoming`): only for a reader whose Secret Lair In app tick is on (`on`). A drop
 * that leads Home stays the lead and is not repeated in the group; one the window also holds leaves its place below, so no
 * post is drawn twice. The head's count gains the drops the window did not hold. Pure.
 */
export function withUpcoming(feed: HomeFeed, drops: readonly FeedView[]): HomeFeed {
  if (!feed.chosen || !feed.on.includes("secret-lair") || drops.length === 0) return feed;
  const upcoming = drops.filter((d) => d.key !== feed.lead?.key);
  const keys = new Set(upcoming.map((d) => d.key));
  const held = new Set(feed.items.map((i) => i.key));
  const extra = upcoming.filter((d) => d.unseen && !held.has(d.key)).length;
  return { ...feed, items: feed.items.filter((i) => !keys.has(i.key)), upcoming, unseen: feed.unseen + extra };
}
