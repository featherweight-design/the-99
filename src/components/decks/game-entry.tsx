"use client";

// One game in the cross-deck Games view (design handoff `design_handoff_the99_games_tabs`, Seats): a head with the result
// and `3 players · Nov 19`, and the way to the deck in words (`Open {deck}`, the phone's `Open deck`), then the Seats, the
// Helped and Hurt marks and the note. The press is the link in the head, to the deck's Games tab at that game
// (`?tab=games&game=<id>`), where it is scrolled into view and ringed. Read-only: the tab stays the only place a game is
// logged, corrected or deleted. Every name in the seats is the owner's snapshot.

import Link from "next/link";
import { memo } from "react";
import { gameHistoryCopy } from "../../lib/copy/game-history";
import { formatPlayed } from "../../lib/decks/format";
import { gameHref } from "../../lib/games/landing";
import type { HistoryGame } from "../../lib/games/history";
import { PendingReporter } from "../shell/pending-reporter";
import { GameRowBody, ResultHead } from "./game-row-parts";
import { useZone } from "../zone-context";

const copy = gameHistoryCopy.row;

function Chevron() {
  return (
    <svg aria-hidden width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 5.5 12.5 10 8 14.5" />
    </svg>
  );
}

/** Memoized: the list grows by windows and the rows already drawn are the same objects, so they do not draw again. */
export const GameEntry = memo(function GameEntry({ game }: { game: HistoryGame }) {
  const zone = useZone();
  const href = gameHref(game.deck.id, game.id);
  const note = game.note?.trim() ? game.note : null;
  return (
    <li data-game-entry={game.id} className="list-none border-0 border-b border-solid border-b-[color:var(--border)] px-[14px] py-[12px] last:border-b-0 md:px-[16px]">
      <div className="flex items-center justify-between gap-[12px]">
        <ResultHead result={game.result} podSize={game.podSize} date={formatPlayed(game.playedAt, undefined, zone)} />
        <Link
          href={href}
          className="inline-flex min-h-[44px] min-w-0 flex-none items-center gap-[4px] text-[12.5px] text-[color:var(--accent-text)] hover:underline md:min-h-[32px]"
        >
          <PendingReporter href={href} />
          <span className="min-w-0 truncate md:hidden">{copy.openShort}</span>
          <span className="hidden max-w-[260px] truncate md:inline">{copy.open(game.deck.name)}</span>
          <Chevron />
        </Link>
      </div>
      <GameRowBody
        you={{ deckName: game.deck.name, artUri: game.deck.commanderArtCropUri ?? null, versionNumber: game.versionNumber }}
        seats={game.opponents}
        podSize={game.podSize}
        result={game.result}
        worked={game.worked}
        hurt={game.hurt}
        note={note}
      />
    </li>
  );
});
