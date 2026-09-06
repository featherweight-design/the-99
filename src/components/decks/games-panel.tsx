"use client";
// GamesPanel — the Games view's body: headline, aggregate, form, history.
// A peer of the decklist and Consider rather than a drawer beside them, so it
// owns its own vertical rhythm and does not inherit the decklist's.

import type { DeckGame, GameSummary } from "../../lib/decks/games";
import { deriveHeadline } from "../../lib/decks/game-headline";
import { gameLogCopy } from "../../lib/copy/game-log";

export interface GamesPanelProps {
  deckId: string;
  games: DeckGame[];
  summary: GameSummary;
}

export function GamesPanel({ games, summary }: GamesPanelProps) {
  const headline = deriveHeadline(summary);

  return (
    <section className="px-[16px] py-[14px] md:px-[30px] md:py-[20px]">
      {headline && (
        <header className="mb-[14px] md:mb-[20px]">
          <h3 className="font-display text-[20px] md:text-[26px] leading-[1.2] text-[color:var(--fg)]">
            {headline.heading}
            {/* N=1 only. At N>=2 the record is a clause inside the sub-line, so
                a span here would print it twice. */}
            {headline.record && (
              <>
                {" "}
                <span className="font-mono text-[13px] tabular-nums text-[color:var(--accent)]">
                  {headline.record}
                </span>
              </>
            )}
          </h3>
          {headline.sub && (
            <p className="mt-[6px] text-[13.5px] leading-[1.5] text-[color:var(--fg-body)]">
              {headline.sub}
            </p>
          )}
        </header>
      )}
      <h2 className="font-mono uppercase text-[9px] md:text-[11px] tracking-[0.1em] md:tracking-[0.12em] text-[color:var(--fg-faint)]">
        {gameLogCopy.history.heading}
      </h2>
      <ul>
        {games.map((g) => (
          <li key={g.id}>{g.result}</li>
        ))}
      </ul>
    </section>
  );
}
