"use client";

// A failed read of the cross-deck Games view, said in the app's shared toast (design handoff `design_handoff_the99_game_history`,
// Edges L3 and X1-X2): `role="alert"`, the sentence and a `Try again`. It never replaces what is on the page: the first read
// failing leaves the deck tiles drawn, and the next window failing leaves the rows already shown. Closes itself on the
// shared clock, held while the pointer or focus is on it.

import { useRef, useState } from "react";
import { gameHistoryCopy } from "../../lib/copy/game-history";
import { ToastFrame, useToastClock } from "../collection/edit-toast";

export function GamesFailedToast({ title, onRetry, onDone, kind }: {
  title: string;
  onRetry: () => void;
  onDone: () => void;
  /** Which read failed, for the frame's `data-toast-kind`. */
  kind: "games-failed" | "games-more-failed";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  useToastClock(ref, !hover && !focus, onDone);
  return (
    <ToastFrame
      frameRef={ref}
      role="alert"
      kind={kind}
      title={title}
      onHold={(which, on) => (which === "hover" ? setHover : setFocus)(on)}
      actions={
        <button
          type="button"
          onClick={onRetry}
          className="min-h-[44px] cursor-pointer border-0 bg-transparent px-[12px] text-[13.5px] font-semibold text-[color:var(--accent-text)] underline underline-offset-2"
        >
          {gameHistoryCopy.retry}
        </button>
      }
    />
  );
}
