"use client";

import { twMerge } from "tailwind-merge";

// The "I own these cards" opt-in, drawn once: the precon start's `I own this precon…` and the import's `I own these
// cards…` (no-collection entry R2, S8, which names the precon start's checkbox as its anatomy). An 18px native box in
// `--accent`, a 13px label in `--fg-body`, and the whole label the press.

export function OptInCheckbox({ checked, onChange, disabled = false, className = "", children }: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Placement and row height for the caller's layout, added to the label. */
  className?: string;
  children: React.ReactNode;
}) {
  return (
    // twMerge, not concatenation: a caller's alignment must beat this one, and Tailwind orders conflicting utilities by
    // the stylesheet, not the class string (`items-start` is emitted after `items-center`).
    <label className={twMerge("flex cursor-pointer items-start gap-[10px] text-[13px] leading-[1.45] text-[color:var(--fg-body)]", className)}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-[2px] h-[18px] w-[18px] flex-none cursor-pointer accent-[color:var(--accent)]"
      />
      <span>{children}</span>
    </label>
  );
}
