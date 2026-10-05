"use client";

// Group Toggle — All/Shopping filter pills + By type / By role grouping pills.
// §Decklist Group Toggle (design table).

import { useState } from "react";
import { BULK_BUTTON_BASE, ClearAutoButton } from "./clear-auto";
import { LockMark } from "./lock-mark";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";
import { FilterPanel } from "../ui/filter-panel";
import { useIsDesktop } from "../ui/use-is-desktop";
import {
  buildDeckSortOptions,
  deckSortCopy,
  deckSortOrderLabel,
  nextDeckSortState,
  type DeckSortDirection,
  type DeckSortKey,
  DECK_GROUPING_LABELS,
} from "../../lib/copy/deck-sort";
import { PriceStrip } from "./price-strip";
import { StandInLimit } from "./stand-in-limit";
import type { PriceSummary, ProvenanceForm } from "../../lib/decks/price";
import { viewToggleCopy } from "../../lib/copy/card-surfaces";
import { ViewToggle, type ViewToggleOption } from "../ui/view-toggle";

export type DeckView = "list" | "card";

/** The key `useStoredView` keeps the deck's choice under. One key for every
 *  deck, not one per deck: "I read decks as cards" is a fact about the reader. */
export const DECK_VIEW_KEY = "the99:deck-view";

export function isDeckView(value: string): value is DeckView {
  return value === "list" || value === "card";
}

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
  /** Shopping rows over the deck's limit (swap tools). The limit line counts them; it draws
   *  nothing when the tools are off. */
  shoppingOverCount?: number;
  /** The live order for the open filter, and the way to change it. */
  sort: { key: DeckSortKey; direction: DeckSortDirection };
  onSortChange: (next: { key: DeckSortKey; direction: DeckSortDirection }) => void;
  /** Announced through the surface's own live region — see `BuilderShell`. */
  onSortAnnounce?: (message: string) => void;
  /**
   * The draft's own note for this slot (#389, surface 1) — `n of these differ
   * from vN`. While it is set the auto cluster's kept note stands down: the
   * slot holds one sentence, and "37 cards are yours now" beside "12 of these
   * differ from v2" is two counts of the same list that answer different
   * questions. The bulk controls themselves are untouched.
   */
  draftNote?: string | null;
  /**
   * The Lock cards mode (Locked, PR 4a; toolbar addendum F3). `onLockModeChange` is present only
   * with `NEVER_CUT_ENABLED` on, and its absence is what keeps this toolbar exactly as it was.
   */
  lockMode?: boolean;
  onLockModeChange?: (on: boolean) => void;
  /** Auto COPIES whose card is locked (T3): Clear's label counts `autoCount` less these. */
  lockedAutoCount?: number;
};

/**
 * `Lock cards`, which reads `Done` while the mode runs. Exported for the About page's Locked
 * cards figure, which draws it above the rows in the mode.
 */
export function LockModeButton({ lockMode, onToggle }: { lockMode: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`${BULK_BUTTON_BASE} inline-flex items-center gap-[7px] min-w-[116px] justify-center ${
        lockMode ? "text-accent border-accent" : "text-fg-body border-border-strong"
      }`}
    >
      <LockMark ink={lockMode ? "var(--accent)" : "var(--fg-muted)"} />
      {lockMode ? lockedCardsCopy.mode.done : lockedCardsCopy.mode.button}
    </button>
  );
}

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
  shoppingOverCount = 0,
  sort,
  onSortChange,
  onSortAnnounce,
  draftNote = null,
  lockMode = false,
  onLockModeChange,
  lockedAutoCount = 0,
}: GroupToggleProps) {
  // `md:` is the only breakpoint this row has ever used, and the panel's form
  // follows it: a labelled 44px pill at phone, the desktop popover above.
  const wide = useIsDesktop();
  // Keep all's question replaces the bulk pair, and Lock cards stands down with it (addendum F3):
  // a mode that changes every row's ✕ has no business beside an unanswered question about them.
  const [keepAsking, setKeepAsking] = useState(false);
  // Absent under Shopping rather than disabled, for the view well's reason: a shopping list is a
  // list of things to buy, and there is nothing on it to lock from here. A locked row keeps its
  // mark there; setting or clearing a lock happens only in the mode, in the All view.
  const lockAvailable = onLockModeChange !== undefined && filter === "all";
  // Cluster 2 and the hairline share this gate (addendum F3, delta 1). Lock cards alone is reason
  // enough for both; with the switch off it reduces to the gate they had before.
  const actCluster = lockAvailable || Boolean(draftNote) || autoCount > 0 || keptCount > 0;
  return (
    /* Toggle bar container: mobile p=9px 16px | desktop p=14px 26px 10px.
       The strip sits INSIDE this container, above the bottom border, so the
       divider closes the filter row and its strip together. The wrap is not
       free: `items-center` and both gaps belong to the pill row, not to the
       column — left on the outer element they would centre the pills and turn
       the 7/10px pill gap into the gap above the strip. */
    <div className="flex flex-col px-[16px] py-[9px] md:px-[26px] md:pt-[14px] md:pb-[10px] border-b border-b-[color:var(--border)] border-[color:var(--border)] md:border-b-0">
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

        {/* Spacer: pushes the group pills right — from `md:` only. Below it the
            CLUSTER grows instead (see its own note), and two growing children
            split the free space between them: at 700px that left the sort 40px
            short of the right edge with a hole beside it, rather than the well
            sitting flush. Only one of the two may grow at a time.

            HIDDEN below `md:`, not merely un-grown: a zero-width span is still
            a flex item, so the row's `gap-[7px]` would reserve 7px on each side
            of it — a 14px hole between the pills and the cluster, and one more
            item for the wrap to reason about. */}
        <span className="hidden md:block md:flex-1" aria-hidden />

        {/* The auto-lifecycle cluster — the kept note, Keep all, Clear all auto.
            Absent at zero, disabled only while one of its own writes runs. Not
            gated on autoCount here: state 7 keeps the kept-note after the last
            auto card goes, and the component decides its own absence. */}
        {/* CLUSTER 2 — act on the cards. One flex child, in both note forms.
            `clear-auto.tsx` already wraps the KEPT note with the bulk pair; the
            draft note used to sit outside that wrapper as a child of this row,
            which made the handoff's stated invariant — the row wraps between
            clusters and never inside one — false in exactly the variant nobody
            had measured, and spent a 10px gap the desktop line could not afford
            at 2px of margin. The wrapper is absent entirely when there is
            neither a note nor an auto cluster, rather than collecting a gap. */}
        {actCluster && (
          <span
            /* Gated on VISIBLE CONTENT, not on `autoControls` — `BuilderShell`
               passes that object whether or not there is anything to act on, so
               testing it kept an empty wrapper (and the row's gap) in the
               toolbar at every count of zero. The same predicate as the
               hairline, for the same reason.
               The wrapper also takes its CONTENTS' breakpoint, exactly as
               `clear-auto.tsx` makes its own take the kept note's. Below `md:`
               both notes are hidden and a zero-count auto cluster renders
               nothing, so an unconditional wrapper would be an empty flex child
               collecting the toolbar's 7px gap and spacing the row for content
               nobody can see. `empty:hidden` covers the remaining case — a
               wrapper whose children all declined to render at this width. */
            className={`flex-none flex-wrap items-center gap-[8px] empty:hidden ${
              // `flex` whenever Lock cards renders: it is a phone control too.
              autoCount > 0 || lockAvailable ? "flex" : "hidden md:flex"
            }`}
          >
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
            lockedCount={lockedAutoCount}
            lockMode={lockMode}
            onConfirmingChange={setKeepAsking}
          />
        )}

        {/* Lock cards: the LAST child of cluster 2, so the row still wraps between clusters and
            never inside one. The bulk pair's box plus the icon's gap, and a minimum width so
            `Done` keeps the box `Lock cards` drew. No `aria-label` and no `aria-pressed`
            (audit T6): the name is the visible label, and entering and leaving the mode are
            said in the builder's live region. */}
        {lockAvailable && !keepAsking && (
          <LockModeButton lockMode={lockMode} onToggle={() => onLockModeChange(!lockMode)} />
        )}
          </span>
        )}

        {/* CLUSTER 3 — how the list reads: what the sections are, what order
            the rows inside them take, and how a row is drawn. One `flex-none`
            child for the same reason cluster 2 is one: three loose children got
            away with it at seven controls and do not at eight, and the failure
            is the view well alone on a fourth line at 390px. */}
        {/* The hairline divides ACTING ON the cards from READING them, and sort
            is on the reading side — so it sits in front of this cluster rather
            than past it, which is the opposite of the chassis' hairline (that
            one says "not a filter").
            A SEPARATOR, NOT A CHILD, which is a rule about what it may never
            do: with nothing on its left it renders nothing. Its own condition
            rather than cluster 2's, because that cluster is drawn whenever a
            note or the controls exist while `ClearAutoButton` can still return
            an empty wrapper at zero — a rule dividing nothing from something is
            just a stray mark and a 10px gap. And nothing at phone either, where
            there is no room for it. */}
        {actCluster && (
          <span
            aria-hidden
            className="hidden md:block h-[22px] w-px flex-none bg-[color:var(--border-strong)]"
          />
        )}
        {/* A `div`, not a `span`: this cluster holds `FilterPanel`, whose root
            is a block element, and `<span><div/></span>` is invalid markup that
            React warns about at runtime. */}
        {/* `grow` on the phone only. This cluster wraps onto its own line at
            390px, and the view well is the one control a thumb reaches for
            without reading — so it goes to the right edge, where the thumb is,
            while the grouping pills and the sort stay left. Above `md:` the row
            does not wrap and the outer spacer already places this cluster, so
            growing here would fight it for the leftover space.

            `flex-none` is `md:` only for the same reason it has to be: it
            compiles to `flex: none`, which zeroes the grow this needs. */}
        <div
          className={[
            "flex items-center gap-[7px] md:gap-[10px] md:grow-0 md:flex-none",
            // Growing is the phone's push of the view well to the right edge,
            // and NOTHING else — so it happens only when the well is drawn.
            // Under Shopping the well is absent and a growing cluster would
            // stretch past its own last control, leaving space inside it that
            // holds nothing.
            filter === "all" ? "grow" : "",
          ].join(" ")}
        >
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
          {DECK_GROUPING_LABELS.type}
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
          {DECK_GROUPING_LABELS.role}
        </button>

        {/* The order the rows inside those sections take. One mount of the
            panel `/collection`'s own Sort is, in single-select: `By type` names
            the sections, this names what happens inside them, and the well
            names how a row is drawn — the three read left to right as one
            statement about the list. */}
        <FilterPanel
          // Keyed on the form: the panel holds its own `open` and has no reset,
          // so a sheet left open across a resize would come back as a desktop
          // popover with no trigger click. Every other mount does the same.
          key={`deck-sort-${wide ? "wide" : "compact"}`}
          compact={!wide}
          desktopRowMinPx={44}
          copy={deckSortCopy}
          options={buildDeckSortOptions(filter, sort.key, sort.direction)}
          selected={[sort.key]}
          selectionMode="single"
          // Exactly one order is always chosen, so a lit border would say "on"
          // about a control that is never off, and a badge would count one of one.
          selectionOrnament={false}
          showCounts={false}
          searchable={false}
          widthPx={260}
          footerStatus={false}
          onToggle={(code) => {
            const next = nextDeckSortState(sort, code as DeckSortKey);
            onSortChange(next);
            // Announced as authored: the labels carry `A–Z`, and lowercasing
            // changes how a screen reader says it.
            onSortAnnounce?.(`Sorted by ${deckSortOrderLabel(next.key, next.direction)}.`);
          }}
          onClear={() => {}}
          onAnnounce={(message) => onSortAnnounce?.(message)}
        />

        {/* Absent under Shopping, not disabled: a shopping list is a list of
            things to buy, and there is no second way to read it. */}
        {filter === "all" && (
          <>
            {/* Pushes the well to the right edge on the phone, and collapses
                above `md:` where the cluster is `flex-none` and the row reads as
                one statement left to right.

                INSIDE the condition, with the control it pushes: left outside,
                it is the cluster's last child under Shopping and pushes nothing
                — 330px of trailing dead space at 620px, which is what took the
                cluster off the right edge. */}
            <span className="grow md:hidden" aria-hidden />
            <ViewToggle options={DECK_VIEWS} value={view} onChange={onViewChange} />
          </>
        )}
        </div>
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
      {/* A sibling of the strip, not a child: the strip returns null without provenance, and the
          limit still shows then (it reads `none over`). */}
      {filter === "shopping" && <StandInLimit shoppingCount={shoppingCount} overCount={shoppingOverCount} />}
    </div>
  );
}
