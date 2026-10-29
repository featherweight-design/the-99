"use client";
// Quick-add's failed search, said in the deck toast (small items 2, item 8, `Quick-Add-Failed`): the seat picker's
// failed-search words, split into the title and a Try again press, `role="alert"`. The bar itself draws nothing new.
//
// It is an alert in the deck toast stack (small items 3, item 8, `Deck-Toasts`), which stands 10px above the dock, so it
// never covers the field the reader is typing in. It takes part in the one-alert claim: a refusal arriving replaces it,
// and it replaces a refusal. A receipt arriving does not dismiss it, since the field still holds its query: it moves
// above the receipt.

import { useRef, useState } from "react";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { ToastFrame, useToastClock } from "../collection/edit-toast";
import { useDeckAlertClaim } from "./deck-toast-stack";

export function QuickAddFailedToast({
  insideProps,
  onRetry,
  onDone,
}: {
  /** The bar's `useSearchDismiss` mark: a press on the toast is not a press outside the bar, which would clear the field. */
  insideProps: Record<string, string>;
  onRetry: () => void;
  onDone: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  useToastClock(ref, !hover && !focus, onDone);
  useDeckAlertClaim(onDone);

  return (
    <ToastFrame
      frameRef={ref}
      role="alert"
      placement="deck"
      kind="quick-add-failed"
      marks={insideProps}
      title={addPanelCopy.quickAdd.searchFailed}
      onHold={(kind, on) => (kind === "hover" ? setHover : setFocus)(on)}
      actions={
        // The press must not take focus off the field: on a phone that drops the keyboard (the board: "the keyboard
        // stays up"). A keyboard press does move focus here, so `onRetry` hands it back.
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={onRetry}
          className="min-h-[44px] cursor-pointer border-0 bg-transparent px-[12px] text-[13.5px] font-semibold text-[color:var(--accent-text)] underline underline-offset-2"
        >
          {addPanelCopy.quickAdd.searchRetry}
        </button>
      }
    />
  );
}
