// The ✕ on a What's new item, its lead story and a Waiting on you row (Hugh's ruling 2026-10-27, the menu-home plan's
// product call 6): the reader's own `feed_dismissals` row, which every read leaves out for good (`standing` for stored
// items and push, the catalog branches in `lib/feed/read.ts`, `notDismissedAsk` for the asks). Lives here because an
// item's key is resolved through `feed_items`, a social table (`check:social-reads`). Never answers an ask.
import { sql, type SQL } from "drizzle-orm";
import { db } from "../../db";
import { feedDismissals, feedItems } from "../../db/schema";
import { isUuid } from "./rules";

/** What the ✕ names: Home's opaque key for an item, or a Waiting on you ask by its request id. */
export type DismissTarget =
  | { kind: "item"; id: string }
  | { kind: "catalog"; key: string }
  | { kind: "ask"; requestId: string };

/** A catalog key's code or file name: short, and no control characters. */
const CATALOG = /^(set|precon):[^\u0000-\u001f]{1,200}$/;

/** The client's key, checked. `item:<uuid>` and `set:`/`precon:` are Home's own keys; `ask:<uuid>` is a Waiting row. */
export function parseDismissKey(raw: unknown): DismissTarget | null {
  if (typeof raw !== "string") return null;
  if (raw.startsWith("item:")) return isUuid(raw.slice(5)) ? { kind: "item", id: raw.slice(5).toLowerCase() } : null;
  if (raw.startsWith("ask:")) return isUuid(raw.slice(4)) ? { kind: "ask", requestId: raw.slice(4).toLowerCase() } : null;
  return CATALOG.test(raw) ? { kind: "catalog", key: raw } : null;
}

/**
 * The one write. A stored item is dismissed only when it is the reader's own row; an ask through the reader's own
 * (holder's) feed item for it, so its Waiting row and its Home item go together. Idempotent. Apart for a test.
 */
export function dismissQuery(userId: string, t: DismissTarget): SQL {
  if (t.kind === "catalog") {
    return sql`insert into ${feedDismissals} (user_id, key) values (${userId}, ${t.key}) on conflict do nothing`;
  }
  const which = t.kind === "item"
    ? sql`dfi.id = ${t.id}::uuid`
    : sql`dfi.kind = 'spare-request' and dfi.dedupe_key = ${t.requestId} and dfi.data ->> 'answer' is null`;
  return sql`insert into ${feedDismissals} (user_id, key)
    select dfi.user_id, 'item:' || dfi.id::text from ${feedItems} dfi
    where dfi.user_id = ${userId} and ${which}
    on conflict do nothing`;
}

/** Dismisses the target for the reader. Whether anything matched is not reported: a ✕ on a row already gone is done. */
export async function dismissFeedTarget(userId: string, t: DismissTarget): Promise<void> {
  await db.execute(dismissQuery(userId, t));
}
