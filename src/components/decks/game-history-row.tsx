"use client";
// One logged game. The row is also the only correction path — §4 has no edit
// action — so the delete confirm lives inside the row rather than in a dialog.

import { useState, useTransition } from "react";
import { deleteGame } from "../../app/decks/actions";
import { GAME_AXIS_KEYS, type GameAxisKey } from "../../lib/decks/game-axes";
import { axisCopy, gameLogCopy } from "../../lib/copy/game-log";
import type { DeckGame } from "../../lib/decks/games";
import { MutationError } from "./mutation-error";

export interface GameHistoryRowProps {
  deckId: string;
  game: DeckGame;
  /** True when this is the only game left, so the announcement can say so. */
  isLast: boolean;
  onDeleted: (wasLast: boolean) => void;
}

const RESULT_GLYPH = {
  win: gameLogCopy.history.won,
  loss: gameLogCopy.history.lost,
  draw: gameLogCopy.history.drawn,
} as const;

// "12 Aug" — the design's locator. The year appears only when it is not the
// current one, so a log read in the same season stays short.
// Composed rather than handed whole to Intl: en-GB abbreviates September as
// "Sept", which is correct but a character wider than the fixed meta slot was
// drawn for.
function formatPlayed(date: Date, now: Date = new Date()): string {
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const stem = `${date.getDate()} ${month}`;
  return date.getFullYear() === now.getFullYear() ? stem : `${stem} ${date.getFullYear()}`;
}

export function GameHistoryRow({ deckId, game, isLast, onDeleted }: GameHistoryRowProps) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // One pass over the vocabulary rather than concatenating the two lists:
  // grouping the marks by direction would break the row's reading order away
  // from the form's, for no gain.
  type Mark = { key: GameAxisKey; polarity: "worked" | "hurt" };
  const marks = GAME_AXIS_KEYS.flatMap<Mark>((key) =>
    game.worked.includes(key)
      ? [{ key, polarity: "worked" }]
      : game.hurt.includes(key)
        ? [{ key, polarity: "hurt" }]
        : [],
  );

  function confirm() {
    startTransition(async () => {
      setError(null);
      const outcome = await deleteGame(deckId, game.id);
      if (!outcome.ok) {
        setError(outcome.message ?? gameLogCopy.history.deleteRefused);
        setConfirming(false);
        return;
      }
      // The row lives until the route revalidates. Leaving it confirming would
      // show the question again, re-enabled, for as long as that takes.
      setConfirming(false);
      onDeleted(isLast);
    });
  }

  return (
    <li className="flex flex-wrap md:flex-nowrap items-center gap-[14px] min-h-[64px] md:min-h-[52px] rounded-[9px] pl-[14px] pr-[12px] py-[8px] bg-surface border border-border">
      {/* Result square — never --danger. A loss is a result, not an error. */}
      <span
        className={
          "flex-none flex items-center justify-center w-[26px] h-[26px] rounded-[7px] font-mono text-[12px] font-semibold border " +
          (game.result === "win" ? "border-success text-success" : "border-border-strong text-fg-body")
        }
      >
        {RESULT_GLYPH[game.result]}
      </span>

      <span className="flex-none md:w-[132px] font-mono text-[11px] tabular-nums text-fg-faint">
        {gameLogCopy.history.meta(String(game.podSize), formatPlayed(game.playedAt))}
      </span>

      <span className="flex-1 min-w-0 flex flex-wrap gap-[6px]">
        {marks.length === 0 ? (
          <span className="font-mono text-[10.5px] text-fg-locked">{gameLogCopy.history.noMarks}</span>
        ) : (
          marks.map(({ key, polarity }) => (
            <span
              key={key}
              className="inline-flex items-center gap-[6px] rounded-full pl-[8px] pr-[11px] py-[4px] font-mono text-[10.5px] bg-elevated text-fg-body"
            >
              <span
                aria-hidden
                className={
                  "w-[6px] h-[6px] rounded-full flex-none " +
                  (polarity === "worked" ? "bg-success" : "bg-warning")
                }
              />
              {axisCopy[key].label}
            </span>
          ))
        )}
      </span>

      {confirming ? (
        <span className="flex-none flex items-center gap-[8px]">
          <span className="text-[11.5px] text-fg-body">{gameLogCopy.history.confirm}</span>
          <button
            type="button"
            disabled={isPending}
            onClick={confirm}
            className="min-h-[44px] md:min-h-[30px] px-[14px] md:px-[10px] rounded-[7px] text-[11.5px] border border-border-strong text-danger bg-transparent cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            {gameLogCopy.history.confirmYes}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => setConfirming(false)}
            className="min-h-[44px] md:min-h-[30px] px-[14px] md:px-[10px] rounded-[7px] text-[11.5px] border border-border text-fg-body bg-transparent cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            {gameLogCopy.history.confirmNo}
          </button>
        </span>
      ) : (
        <button
          type="button"
          aria-label={gameLogCopy.history.delete}
          onClick={() => setConfirming(true)}
          className="flex-none flex items-center justify-center w-[44px] h-[44px] md:w-[30px] md:h-[30px] rounded-[7px] border border-border font-mono text-[13px] text-fg-locked hover:text-danger bg-transparent cursor-pointer"
        >
          ×
        </button>
      )}

      {error && (
        <span className="w-full">
          <MutationError message={error} />
        </span>
      )}
    </li>
  );
}
