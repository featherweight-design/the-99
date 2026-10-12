// What the Stats view on /decks reads (handoff `design_handoff_the99_lineup`, R2). Types only, so the
// client view compiles without the server read that fills them (`load.ts`).

import type { GameResult } from "../decks/stats";
import type { TileBracket } from "../decks/read";

/** One logged game, as the deck's own Games tab holds it. `playedAt` is an ISO instant. */
export type LineupGame = { result: GameResult; playedAt: string; podSize: number };

export type LineupDeck = {
  id: string;
  name: string;
  /** The commanders' combined identity, W U B R G order (`deckIdentity`). Empty for colorless. */
  identity: string[];
  /** Never committed: a brew. `Finished only` leaves these out. */
  brew: boolean;
  /** The tile's own bracket (`tileBracket`): the stored range and the declaration answering it. */
  bracket: TileBracket | null;
  /** Newest first, as `listDeckGames` returns them. */
  games: LineupGame[];
};

export type LineupData = { decks: LineupDeck[] };

export type LineupFilter = "all" | "finished";
