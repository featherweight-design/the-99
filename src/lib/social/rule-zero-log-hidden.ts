// Hide a game's log reminder, and take the hiding back (log reminder 2b, the Home card's ✕ and its Undo). One row per
// (player, game) in `rule_zero_log_hidden`, the game named as its URL names it (whole milliseconds of the result's
// `started_at`). Only the viewer's own reminder: the insert is selected from the viewer's own result row, at a table in
// a pod they are still in, inside its keep window, so no one can hide a reminder they do not hold. Hiding never
// touches the log itself: Log this game stays on the table until its week ends.
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { ruleZeroLogHidden } from "../../db/schema";
import { tableKept } from "./rule-zero-open";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The inputs of a server action arrive as `unknown`: a table id and a game id in whole milliseconds, or nothing. */
function parse(tableId: unknown, gameMs: unknown): { tableId: string; gameMs: number } | null {
  if (typeof tableId !== "string" || !UUID.test(tableId)) return null;
  if (typeof gameMs !== "number" || !Number.isSafeInteger(gameMs) || gameMs <= 0) return null;
  return { tableId, gameMs };
}

/** Hide the viewer's reminder for one game. False when the viewer holds no such game (or it is past its keep window). */
export async function hideLogReminder(viewerId: string, tableId: unknown, gameMs: unknown): Promise<boolean> {
  const g = parse(tableId, gameMs);
  if (!g) return false;
  const { rowCount } = await db.execute(sql`
    insert into rule_zero_log_hidden (user_id, table_id, game_ms)
    select rs.user_id, rs.table_id, ${g.gameMs}::bigint
    from rule_zero_result_seats rs
    join rule_zero_tables on rule_zero_tables.id = rs.table_id
    join pod_members viewer_in on viewer_in.pod_id = rule_zero_tables.pod_id and viewer_in.user_id = ${viewerId}
    where rs.table_id = ${g.tableId} and rs.user_id = ${viewerId}
      and round(extract(epoch from rs.started_at) * 1000)::bigint = ${g.gameMs}::bigint
      and ${tableKept}
    limit 1
    on conflict do nothing`);
  if ((rowCount ?? 0) > 0) return true;
  // Already hidden counts as done, so a double press or a retry reads the same.
  const [row] = await db
    .select({ at: ruleZeroLogHidden.hiddenAt })
    .from(ruleZeroLogHidden)
    .where(and(eq(ruleZeroLogHidden.userId, viewerId), eq(ruleZeroLogHidden.tableId, g.tableId), eq(ruleZeroLogHidden.gameMs, g.gameMs)));
  return row !== undefined;
}

/** Take the hiding back (Undo): the reminder draws again. Only the viewer's own row. */
export async function unhideLogReminder(viewerId: string, tableId: unknown, gameMs: unknown): Promise<boolean> {
  const g = parse(tableId, gameMs);
  if (!g) return false;
  await db
    .delete(ruleZeroLogHidden)
    .where(and(eq(ruleZeroLogHidden.userId, viewerId), eq(ruleZeroLogHidden.tableId, g.tableId), eq(ruleZeroLogHidden.gameMs, g.gameMs)));
  return true;
}
