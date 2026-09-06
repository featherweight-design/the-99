"use client";
// GamesPanel — the Games view's body: headline, aggregate, form, history.
// A peer of the decklist and Consider rather than a drawer beside them, so it
// owns its own vertical rhythm and does not inherit the decklist's.

import type { DeckGame, GameSummary } from "../../lib/decks/games";
import { gameLogCopy } from "../../lib/copy/game-log";

export interface GamesPanelProps {
  deckId: string;
  games: DeckGame[];
  summary: GameSummary;
}

export function GamesPanel({ games, summary }: GamesPanelProps) {
  return (
    <section className="px-[16px] py-[14px] md:px-[30px] md:py-[20px]">
      <h2 className="font-mono uppercase text-[9px] md:text-[11px] tracking-[0.1em] md:tracking-[0.12em] text-[color:var(--fg-faint)]">
        {gameLogCopy.history.heading}
      </h2>
      <p className="sr-only">{summary.count} games</p>
      <ul>
        {games.map((g) => (
          <li key={g.id}>{g.result}</li>
        ))}
      </ul>
    </section>
  );
}
