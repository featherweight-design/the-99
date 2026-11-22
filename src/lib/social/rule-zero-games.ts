/**
 * The games the viewer played at a table, from the stored results: what the closed table page draws as its `Your game`
 * cards (log reminder C1, L1), and the one read the Home card builds on. A game is one result (`started_at` names it),
 * logged when a game of the viewer's carries `rule_zero_game_at` equal to it (`loggedAt` is when).
 *
 * Under the table's grant, like the log's own reads: seats come through `resultSeatsQuery` (the viewer seated at the
 * table, in its pod, the table inside its keep window), so a player who left the pod is not drawn and a deck its owner's
 * rules hide is not named. Names are `ThirdPartyName`s, no account id leaves, and the viewer's own deck is the one the
 * result holds for them (their deck at Start), which is the deck Log this game opens. A game with no deck for the
 * viewer (a deckless seat, a deleted deck) has no card: the plan's `Log it by hand` covers it.
 */
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { deckGames, ruleZeroResultSeats, ruleZeroTables } from "../../db/schema";
import type { ThirdPartyName } from "../person-name/brand";
import { named } from "../person-name/mint";
import { ruledSeatOwnersOf } from "./rule-zero";
import { ownedDeckArt } from "./rule-zero-art";
import { resultSeatsQuery } from "./rule-zero-log";
import { tableKept } from "./rule-zero-open";
import { gameMsOf, resultPlacesQuery } from "./rule-zero-result";

/** `tableKept`'s week (`interval '7 days'`; the database runs in UTC, so a week is 7 x 24 hours). */
const KEPT_MS = 7 * 86_400_000;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** How a game ended for the card's heading: the viewer won, the table drew, another player won, or the winner is not drawn. */
export type GameResult = { kind: "you" } | { kind: "draw" } | { kind: "won"; name: ThirdPartyName } | { kind: "unknown" };

export type TableGame = {
  /** The game's id in a URL: whole milliseconds since the epoch (`gameMsOf`). */
  gameMs: number;
  startedAt: Date;
  /** The viewer's deck at Start: the page Log this game opens, and the name the card's note carries. */
  deckId: string;
  deckName: string;
  result: GameResult;
  /** The drawn seats, best place first. `you` is the viewer's own, drawn as `You`. */
  seats: { name: string | ThirdPartyName; you: boolean; place: number; artCropUri: string | null }[];
  /** When the viewer logged it (the log's own save time), or null while it is not logged. */
  loggedAt: Date | null;
  /** When its seats and result stop filling in: a week past the table's morning (`tableKept`). */
  until: Date;
};

/**
 * The viewer's own results at a table, newest first, each with whether (and when) they logged it. Their own rows only,
 * so it needs no grant beyond `tableKept`. Apart so a test can render its SQL: the subquery is aliased and qualified,
 * and the join keeps the projection's table names.
 */
export const viewerGamesQuery = (viewerId: string, tableId: string, q: Pick<typeof db, "select"> = db) =>
  q
    .select({
      startedAt: ruleZeroResultSeats.startedAt,
      expiresAt: ruleZeroTables.expiresAt,
      ms: gameMsOf(ruleZeroResultSeats.startedAt),
      loggedAt: sql<Date | null>`(
        select max(dg.created_at) from ${deckGames} dg
        where dg.user_id = ${ruleZeroResultSeats.userId} and dg.rule_zero_table_id = ${ruleZeroResultSeats.tableId} and dg.rule_zero_game_at = ${ruleZeroResultSeats.startedAt}
      )`.mapWith((v: string | null) => (v === null ? null : new Date(v))),
    })
    .from(ruleZeroResultSeats)
    .innerJoin(ruleZeroTables, eq(ruleZeroTables.id, ruleZeroResultSeats.tableId))
    .where(and(eq(ruleZeroResultSeats.tableId, tableId), eq(ruleZeroResultSeats.userId, viewerId), tableKept))
    .orderBy(desc(ruleZeroResultSeats.startedAt));

/** Pure: the card's heading from the stored places and the drawn rows. */
export function gameResultOf(viewerId: string, placed: readonly { userId: string; place: number }[], rows: readonly { userId: string; displayName: string }[]): GameResult {
  const first = placed.filter((p) => p.place === 1);
  if (first.length > 1) return { kind: "draw" };
  if (first.length === 0) return { kind: "unknown" };
  if (first[0].userId === viewerId) return { kind: "you" };
  const winner = rows.find((r) => r.userId === first[0].userId);
  return winner ? { kind: "won", name: named(winner.displayName) } : { kind: "unknown" };
}

/** The viewer's games at the table in the caller's transaction, newest first: the closed page's cards. */
export async function tableGamesIn(tx: Tx, viewerId: string, tableId: string): Promise<TableGame[]> {
  const played = await viewerGamesQuery(viewerId, tableId, tx);
  if (played.length === 0) return [];
  const ruled = await ruledSeatOwnersOf(viewerId, tableId, tx);
  const out: { game: Omit<TableGame, "seats">; rows: Awaited<ReturnType<typeof resultSeatsQuery>>; placed: { userId: string; place: number }[] }[] = [];
  for (const g of played) {
    const [rows, placed] = await Promise.all([
      resultSeatsQuery(viewerId, tableId, g.startedAt, tx, ruled, true),
      resultPlacesQuery(tableId, viewerId, g.startedAt, tx, true),
    ]);
    const mine = rows.find((r) => r.userId === viewerId);
    if (!mine || mine.deckId === null || mine.deckName === null) continue;
    out.push({
      game: { gameMs: g.ms, startedAt: g.startedAt, deckId: mine.deckId, deckName: mine.deckName, result: gameResultOf(viewerId, placed, rows), loggedAt: g.loggedAt, until: new Date(g.expiresAt.getTime() + KEPT_MS) },
      rows,
      placed,
    });
  }
  const art = await ownedDeckArt(viewerId, out.flatMap((o) => o.rows.flatMap((r) => (r.deckId ? [r.deckId] : []))));
  return out.map(({ game, rows, placed }) => ({
    ...game,
    seats: rows
      .map((r) => ({
        name: r.userId === viewerId ? r.displayName : named(r.displayName),
        you: r.userId === viewerId,
        place: placed.find((p) => p.userId === r.userId)?.place ?? placed.length,
        artCropUri: (r.deckId ? art.get(r.deckId)?.commander : null) ?? r.commanderArt,
      }))
      .sort((a, b) => a.place - b.place),
  }));
}
