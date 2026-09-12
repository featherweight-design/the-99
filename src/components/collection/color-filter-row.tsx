"use client";

// The desktop WUBRG pip selector, lifted out of filter-bar.tsx so /collection and the set
// grid mount ONE component rather than each drawing their own row of pips.
//
// It takes no surface flag, and must not grow one. Two surfaces sharing a component that
// branches on which surface it is in is the defect the Commanders/Discover split exists to
// prevent; if this ever needs to behave differently per page, the answer is two components.

import type { RefObject } from "react";
import { ColorPip } from "./color-pip";

export const WUBRG = ["W", "U", "B", "R", "G"] as const;

export function ColorFilterRow({
  selected,
  onToggle,
  className = "hidden md:flex",
  containerRef,
}: {
  selected: string[];
  onToggle: (color: string) => void;
  /** Visibility only. Every other property of the row is fixed. */
  className?: string;
  /**
   * Somewhere for focus to land. The set grid hands focus here when a viewport change
   * closes its phone sheet, because the sheet's own trigger is hidden at that width.
   */
  containerRef?: RefObject<HTMLDivElement | null>;
}) {
  return (
    // §Color Filter: --surface-sunken on 1px --border-strong, radius 8px, 6px gaps
    <div
      ref={containerRef}
      tabIndex={containerRef ? -1 : undefined}
      className={`${className} items-center gap-[6px] rounded-lg px-[10px] py-[7px]`}
      style={{
        background: "var(--surface-sunken)",
        border: "1px solid var(--border-strong)",
      }}
    >
      {/* §Color Filter Label "COLOR" — mono 10px, --fg-faint, letter-spacing 0.1em */}
      <span
        className="font-mono text-[10px] mr-[2px] tracking-[0.1em]"
        style={{ color: "var(--fg-faint)" }}
      >
        COLOR
      </span>
      {WUBRG.map((c) => (
        <ColorPip
          key={c}
          color={c}
          selected={selected.includes(c)}
          onToggle={() => onToggle(c)}
        />
      ))}
    </div>
  );
}
