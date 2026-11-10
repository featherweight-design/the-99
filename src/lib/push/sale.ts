/**
 * The sale-time push (drop alerts PR 3): a Secret Lair drop's own heads-up, sent when its pre-queue opens, or at the sale
 * when the post names no pre-queue. The time comes from `wizards_announcements` (`on_sale_at`, `pre_queue_at`, read from the
 * post's words by `announcements/on-sale.ts`); no model call.
 *
 * It rides the `secret-lair` kind (its push tick, its stamp, its availability): a second `push_outbox` row for the same post,
 * told apart by its key, `sale:<contentful id>` against the announcement's `post:<id>`. The unique index (user, kind, key) is
 * the whole "once" while the outbox row survives (the flush prunes a row a week after its `created_at`): a time edited AFTER the push went out never sends another, unless the edit moves the send instant more than a week on.
 *
 * Nothing is queued before the push is due, so there is nothing to reschedule: an edit to either time before then simply moves
 * the instant the next run judges. A row already queued (held overnight) is read at the flush with the CURRENT times, and
 * dropped when the sale has begun.
 *
 * With the hold on (`SALE_PUSH_IGNORES_HOLD` false) a push due inside a reader's held hours waits for 09:00, and a drop whose sale
 * begins by then is dropped as gone: the Superdrop's 8 a.m. PT pre-queue is inside the hold for a Pacific reader (and 9:00 is the
 * sale itself), so that reader never hears of it. That is the cost of keeping the hold, and why the exemption is Design's and
 * Hugh's call.
 *
 * Inert until Design's words land: `SALE_PUSH_LIVE` is false, so no run queues anything. `SALE_PUSH_IGNORES_HOLD` is
 * Design's and Hugh's open call (the 21:00 to 09:00 hold against a 9 a.m. PT sale, which is 6 a.m. in Hawaii): false keeps
 * the hold; true sends this push at any hour (`plan.ts`).
 */
import { sql, type SQL } from "drizzle-orm";

import { pushOutbox, pushSubscriptions, userPrefs, wizardsAnnouncements } from "../../db/schema";
import { pushKindEnabledAt } from "./kind-gate";

/** False until the handoff's push words ship: the cron queues no sale push, and `docs/agents/push.md` says how to turn it on. */
export const SALE_PUSH_LIVE = false;

/** The open hold call: true sends the sale push inside the held hours. */
export const SALE_PUSH_IGNORES_HOLD = false;

/** How long before the pre-queue (or the sale, with none) the push is due. 0 sends when it opens; the cron's 15 minutes is the slack. */
export const SALE_PUSH_LEAD_MS = 0;

const PREFIX = "sale:";

/** The outbox `item_key` of a post's sale push. */
export const saleKey = (contentfulId: string): string => `${PREFIX}${contentfulId}`;

/** The post's Contentful id inside a sale push's key, or null for a key that is not one. */
export const parseSaleKey = (key: string): string | null => (key.startsWith(PREFIX) && key.length > PREFIX.length ? key.slice(PREFIX.length) : null);

/** The instant a drop's push is due: the pre-queue's opening when the post has one, else the sale's start; null with no sale time. */
export function saleSendAt(sale: { preQueueAt: Date | null; onSaleAt: Date | null }): Date | null {
  if (!sale.onSaleAt) return null;
  const at = sale.preQueueAt ?? sale.onSaleAt;
  return new Date(at.getTime() - SALE_PUSH_LEAD_MS);
}

/** Due now: its send instant has come, the sale has not begun, and it is inside the stale window (the flush's). Pure twin of the query's time gates (the reader's stamp and device are the query's alone). */
export function salePushDue(sale: { preQueueAt: Date | null; onSaleAt: Date | null }, now: Date, staleMs: number): boolean {
  const at = saleSendAt(sale);
  if (!at || !sale.onSaleAt) return false;
  return at.getTime() <= now.getTime() && now.getTime() < sale.onSaleAt.getTime() && at.getTime() > now.getTime() - staleMs;
}

// Over the query's own alias `wa`: a column reference through the table name would not resolve against an aliased table.
const SENDS_AT = sql`(coalesce(wa.pre_queue_at, wa.on_sale_at) - ${sql.raw(String(SALE_PUSH_LEAD_MS))} * interval '1 millisecond')`;

/**
 * One reader's due sale pushes, queued; nothing on a repeat. Same gates as the catalog arrivals (a device, the kind's push on
 * and newer than its stamp, inside the stale window), and the row's `created_at` is the send instant, so the stamp, the stale
 * window and a device's subscribe time are judged on the event.
 */
export function enqueueSalePushQuery(userId: string, now: Date, staleMs: number): SQL {
  const at = now.toISOString();
  return sql`insert into ${pushOutbox} (user_id, kind, item_key, batch_key, payload, created_at)
    select ${userId}::text, 'secret-lair', ${PREFIX}::text || wa.contentful_id, ${PREFIX}::text || wa.contentful_id, '{}'::jsonb, ${SENDS_AT}
    from ${wizardsAnnouncements} wa
    left join ${userPrefs} sup on sup.user_id = ${userId}
    where wa.kind = 'secret-lair' and not wa.baseline and wa.on_sale_at is not null
      and ${SENDS_AT} <= ${at}::timestamptz
      and wa.on_sale_at > ${at}::timestamptz
      and ${SENDS_AT} > ${new Date(now.getTime() - staleMs).toISOString()}::timestamptz
      and ${SENDS_AT} > ${pushKindEnabledAt(sql`sup`, sql`'secret-lair'::text`)}
      and exists (select 1 from ${pushSubscriptions} sps where sps.user_id = ${userId})
    on conflict (user_id, kind, item_key) do nothing
    returning id`;
}

/**
 * The posts these ids name, with what a sale push says, while their sale has not begun. A post whose sale began or vanished is absent,
 * so its row is dropped as gone. `due` is false when an edit moved the send instant past now since the row was queued: the flush
 * leaves such a row waiting (neither sent nor dropped) and sends it at the new time.
 */
export function saleItemsQuery(contentfulIds: readonly string[], now: Date): SQL {
  return sql`select wa.contentful_id as id, wa.title, wa.hero_image_url as image, wa.on_sale_at as on_sale_at,
      wa.pre_queue_at as pre_queue_at, wa.on_sale_zone as zone, ${SENDS_AT} <= ${now.toISOString()}::timestamptz as due
    from ${wizardsAnnouncements} wa
    where wa.kind = 'secret-lair' and wa.on_sale_at > ${now.toISOString()}::timestamptz
      and wa.contentful_id = any(${sql.param([...contentfulIds])}::text[])`;
}

const ZONE_LABEL: Record<string, string> = {
  "America/Los_Angeles": "PT", "America/Denver": "MT", "America/Chicago": "CT", "America/New_York": "ET", UTC: "UTC",
};

/** `Mon 9 a.m. PT`, or `Mon 1:30 p.m. ET`: the weekday and the clock in the zone the post wrote it in, as the post wrote it. */
export function saleClock(instant: Date, zone: string, withDay: boolean): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "short", hour: "numeric", minute: "2-digit", hour12: true }).formatToParts(instant);
  const p = (type: string) => parts.find((x) => x.type === type)?.value ?? "";
  const time = `${p("hour")}${p("minute") === "00" ? "" : `:${p("minute")}`} ${p("dayPeriod").toLowerCase().replace(/^([ap])m$/, "$1.m.")}`;
  return `${withDay ? `${p("weekday")} ` : ""}${time} ${ZONE_LABEL[zone] ?? zone}`;
}
