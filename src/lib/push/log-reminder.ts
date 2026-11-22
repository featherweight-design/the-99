/**
 * The log reminder's push (log reminder, PR 3): "<winner> won at <pod>'s table. Log your game." Its own `push_outbox` kind
 * (`LOG_PUSH_KIND`), outside the feed's kinds, written inside the result save's transaction (`saveTableResult`) for every seated
 * player but the saver whose Start seat holds a deck, so a rolled-back save sends nothing. The kick follows the commit.
 *
 * The row holds no words, like every outbox row: `item_key` names the game (`game:<table id>:<epoch ms>`, the game's own id in
 * a Log URL), and the flush resolves it through `loadLogGames` under the reader's own grant (`social/rule-zero-log-home.ts`),
 * so a game the reader has logged or hidden, that was undone, whose pod or deck they have left, is dropped at the flush.
 * `batch_key` is the table, so two games of one table are one push and two tables are two.
 *
 * One row per (reader, game), by the outbox's unique index: a re-save of the same game never pushes twice. It is queued only
 * while the reader has a device; no per-kind preference exists to judge. The overnight hold applies (not `HOLD_EXEMPT_KINDS`).
 */
import { sql, type SQL } from "drizzle-orm";

import { pushOutbox, pushSubscriptions } from "../../db/schema";
import { LOG_PUSH_KIND } from "../feed/kinds";
import { isUuid } from "../social/rules";

const PREFIX = "game:";

/** The outbox `item_key` of a game's reminder. `gameMs` is the game's id: whole milliseconds since the epoch. */
export const logItemKey = (tableId: string, gameMs: number): string => `${PREFIX}${tableId}:${Math.trunc(gameMs)}`;

/** The table and game inside a reminder's `item_key`, or null for a key that is not one. */
export function parseLogKey(key: string): { tableId: string; gameMs: number } | null {
  if (!key.startsWith(PREFIX)) return null;
  const [tableId, ms, ...rest] = key.slice(PREFIX.length).split(":");
  if (rest.length > 0 || !isUuid(tableId) || !/^\d{1,16}$/.test(ms ?? "")) return null;
  return { tableId, gameMs: Number(ms) };
}

/** Queue the reminder for one seated player. Returns a row only when it queued one (a device, and not already queued). */
export function enqueueLogPushQuery(userId: string, tableId: string, gameMs: number, now: Date): SQL {
  return sql`insert into ${pushOutbox} (user_id, kind, item_key, batch_key, payload, created_at)
    select ${userId}, ${LOG_PUSH_KIND}, ${logItemKey(tableId, gameMs)}, ${tableId}, '{}'::jsonb, ${now.toISOString()}::timestamptz
    where exists (select 1 from ${pushSubscriptions} lps where lps.user_id = ${userId})
    on conflict (user_id, kind, item_key) do nothing
    returning id`;
}
