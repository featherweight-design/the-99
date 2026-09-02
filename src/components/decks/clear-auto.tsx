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
  /** Cards whose auto flag has been cleared (kept). Shows the kept note when ≥ 1. */
  keptCount: number;
  onClear: () => void;
  pending: boolean;
}

/** A GhostButton in mono 12px, right-aligned in the group toolbar.
 *  Absent entirely at zero — never rendered disabled. */
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
        className="font-mono text-[11px] md:text-[12px] text-fg-locked disabled:opacity-50 disabled:cursor-default"
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
  /** Number of rows removed — the receipt reads "{n} auto cards removed". */
  removed: number;
  onUndo: () => void;
}

/** One strip, not one per row. Lifetime is decklist state, matching PR #204. */
export function SweepReceipt({ removed, onUndo }: SweepReceiptProps) {
  return (
    <div className="flex items-center justify-between gap-[12px] px-[12px] py-[8px] mb-[12px] md:mb-[14px] bg-surface-sunken border border-dashed border-border-strong rounded-[8px]">
      <span className="font-mono text-[11px] md:text-[12px] text-fg-locked">
        {recommendationsCopy.auto.swept(String(removed))}
      </span>
      <button
        type="button"
        onClick={onUndo}
        aria-label={recommendationsCopy.auto.sweptUndoAria(String(removed))}
        className="font-mono text-[11px] md:text-[12px] text-accent-shadow underline cursor-pointer"
      >
        {recommendationsCopy.auto.sweptUndo}
      </button>
    </div>
  );
}
