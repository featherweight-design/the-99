// Home's `Game to log` card (log reminder 2b, boards H1 to H3), read PER REQUEST, outside Home's cached payload: a game
// saved at someone else's table, a log made on the deck's Games tab and a hide all move nothing Home's key carries.
// Its own module so `check:list-cache` holds the claim once Home calls it (`PER_REQUEST_READS`).
//
// The games are the closed table page's own (`tableGamesIn`), so the card and the page agree on seats, result, deck and
// the week's end. Two reads: one statement names the viewer's unlogged, unhidden games at ended tables inside their
// keep window (their own result rows, in a pod they are still in); then `tableGamesIn` draws each table's games under
// the table's grant. A table whose viewer left the pod, a game with no deck for them and a deleted deck draw nothing.
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { podMembers, pods, ruleZeroTables } from "../../db/schema";
import type { ThirdPartyName } from "../person-name/brand";
import { named } from "../person-name/mint";
import { tableEnded, tableKept } from "./rule-zero-open";
import { tableGamesIn, type TableGame } from "./rule-zero-games";

/** One row of the card: a game to log, with the table it came from. */
export type HomeLogGame = TableGame & { tableId: string; podName: ThirdPartyName };

/** How many tables one read draws: a week of weekly nights is one or two, so this only bounds a stuffed fixture. */
const TABLES_CAP = 12;

type Candidate = { tableId: string; ms: number };

/**
 * The viewer's own results at ended, kept tables that carry their deck, are not logged and are not hidden, newest
 * first. Correlated subqueries alias and qualify (Drizzle drops the qualification in a single-table select).
 */
export const candidateGamesQuery = (viewerId: string) => sql`
  select distinct rs.table_id as "tableId", round(extract(epoch from rs.started_at) * 1000)::bigint as ms, rs.started_at as at
  from rule_zero_result_seats rs
  join rule_zero_tables on rule_zero_tables.id = rs.table_id
  join pod_members viewer_in on viewer_in.pod_id = rule_zero_tables.pod_id and viewer_in.user_id = ${viewerId}
  where rs.user_id = ${viewerId} and rs.deck_id is not null
    and ${tableEnded} and ${tableKept}
    and not exists (
      select 1 from deck_games dg
      where dg.user_id = rs.user_id and dg.rule_zero_table_id = rs.table_id and dg.rule_zero_game_at = rs.started_at)
    and not exists (
      select 1 from rule_zero_log_hidden h
      where h.user_id = rs.user_id and h.table_id = rs.table_id and h.game_ms = round(extract(epoch from rs.started_at) * 1000)::bigint)
  order by rs.started_at desc
  limit ${TABLES_CAP * 4}`;

/** The viewer's games to log, newest first. Empty when there is nothing to remind of. */
export async function loadHomeLogGames(viewerId: string): Promise<HomeLogGame[]> {
  const { rows } = await db.execute<{ tableId: string; ms: string | number }>(candidateGamesQuery(viewerId));
  const found: Candidate[] = rows.map((r) => ({ tableId: r.tableId, ms: Number(r.ms) }));
  if (found.length === 0) return [];
  const tableIds = [...new Set(found.map((c) => c.tableId))].slice(0, TABLES_CAP);
  const wanted = new Set(found.map((c) => `${c.tableId}:${c.ms}`));
  return db.transaction(async (tx) => {
    const names = await tx
      .select({ tableId: ruleZeroTables.id, name: pods.name })
      .from(ruleZeroTables)
      .innerJoin(pods, eq(pods.id, ruleZeroTables.podId))
      .innerJoin(podMembers, and(eq(podMembers.podId, ruleZeroTables.podId), eq(podMembers.userId, viewerId)))
      .where(inArray(ruleZeroTables.id, tableIds));
    const podOf = new Map(names.map((n) => [n.tableId, named(n.name)]));
    const out: HomeLogGame[] = [];
    for (const tableId of tableIds) {
      const podName = podOf.get(tableId);
      if (!podName) continue;
      for (const g of await tableGamesIn(tx, viewerId, tableId)) {
        if (g.loggedAt === null && wanted.has(`${tableId}:${g.gameMs}`)) out.push({ ...g, tableId, podName });
      }
    }
    return out.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  });
}
