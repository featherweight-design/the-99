"use client";
// One logged game. The row is also the only correction path — §4 has no edit
// action — so the delete confirm lives inside the row rather than in a dialog.

import { useState, useTransition } from "react";
import { deleteGame } from "../../app/decks/actions";
import { GAME_AXIS_KEYS, type GameAxisKey } from "../../lib/decks/game-axes";
import { axisCopy, gameLogCopy } from "../../lib/copy/game-log";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
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

  // A note is a second LINE of the row, so the `<li>` is a column and the
  // slots that were its children move into an inner row. A row with no note is
  // then exactly the row that shipped: the column has one child, and every
  // metric on it — the min-height, the padding, the border — is unmoved.
  const note = game.note?.trim() ? game.note : null;

  return (
    <li className="flex flex-col min-h-[64px] md:min-h-[52px] rounded-[9px] pl-[14px] pr-[12px] py-[8px] bg-surface border border-border">
      <div className="flex flex-wrap md:flex-nowrap items-center gap-[14px] flex-1">
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

      {/* The version that was on the table. A fixed slot, drawn even when the
          game has none: the dash keeps the marks that follow it on one vertical,
          and an absent stamp is history rather than a gap. On the phone the meta
          cell to its left sizes to its own text, so the whole sequence shifts
          with the date's width — that is the log's existing behaviour at that
          width and the stamp inherits it rather than fixing it. */}
      <span
        className={
          "flex-none w-[44px] font-mono text-[10.5px] tabular-nums " +
          (game.versionNumber === null ? "text-fg-locked" : "text-fg-faint")
        }
      >
        {game.versionNumber === null
          ? deckVersioningCopy.stamp.absent
          : deckVersioningCopy.stamp.value(game.versionNumber)}
      </span>

      {/* The handoff's phone row: result and meta on line one, the chips wrapping on line two
          (64px minimum). `order-last` with a full basis is what moves them down there; sharing line
          one, they were squeezed into what the meta, stamp and delete left over (Hugh, 2026-09-27). */}
      <span data-marks className="order-last basis-full md:order-none md:basis-auto flex-1 min-w-0 flex flex-wrap gap-[6px]">
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
        {/* The note, for the ear, in the place the table puts it: inside the
            row's description, immediately after the marks. The line the eye
            reads is a second line BELOW the row's controls, so leaving it to
            carry the description would announce the delete button between the
            marks and the note. The visible line is `aria-hidden` and this is
            the only copy anything speaks. */}
        {note !== null && (
          <span className="sr-only">{`${gameLogCopy.history.noteSpoken}\u201C${note}\u201D`}</span>
        )}
      </span>

      {confirming ? (
        <span className="ml-auto md:ml-0 flex-none flex items-center gap-[8px]">
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
          className="ml-auto md:ml-0 flex-none flex items-center justify-center w-[44px] h-[44px] md:w-[30px] md:h-[30px] rounded-[7px] border border-border font-mono text-[13px] text-fg-locked hover:text-danger bg-transparent cursor-pointer"
        >
          ×
        </button>
      )}

      {error && (
        <span className="order-last w-full">
          <MutationError message={error} />
        </span>
      )}
      </div>

      {/* The note line — deck-tuning.md §Note line. Rendered only when there is
          one, with nothing reserved when there is not. Indented to the mark
          column on desktop and flush on the phone, where the row stacks anyway.
          The rule is its own 2px element rather than a border, because the
          handoff gives it a radius and a background of its own. Quoted in
          typographic quotes: it is somebody's sentence, not a field's value. */}
      {note !== null && (
        <div
          aria-hidden
          className="flex gap-[10px] md:gap-[11px] mt-[8px] md:mt-[7px] md:mb-[1px] md:pl-[40px]"
        >
          <span className="flex-none w-[2px] rounded-full bg-border-strong" />
          {/* No truncation and no line clamp: the 140-character cap is what
              makes that safe, and it is enforced by the column's own check.
              `min-w-0` is what makes `break-words` bite — a flex item's
              automatic min-content width otherwise holds an unbroken 140
              characters at full width and pushes the row off a 390px screen,
              which is exactly the case the cap was supposed to make safe. */}
          <span className="min-w-0 italic text-[12.5px] leading-[1.5] text-fg-muted break-words">
            {`\u201C${note}\u201D`}
          </span>
        </div>
      )}
    </li>
  );
}
