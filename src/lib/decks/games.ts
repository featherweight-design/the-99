import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { deckGames, deckGameAxes } from "../../db/schema";
import { GAME_AXIS_KEYS, type AxisPolarity, type GameAxisKey } from "./game-axes";

export type DeckGame = {
  id: string;
  result: "win" | "loss" | "draw";
  podSize: number;
  playedAt: Date;
  worked: GameAxisKey[];
  hurt: GameAxisKey[];
};

export type AxisTally = {
  key: GameAxisKey;
  worked: number;
  hurt: number;
  /** Orders and buckets the axes. NEVER rendered — see the plan's constraints. */
  net: number;
};

export type GameSummary = {
  count: number;
  record: { wins: number; losses: number; draws: number };
  axes: AxisTally[];
  keep: AxisTally[];
  fix: AxisTally[];
  mixed: AxisTally[];
};

/**
 * Every game on a deck, newest first, with its marks attached.
 *
 * Two queries and a join in memory rather than one joined query: a joined read
 * returns one row per mark and has to be de-duplicated back into games anyway,
 * and the mark set per deck is small enough that the second round trip is
 * cheaper than that reassembly is to get wrong. created_at breaks the tie when
 * two games share a played_at, which the date-only form makes common.
 */
export async function listDeckGames(deckId: string, userId: string): Promise<DeckGame[]> {
  const rows = await db
    .select({
      id: deckGames.id,
      result: deckGames.result,
      podSize: deckGames.podSize,
      playedAt: deckGames.playedAt,
    })
    .from(deckGames)
    .where(and(eq(deckGames.deckId, deckId), eq(deckGames.userId, userId)))
    .orderBy(desc(deckGames.playedAt), desc(deckGames.createdAt));

  if (rows.length === 0) return [];

  const marks = await db
    .select({ gameId: deckGameAxes.gameId, axis: deckGameAxes.axis, polarity: deckGameAxes.polarity })
    .from(deckGameAxes)
    .innerJoin(deckGames, eq(deckGames.id, deckGameAxes.gameId))
    .where(and(eq(deckGames.deckId, deckId), eq(deckGames.userId, userId)))
    .orderBy(asc(deckGameAxes.axis));

  const byGame = new Map<string, { worked: GameAxisKey[]; hurt: GameAxisKey[] }>();
  for (const row of rows) byGame.set(row.id, { worked: [], hurt: [] });
  for (const mark of marks) {
    const bucket = byGame.get(mark.gameId);
    if (!bucket) continue;
    // A row whose axis has since left the vocabulary is dropped from the read
    // rather than deleted from the table — the game itself is still history.
    const key = mark.axis as GameAxisKey;
    if (!GAME_AXIS_KEYS.includes(key)) continue;
    if ((mark.polarity as AxisPolarity) === "worked") bucket.worked.push(key);
    else bucket.hurt.push(key);
  }

  return rows.map((row) => ({
    id: row.id,
    result: row.result as DeckGame["result"],
    podSize: row.podSize,
    playedAt: row.playedAt,
    worked: byGame.get(row.id)!.worked,
    hurt: byGame.get(row.id)!.hurt,
  }));
}

/**
 * Pure. Takes rows that are already loaded and returns everything the panel
 * draws — which is what makes the whole aggregation testable without a
 * database, and why listDeckGames does no counting of its own.
 *
 * There is deliberately no minimum-games gate here. summarizeGames answers the
 * same way at N=1 as at N=30; PATTERN_MIN is a rendering decision the panel
 * makes about ink and headings, not a rule about what the data means.
 */
export function summarizeGames(games: DeckGame[]): GameSummary {
  const record = { wins: 0, losses: 0, draws: 0 };
  const tallies = new Map<GameAxisKey, AxisTally>();

  for (const g of games) {
    if (g.result === "win") record.wins += 1;
    else if (g.result === "loss") record.losses += 1;
    else record.draws += 1;

    for (const key of g.worked) tally(tallies, key).worked += 1;
    for (const key of g.hurt) tally(tallies, key).hurt += 1;
  }

  const axes = [...tallies.values()].map((t) => ({ ...t, net: t.worked - t.hurt }));

  return {
    count: games.length,
    record,
    axes: sortAxes(axes),
    keep: sortAxes(axes.filter((a) => a.net > 0)),
    fix: sortAxes(axes.filter((a) => a.net < 0)),
    mixed: sortAxes(axes.filter((a) => a.net === 0)),
  };
}

function tally(map: Map<GameAxisKey, AxisTally>, key: GameAxisKey): AxisTally {
  const existing = map.get(key);
  if (existing) return existing;
  const created = { key, worked: 0, hurt: 0, net: 0 };
  map.set(key, created);
  return created;
}

// Strongest signal first. The tie-break is the vocabulary order rather than
// alphabetical, so two axes of equal weight always appear in the same sequence
// they appear in on the form and on a history row.
function sortAxes(axes: AxisTally[]): AxisTally[] {
  return [...axes].sort((a, b) => {
    const byMagnitude = Math.abs(b.net) - Math.abs(a.net);
    if (byMagnitude !== 0) return byMagnitude;
    return GAME_AXIS_KEYS.indexOf(a.key) - GAME_AXIS_KEYS.indexOf(b.key);
  });
}
