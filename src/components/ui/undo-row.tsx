// The in-place Undo row: what a list leaves where a row just went, with one press to put it back.
//
// PRESENTATIONAL. The deck builder's spent slot (`decklist-row.tsx`, decision 5 of the add-panel
// addendum) drew it first; a hidden commander on For you and Discover draws the same row
// (design_handoff_the99_hide_commander README §2). Each caller owns its own undo, its own refusal
// and its own row shell, so a deck row keeps its 34px or 52px line and a commander row its 48px.
// No toast and no timer: the row stands until the reader leaves.

import type { ReactNode, Ref } from "react";
import { TOUCH_HIT } from "./touch-hit";
import { MutationError } from "../decks/mutation-error";

export function UndoShell({
  shell,
  marks,
  lead,
  label,
  action,
  actionAria,
  onUndo,
  pending = false,
  error,
  undoRef,
  frameRef,
  errorLine = defaultErrorLine,
}: {
  /** The row's own shell classes (height, padding, radius); the sunken ground and dashed edge are added here. */
  shell: string;
  /** Attributes for the row itself: the deck builder's `data-decklist-row`, which its probes address. */
  marks?: Record<string, string>;
  /** Drawn before the label: the deck row's dot-width spacer, which keeps the name aligned with the live rows. */
  lead?: ReactNode;
  label: ReactNode;
  action: string;
  actionAria: string;
  onUndo: () => void;
  pending?: boolean;
  /** The refusal. The button goes and this line stands under the row, saying where to go instead. */
  error: string | null;
  /** The Undo button, for a caller that moves focus to it once the row is drawn. */
  undoRef?: Ref<HTMLButtonElement>;
  /** The row's frame, which takes focus when a refusal takes the button away. Focusable only then. */
  frameRef?: Ref<HTMLDivElement>;
  /** How the refusal line is drawn. The deck builder's is `MutationError`, the default; a list row passes its own. */
  errorLine?: (message: string) => ReactNode;
}) {
  return (
    <div ref={frameRef} tabIndex={frameRef && error ? -1 : undefined}>
      <div {...marks} className={`${shell} bg-surface-sunken border border-dashed border-border-strong`}>
        {lead}
        <span className="flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis font-mono text-[12px] text-fg-locked">
          {label}
        </span>
        {/* Absent once the undo has been refused: the message below tells the
            player where to go instead. */}
        {!error && (
          <button
            ref={undoRef}
            type="button"
            onClick={onUndo}
            disabled={pending}
            className={`flex-none flex items-center px-0 ${TOUCH_HIT}
              bg-transparent border-0 border-b border-b-accent-shadow border-accent-shadow
              text-[12.5px] font-semibold leading-[1.4]
              text-accent-text hover:text-accent-hover cursor-pointer disabled:opacity-50 disabled:cursor-default transition-colors`}
            aria-label={actionAria}
          >
            {action}
          </button>
        )}
      </div>
      {error && errorLine(error)}
    </div>
  );
}

function defaultErrorLine(message: string): ReactNode {
  return <MutationError message={message} />;
}
