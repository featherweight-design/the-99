import { sql, type SQL } from "drizzle-orm";
import { db } from "../../db";
import { requireAdmin } from "./access";
import { listAccounts } from "./accounts";
import { coerceAnswers, parseFeedbackFilter, type FeedbackFilter, type FeedbackKind, type FeedbackRow } from "./feedback-rule";
import { unlistedAccount } from "./mask";
import { namesFor } from "./names";
import { utc } from "./invites";

/**
 * The Feedback tab's read (flyer trial, admin Feedback PR A). SERVER-ONLY. The first statement is the admin check (a
 * loader re-checks even though the page does); then ONE statement returns the page, the counts, the unread count and
 * the average rating. A row carries the masked name only: the account id is used to name it here and never leaves.
 */
export type FeedbackRead = {
  rows: FeedbackRow[];
  counts: { all: number; problem: number; check_in: number };
  /** Rows no admin has opened yet. */
  fresh: number;
  /** Average of the check-ins' valid 1..5 ratings; null with none. */
  avg: number | null;
  hasMore: boolean;
};

type RawRow = {
  id: string;
  userId: string | null;
  kind: FeedbackKind;
  groupName: string | null;
  createdAt: string;
  readAt: string | null;
  page: string | null;
  device: string | null;
  digest: string | null;
  source: string | null;
  answers: unknown;
};

/**
 * The statement. `f`, `fm` and `g` are aliased and every column is qualified; the filter, limit and offset are
 * parameters. A rating counts toward the average only when it is a JSON number whose text is a single digit 1..5 (what `coerceAnswers` shows), so a malformed answer
 * cannot throw the cast. One group per account at most (`flag_group_members` is keyed on `user_id`), so the join
 * cannot repeat a row.
 */
export function feedbackQuery(filter: FeedbackFilter, limit: number, offset: number): SQL {
  return sql`with page as (
      select f.id, f.user_id, f.kind, f.answers, f.page, f.device, f.digest, f.source, f.created_at, f.read_at, g.name as group_name
      from feedback f
      left join flag_group_members fm on fm.user_id = f.user_id
      left join flag_groups g on g.id = fm.group_id
      where (${filter}::text = 'all' or f.kind = ${filter}::text)
      order by f.created_at desc, f.id desc
      limit ${limit + 1} offset ${offset}
    )
    select
      coalesce((select json_agg(json_build_object(
        'id', p.id, 'userId', p.user_id, 'kind', p.kind, 'groupName', p.group_name, 'createdAt', p.created_at,
        'readAt', p.read_at, 'page', p.page, 'device', p.device, 'digest', p.digest, 'source', p.source, 'answers', p.answers
      ) order by p.created_at desc, p.id desc) from page p), '[]'::json) as rows,
      t.total, t.problems, t.check_ins, t.fresh, t.avg
    from (select
        count(*)::int as total,
        (count(*) filter (where c.kind = 'problem'))::int as problems,
        (count(*) filter (where c.kind = 'check_in'))::int as check_ins,
        (count(*) filter (where c.read_at is null))::int as fresh,
        (avg((c.answers->>'rating')::numeric) filter (
          where c.kind = 'check_in' and jsonb_typeof(c.answers->'rating') = 'number' and c.answers->>'rating' ~ '^[1-5]$'
        ))::float8 as avg
      from feedback c) t`;
}

/** The statement that opens a row: sets `read_at` and nothing else, and only while it is still null. */
export const markReadQuery = (id: string): SQL => sql`update feedback set read_at = now() where id = ${id} and read_at is null`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function readFeedback(opts: { filter?: unknown; limit?: number; offset?: number } = {}): Promise<FeedbackRead> {
  await requireAdmin();
  const filter = parseFeedbackFilter(opts.filter);
  const limit = Number.isInteger(opts.limit) && opts.limit! > 0 ? Math.min(opts.limit!, 200) : 50;
  const offset = Number.isInteger(opts.offset) && opts.offset! > 0 ? Math.min(opts.offset!, 100_000) : 0;
  const { rows: out } = await db.execute<{
    rows: RawRow[];
    total: number;
    problems: number;
    check_ins: number;
    fresh: number;
    avg: number | null;
  }>(feedbackQuery(filter, limit, offset));
  const [r] = out;
  const raw = r.rows;
  const ids = raw.flatMap((x) => (x.userId ? [x.userId] : []));
  // Clerk down falls back to stored ids (`listAccounts`), which `namesFor` names as `Account ·xxxx`; never throws here.
  const names = ids.length ? namesFor(ids, (await listAccounts()).accounts) : {};
  const rows: FeedbackRow[] = raw.slice(0, limit).map((x) => ({
    id: x.id,
    kind: x.kind,
    name: x.userId ? (names[x.userId] ?? unlistedAccount(x.userId).name) : null,
    group: x.groupName,
    at: utc(x.createdAt)!.toISOString(),
    unread: x.readAt === null,
    page: x.page,
    device: x.device,
    digest: x.digest ? x.digest.slice(0, 8) : null,
    source: x.source,
    answers: coerceAnswers(x.kind, x.answers),
  }));
  return {
    rows,
    counts: { all: r.total, problem: r.problems, check_in: r.check_ins },
    fresh: r.fresh,
    avg: r.avg === null ? null : Number(r.avg),
    hasMore: raw.length > limit,
  };
}

/** Opens a row: admin only, a uuid only, idempotent. `changed` is false when it was already read or does not exist. */
export async function markFeedbackRead(id: unknown): Promise<{ ok: true; changed: boolean } | { ok: false }> {
  await requireAdmin();
  if (typeof id !== "string" || !UUID.test(id)) return { ok: false };
  const res = await db.execute(markReadQuery(id));
  return { ok: true, changed: (res.rowCount ?? 0) > 0 };
}
