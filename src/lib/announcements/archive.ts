/**
 * The Announcements archive's reads (`/announcements`, small items 11 item 3): every stored Wizards post, newest first by
 * `published_at`, thirty a page, filtered by kind. A LIBRARY, not the feed: it includes the baseline posts (the back
 * catalogue the first ingest found), posts the reader dismissed on Home and kinds the reader switched off in Settings
 * (Settings choose what reaches Home and push, nothing else). It READS ONLY: no seen cursor moves and no dismissal changes,
 * so a visit leaves Home's badge and rows exactly as they were. The table is public (no per-account rows), so there is no
 * cross-user read here; the reader gates only on `ANNOUNCEMENTS_ENABLED`, resolved for this reader by the caller
 * (`requestFlags`) and handed in as `env`.
 *
 * Paging is KEYSET on `(published_at desc, id desc)`, not an offset: the hourly ingest can insert a post at the top while a
 * reader pages, and an offset would then repeat a row at the next page's head. The cursor is the last row's own sort key
 * (`archive-model.ts`). A month jump is the same read started from that month's end (`anchorCursor`), so there is one
 * read for the first page, Show older and the jump.
 *
 * Round trips: a first load is two statements in parallel (the page, and the month counts for every kind in one grouped
 * read, which also gives the total, the first year and the jump sheet), plus one read of Commander decklists posts' See the lists
 * addresses only when the page holds such a post. Show older and a jump are the page's one statement (and the same
 * optional lists read); the counts stay with the client.
 */
import { sql, type SQL } from "drizzle-orm";

import { db } from "../../db";
import { wizardsAnnouncementDecklists, wizardsAnnouncements } from "../../db/schema";
import { ANNOUNCEMENT_KINDS } from "../feed/kinds";
import { toViews, withListTargets } from "../feed/home";
import { saleJson } from "../feed/sale-json";
import { toFeedItem, type FeedRow } from "../feed/read";
import { announcementsEnabled } from "./flag";
import { loadPostListTargets } from "./early-list-read";
import { ARCHIVE_PAGE, encodeCursor, parseCursor, toMonthCounts, type ArchiveKind, type ArchivePage, type CountRow, type MonthCounts } from "./archive-model";

type Executor = Pick<typeof db, "execute">;

type PostRow = {
  contentful_id: string;
  kind: string;
  title: string;
  excerpt: string | null;
  hero: string | null;
  url: string;
  promised: number | null;
  lists: number;
  /** A Secret Lair drop's announced sale as jsonb (`saleJson`), or null. */
  sale?: unknown;
  published_at: Date | string;
  /** `published_at` as the database prints it: the cursor's exact value, to the microsecond. */
  published_text: string;
  id: string;
};

/**
 * The page's read, apart so a test can render it. Only the columns a row draws: no `lastmod`, `parse_status` or
 * `first_seen_at`. The lists' count is a correlated subquery, aliased and qualified. `limit + 1` rows are asked for, so the
 * next page's existence is known without trusting a separate count. Pure: nothing is written.
 */
export function archivePageQuery(kind: ArchiveKind, after: string | null): SQL {
  const cursor = after === null ? null : parseCursor(after);
  const where: SQL[] = [];
  // Only the kinds the app knows, under All too: the counts drop an unknown kind, so rows and counts must agree.
  if (kind !== "all") where.push(sql`wa.kind = ${kind}::text`);
  else where.push(sql`wa.kind in (${sql.join(ANNOUNCEMENT_KINDS.map((k) => sql`${k}::text`), sql`, `)})`);
  if (cursor) where.push(sql`(wa.published_at, wa.id) < (${cursor.at}::timestamptz, ${cursor.id}::uuid)`);
  const filter = where.length > 0 ? sql`where ${sql.join(where, sql` and `)}` : sql``;
  return sql`select wa.id::text as id, wa.contentful_id, wa.kind, wa.title, wa.excerpt, wa.hero_image_url as hero, wa.url,
      wa.promised_decks as promised,
      (select count(*) from ${wizardsAnnouncementDecklists} wad where wad.announcement_id = wa.id)::int as lists,
      ${saleJson(sql`wa`)} as sale, wa.published_at, wa.published_at::text as published_text
    from ${wizardsAnnouncements} wa
    ${filter}
    order by wa.published_at desc, wa.id desc
    limit ${ARCHIVE_PAGE + 1}`;
}

/** Every month's posts per kind in one grouped read: the heads' counts, the jump sheet, the total and the first year. */
export function archiveCountsQuery(): SQL {
  return sql`select to_char(wa.published_at at time zone 'UTC', 'YYYY-MM') as ym, wa.kind, count(*)::int as n
    from ${wizardsAnnouncements} wa
    group by 1, 2`;
}

/** The rows of a page read as the Home feed draws them (`toViews`, dated at publication), and the next cursor. Pure, for the tests. */
export function toArchivePage(rows: readonly PostRow[], targets: ReadonlyMap<string, string>): ArchivePage {
  const shown = rows.slice(0, ARCHIVE_PAGE);
  const items = shown.map((r): FeedRow => ({
    kind: r.kind as FeedRow["kind"],
    key: `post:${r.contentful_id}`,
    created_at: r.published_at,
    code: null,
    name: r.title,
    file_name: null,
    oracle_id: null,
    variant_id: null,
    friend_public_id: null,
    friend_name: null,
    data: { title: r.title, excerpt: r.excerpt, hero: r.hero, url: r.url, promised: r.promised, lists: r.lists, sale: r.sale },
    unseen: false,
  }));
  const views = withListTargets(toViews(items.map(toFeedItem), { sets: new Map(), precons: new Map(), owned: new Map(), cards: new Map() }), targets);
  const last = shown.at(-1);
  return { items: views, next: rows.length > ARCHIVE_PAGE && last ? encodeCursor({ at: last.published_text, id: last.id }) : null };
}

/** One page, or null while `ANNOUNCEMENTS_ENABLED` is off for this reader. */
export async function loadArchivePage(env: NodeJS.ProcessEnv, kind: ArchiveKind, after: string | null, q: Executor = db): Promise<ArchivePage | null> {
  if (!announcementsEnabled(env)) return null;
  // A cursor that is not a cursor reads the first page rather than guessing at a position.
  const { rows } = await q.execute<PostRow>(archivePageQuery(kind, after !== null && parseCursor(after) === null ? null : after));
  const posts = rows as PostRow[];
  const ids = posts.slice(0, ARCHIVE_PAGE).flatMap((p) => (p.kind === "commander-decklists" ? [p.contentful_id] : []));
  const targets = await loadPostListTargets(ids, new Date(), q);
  return toArchivePage(posts, targets);
}

/** Every month's counts, or null while the switch is off. */
export async function loadArchiveCounts(env: NodeJS.ProcessEnv, q: Executor = db): Promise<MonthCounts | null> {
  if (!announcementsEnabled(env)) return null;
  const { rows } = await q.execute<CountRow>(archiveCountsQuery());
  return toMonthCounts(rows as CountRow[]);
}

/** The page and the counts of a first load, the two statements in parallel; null while the switch is off. */
export async function loadArchive(env: NodeJS.ProcessEnv, kind: ArchiveKind, after: string | null, q: Executor = db): Promise<{ page: ArchivePage; counts: MonthCounts } | null> {
  if (!announcementsEnabled(env)) return null;
  const [page, counts] = await Promise.all([loadArchivePage(env, kind, after, q), loadArchiveCounts(env, q)]);
  return page && counts ? { page, counts } : null;
}
