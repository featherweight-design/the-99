"use client";

// The one checkbox the app draws (no-collection entry polish, 2026-10-15): the native input, hidden, and an 18px box
// beside it with a `✓` when set (a pseudo-element, so the mark is never part of the label's text). It had been drawn six ways: this box in four places, a native 18px in the opt-in, a
// native 20 to 22px on the precon pick rows (which read as large, and as a broken deck image beside the row's art), and
// the browser's own on the scan lab. It renders a fragment, so the caller's `<label>` keeps its own layout and its
// whole row stays the press; place it first in that label. The box is `aria-hidden`: the input carries the name.

export const CHECKBOX_SIZE = 18;

export function Checkbox({ checked, onChange, disabled = false, busy = false, ariaLabel, className = "" }: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  busy?: boolean;
  /** The input's name when the label's own text is not it (a row whose label holds more than one thing). */
  ariaLabel?: string;
  /** Placement for the caller's layout, on the box (an `items-start` row nudges it to the first line). */
  className?: string;
}) {
  return (
    <>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-busy={busy || undefined}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={
          "flex h-[18px] w-[18px] flex-none items-center justify-center rounded-[4px] text-[12px] font-bold text-[color:var(--bg)] " +
          "[border:1.5px_solid_var(--fg-faint)] peer-checked:bg-[color:var(--accent)] peer-checked:[border-color:var(--accent)] peer-checked:after:content-['✓'] " +
          "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[color:var(--accent)] " +
          "peer-disabled:opacity-50 " +
          className
        }
      >
      </span>
    </>
  );
}
