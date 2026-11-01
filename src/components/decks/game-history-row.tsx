"use client";
// One logged game. The row is also the only correction path — §4 has no edit
// action — so its × opens the app's one delete confirm, floating under it.

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { deleteGame } from "../../app/decks/actions";
import { gameLogCopy } from "../../lib/copy/game-log";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import type { GameOpponent } from "../../lib/decks/game-opponents";
import type { DeckGame } from "../../lib/decks/games";
import { formatPlayed } from "../../lib/decks/format";
import { gameRowId } from "../../lib/games/landing";
import { noteAppScroll } from "../../lib/ui/reveal";
import { ANCHORED_PANEL_CLASS, useAnchoredPanel } from "../ui/anchored-panel";
import { DeleteConfirm, DELETE_CONFIRM_WIDTH } from "../ui/delete-confirm";
import { GameMarks, GameNote } from "./game-row-parts";
import { GameVsLine } from "./game-vs-line";

export interface GameHistoryRowProps {
  deckId: string;
  game: DeckGame;
  /** True when this is the only game left, so the announcement can say so. */
  isLast: boolean;
  onDeleted: (wasLast: boolean) => void;
  /** Who sat across the table, as logged (Social R3). Absent or empty: no line, nothing reserved. */
  opponents?: readonly GameOpponent[];
  /** The cross-deck Games view landed here (`?tab=games&game=<id>`): scroll into view and ring for the panel's two seconds. */
  ringed?: boolean;
}

const RESULT_GLYPH = {
  win: gameLogCopy.history.won,
  loss: gameLogCopy.history.lost,
  draw: gameLogCopy.history.drawn,
} as const;

export function GameHistoryRow({ deckId, game, isLast, onDeleted, opponents, ringed = false }: GameHistoryRowProps) {
  const rowRef = useRef<HTMLLIElement>(null);
  // On arrival only: the ring clearing is not a reason to move the page again.
  useEffect(() => {
    if (!ringed) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    noteAppScroll();
    rowRef.current?.scrollIntoView?.({ block: "center", behavior: reduce ? "auto" : "smooth" });
    // Focus on the game, so a screen reader lands on it and reads it: the ring is only what the eye gets.
    rowRef.current?.focus?.({ preventScroll: true });
  }, [ringed]);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // The synchronous guard, as the deck's pane keeps one: two presses can both land before React
  // commits `isPending` and disables the button, and each would send its own delete.
  const inFlight = useRef(false);
  // The deck delete's own pane, floating under the × in the same panel (Hugh, 2026-09-27).
  const { at, place, triggerRef, panelRef } = useAnchoredPanel({ open: confirming, width: DELETE_CONFIRM_WIDTH });
  const panelId = useId();

  // A refusal belongs to the pane that showed it: the row outlives the pane, so the error is
  // cleared here or the next confirm would open with the last one's refusal already in it.
  function keep() {
    setConfirming(false);
    setError(null);
    triggerRef.current?.focus();
  }

  function confirm() {
    if (inFlight.current) return;
    inFlight.current = true;
    startTransition(async () => {
      setError(null);
      let outcome: Awaited<ReturnType<typeof deleteGame>>;
      try {
        outcome = await deleteGame(deckId, game.id);
      } catch {
        // A request that never reached the server (offline, a dropped connection) deleted
        // nothing either, so it reads as the same refusal rather than escaping to the page.
        outcome = { ok: false, message: gameLogCopy.history.deleteRefused };
      } finally {
        inFlight.current = false;
      }
      if (!outcome.ok) {
        // The pane stays open and says so, as the deck's does: nothing was deleted.
        setError(outcome.message ?? gameLogCopy.history.deleteRefused);
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
    <li
      ref={rowRef}
      id={gameRowId(game.id)}
      data-ringed={ringed ? "" : undefined}
      tabIndex={ringed ? -1 : undefined}
      // The arrival ring (handoff Place W3): a 2px accent border drawn outside the row, a 4px halo beyond it, radius 10.
      // The accent as an outline and a soft halo, never text.
      className={
        "flex flex-col min-h-[64px] md:min-h-[52px] pl-[14px] pr-[12px] py-[8px] bg-surface border transition-shadow duration-300 scroll-mt-[80px] " +
        (ringed
          ? "border-border rounded-[10px] outline outline-2 outline-offset-0 outline-[color:var(--accent)] shadow-[0_0_0_6px_color-mix(in_srgb,var(--accent)_22%,transparent)]"
          : "border-border rounded-[9px]")
      }
    >
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

      {/* 156 on desktop (Small items 7, addendum 5): the slot holds the longest month-first meta,
          `4-player · Dec 31, 2025`, on one line at 11px mono. The phone sizes to its text, unchanged. */}
      <span className="flex-none md:w-[156px] font-mono text-[11px] tabular-nums text-fg-faint">
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

      <GameMarks worked={game.worked} hurt={game.hurt} note={note} />

      {/* The ×, and the deck delete's pane floating under it: one confirm, drawn the way every
          delete in the app is drawn (`DeleteConfirm`), in the panel the deck ⋯ menu floats in. */}
      {/* A div, not a span: it holds the pane's block-level panel, and a span around a div is
          invalid nesting the HTML parser repairs before hydration. */}
      <div className="relative ml-auto md:ml-0 flex-none">
        <button
          ref={triggerRef}
          type="button"
          aria-label={gameLogCopy.history.delete}
          aria-expanded={confirming}
          aria-controls={confirming ? panelId : undefined}
          onClick={() => {
            if (isPending) return;
            if (!confirming) place();
            setError(null);
            setConfirming((c) => !c);
          }}
          className="flex items-center justify-center w-[44px] h-[44px] md:w-[30px] md:h-[30px] rounded-[7px] border border-border font-mono text-[13px] text-fg-locked hover:text-danger bg-transparent cursor-pointer transition-colors"
        >
          ×
        </button>
        {confirming && (
          <div
            id={panelId}
            ref={panelRef}
            onKeyDown={(e) => {
              if (e.key === "Escape" && !isPending) keep();
            }}
            // Held to the room on the side it hangs, the confirm scrolling inside, so a short
            // window never puts its buttons past the fold or under the tab bar.
            style={{
              width: DELETE_CONFIRM_WIDTH,
              ...(at ? { position: "fixed", top: at.top, left: at.left, marginTop: 0, maxHeight: at.maxHeight } : {}),
            }}
            className={`absolute right-0 top-full mt-[6px] sm:mt-[4px] flex flex-col ${ANCHORED_PANEL_CLASS}`}
          >
            <DeleteConfirm
              heading={gameLogCopy.history.confirm}
              body={gameLogCopy.history.confirmBody}
              cancelLabel={gameLogCopy.history.confirmNo}
              confirmLabel={gameLogCopy.history.confirmYes}
              pendingLabel={gameLogCopy.history.deleting}
              pending={isPending}
              error={error}
              onCancel={keep}
              onConfirm={confirm}
            />
          </div>
        )}
      </div>

      </div>

      {opponents && opponents.length > 0 && <GameVsLine seats={opponents} />}

      {/* The note line — deck-tuning.md §Note line; flush on the phone, indented to the mark column on desktop. */}
      {note !== null && <GameNote note={note} inset="md:pl-[40px]" />}
    </li>
  );
}
