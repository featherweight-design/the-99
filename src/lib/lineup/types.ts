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
  /** Whose decks the commanders' index describes: `Gishath`, or a pair's `Kratos + Atreus`. */
  basis: string;
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
  /** The art its hover preview shows: the printing the player owns, else the catalog's (the chain card details opens). */
  imageUri: string | null;
  /** Each deck playing it: the copies it asks for, and how many of those it has (all of them less Shopping's buy). */
  decks: { id: string; wants: number; held: number }[];
};

/** The collection's figures, per copy owned, basics left out, counted for both scopes. */
export type LineupCollection = {
  copies: number;
  cards: number;
  valueCents: number;
  all: { inDeckCopies: number; inDeckCents: number };
  finished: { inDeckCopies: number; inDeckCents: number };
  /** Owned cards a deck's commander list carries at 20% or more: what each deck wants, and its share. */
  wanted: { oracleId: string; name: string; imageUri: string | null; owned: number; wants: { deckId: string; n: number }[]; hits: { deckId: string; pct: number }[] }[];
};

export type LineupData = {
  /** Null when the collection reads failed, with the build figures. */
  collection: LineupCollection | null;
  decks: LineupDeck[];
  /** Null when the claim read failed, with the build figures. */
  shared: LineupShared[] | null;
  /** Distinct nonbasic cards across every deck, and across the finished ones: the Shared card's denominator. */
  cardCounts: { all: number; finished: number };
  /** The newest price the values were read at, ISO, or null with none. */
  pricesAsOf: string | null;
};

export type LineupFilter = "all" | "finished";
