// The Stats view's read (handoff `design_handoff_the99_lineup`, R2). SERVER-ONLY.
//
// A FIXED NUMBER OF READS, whatever the deck count (brief, lock 4): the deck list as `/decks` reads it,
// and one games read over every deck. Every per-deck figure is the deck's own (lock 2): the bracket is the
// tile's (`listDecksWithStats` with `includeBracket`, `storedPermitsSql`), the identity is `deckIdentity`, a
// brew is a deck never committed, and a game is the row its Games tab draws.

import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { deckGames } from "../../db/schema";
import { analysisTabEnabled } from "../decks/analysis-flag";
import { deckIdentity } from "../decks/format";
import { listDecksWithStats } from "../decks/read";
import { DEFAULT_DECK_SORT } from "../decks/sort";
import type { LineupData, LineupGame } from "./types";

export async function loadLineup(userId: string): Promise<LineupData> {
  // The bracket follows the tile's own switch: a bracket only the Analysis tab can explain is drawn
  // only while that tab exists.
  const decks = await listDecksWithStats(userId, DEFAULT_DECK_SORT, { includeBracket: analysisTabEnabled() });
  const ids = decks.map((d) => d.id);
  const rows = ids.length === 0
    ? []
    : await db
      .select({ deckId: deckGames.deckId, result: deckGames.result, podSize: deckGames.podSize, playedAt: deckGames.playedAt })
      .from(deckGames)
      .where(and(eq(deckGames.userId, userId), inArray(deckGames.deckId, ids)))
      // `listDeckGames`' order, so a deck's games read newest first here as on its Games tab.
      .orderBy(desc(deckGames.playedAt), desc(deckGames.createdAt));
  const games = new Map<string, LineupGame[]>();
  for (const r of rows) {
    const list = games.get(r.deckId) ?? [];
    list.push({ result: r.result as LineupGame["result"], playedAt: r.playedAt.toISOString(), podSize: r.podSize });
    games.set(r.deckId, list);
  }
  return {
    decks: decks.map((d) => ({
      id: d.id,
      name: d.name,
      identity: deckIdentity(d.commanderColorIdentity, d.partnerColorIdentity),
      brew: d.lastCommittedAt === null,
      bracket: d.bracket,
      games: games.get(d.id) ?? [],
    })),
  };
}
