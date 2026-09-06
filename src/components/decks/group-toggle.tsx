"use client";

// Group Toggle — All/Shopping filter pills + By type / By role grouping pills.
// §Decklist Group Toggle (design table).

import { ClearAutoButton } from "./clear-auto";
import { PriceStrip } from "./price-strip";
import type { PriceSummary, ProvenanceForm } from "../../lib/decks/price";

interface GroupToggleProps {
  allCount: number;
  shoppingCount: number;
  filter: "all" | "shopping";
  grouping: "type" | "role";
  onFilterChange: (f: "all" | "shopping") => void;
  onGroupingChange: (g: "type" | "role") => void;
  /** Number of untouched auto cards. The button is absent at 0. */
  autoCount?: number;
  /** Number of non-auto cards — kept fill cards and player additions alike. */
  keptCount?: number;
  sweepPending?: boolean;
  onClearAuto?: () => void;
  keepAllPending?: boolean;
  onKeepAllAuto?: () => void;
  /** Summed over the same cards the Shopping pill counts — one fact, two
      renderings, so they can never disagree on screen. */
  priceSummary?: PriceSummary | null;
  /** Server-built. Null renders no strip at all. */
  provenance?: ProvenanceForm | null;
}

export function GroupToggle({
  allCount,
  shoppingCount,
  filter,
  grouping,
  onFilterChange,
  onGroupingChange,
  autoCount = 0,
  keptCount = 0,
  sweepPending = false,
  onClearAuto,
  keepAllPending = false,
  onKeepAllAuto,
  priceSummary = null,
  provenance = null,
}: GroupToggleProps) {
  return (
    /* Toggle bar container: mobile p=9px 16px | desktop p=14px 26px 10px.
       The strip sits INSIDE this container, above the bottom border, so the
       divider closes the filter row and its strip together. The wrap is not
       free: `items-center` and both gaps belong to the pill row, not to the
       column — left on the outer element they would centre the pills and turn
       the 7/10px pill gap into the gap above the strip. */
    <div className="flex flex-col px-[16px] py-[9px] md:px-[26px] md:pt-[14px] md:pb-[10px] border-b border-[color:var(--border)] md:border-b-0">
      {/* `flex-wrap`: at 390px the row carries two filter pills, two bulk auto
          controls and two grouping pills, and without it the last of them is
          pushed off the edge. The auto cluster is one flex child, so it wraps
          whole rather than splitting the pair across two lines. */}
      <div className="flex flex-wrap items-center gap-[7px] md:gap-[10px]">
        {/* "All N" filter pill — active: accent bg dark text | idle: muted with border */}
        <button
          type="button"
          onClick={() => onFilterChange("all")}
          className={[
            "font-sans font-semibold transition-[filter] hover:brightness-125 text-[12px] md:text-[13px] rounded-full px-[11px] py-[4px] md:px-[14px] md:py-[5px]",
            filter === "all"
              ? "text-[color:var(--bg)] bg-[color:var(--accent)]"
              : "text-[color:var(--fg-faint)] bg-transparent border border-solid border-[color:var(--border-strong)]",
          ].join(" ")}
        >
          All {allCount}
        </button>

        {/* "Shopping N" filter pill — idle: amber text with amber border */}
        <button
          type="button"
          onClick={() => onFilterChange("shopping")}
          className={[
            "font-sans transition-[filter] hover:brightness-125 text-[12px] md:text-[13px] rounded-full px-[11px] py-[4px] md:px-[14px] md:py-[5px]",
            filter === "shopping"
              ? "font-semibold text-[color:var(--bg)] bg-[color:var(--accent)]"
              : "font-medium text-[color:var(--warning)] bg-transparent border border-solid border-[color:color-mix(in_srgb,var(--accent)_30%,var(--bg))]",
          ].join(" ")}
        >
          Shopping {shoppingCount}
        </button>

        {/* Spacer: pushes group pills to the right on both breakpoints */}
        <span className="flex-1" aria-hidden />

        {/* The auto-lifecycle cluster — the kept note, Keep all, Clear all auto.
            Absent at zero, disabled only while one of its own writes runs. Not
            gated on autoCount here: state 7 keeps the kept-note after the last
            auto card goes, and the component decides its own absence. */}
        {onClearAuto && onKeepAllAuto && (
          <ClearAutoButton
            count={autoCount}
            keptCount={keptCount}
            onClear={onClearAuto}
            pending={sweepPending}
            onKeepAll={onKeepAllAuto}
            keepAllPending={keepAllPending}
          />
        )}

        {/* "Group" label — desktop only, margin-left: auto is handled by spacer above */}
        <span
          className="hidden md:inline font-mono text-[10px] uppercase tracking-[0.1em]"
          style={{ color: "var(--fg-faint)" }}
        >
          Group
        </span>

        {/* By type — active: dark pill with border | idle: plain muted text */}
        {/* Mobile active: px-10 py-4; Desktop active: px-13 py-5              */}
        {/* Mobile idle:   px-6 py-4 no border; Desktop idle: px-13 py-5 border */}
        <button
          type="button"
          onClick={() => onGroupingChange("type")}
          className={
            grouping === "type"
              ? "font-sans transition-[filter] hover:brightness-125 text-[11.5px] md:text-[12.5px] rounded-full px-[10px] py-[4px] md:px-[13px] md:py-[5px] font-semibold text-[color:var(--fg)] bg-[color:var(--elevated)] border border-solid border-[color:var(--border-strong)]"
              : "font-sans transition-[filter] hover:brightness-125 text-[11.5px] md:text-[12.5px] rounded-full px-[6px] py-[4px] md:px-[13px] md:py-[5px] border-0 md:border md:border-solid md:border-[color:var(--border)] font-medium text-[color:var(--fg-faint)] bg-transparent"
          }
        >
          By type
        </button>

        {/* By role — idle: no border mobile, 1px solid var(--border) desktop */}
        <button
          type="button"
          onClick={() => onGroupingChange("role")}
          className={
            grouping === "role"
              ? "font-sans transition-[filter] hover:brightness-125 text-[11.5px] md:text-[12.5px] rounded-full px-[10px] py-[4px] md:px-[13px] md:py-[5px] font-semibold text-[color:var(--fg)] bg-[color:var(--elevated)] border border-solid border-[color:var(--border-strong)]"
              : "font-sans transition-[filter] hover:brightness-125 text-[11.5px] md:text-[12.5px] rounded-full px-[6px] py-[4px] md:px-[13px] md:py-[5px] border-0 md:border md:border-solid md:border-[color:var(--border)] font-medium text-[color:var(--fg-faint)] bg-transparent"
          }
        >
          By role
        </button>
      </div>

      {/* Scoped to the filter it sits under: the sum of what Shopping is
          showing, and nothing when another filter is open. */}
      {/* No spacer wrapper: the strip declines to render on an empty list or an
          unreadable table, and a wrapper carrying the 10px gap would leave that
          gap under the pills with nothing in it. The strip owns its own top
          margin so the decision and the space it occupies stay together. */}
      {filter === "shopping" && priceSummary && (
        <PriceStrip summary={priceSummary} provenance={provenance} />
      )}
    </div>
  );
}
