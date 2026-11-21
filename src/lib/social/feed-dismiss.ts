// The ✕ on a What's new item, its lead story and a Waiting on you row (Hugh's ruling 2026-10-27, the menu-home plan's
// product call 6): the reader's own `feed_dismissals` row, which every read leaves out for good (`standing` for stored
// items and push, the catalog branches in `lib/feed/read.ts`, `notDismissedAsk` for the asks). Lives here because an
// item's key is resolved through `feed_items`, a social table (`check:social-reads`). Never answers an ask.
import { and, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "../../db";
import { feedDismissals, feedItems, spareRequests } from "../../db/schema";
import { CLEAR_ALL_MAX } from "./feed-dismiss-limits";
import { isUuid } from "./rules";

/** What the ✕ names: Home's opaque key for an item, or a Waiting on you ask by its request id. */
export type DismissTarget =
  | { kind: "item"; id: string }
  | { kind: "catalog"; key: string }
  | { kind: "ask"; requestId: string };

/** A catalog key's code, file name or Wizards post id: short, and no control characters. */
const CATALOG = /^(set|precon|post):[^\u0000-\u001f]{1,200}$/;

/** The client's key, checked. `item:<uuid>` and `set:`/`precon:`/`post:` are Home's own keys; `ask:<uuid>` is a Waiting row. */
export function parseDismissKey(raw: unknown): DismissTarget | null {
  if (typeof raw !== "string") return null;
  if (raw.startsWith("item:")) return isUuid(raw.slice(5)) ? { kind: "item", id: raw.slice(5).toLowerCase() } : null;
  if (raw.startsWith("ask:")) return isUuid(raw.slice(4)) ? { kind: "ask", requestId: raw.slice(4).toLowerCase() } : null;
  return CATALOG.test(raw) ? { kind: "catalog", key: raw } : null;
}

/**
 * The one write. A stored item is dismissed only when it is the reader's own row. An ask only when the reader holds
 * it: under its own `ask:<id>` key, which Waiting on you reads (a holder with the kind off has no feed item for it),
 * and under the holder's feed item for it when there is one, so its Home item goes too. Idempotent. Apart for a test.
 */
export function dismissQuery(userId: string, t: DismissTarget): SQL {
  if (t.kind === "catalog") {
    return sql`insert into ${feedDismissals} (user_id, key) values (${userId}, ${t.key}) on conflict do nothing`;
  }
  if (t.kind === "ask") {
    return sql`insert into ${feedDismissals} (user_id, key)
    select dsr.holder_user_id, 'ask:' || dsr.id::text from ${spareRequests} dsr
    where dsr.id = ${t.requestId}::uuid and dsr.holder_user_id = ${userId}
    union all
    select dfi.user_id, 'item:' || dfi.id::text from ${feedItems} dfi
    join ${spareRequests} dsr on dsr.id = ${t.requestId}::uuid and dsr.holder_user_id = dfi.user_id
    where dfi.user_id = ${userId} and dfi.kind = 'spare-request' and dfi.dedupe_key = dsr.id::text and dfi.data ->> 'answer' is null
    on conflict do nothing`;
  }
  return sql`insert into ${feedDismissals} (user_id, key)
    select dfi.user_id, 'item:' || dfi.id::text from ${feedItems} dfi
    where dfi.user_id = ${userId} and dfi.id = ${t.id}::uuid
    on conflict do nothing`;
}

/** Dismisses the target for the reader. Whether anything matched is not reported: a ✕ on a row already gone is done. */
export async function dismissFeedTarget(userId: string, t: DismissTarget): Promise<void> {
  await db.execute(dismissQuery(userId, t));
}

/**
 * The keys Clear all may write or lift: Home's own (`item:`, `set:`, `precon:`, `post:`), never an `ask:` (Clear all
 * does not answer or hide a Waiting row), at most `CLEAR_ALL_MAX`, deduplicated. Null when the input is not that, so
 * one bad key refuses the lot.
 */
export function parseClearKeys(raw: unknown): { items: string[]; catalog: string[] } | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > CLEAR_ALL_MAX) return null;
  const items = new Set<string>();
  const catalog = new Set<string>();
  for (const k of raw) {
    const t = parseDismissKey(k);
    if (!t || t.kind === "ask") return null;
    if (t.kind === "item") items.add(t.id);
    else catalog.add(t.key);
  }
  return { items: [...items], catalog: [...catalog] };
}

/** The one statement behind Clear all: every stored item only from the reader's own rows, every catalog key as given. Idempotent. */
export function clearQuery(userId: string, k: { items: string[]; catalog: string[] }): SQL {
  const parts: SQL[] = [];
  if (k.items.length > 0) {
    parts.push(sql`select dfi.user_id, 'item:' || dfi.id::text from ${feedItems} dfi
    where dfi.user_id = ${userId} and dfi.id in (${sql.join(k.items.map((id) => sql`${id}::uuid`), sql`, `)})`);
  }
  if (k.catalog.length > 0) {
    parts.push(sql`select ${userId}::text, ck from (values ${sql.join(k.catalog.map((key) => sql`(${key})`), sql`, `)}) as c(ck)`);
  }
  return sql`insert into ${feedDismissals} (user_id, key) ${sql.join(parts, sql` union all `)} on conflict do nothing returning key`;
}

/** Clear all's write. Returns the keys it newly wrote: one the reader had already dismissed (another tab) is not among them, so Undo leaves it alone. */
export async function clearFeedKeys(userId: string, k: { items: string[]; catalog: string[] }): Promise<string[]> {
  const done = await db.execute<{ key: string }>(clearQuery(userId, k));
  return done.rows.map((r) => r.key);
}

/** Undo's inverse: the reader's own dismissals for the keys Clear all newly wrote (its action returns them), and nobody else's. */
export async function restoreFeedKeys(userId: string, k: { items: string[]; catalog: string[] }): Promise<void> {
  const keys = [...k.items.map((id) => `item:${id}`), ...k.catalog];
  await db.delete(feedDismissals).where(and(eq(feedDismissals.userId, userId), inArray(feedDismissals.key, keys)));
}
