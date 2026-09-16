"use client";

import { useRef, useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { deleteDeck } from "../../app/decks/actions";
import { refreshCopy } from "../../lib/copy/refresh";

/**
 * The delete confirm inside `DeckCardOverflow`'s panel.
 *
 * Replaces `window.confirm`, which could state nothing about what a deck takes
 * with it and — being browser chrome — had no error path at all: a throwing
 * `deleteDeck` left the menu sitting there having reported nothing. The pane is
 * the folder delete's from `shelf-menu.tsx`, specified by the folders handoff
 * (decision 25); only the copy differs.
 */
export function DeleteMode({
  deckId,
  deckName,
  onCancel,
}: {
  deckId: string;
  deckName: string;
  onCancel: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Guards the double-press the `disabled` attribute cannot: a second click
  // dispatched in the same commit as the first sees the old prop.
  const inFlight = useRef(false);
  const c = refreshCopy.decks.del;

  function confirm() {
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);
    startTransition(async () => {
      try {
        await deleteDeck(deckId);
      } catch (err) {
        // `deleteDeck` ends in `redirect()`, which signals BY THROWING, and the
        // throw arrives here before the router navigates. Swallowing it would
        // report a failure over a deletion that succeeded and strand the reader
        // on a route whose deck is gone — the same trap `create-picker.tsx`
        // documents. Rethrow first, then handle what is left: a real outage.
        unstable_rethrow(err);
        inFlight.current = false;
        setError(c.failed);
        return;
      }
      // Deliberately not cleared on success: the redirect above is still in
      // flight, and re-enabling the buttons would offer a second delete of a
      // deck that is already gone.
    });
  }

  return (
    <div className="flex flex-col gap-[10px] p-[12px]">
      <p className="m-0 font-display text-[14px] font-semibold text-[color:var(--fg)]">
        {c.heading(deckName)}
      </p>
      <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-body)]">{c.body}</p>
      {error && (
        <p role="alert" className="m-0 font-mono text-[11px]" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      <div className="flex gap-[8px]">
        <button
          type="button"
          disabled={pending}
          onClick={onCancel}
          className="h-[32px] flex-1 cursor-pointer rounded-[6px] border border-solid border-[color:var(--border-strong)] bg-transparent font-sans text-[12.5px] text-[color:var(--fg-body)]"
        >
          {c.cancel}
        </button>
        {/* `--danger`, as the folder pane's confirm is: this destroys a thing
            the player named, with no undo. What is safe is the collection, and
            the sentence above is what says so. */}
        <button
          type="button"
          disabled={pending}
          onClick={confirm}
          className="h-[32px] flex-1 cursor-pointer rounded-[6px] border-none bg-[color:var(--danger)] font-sans text-[12.5px] font-semibold text-[color:var(--bg)]"
        >
          {pending ? c.pending : c.confirm}
        </button>
      </div>
    </div>
  );
}
