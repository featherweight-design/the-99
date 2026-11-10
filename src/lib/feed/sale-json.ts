import { sql, type SQL } from "drizzle-orm";

/**
 * A post's announced sale as jsonb, for the feed's and the archive's `data`: null with no date, else the date, the hour
 * and pre-queue as instants and the zone the post wrote them in. `wa` is the query's alias of `wizards_announcements`.
 */
export const saleJson = (wa: SQL): SQL =>
  sql`case when ${wa}.on_sale_date is not null then jsonb_build_object('date', ${wa}.on_sale_date::text, 'at', ${wa}.on_sale_at,
    'preQueueAt', ${wa}.pre_queue_at, 'zone', ${wa}.on_sale_zone) end`;
