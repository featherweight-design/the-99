import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { deckGames, deckGameAxes, deckVersions } from "../../db/schema";
import { GAME_AXIS_KEYS, type AxisPolarity, type GameAxisKey } from "./game-axes";

export type DeckGame = {
  id: string;
  result: "win" | "loss" | "draw";
  podSize: number;
  playedAt: Date;
  /**
   * The version that was on the table the night this game was played, or null.
   *
   * Null is a real state and not a failure: games logged before versioning
   * arrived have no version to point at, and `on delete set null` means a
   * version deleted out from under a game leaves the game standing. The row
   * renders it as a dash rather than dropping the slot.
   */
  versionNumber: number | null;
  /**
   * What happened, in the player's own words, or null when there was nothing
   * worth writing down — which is most games. The log form writes it; a game
   * already logged has no edit path, so a note added to one afterwards is
   * written by hand against the database. The row draws whatever is there, to
   * #10's handoff.
   */
  note: string | null;
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
  /**
   * Games carrying at least one mark. The sub-line says "Marked in 3 of 5
   * games", and that numerator is not derivable from the tallies: one game can
   * contribute to several axes, so summing them would overcount.
   */
  marked: number;
  record: { wins: number; losses: number; draws: number };
  /**
   * Every marked axis in vocabulary order. The buckets below rank by strength;
   * this list is the flat one the N=1 panel draws, where ranking would be a
   * claim about a single game.
   */
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
      note: deckGames.note,
      versionNumber: deckVersions.number,
    })
    .from(deckGames)
    // LEFT, never inner: an unstamped game is history the log still has to draw,
    // and an inner join would delete it from the list to avoid printing a dash.
    // Scoped to the same deck as well as the id, because `version_id` is a
    // foreign key to `deck_versions.id` alone: a row pointing at another deck's
    // version would otherwise be stamped with that deck's `vN` here while
    // `listVersions` leaves it out of its games-held tally, and the two surfaces
    // would disagree. Out of scope, the join misses and the game reads unstamped.
    .leftJoin(
      deckVersions,
      and(eq(deckVersions.id, deckGames.versionId), eq(deckVersions.deckId, deckGames.deckId)),
    )
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
    note: row.note,
    versionNumber: row.versionNumber,
    worked: byGame.get(row.id)!.worked,
    hurt: byGame.get(row.id)!.hurt,
  }));
}

// The pure aggregation lives in its own module so a client component (the About figures) can import it
// without pulling in the database through this one. Re-exported: every existing caller is unchanged.
export { summarizeGames } from "./games-summary";
