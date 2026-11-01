/**
 * The cross-deck game history (design handoff `design_handoff_the99_game_history`, build PR 1): the viewer's own
 * games on every deck, newest first, in windows of `GAME_HISTORY_WINDOW`, with the deck, the seats, the month counts,
 * the summary and the "Played against" options. Read-only, owner-only: every statement scopes `deck_games.user_id`
 * AND the deck's owner to the viewer (`user_id` on a game is a convenience, not the boundary).
 *
 * Paged by KEYSET on (played_at desc, id desc), never offset: the cursor is the last row's position, so a game logged
 * between two reads moves nothing. Filters run in SQL and combine with AND. Friends enter only through
 * `social/game-history.ts`, which joins the viewer's own friend link in the same statement; a seat's friend is a
 * `publicId`, never an account id.
 *
 * Opponents are always on: `SOCIAL_GAMES_ENABLED` and the friends switch it followed are both retired, so there is no
 * switch to read here.
 */
import { and, asc, desc, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db";
import { cards, deckGameAxes, deckGameOpponents, deckGames, deckVersions, decks } from "../../db/schema";
import { withArt } from "../decks/deck-opponents-read";
import { deckIdentity } from "../decks/format";
import { GAME_AXIS_KEYS, type AxisPolarity, type GameAxisKey } from "../decks/game-axes";
import { resolveCommanderPrintingsByDeck } from "../decks/printings";
import { friendSeatPredicate, listPlayedAgainstFriends, loadHistorySeats, type HistorySeat, type PlayedAgainstFriend } from "../social/game-history";
import {
  decodeCursor, encodeCursor, GAME_HISTORY_WINDOW, isGameResult, isHistoryUuid,
  type GameHistoryCursor, type GameHistoryFilter, type GameResult,
} from "./history-rules";

export { GAME_HISTORY_WINDOW } from "./history-rules";
export type { GameHistoryFilter, GameResult } from "./history-rules";

type Reader = Pick<typeof db, "select">;

export type HistoryDeck = {
  id: string;
  name: string;
  /** WUBRG order, the pair's colors together. */
  identity: string[];
  commanderName: string;
  partnerName: string | null;
  /** The name of the owned printing the art came from, else null. */
  commanderPrintedName: string | null;
  /** The owned copy's art, else the oracle-level art. */
  commanderImageUri: string | null;
  commanderArtCropUri: string | null;
};

export type HistoryGame = {
  id: string;
  playedAt: Date;
  result: GameResult;
  podSize: number;
  /** The deck version played, or null (unstamped, or the version was deleted). */
  versionNumber: number | null;
  note: string | null;
  worked: GameAxisKey[];
  hurt: GameAxisKey[];
  deck: HistoryDeck;
  /** The owner's snapshot of each seat; empty for a game with none logged. */
  opponents: HistorySeat[];
};

export type HistoryMonth = { month: string; games: number };

export type HistorySummary = {
  /** Games under the filter. */
  games: number;
  wins: number;
  losses: number;
  draws: number;
  /** Distinct decks the filtered games were played on. */
  decks: number;
  podMin: number | null;
  podMax: number | null;
  firstPlayedAt: Date | null;
  lastPlayedAt: Date | null;
  /** The deck that leads OUTRIGHT, with its games; null when two decks tie or there are no games. */
  mostPlayed: { deckId: string; name: string; games: number } | null;
  /** With a friend filter only: of the losses under it, those a seat of that friend won. Null otherwise. */
  friendWonLosses: { won: number; losses: number } | null;
};

export type PlayedAgainstCommander = { oracleId: string; name: string; games: number; artCropUri: string | null };

export type HistoryAggregates = {
  /** The viewer's whole history, unfiltered: the low-N ladder and the filtered-to-zero frame read it. */
  total: number;
  /** Games per result under every filter BUT the result: the Result options' counts, so a zero option reads 0 and stays pressable. */
  byResult: { wins: number; losses: number; draws: number };
  /** Games per deck under every filter BUT the deck: the deck picker's counts. Decks with none under it are absent. */
  byDeck: { deckId: string; games: number }[];
  /** Games per month under the filter, newest first, counting the WHOLE month (not just this window). */
  months: HistoryMonth[];
  summary: HistorySummary;
  /** The "Played against" options, over the viewer's whole history and not the filter. */
  playedAgainst: { friends: PlayedAgainstFriend[]; commanders: PlayedAgainstCommander[] };
};

export type GameHistory = {
  games: HistoryGame[];
  /** Pass back as `cursor` for the next window; null at the end. */
  next: string | null;
  /** Month counts, summary and options. Read with the first window only (no cursor), null on a later one. */
  aggregates: HistoryAggregates | null;
};

/** The owner's games: the game AND its deck belong to the viewer. */
function ownedGames(viewerId: string): SQL {
  return and(eq(deckGames.userId, viewerId), eq(decks.userId, viewerId))!;
}

/** The filter as SQL conditions, AND-ed. An invalid value matches nothing. Apart so a test can render it. */
export function filterConditions(viewerId: string, filter: GameHistoryFilter): SQL[] {
  const out: SQL[] = [];
  const never = sql`false`;
  if (filter.deckId !== undefined) out.push(isHistoryUuid(filter.deckId) ? eq(deckGames.deckId, filter.deckId) : never);
  if (filter.result !== undefined) out.push(isGameResult(filter.result) ? eq(deckGames.result, filter.result) : never);
  if (filter.friend !== undefined) out.push(isHistoryUuid(filter.friend) ? friendSeatPredicate(viewerId, filter.friend) : never);
  if (filter.commander !== undefined) {
    out.push(
      isHistoryUuid(filter.commander)
        ? sql`exists (select 1 from ${deckGameOpponents} oc where oc.game_id = ${deckGames}.id and (oc.commander_oracle_id = ${filter.commander} or oc.partner_oracle_id = ${filter.commander}))`
        : never,
    );
  }
  return out;
}

/** The rows strictly after the cursor in (played_at desc, id desc). The timestamp stays text so microseconds survive. */
export function keysetAfter(cursor: GameHistoryCursor): SQL {
  return sql`(${deckGames.playedAt}, ${deckGames.id}) < (${cursor.playedAt}::timestamp, ${cursor.id}::uuid)`;
}

const partnerCard = alias(cards, "partner_card");

/** One window of rows plus one, to know whether another follows. Apart so a test can render its SQL. */
export function historyPageQuery(viewerId: string, filter: GameHistoryFilter, cursor: GameHistoryCursor | null, q: Reader = db) {
  return q
    .select({
      id: deckGames.id,
      deckId: deckGames.deckId,
      result: deckGames.result,
      podSize: deckGames.podSize,
      playedAt: deckGames.playedAt,
      cursorAt: sql<string>`${deckGames.playedAt}::text`,
      note: deckGames.note,
      versionNumber: deckVersions.number,
      deckName: decks.name,
      commanderOracleId: decks.commanderOracleId,
      commanderName: cards.name,
      commanderIdentity: cards.colorIdentity,
      commanderImageUri: cards.imageUri,
      commanderArtCropUri: cards.artCropUri,
      partnerName: partnerCard.name,
      partnerIdentity: partnerCard.colorIdentity,
    })
    .from(deckGames)
    .innerJoin(decks, eq(decks.id, deckGames.deckId))
    .innerJoin(cards, eq(cards.oracleId, decks.commanderOracleId))
    .leftJoin(partnerCard, eq(partnerCard.oracleId, decks.partnerOracleId))
    // LEFT, scoped to the game's own deck: the game's Games tab joins versions the same way (`listDeckGames`).
    .leftJoin(deckVersions, and(eq(deckVersions.id, deckGames.versionId), eq(deckVersions.deckId, deckGames.deckId)))
    .where(and(ownedGames(viewerId), ...filterConditions(viewerId, filter), cursor ? keysetAfter(cursor) : undefined))
    .orderBy(desc(deckGames.playedAt), desc(deckGames.id))
    .limit(GAME_HISTORY_WINDOW + 1);
}

/** Games per month under the filter. */
export function historyMonthsQuery(viewerId: string, filter: GameHistoryFilter, q: Reader = db) {
  const month = sql<string>`to_char(${deckGames.playedAt}, 'YYYY-MM')`;
  return q
    .select({ month, games: sql<number>`count(*)::int` })
    .from(deckGames)
    .innerJoin(decks, eq(decks.id, deckGames.deckId))
    .where(and(ownedGames(viewerId), ...filterConditions(viewerId, filter)))
    .groupBy(month)
    .orderBy(desc(month));
}

/** The counts under the filter, in one statement. */
export function historySummaryQuery(viewerId: string, filter: GameHistoryFilter, q: Reader = db) {
  const friendLost = isHistoryUuid(filter.friend)
    ? sql<number>`count(*) filter (where ${deckGames.result} = 'loss' and ${friendSeatPredicate(viewerId, filter.friend, { won: true })})::int`
    : sql<number>`0`;
  return q
    .select({
      games: sql<number>`count(*)::int`,
      wins: sql<number>`count(*) filter (where ${deckGames.result} = 'win')::int`,
      losses: sql<number>`count(*) filter (where ${deckGames.result} = 'loss')::int`,
      draws: sql<number>`count(*) filter (where ${deckGames.result} = 'draw')::int`,
      decks: sql<number>`count(distinct ${deckGames.deckId})::int`,
      podMin: sql<number | null>`min(${deckGames.podSize})`,
      podMax: sql<number | null>`max(${deckGames.podSize})`,
      first: sql<string | null>`min(${deckGames.playedAt})::text`,
      last: sql<string | null>`max(${deckGames.playedAt})::text`,
      friendLost,
    })
    .from(deckGames)
    .innerJoin(decks, eq(decks.id, deckGames.deckId))
    .where(and(ownedGames(viewerId), ...filterConditions(viewerId, filter)));
}

/** The two most played decks under the filter: enough to tell a lead from a tie. */
export function historyTopDecksQuery(viewerId: string, filter: GameHistoryFilter, q: Reader = db) {
  const games = sql<number>`count(*)::int`;
  return q
    .select({ deckId: decks.id, name: decks.name, games })
    .from(deckGames)
    .innerJoin(decks, eq(decks.id, deckGames.deckId))
    .where(and(ownedGames(viewerId), ...filterConditions(viewerId, filter)))
    .groupBy(decks.id, decks.name)
    .orderBy(desc(games), asc(decks.id))
    .limit(2);
}

/** Games per deck under the filter without its deck: what each choice in the deck picker would leave. */
export function historyByDeckQuery(viewerId: string, filter: GameHistoryFilter, q: Reader = db) {
  return q
    .select({ deckId: decks.id, games: sql<number>`count(*)::int` })
    .from(deckGames)
    .innerJoin(decks, eq(decks.id, deckGames.deckId))
    .where(and(ownedGames(viewerId), ...filterConditions(viewerId, { ...filter, deckId: undefined })))
    .groupBy(decks.id);
}

/** Commanders the viewer has sat across from, with the games each was in, over the whole history. */
export function playedAgainstCommandersQuery(viewerId: string, q: Reader = db) {
  const games = sql<number>`count(distinct ${deckGameOpponents.gameId})::int`;
  return q
    .select({ oracleId: cards.oracleId, name: cards.name, artCropUri: cards.artCropUri, games })
    .from(deckGameOpponents)
    .innerJoin(deckGames, eq(deckGames.id, deckGameOpponents.gameId))
    .innerJoin(decks, eq(decks.id, deckGames.deckId))
    .innerJoin(cards, or(eq(cards.oracleId, deckGameOpponents.commanderOracleId), eq(cards.oracleId, deckGameOpponents.partnerOracleId)))
    .where(ownedGames(viewerId))
    .groupBy(cards.oracleId, cards.name, cards.artCropUri)
    .orderBy(desc(games), asc(cards.name), asc(cards.oracleId));
}

/** Every game the viewer has logged, on any deck. */
export function historyTotalQuery(viewerId: string, q: Reader = db) {
  return q
    .select({ total: sql<number>`count(*)::int` })
    .from(deckGames)
    .innerJoin(decks, eq(decks.id, deckGames.deckId))
    .where(ownedGames(viewerId));
}

const asDate = (text: string | null): Date | null => (text === null ? null : new Date(`${text.replace(" ", "T")}Z`));

async function readAggregates(viewerId: string, filter: GameHistoryFilter): Promise<HistoryAggregates> {
  const [[total], months, [sum], top, friends, commanders, byDeck, [others]] = await Promise.all([
    historyTotalQuery(viewerId),
    historyMonthsQuery(viewerId, filter),
    historySummaryQuery(viewerId, filter),
    historyTopDecksQuery(viewerId, filter),
    listPlayedAgainstFriends(viewerId),
    playedAgainstCommandersQuery(viewerId),
    historyByDeckQuery(viewerId, filter),
    // With no result filter on, the summary already counts every result; with one on, ask again without it.
    filter.result === undefined ? Promise.resolve([undefined]) : historySummaryQuery(viewerId, { ...filter, result: undefined }),
  ]);
  const [lead, second] = top;
  const across = others ?? sum;
  return {
    total: total?.total ?? 0,
    byDeck: byDeck.map((d) => ({ deckId: d.deckId, games: d.games })),
    byResult: { wins: across.wins, losses: across.losses, draws: across.draws },
    months: months.map((m) => ({ month: m.month, games: m.games })),
    summary: {
      games: sum.games,
      wins: sum.wins,
      losses: sum.losses,
      draws: sum.draws,
      decks: sum.decks,
      podMin: sum.podMin,
      podMax: sum.podMax,
      firstPlayedAt: asDate(sum.first),
      lastPlayedAt: asDate(sum.last),
      mostPlayed: lead && (!second || lead.games > second.games) ? { deckId: lead.deckId, name: lead.name, games: lead.games } : null,
      friendWonLosses: isHistoryUuid(filter.friend) ? { won: sum.friendLost, losses: sum.losses } : null,
    },
    playedAgainst: { friends, commanders },
  };
}

async function readMarks(gameIds: string[]): Promise<Map<string, { worked: GameAxisKey[]; hurt: GameAxisKey[] }>> {
  const byGame = new Map(gameIds.map((id) => [id, { worked: [] as GameAxisKey[], hurt: [] as GameAxisKey[] }]));
  if (gameIds.length === 0) return byGame;
  const marks = await db
    .select({ gameId: deckGameAxes.gameId, axis: deckGameAxes.axis, polarity: deckGameAxes.polarity })
    .from(deckGameAxes)
    .where(inArray(deckGameAxes.gameId, gameIds))
    .orderBy(asc(deckGameAxes.axis));
  for (const m of marks) {
    const key = m.axis as GameAxisKey;
    // An axis that has left the vocabulary is dropped from the read, as the Games tab does; the game stands.
    if (!GAME_AXIS_KEYS.includes(key)) continue;
    byGame.get(m.gameId)?.[(m.polarity as AxisPolarity) === "worked" ? "worked" : "hurt"].push(key);
  }
  return byGame;
}

/**
 * One window of the viewer's game history. Pass `cursor` (from the previous window's `next`) to continue; a cursor
 * that is not one this module wrote reads as the first window. Aggregates ride the first window only.
 * Throws when the read fails: a history that silently lacked its opponents would say "none".
 */
export async function loadGameHistory(
  viewerId: string,
  opts: { filter?: GameHistoryFilter; cursor?: string | null } = {},
): Promise<GameHistory> {
  const filter = opts.filter ?? {};
  const cursor = decodeCursor(opts.cursor);
  const [rows, aggregates] = await Promise.all([
    historyPageQuery(viewerId, filter, cursor),
    cursor ? Promise.resolve(null) : readAggregates(viewerId, filter),
  ]);
  const page = rows.slice(0, GAME_HISTORY_WINDOW);
  const last = page[page.length - 1];
  const ids = page.map((r) => r.id);
  const deckRows = [...new Map(page.map((r) => [r.deckId, r])).values()];
  const [seats, marks, owned] = await Promise.all([
    loadHistorySeats(viewerId, ids).then(withArt),
    readMarks(ids),
    // Fail-soft: a deck whose owned copy is unresolved keeps the oracle art.
    resolveCommanderPrintingsByDeck(viewerId, deckRows.flatMap((r) => (r.commanderOracleId ? [{ deckId: r.deckId, commanderOracleId: r.commanderOracleId }] : []))),
  ]);
  const games = page.map((r): HistoryGame => ({
    id: r.id,
    playedAt: r.playedAt,
    result: r.result as GameResult,
    podSize: r.podSize,
    versionNumber: r.versionNumber,
    note: r.note,
    worked: marks.get(r.id)?.worked ?? [],
    hurt: marks.get(r.id)?.hurt ?? [],
    deck: {
      id: r.deckId,
      name: r.deckName,
      identity: deckIdentity(r.commanderIdentity, r.partnerIdentity),
      commanderName: r.commanderName,
      partnerName: r.partnerName,
      commanderPrintedName: owned.get(r.deckId)?.printedName ?? null,
      commanderImageUri: owned.get(r.deckId)?.imageUri ?? r.commanderImageUri,
      commanderArtCropUri: owned.get(r.deckId)?.artCropUri ?? r.commanderArtCropUri,
    },
    opponents: seats.get(r.id) ?? [],
  }));
  return {
    games,
    next: rows.length > GAME_HISTORY_WINDOW && last ? encodeCursor({ playedAt: last.cursorAt, id: last.id }) : null,
    aggregates,
  };
}
