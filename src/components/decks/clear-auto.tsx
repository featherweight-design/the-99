"use client";

// ClearAutoButton — the sweep control in the group toolbar.
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
}

/** A GhostButton in mono 12px, right-aligned in the group toolbar.
 *  Absent entirely at zero rather than shown disabled, because a disabled
 *  "Clear 0 auto cards" is a control offering nothing. The one time it does
 *  render disabled is while its own sweep is in flight. */
export function ClearAutoButton({ count, keptCount, onClear, pending }: ClearAutoButtonProps) {
  if (count === 0) return null;

  return (
    <span className="flex items-center gap-[8px]">
      {keptCount >= 1 && (
        <span className="font-mono text-[11px] text-fg-locked hidden md:inline">
          {recommendationsCopy.auto.keptNote(String(keptCount))}
        </span>
      )}
      <button
        type="button"
        onClick={onClear}
        disabled={pending}
        aria-label={recommendationsCopy.auto.clearAllAria(String(count))}
        className="font-mono text-[12px] text-fg-body bg-transparent border border-border-strong rounded-[8px] px-[12px] py-[6px] cursor-pointer disabled:opacity-50 disabled:cursor-default"
      >
        {/* Responsive label: desktop shows the full string, mobile shows the short form.
            Both live in one button element to keep a single interactive control. */}
        <span className="hidden md:inline">{recommendationsCopy.auto.clearAll(String(count))}</span>
        <span className="md:hidden">{recommendationsCopy.auto.clearAllMobile(String(count))}</span>
      </button>
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
