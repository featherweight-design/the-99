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
import { wizardsOutRoute } from "../push/wizards-out";
import { kindEnabledAt } from "./kind-gate";
import type { DropSale } from "./drop-lines";
import { wizardsPostUrl } from "./home";

type Executor = Pick<typeof db, "execute">;

/** How long a drop with an hour stays in the group after its sale begins. */
export const UPCOMING_AFTER_MS = 60 * 60 * 1000;

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
        (wa.on_sale_at is not null and wa.on_sale_at + ${sql.raw(String(UPCOMING_AFTER_MS))} * interval '1 millisecond' > ${at})
        or (wa.on_sale_at is null and wa.on_sale_date is not null and wa.on_sale_date >= (${at} at time zone ${STORE_ZONE})::date)
      )
      and not exists (select 1 from ${feedDismissals} afd where afd.user_id = ${viewerId} and afd.key = 'post:' || wa.contentful_id)
      and wa.first_seen_at > ${kindEnabledAt(sql`aup`, sql`'secret-lair'::text`)}
    order by coalesce(wa.on_sale_at, wa.on_sale_date::timestamp at time zone ${STORE_ZONE}), wa.contentful_id
    limit ${sql.raw(String(UPCOMING_LIMIT))}`;
}

/** An upcoming drop as Home and Archive draw it: the post, with its sale. Client-safe. */
export type UpcomingDrop = {
  /** The post's feed key (`post:<id>`): the row's seen state, dismissal and press are the post's own. */
  key: string;
  title: string;
  summary: string | null;
  hero: string | null;
  /** Through the app's own out route, or null when the post has no wizards address. */
  outbound: string | null;
  unseen: boolean;
  sale: DropSale;
};

const iso = (v: Date | string | null): string | null => (v === null ? null : new Date(v).toISOString());

export function toUpcoming(r: UpcomingRow): UpcomingDrop {
  return {
    key: `post:${r.id}`,
    title: r.title,
    summary: r.excerpt,
    hero: r.hero,
    outbound: wizardsPostUrl(r.url) ? wizardsOutRoute("secret-lair", `post:${r.id}`) : null,
    unseen: r.unseen === true,
    sale: { date: r.on_sale_date, at: iso(r.on_sale_at), preQueueAt: iso(r.pre_queue_at), zone: r.on_sale_zone },
  };
}

export async function loadUpcomingDrops(userId: string, now: Date, q: Executor = db): Promise<UpcomingDrop[]> {
  const { rows } = await q.execute<UpcomingRow>(upcomingQuery(userId, now));
  return (rows as UpcomingRow[]).map(toUpcoming);
}
