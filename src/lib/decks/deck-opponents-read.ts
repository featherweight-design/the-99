/**
 * A deck's games with their opponents and the matchups drawn from them (Social R3 plan, PR 1). The deck page's
 * Games tab reads it, behind `SOCIAL_GAMES_ENABLED`.
 *
 * **It never throws.** Opponents are an ornament on a game the player already logged: a read that fails leaves
 * the games exactly as they were, with no opponents and no Matchups, and never an error on the deck page.
 * `null` is both "the switch is off" and "the read failed", and the caller draws neither differently: a deck
 * with no recorded opponents draws no Matchups section at all.
 */
import { socialGamesEnabled } from "../social/flag";
import type { DeckGame } from "./games";
import { listGameOpponents, type GameOpponent } from "./game-opponents";
import { summarizeMatchups, type Matchups } from "./matchups";

export type DeckOpponents = {
  /** Seats by game id, as logged. A game with none is absent. */
  opponents: Map<string, GameOpponent[]>;
  matchups: Matchups;
};

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
    const opponents = await read(deckId, userId);
    return { opponents, matchups: summarizeMatchups(games, opponents) };
  } catch (error) {
    console.error("game opponents: the deck's opponents could not be read", error);
    return null;
  }
}
