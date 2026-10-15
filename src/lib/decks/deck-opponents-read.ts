/**
 * A deck's games with their opponents and the matchups drawn from them (Social R3 plan, PR 1). The deck page's
 * Games tab reads it, behind `SOCIAL_GAMES_ENABLED`.
 *
 * **It never throws.** Opponents are an ornament on a game the player already logged: a read that fails leaves
 * the games exactly as they were, with no opponents and no Matchups, and never an error on the deck page.
 * `null` is both "the switch is off" and "the read failed", and the caller draws neither differently: a deck
 * with no recorded opponents draws no Matchups section at all.
 */
import { loadOpeningArt } from "../cards/opening-printing";
import { socialGamesEnabled } from "../social/flag";
import type { DeckGame } from "./games";
import { listGameOpponents, type GameOpponent, type OpponentCommander } from "./game-opponents";
import { summarizeMatchups, type Matchups } from "./matchups";

export type DeckOpponents = {
  /** Seats by game id, as logged. A game with none is absent. */
  opponents: Map<string, GameOpponent[]>;
  matchups: Matchups;
};

/** What crosses to the Games tab: plain objects, so the seats ride as a record. */
export type DeckOpponentsWire = {
  opponents: Record<string, GameOpponent[]>;
  matchups: Matchups;
};

export const opponentsWire = (read: DeckOpponents): DeckOpponentsWire => ({
  opponents: Object.fromEntries(read.opponents),
  matchups: read.matchups,
});

/**
 * The art a thumbnail draws for each commander a seat names, the printing card details opens (the same
 * one the seat picker drew when the seat was filled). Fail-soft: a failed art read leaves the seats
 * with initials and the matchups with pips, and never costs the opponents themselves.
 */
async function withArt(opponents: Map<string, GameOpponent[]>): Promise<Map<string, GameOpponent[]>> {
  const ids = new Set<string>();
  for (const seats of opponents.values()) {
    for (const s of seats) for (const c of [s.commander, s.partner]) if (c) ids.add(c.oracleId);
  }
  if (ids.size === 0) return opponents;
  const art = await loadOpeningArt([...ids]).catch(() => new Map<string, string>());
  const dress = (c: OpponentCommander | null): OpponentCommander | null => (c ? { ...c, imageUri: art.get(c.oracleId) ?? null } : null);
  return new Map([...opponents].map(([game, seats]) => [game, seats.map((s) => ({ ...s, commander: dress(s.commander), partner: dress(s.partner) }))]));
}

export async function loadDeckOpponents(
  deckId: string,
  userId: string,
  games: readonly DeckGame[],
  env: NodeJS.ProcessEnv,
  // Injected so a test can fail the read. The page passes none.
  read: typeof listGameOpponents = listGameOpponents,
): Promise<DeckOpponents | null> {
  if (!socialGamesEnabled(env) || games.length === 0) return null;
  try {
    const opponents = await withArt(await read(deckId, userId));
    return { opponents, matchups: summarizeMatchups(games, opponents) };
  } catch (error) {
    console.error("game opponents: the deck's opponents could not be read", error);
    return null;
  }
}
