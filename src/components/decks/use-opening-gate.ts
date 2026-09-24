"use client";

import { useEffect, useRef, useState } from "react";

/** A fetch that answers inside this goes straight to the answer, with no loader at all. */
export const OPENING_DELAY_MS = 150;
/** Once drawn, the loader stays at least this long, so it never blinks. */
export const OPENING_HOLD_MS = 400;

/**
 * Whether the tab is OPENING (§8, 8a): shown, still `idle`, with a stored analysis to fetch, and
 * the peek not yet answered. No stored permits means nothing to fetch, so the empty state is the
 * answer at once and is never held back. Anything past `idle` (a press, a reading) is an answer
 * too, so a press made on the open tab is never gated.
 *
 * ONE EXCEPTION, decided rather than missed: press Analyze, move to another deck while it is in
 * flight, and come back. The deck change resets the tab to `idle`, and the peek does not run for a
 * deck with a press out, so the loader draws over that press and its reply waits out the hold, at
 * most 400ms. Settling there instead would draw the not-analyzed ring over a running analysis.
 * See `gap-report-analysis-tab-opening.md`.
 */
export function isOpening({
  shown,
  kind,
  storedPermits,
  peekSettled,
}: {
  shown: boolean;
  kind: string;
  storedPermits: readonly unknown[] | null;
  peekSettled: boolean;
}): boolean {
  return shown && kind === "idle" && storedPermits !== null && !peekSettled;
}

/**
 * The opening loader's timing (Analysis tab handoff §8, 8a), for a fetch whose outcome the tab
 * cannot guess.
 *
 * - `off`: draw the answer.
 * - `wait`: the fetch is out, under 150ms old. Draw nothing (the block keeps its height).
 * - `loader`: draw the loader. Once here, it holds for 400ms even if the fetch answers sooner,
 *   and the answer waits behind it.
 *
 * Only the OPENING fetch is gated: the shell passes `active` for the peek alone, and a press moves
 * the tab out of `idle`, which ends it. The one way a press's reply meets the hold is the
 * deck-change case `isOpening` names.
 */
export function useOpeningGate(active: boolean): "off" | "wait" | "loader" {
  const [phase, setPhase] = useState<"off" | "wait" | "loader">(active ? "wait" : "off");
  const shownAt = useRef(0);
  // A fetch starting is adjusted during render, so the tab never paints its answer-less state once.
  const [prevActive, setPrevActive] = useState(active);
  if (prevActive !== active) {
    setPrevActive(active);
    if (active && phase !== "loader") setPhase("wait");
  }

  useEffect(() => {
    // A `wait` whose fetch answered needs no write: it already reads as `off` below, and the next
    // fetch starts from it.
    if (phase === "wait" && active) {
      const t = setTimeout(() => {
        shownAt.current = Date.now();
        setPhase("loader");
      }, OPENING_DELAY_MS);
      return () => clearTimeout(t);
    }
    if (phase === "loader" && !active) {
      const left = OPENING_HOLD_MS - (Date.now() - shownAt.current);
      const t = setTimeout(() => setPhase("off"), Math.max(0, left));
      return () => clearTimeout(t);
    }
  }, [phase, active]);

  // Answered inside the delay: the answer, this render, with no frame of the waiting block.
  return phase === "wait" && !active ? "off" : phase;
}
