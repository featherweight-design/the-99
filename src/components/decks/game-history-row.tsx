"use client";
// One logged game. The row is also the only correction path — §4 has no edit
// action — so its × opens the app's one delete confirm, floating under it.

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { deleteGame } from "../../app/decks/actions";
import { gameLogCopy } from "../../lib/copy/game-log";
import type { GameOpponent } from "../../lib/decks/game-opponents";
import type { DeckGame } from "../../lib/decks/games";
import { formatPlayed } from "../../lib/decks/format";
import { gameRowId } from "../../lib/games/landing";
import { noteAppScroll } from "../../lib/ui/reveal";
import { RING_FADE_CLASS } from "../../lib/ui/ring-timing";
import { ANCHORED_PANEL_CLASS, useAnchoredPanel } from "../ui/anchored-panel";
import { DeleteConfirm, DELETE_CONFIRM_WIDTH } from "../ui/delete-confirm";
import { GameRowBody, ResultHead } from "./game-row-parts";
import { useZone } from "../zone-context";

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
  /** Your tile in the Seats: this deck's name and its commander's art. */
  you: { deckName: string; artUri: string | null };
}

export function GameHistoryRow({ deckId, game, isLast, onDeleted, opponents, ringed = false, you }: GameHistoryRowProps) {
  const zone = useZone();
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
        "list-none scroll-mt-[80px] border-0 border-b border-solid border-b-[color:var(--border)] px-[14px] py-[12px] last:border-b-0 md:px-[16px] " + (ringed ? "" : RING_FADE_CLASS + " ") +
        (ringed
          ? "rounded-[10px] outline outline-2 outline-offset-0 outline-[color:var(--accent)] shadow-[0_0_0_6px_color-mix(in_srgb,var(--accent)_22%,transparent)]"
          // Unringed keeps a clear outline and halo, so the ring leaving fades (RING_FADE_CLASS) rather than snapping.
          : "rounded-[9px] outline outline-2 outline-offset-0 outline-transparent shadow-[0_0_0_6px_transparent]")
      }
    >
      <div className="flex items-center justify-between gap-[12px]">
        <ResultHead result={game.result} podSize={game.podSize} date={formatPlayed(game.playedAt, undefined, zone)} />
      {/* The ×, and the deck delete's pane floating under it: one confirm, drawn the way every
          delete in the app is drawn (`DeleteConfirm`), in the panel the deck ⋯ menu floats in. */}
      {/* A div, not a span: it holds the pane's block-level panel, and a span around a div is
          invalid nesting the HTML parser repairs before hydration. */}
      <div className="relative flex-none">
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

      <GameRowBody
        you={{ deckName: you.deckName, artUri: you.artUri, versionNumber: game.versionNumber }}
        seats={opponents ?? []}
        podSize={game.podSize}
        result={game.result}
        worked={game.worked}
        hurt={game.hurt}
        note={note}
      />
    </li>
  );
}
