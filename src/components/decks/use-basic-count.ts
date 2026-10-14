"use client";

import { useContext, useEffect, useState, useTransition } from "react";
// The context, not `useRouter`, which throws with no app router mounted (a row rendered alone, in a test);
// `intent-prefetch-link.tsx` reads it the same way. With none, a thrown save says so and refreshes nothing.
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { setBasicQuantity } from "../../app/decks/actions";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { createBasicCounts, useBasicCounts, type BasicCounts } from "./basic-counts";

export { SETTLE_MS } from "./basic-counts";

/** The highest figure the count field takes; a typed figure above it restores (READINESS item 5). */
export const BASIC_FIELD_MAX = 99;

/**
 * One view's half of the basics stepper: what this row or tile draws, over the deck's save queue
 * (`basic-counts.tsx`). Every press moves the count at once; the queue sends one save per settle.
 *
 * Two failures, said differently (`src/lib/copy/README.md`, since #1746): a RETURNED refusal was decided before
 * any write, so the count is the saved one again and the deck is unchanged; a THROWN save may have committed, so
 * the view claims no revert, says it could not confirm, and the page is refreshed.
 *
 * `quantity` is the count the deck list draws, the prediction included. `shown` is this view's own figure, for a
 * view with no deck list above it; it clears once the list agrees.
 */
export function useBasicCount({
  deckId,
  oracleId,
  quantity,
  onSettled,
}: {
  deckId: string;
  oracleId: string;
  quantity: number;
  onSettled?: (n: number) => void;
}) {
  const shared = useBasicCounts();
  const router = useContext(AppRouterContext);
  const [, startTransition] = useTransition();
  // A row mounted outside the builder keeps a queue of its own, with no deck list to predict into.
  const [local] = useState<BasicCounts | null>(() =>
    shared
      ? null
      : createBasicCounts({
          save: (id, n) => setBasicQuantity(deckId, id, n),
          predict: () => {},
          transition: (fn) => startTransition(fn),
          refresh: () => router?.refresh(),
        }),
  );
  const counts = (shared ?? local)!;

  const [shown, setShown] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (shown !== null && shown === quantity) setShown(null);

  useEffect(
    () =>
      counts.subscribe(oracleId, (r) => {
        if (r.kind === "ok") {
          onSettled?.(r.n);
          return;
        }
        setShown(null);
        setError(r.kind === "refused" ? addPanelCopy.basicStepper.refused : addPanelCopy.basicStepper.unconfirmed);
      }),
    [counts, oracleId, onSettled],
  );

  const count = shown ?? quantity;
  function set(n: number) {
    if (n < 1) return;
    setShown(n);
    setError(null);
    counts.set(oracleId, n, counts.base(oracleId) ?? quantity);
  }

  return {
    count,
    /** The deck's count before the open burst began; the count itself when none is open. */
    base: counts.base(oracleId) ?? quantity,
    error,
    /** One more or one fewer, from the figure on screen. */
    step: (delta: 1 | -1) => set(count + delta),
    /**
     * A typed figure. Outside 1..`BASIC_FIELD_MAX`, or unchanged, it restores and writes nothing: a 0 would
     * remove a whole stack with no receipt to undo it, so removal stays the ✕ at 1.
     */
    type: (n: number) => {
      if (!Number.isInteger(n) || n < 1 || n > BASIC_FIELD_MAX || n === count) return;
      set(n);
    },
    /**
     * The ✕ at 1 pressed while a burst is open: the burst is cancelled and the caller removes the row by an
     * ABSOLUTE 0, since the burst's own save may land before or after it. Returns whether a burst was open.
     */
    takeOver: () => counts.takeOver(oracleId),
  };
}
