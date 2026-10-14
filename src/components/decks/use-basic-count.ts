"use client";

import { useContext, useEffect, useRef, useState, useTransition } from "react";
// The context, not `useRouter`, which throws with no app router mounted (a row rendered alone, in a test);
// `intent-prefetch-link.tsx` reads it the same way. With none, a thrown save says so and refreshes nothing.
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";

import type { BasicQuantityOutcome } from "../../lib/decks/set-basic-quantity";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { useSetOptimisticQuantity } from "./optimistic-deck";

/** Quiet time after the last press before the one save goes (plan `2026-10-14-basic-lands-stepper.md`). */
export const SETTLE_MS = 600;

/** The highest figure the count field takes; a typed figure above it restores (READINESS item 5). */
export const BASIC_FIELD_MAX = 99;

type Save = (n: number) => Promise<BasicQuantityOutcome>;

/**
 * The basics stepper's count: every press moves it at once, and ONE save carries the final figure
 * once the presses stop for `SETTLE_MS` (the handoff's lock, "one save writes the final count").
 *
 * The whole burst runs inside ONE transition, held open until its save has answered, so the
 * deck-wide prediction (`setQuantity`) stands for the burst and the save alike and React drops it
 * only when the revalidated page has landed. A press while a save is out restarts the settle, and
 * the next save carries the newer figure.
 *
 * Two failures, said differently (`src/lib/copy/README.md`, since #1746):
 * - a RETURNED refusal was decided before any write, so the prediction falls away with the
 *   transition, the count is the saved one again, and the row says the deck is unchanged;
 * - a THROWN save may have committed with its answer lost, so the row does not claim a revert. It
 *   says it could not confirm, and the page is refreshed so the count read is the true one.
 *
 * `quantity` is the count the deck list draws, the prediction included. `shown` is this row's own
 * figure, for a row with no deck list above it; it clears once the list agrees.
 */
export function useBasicCount({
  oracleId,
  quantity,
  save,
  onSettled,
}: {
  oracleId: string;
  quantity: number;
  save: Save;
  onSettled?: (n: number) => void;
}) {
  const router = useContext(AppRouterContext);
  const setOptimistic = useSetOptimisticQuantity();
  const [, startTransition] = useTransition();
  const [shown, setShown] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (shown !== null && shown === quantity) setShown(null);
  // The count before this burst: the deck's figure while no burst is open. The row's `from N` reads it.
  const [pressing, setPressing] = useState(false);
  const [base, setBase] = useState(quantity);
  if (!pressing && base !== quantity) setBase(quantity);

  const target = useRef(quantity);
  const burst = useRef(false);
  // Set by `takeOver`: the ✕ at 1 owns the row now, so the burst sends nothing more and says nothing.
  const taken = useRef(false);
  const wake = useRef<(() => void) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Settle at once: a row unmounted mid-burst (List ↔ Card swaps the row for the tile) must still save the
  // count it showed, so its unmount FLUSHES the burst rather than dropping it. The save then runs on; its
  // answer lands on whichever view mounted, through the revalidated page.
  const flush = useRef<(() => void) | null>(null);
  useEffect(() => () => flush.current?.(), []);

  /** Resolves `true` once the presses have been quiet for the settle, `false` on the next press. */
  function quiet(): Promise<boolean> {
    return new Promise((resolve) => {
      const settled = () => {
        if (timer.current) clearTimeout(timer.current);
        wake.current = null;
        flush.current = null;
        resolve(true);
      };
      wake.current = () => {
        flush.current = null;
        resolve(false);
      };
      flush.current = settled;
      timer.current = setTimeout(settled, SETTLE_MS);
    });
  }

  function set(n: number) {
    if (n < 1) return;
    target.current = n;
    setShown(n);
    setError(null);
    if (burst.current) {
      // A press inside the burst: show it deck-wide and restart the settle.
      startTransition(() => setOptimistic(oracleId, n));
      if (timer.current) clearTimeout(timer.current);
      const w = wake.current;
      wake.current = null;
      w?.();
      return;
    }
    burst.current = true;
    setPressing(true);
    startTransition(async () => {
      setOptimistic(oracleId, n);
      let outcome: "ok" | "refused" | "thrown" = "ok";
      let saved = n;
      try {
        for (;;) {
          if (!(await quiet())) {
            if (taken.current) break;
            continue;
          }
          saved = target.current;
          let result: BasicQuantityOutcome;
          try {
            result = await save(saved);
          } catch {
            outcome = "thrown";
            break;
          }
          if (taken.current) break;
          // Pressed again while the save was out: settle once more and send the newer figure.
          if (target.current !== saved) continue;
          outcome = result.ok ? "ok" : "refused";
          break;
        }
      } finally {
        burst.current = false;
        setPressing(false);
      }
      if (taken.current) {
        taken.current = false;
        return;
      }
      if (outcome === "ok") {
        onSettled?.(saved);
        return;
      }
      setShown(null);
      if (outcome === "refused") {
        setError(addPanelCopy.basicStepper.refused);
      } else {
        setError(addPanelCopy.basicStepper.unconfirmed);
        router?.refresh();
      }
    });
  }

  return {
    count: shown ?? quantity,
    /** The deck's count before the burst on screen began. */
    base,
    error,
    /**
     * The ✕ at 1 pressed while a burst is open: the burst is cancelled (no save, no line), and the caller
     * removes the row with an ABSOLUTE 0 rather than one copy off, because the burst's own save may land
     * before or after it. Returns whether a burst was open.
     */
    takeOver: () => {
      if (!burst.current) return false;
      taken.current = true;
      if (timer.current) clearTimeout(timer.current);
      const w = wake.current;
      wake.current = null;
      w?.();
      return true;
    },
    /** One more or one fewer, from the figure on screen. */
    step: (delta: 1 | -1) => set((shown ?? quantity) + delta),
    /**
     * A typed figure. Outside 1..`BASIC_FIELD_MAX`, or unchanged, it restores and writes nothing: a
     * 0 would remove a whole stack with no receipt to undo it, so removal stays the ✕ at 1.
     */
    type: (n: number) => {
      if (!Number.isInteger(n) || n < 1 || n > BASIC_FIELD_MAX || n === (shown ?? quantity)) return;
      set(n);
    },
  };
}
