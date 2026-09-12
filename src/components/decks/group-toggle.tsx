"use client";

// Group Toggle — All/Shopping filter pills + By type / By role grouping pills.
// §Decklist Group Toggle (design table).

import { ClearAutoButton } from "./clear-auto";
import { PriceStrip } from "./price-strip";
import type { PriceSummary, ProvenanceForm } from "../../lib/decks/price";
import { viewToggleCopy } from "../../lib/copy/card-surfaces";
import { ViewToggle, type ViewToggleOption } from "../ui/view-toggle";

export type DeckView = "list" | "card";

const DECK_VIEWS: readonly [ViewToggleOption<DeckView>, ViewToggleOption<DeckView>] = [
  { value: "list", glyph: "≣", label: viewToggleCopy.deck.list },
  { value: "card", glyph: "▦", label: viewToggleCopy.deck.card },
];

/**
 * One prop, not two handlers. The cluster renders only when both answers are
 * available, so as separate optional props a caller passing just the sweep
 * would drop the whole cluster with neither a type error nor a runtime signal.
 * Bundled, the pair cannot be half-supplied.
 */
export type AutoControls = { onClear: () => void; onKeepAll: () => void };

type GroupToggleProps = {
  allCount: number;
  shoppingCount: number;
  filter: "all" | "shopping";
  grouping: "type" | "role";
  onFilterChange: (f: "all" | "shopping") => void;
  onGroupingChange: (g: "type" | "role") => void;
  /** Both required, not optional: the well is part of the bar from here on, and
   *  an optional pair would let a caller drop the control with no signal. */
  view: DeckView;
  onViewChange: (v: DeckView) => void;
  /** Number of untouched auto cards. The button is absent at 0. */
  autoCount?: number;
  /** Number of non-auto cards — kept fill cards and player additions alike. */
  keptCount?: number;
  sweepPending?: boolean;
  keepAllPending?: boolean;
  /** Absent on surfaces with no fill to answer for. */
  autoControls?: AutoControls;
  /** Summed over the same cards the Shopping pill counts — one fact, two
      renderings, so they can never disagree on screen. */
  priceSummary?: PriceSummary | null;
  /** Server-built. Null renders no strip at all. */
  provenance?: ProvenanceForm | null;
  /** The rows the Shopping filter shows — what the strip's buy link buys.
      Required, not defaulted: an empty list renders the strip with no link at
      all, so a caller that forgot it would ship a silently link-less strip. */
  shoppingCards: { name: string; quantity: number }[];
  /**
   * The draft's own note for this slot (#389, surface 1) — `n of these are not
   * in vN yet`. While it is set the auto cluster's kept note stands down: the
   * slot holds one sentence, and "37 cards are yours now" beside "12 of these
   * are not in v2 yet" is two counts of the same list that answer different
   * questions. The bulk controls themselves are untouched.
   */
  draftNote?: string | null;
};

export function GroupToggle({
  allCount,
  shoppingCount,
  filter,
  grouping,
  onFilterChange,
  onGroupingChange,
  view,
  onViewChange,
  autoCount = 0,
  keptCount = 0,
  sweepPending = false,
  keepAllPending = false,
  autoControls,
  priceSummary = null,
  provenance = null,
  shoppingCards,
  draftNote = null,
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
        {/* "All N" filter pill. Selected is bone on `--elevated` with a
            `--border-strong` ring — verbatim the active `By type` skin. No
            accent fill anywhere on the builder's control bar: selection here is
            said with the bone-on-elevated skin, never with a coloured ground.
            Accent does still tint a border — the Shopping pill mixes 30% of it
            into its idle ring below. */}
        <button
          type="button"
          onClick={() => onFilterChange("all")}
          className={[
            "font-sans font-semibold transition-[filter] hover:brightness-125 text-[12px] md:text-[13px] rounded-full px-[11px] py-[4px] md:px-[14px] md:py-[5px]",
            filter === "all"
              ? "text-[color:var(--fg)] bg-[color:var(--elevated)] border border-solid border-[color:var(--border-strong)]"
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
              ? "font-semibold text-[color:var(--fg)] bg-[color:var(--elevated)] border border-solid border-[color:var(--border-strong)]"
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
        {/* The draft's note, in the slot the kept note otherwise holds. Its own
            element rather than a value passed through the auto cluster: the
            cluster is absent entirely on a deck the fill never ran on, and the
            draft note has to survive that. */}
        {draftNote && (
          <span className="font-mono text-[11.5px] text-fg-locked hidden md:inline">
            {draftNote}
          </span>
        )}

        {autoControls && (
          <ClearAutoButton
            count={autoCount}
            // Zeroed while the draft speaks for this slot — see `draftNote`.
            // The cluster's own absence test reads it, so a deck with no auto
            // cards left drops the wrapper rather than keeping an empty one.
            keptCount={draftNote ? 0 : keptCount}
            onClear={autoControls.onClear}
            pending={sweepPending}
            onKeepAll={autoControls.onKeepAll}
            keepAllPending={keepAllPending}
          />
        )}

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

        {/* Absent under Shopping, not disabled: a shopping list is a list of
            things to buy, and there is no second way to read it. */}
        {filter === "all" && (
          <ViewToggle options={DECK_VIEWS} value={view} onChange={onViewChange} />
        )}
      </div>

      {/* Scoped to the filter it sits under: the sum of what Shopping is
          showing, and nothing when another filter is open. */}
      {/* No spacer wrapper: the strip declines to render on an empty list or an
          unreadable table, and a wrapper carrying the 10px gap would leave that
          gap under the pills with nothing in it. The strip owns its own top
          margin so the decision and the space it occupies stay together. */}
      {filter === "shopping" && priceSummary && (
        <PriceStrip summary={priceSummary} provenance={provenance} shoppingCards={shoppingCards} />
      )}
    </div>
  );
}
