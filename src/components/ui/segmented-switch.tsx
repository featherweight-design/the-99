"use client";

// THE segmented switch: one bordered well of two or more segments, exactly one chosen. The deck toolbar's
// `All · Shopping · Stats · Notes` bar is the origin (handoff 2a); every one-of-N view or setting switch is meant
// to converge here rather than carry its own copy of the markup (segmented-switch plan, d9's rulings 2026-10-15).
//
// The role follows what the switch does. One that swaps a visible panel or view is a `tablist`; one that changes
// a setting, an order or a grouping is a `radiogroup`. Either way the well is one tab stop (roving `tabIndex`)
// and the arrow, Home and End keys move the choice and the focus together (`onSegmentKeys`).
//
// Two tones. `accent` lets a segment carry its own ink, selected or not (the bar's warm Shopping); `neutral`
// draws every segment alike, muted at rest and bone on the raised fill when chosen, for a quieter switch.

import { useId, type CSSProperties, type ReactNode } from "react";
import { onSegmentKeys } from "./segment-keys";

export type Segment<T extends string> = {
  value: T;
  label: ReactNode;
  /** The accessible name when the drawn label is not the whole of it. */
  ariaLabel?: string;
  /** Drawn after the label (the bar's counts), styled by the caller. */
  count?: ReactNode;
  /** The segment's own ink under the `accent` tone, a CSS color (`var(--warning)`). Neutral ignores it. */
  ink?: string;
  /** A hairline before this segment, splitting the well into groups. */
  divideBefore?: boolean;
  /** Data attributes for the segment's button, for probes and tests. */
  data?: Record<`data-${string}`, string>;
};

/** One segment's box (handoff 2a): a 44px target at phone, content height from `md:`. */
const SEGMENT_BASE =
  "flex min-h-[44px] flex-1 items-center justify-center gap-[6px] whitespace-nowrap rounded-[6px] px-[14px] py-[6px] font-sans text-[14px] transition-[filter] hover:brightness-125 md:min-h-0 md:flex-none md:text-[13.5px]";

export function SegmentedSwitch<T extends string>({
  kind,
  ariaLabel,
  segments,
  value,
  onChange,
  tone = "neutral",
  fill = false,
  data,
}: {
  /** `tabs` for a switch that swaps a visible panel or view; `radio` for one that changes a setting. */
  kind: "tabs" | "radio";
  ariaLabel: string;
  segments: readonly Segment<T>[];
  /** The chosen segment. Null chooses none, and the first segment then holds the tab stop. */
  value: T | null;
  onChange: (next: T) => void;
  tone?: "accent" | "neutral";
  /** Full width at phone, the segments sharing it; content width from `md:` either way. */
  fill?: boolean;
  data?: Record<`data-${string}`, string>;
}) {
  const base = useId();
  const idOf = (v: T) => `${base}-${v}`;
  const values = segments.map((s) => s.value);
  const stop = value !== null && values.includes(value) ? value : values[0];
  const pick = (v: T) => {
    if (v !== value) onChange(v);
  };
  return (
    <div
      role={kind === "tabs" ? "tablist" : "radiogroup"}
      aria-label={ariaLabel}
      onKeyDown={(e) => onSegmentKeys(e, values, idOf, pick)}
      {...data}
      className={`flex items-stretch gap-[2px] rounded-[9px] border border-solid border-[color:var(--border-strong)] p-[3px] ${
        fill ? "w-full md:inline-flex md:w-auto" : "inline-flex w-auto"
      }`}
    >
      {segments.map((s) => {
        const chosen = s.value === value;
        // A segment's own ink rides a custom property its class reads: Tailwind compiles only class names it can
        // read in the source, and an inline `color` would outrank every state utility.
        const own = tone === "accent" && s.ink ? s.ink : null;
        const ink = own ? "text-[color:var(--seg-ink)]" : chosen ? "text-[color:var(--fg)]" : "text-[color:var(--fg-muted)]";
        return [
          s.divideBefore ? (
            <span
              key={`${s.value}-divider`}
              aria-hidden
              data-switch-divider
              className="mx-[3px] my-[6px] w-px flex-none self-stretch bg-[color:var(--border-strong)]"
            />
          ) : null,
          <button
            key={s.value}
            type="button"
            id={idOf(s.value)}
            role={kind === "tabs" ? "tab" : "radio"}
            aria-selected={kind === "tabs" ? chosen : undefined}
            aria-checked={kind === "radio" ? chosen : undefined}
            aria-label={s.ariaLabel}
            tabIndex={s.value === stop ? 0 : -1}
            onClick={() => pick(s.value)}
            {...s.data}
            style={own ? ({ "--seg-ink": own } as CSSProperties) : undefined}
            className={`${SEGMENT_BASE} ${ink} ${chosen ? "font-semibold bg-[color:var(--elevated)]" : "font-medium"}`}
          >
            {s.label}
            {s.count !== undefined && s.count !== null ? <>{" "}{s.count}</> : null}
          </button>,
        ];
      })}
    </div>
  );
}
