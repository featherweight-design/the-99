"use client";

// ClearAutoButton — the auto-lifecycle cluster in the group toolbar: the kept
//   note, the bulk keep, and the sweep.
// SweepReceipt — the one-strip receipt that persists until the player undoes or navigates.
//
// §Decklist Group Toggle (design table) — ClearAutoButton lives right of the spacer,
// left of the Group label.

import { recommendationsCopy } from "../../lib/copy/recommendations";

// ── ClearAutoButton ────────────────────────────────────────────────────────────

interface ClearAutoButtonProps {
  /** The number of untouched auto cards remaining. Absent (not rendered) at 0. */
  count: number;
  /** Non-auto cards — kept fill cards and the player's own additions alike.
      Shows the kept note when ≥ 1. */
  keptCount: number;
  onClear: () => void;
  pending: boolean;
  onKeepAll: () => void;
  keepAllPending: boolean;
}

/** Identical treatment for both bulk controls: these are two answers to the
 *  same question about the same forty cards, and the toolbar has no view on
 *  which is right. A filled or accent plate on either would make the app
 *  recommend an answer it cannot know. `min-h-[44px]` only below md, where the
 *  pair wraps to a line of its own and becomes a phone target. */
const BULK_BUTTON_CLASS =
  "font-mono text-[12px] text-fg-body bg-transparent border border-border-strong rounded-[8px] px-[12px] min-h-[44px] md:min-h-0 py-[6px] cursor-pointer disabled:opacity-50 disabled:cursor-default";

/** A GhostButton in mono 12px, right-aligned in the group toolbar.
 *  Absent entirely at zero rather than shown disabled, because a disabled
 *  "Clear 0 auto cards" is a control offering nothing. The one time it does
 *  render disabled is while its own sweep is in flight.
 *
 *  Design table state 7: the keptNote must survive even when count === 0 and
 *  the button is absent. The note is rendered outside the button's own guard
 *  so it stays visible throughout the auto-card lifecycle — but with neither a
 *  note nor a button to show, the wrapper leaves too, rather than sitting in
 *  the toolbar's flex row as an empty child collecting a gap. */
export function ClearAutoButton({
  count,
  keptCount,
  onClear,
  pending,
  onKeepAll,
  keepAllPending,
}: ClearAutoButtonProps) {
  if (count === 0 && keptCount === 0) return null;

  // Either write in flight disables both. They read the same count and act on
  // the same rows, so the second one clicked would be deciding the fate of
  // cards the first has already spoken for.
  const busy = pending || keepAllPending;

  return (
    /* At a count of 0 the only thing left to render is the kept note, which is
       desktop-only — so below md the wrapper would be an empty flex child
       collecting the toolbar's gap, spacing the row for content nobody can see.
       The wrapper takes the note's own breakpoint rather than the note taking
       the wrapper's: the note is hidden on phones because the toolbar has no
       room for it, and that is still true after a keep. */
    <span
      className={`${count === 0 ? "hidden md:flex" : "flex"} items-center gap-[8px]`}
    >
      {keptCount >= 1 && (
        <span className="font-mono text-[11px] text-fg-locked hidden md:inline">
          {recommendationsCopy.auto.keptNote(String(keptCount))}
        </span>
      )}
      {/* Keep leads, so the cluster reads from the safe answer to the
          destructive one and the sweep is not the first bulk control the eye
          lands on. Both key on `count` alone: a toolbar showing one and not the
          other would say that count means two things. */}
      {count > 0 && (
        <button
          type="button"
          onClick={onKeepAll}
          disabled={busy}
          aria-label={recommendationsCopy.auto.keepAllAria(String(count))}
          className={BULK_BUTTON_CLASS}
        >
          <span className="hidden md:inline">{recommendationsCopy.auto.keepAll(String(count))}</span>
          <span className="md:hidden">{recommendationsCopy.auto.keepAllMobile(String(count))}</span>
        </button>
      )}
      {count > 0 && (
        <button
          type="button"
          onClick={onClear}
          disabled={busy}
          aria-label={recommendationsCopy.auto.clearAllAria(String(count))}
          className={BULK_BUTTON_CLASS}
        >
          {/* Responsive label: desktop shows the full string, mobile shows the short form.
              Both live in one button element to keep a single interactive control. */}
          <span className="hidden md:inline">{recommendationsCopy.auto.clearAll(String(count))}</span>
          <span className="md:hidden">{recommendationsCopy.auto.clearAllMobile(String(count))}</span>
        </button>
      )}
    </span>
  );
}

// ── SweepReceipt ──────────────────────────────────────────────────────────────

interface SweepReceiptProps {
  /** Cards removed, counted in copies rather than rows — a swept basic-land
   *  stack contributes 37. The receipt reads "{n} auto cards removed". */
  removed: number;
  onUndo: () => void;
}

/** One strip, not one per row. Lifetime is decklist state, matching PR #204. */
export function SweepReceipt({ removed, onUndo }: SweepReceiptProps) {
  return (
    <div className="flex items-center gap-[10px] px-[13px] py-[10px] mb-[16px] bg-surface-sunken border border-dashed border-border-strong rounded-[8px]">
      <span className="flex-1 font-mono text-[11px] md:text-[12px] text-fg-locked">
        {recommendationsCopy.auto.swept(String(removed))}
      </span>
      {/* Undo — matches decklist-row.tsx Undo treatment: sans 12.5px semibold,
          accent coloured, border-bottom underline in accent-shadow. */}
      <button
        type="button"
        onClick={onUndo}
        aria-label={recommendationsCopy.auto.sweptUndoAria(String(removed))}
        className="flex-none flex items-center bg-transparent border-0 border-b border-accent-shadow p-0
          text-[12.5px] font-semibold leading-[1.4]
          text-accent cursor-pointer"
      >
        {recommendationsCopy.auto.sweptUndo}
      </button>
    </div>
  );
}
