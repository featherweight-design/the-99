"use client";

import { twMerge } from "tailwind-merge";
import { Checkbox } from "./checkbox";

// The "I own these cards" opt-in, drawn once: the precon start's `I own this precon…` and the import's `I own these
// cards…` (no-collection entry R2, S8, which names the precon start's checkbox as its anatomy). The box is the shared `Checkbox`, a 13px label in `--fg-body`, and the whole label the press.

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
      <Checkbox checked={checked} disabled={disabled} onChange={onChange} className="mt-[2px]" />
      <span>{children}</span>
    </label>
  );
}
