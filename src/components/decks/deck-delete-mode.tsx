"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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
  onBusy,
}: {
  deckId: string;
  deckName: string;
  onCancel: () => void;
  /**
   * Raised while the action is in flight. The pane's own `pending` and
   * `inFlight` guard the pane, and a pane that has been UNMOUNTED guards
   * nothing — so the panel above has to hold the fact too, exactly as
   * `ShelfMenu` does with its own `busy`.
   */
  onBusy: (busy: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Guards the double-press the `disabled` attribute cannot: a second click
  // dispatched in the same commit as the first sees the old prop.
  const inFlight = useRef(false);
  const cancel = useRef<HTMLButtonElement>(null);
  const c = refreshCopy.decks.del;

  // Entering this mode replaces the focused menu row, so without this the reader
  // is dropped on the body — and this panel is not a `dialog` and traps nothing,
  // so Tab would resume at the top of the document with both buttons reachable
  // only by tabbing the whole page. `deck-move-mode.tsx` does the same on the
  // same reasoning. KEEP IT takes focus rather than the confirm: the destructive
  // button should not be one Return away from a keystroke that opened a pane.
  useEffect(() => {
    cancel.current?.focus();
  }, []);

  function confirm() {
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);
    onBusy(true);
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
        onBusy(false);
        setError(c.failed);
        return;
      }
      // Deliberately not cleared on success — neither the local guard nor the
      // panel's: the redirect above is still in flight, and releasing either
      // would offer a second delete of a deck that is already gone.
    });
  }

  return (
    <div className="flex flex-col gap-[10px] p-[12px]">
      {/* Two rules, and the second is what the first created.
          `break-words` because the name is the reader's and `DECK_NAME_MAX` is
          120 characters with no rule against an unbroken run: normal
          word-breaking sends such a name 1086px past the panel's 160px content
          box. Wrapping it then made the pane 323px tall, and the panel hangs
          inside `data-deck-art`, which is `overflow-hidden` and 168px at the
          narrow-cell band. The panel's bottom sits at that box's bottom, so a
          taller pane grows UPWARD and loses its own first lines — and the reader
          could no longer see WHICH deck they were deleting, which is the pane's
          whole job.
          TWO lines, not three, and that is measured rather than chosen: three
          leaves the pane 197px and still clips 16px of the heading at 900px,
          while two returns it to exactly the 176px a short name draws. Two lines
          hold about 40 characters, which names any deck a player can tell
          apart. */}
      <p className="m-0 line-clamp-2 font-display text-[14px] font-semibold break-words text-[color:var(--fg)]">
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
          ref={cancel}
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
