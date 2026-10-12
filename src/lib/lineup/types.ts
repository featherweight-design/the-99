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
  /** The deck's own build figures, from the functions its Stats tab uses (lock 2). Null when that read failed. */
  build: LineupBuild | null;
};

/** What This deck among yours, Jobs and What each deck is worth draw for a deck. */
export type LineupBuild = {
  /** Average mana value of the 99's nonland cards (`averageManaValue`), unrounded; null for an all-land list. */
  manaValue: number | null;
  /** Land copies in the 99. */
  lands: number;
  /** Copies in each job, from `jobTally` over the 99's nonland cards: the deck's own Jobs card. */
  ramp: number;
  draw: number;
  removal: number;
  /** Money's own value (`moneyStats`): every priced copy, commanders included, in cents. */
  valueCents: number;
};

/** A nonbasic card two or more decks play (Cards your decks share). */
export type LineupShared = {
  oracleId: string;
  name: string;
  /** Copies owned, from the collection: never narrowed by a filter (ruling 3). */
  owned: number;
  /** Each deck playing it: the copies it asks for, and how many of those the claim model gives it. */
  decks: { id: string; wants: number; held: number }[];
};

export type LineupData = {
  decks: LineupDeck[];
  /** Null when the claim read failed, with the build figures. */
  shared: LineupShared[] | null;
  /** The newest price the values were read at, ISO, or null with none. */
  pricesAsOf: string | null;
};

export type LineupFilter = "all" | "finished";
