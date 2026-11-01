"use client";

// One game in the cross-deck Games view (design handoff `design_handoff_the99_game_history`, Rows R1-R2): the shipped
// history row with its deck added (commander art and name: the row's first line on the phone, a 230px column from md,
// the width of the Stats lanes' name column) and a chevron, and the ✕ removed. The whole row is ONE press: the deck's
// Games tab at that game (`?tab=games&game=<id>`), where it is scrolled into view and ringed. Read-only: the tab stays the
// only place a game is logged, corrected or deleted. Every name in the vs line is the owner's snapshot.

import Link from "next/link";
import { memo } from "react";
import { gameLogCopy } from "../../lib/copy/game-log";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { formatPlayedUtc } from "../../lib/decks/format";
import { gameHref } from "../../lib/games/landing";
import type { HistoryGame } from "../../lib/games/history";
import { ArtLayer } from "../ui/art-layer";
import { PendingReporter } from "../shell/pending-reporter";
import { GameMarks, GameNote } from "./game-row-parts";
import { GameVsLine } from "./game-vs-line";
import { IdentityMark } from "./lineup/identity-mark";

const RESULT_GLYPH = { win: gameLogCopy.history.won, loss: gameLogCopy.history.lost, draw: gameLogCopy.history.drawn } as const;

/** The deck's commander art at the board's 26px (radius 6, the tile's crop); the identity mark when the deck has no art to draw. */
function DeckArt({ deck }: { deck: HistoryGame["deck"] }) {
  if (!deck.commanderArtCropUri) return <IdentityMark identity={deck.identity} />;
  return (
    <span aria-hidden className="relative h-[26px] w-[26px] flex-none overflow-hidden rounded-[6px] bg-elevated">
      <ArtLayer src={deck.commanderArtCropUri} style={{ backgroundPosition: "50% 25%" }} />
    </span>
  );
}

function Chevron({ className }: { className: string }) {
  return (
    <span aria-hidden className={`${className} w-[24px] flex-none items-center justify-end text-fg-faint`}>
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 5.5 12.5 10 8 14.5" />
      </svg>
    </span>
  );
}

/** Memoized: the list grows by windows and the rows already drawn are the same objects, so they do not draw again. */
export const GameEntry = memo(function GameEntry({ game }: { game: HistoryGame }) {
  const href = gameHref(game.deck.id, game.id);
  const note = game.note?.trim() ? game.note : null;
  return (
    <li data-game-entry={game.id} className="list-none">
      <Link
        href={href}
        className="flex min-h-[64px] flex-col rounded-[9px] border border-border bg-surface py-[8px] pr-[12px] pl-[14px] hover:bg-[color:var(--surface-raised)] md:min-h-[52px]"
      >
        <PendingReporter href={href} />
        <div className="flex flex-1 flex-wrap items-center gap-x-[14px] gap-y-[14px] md:flex-nowrap">
          {/* The deck leads: line one on the phone (a rule under it), a fixed column from md. */}
          <span className="flex min-w-0 basis-full items-center gap-[7px] border-0 border-b border-solid border-b-[color:var(--border)] pt-[2px] pb-[6px] -mb-[8px] md:basis-[230px] md:mb-0 md:flex-none md:border-b-0 md:pt-0 md:pb-0">
            <DeckArt deck={game.deck} />
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium leading-[1.4] text-[color:var(--fg)]">{game.deck.name}</span>
            <Chevron className="flex md:hidden" />
          </span>

          {/* Result square: never --danger. A loss is a result, not an error. */}
          <span
            className={
              "flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[7px] border font-mono text-[12px] font-semibold " +
              (game.result === "win" ? "border-success text-success" : "border-border-strong text-fg-body")
            }
          >
            {RESULT_GLYPH[game.result]}
          </span>
          <span className="flex-none font-mono text-[11px] leading-[normal] tabular-nums text-fg-faint md:w-[156px]">
            {gameLogCopy.history.meta(String(game.podSize), formatPlayedUtc(game.playedAt))}
          </span>
          <span className={"w-[44px] flex-none font-mono text-[10.5px] leading-[normal] tabular-nums " + (game.versionNumber === null ? "text-fg-locked" : "text-fg-faint")}>
            {game.versionNumber === null ? deckVersioningCopy.stamp.absent : deckVersioningCopy.stamp.value(game.versionNumber)}
          </span>
          <GameMarks worked={game.worked} hurt={game.hurt} note={note} normalLeading />
          <Chevron className="hidden md:flex" />
        </div>
        {game.opponents.length > 0 && <GameVsLine seats={game.opponents} inset="md:ml-[488px]" />}
        {note !== null && <GameNote note={note} inset="md:pl-[284px]" />}
      </Link>
    </li>
  );
});
