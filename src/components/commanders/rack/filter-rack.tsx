"use client";
// The rack — the one component that knows which controls a lane has, in which
// order, at which breakpoint. Every control under this directory is lane-blind
// on purpose; this is where the lane is spent.
//
// Three rows, always in this order and always all three: controls, chips,
// result line. The rack never collapses, never reorders and never changes
// height when the results change (STATES invariants).
//
// The breakpoint is read HERE and nowhere below: the controls take `wide` as a
// prop, so exactly one treatment is ever mounted — never a desktop copy and a
// phone copy hidden past each other, which would put two of every radiogroup in
// the accessibility tree.
//
// What the rack does NOT say: `RevealControl` owns "25 shown · N more below"
// and the rack must not restate it. The result line answers a different
// question (how many rows the filters left), and two counts on one screen that
// disagree by design read as a bug.

import { useState } from "react";
import {
  defaultParams,
  activeControlCount,
  type Lane,
  type LaneParams,
} from "../../../lib/commanders/lane-params";
import { DiscoverChooseLink } from "../../intake/help-me-choose-door";
import { filterCopy } from "../../../lib/copy/lanes";
import { useMinWidth } from "../../ui/use-min-width";
import { AvailabilityControl } from "./availability-control";
import { chipsFor } from "./chip-line";
import { CHASSIS_WIDE_MIN_PX, FilterChassis, type FilterChip } from "../../ui/filter-chassis";
import { ColourControl } from "./colour-control";
import { FilterSheet } from "./filter-sheet";
import { OrderControl } from "./order-control";
import { PrintedInControl } from "./printed-in-control";
import type { PrintedInOption } from "../../../lib/commanders/printed-in-lane";
import { ORDER_OPTIONS } from "./order-options";
import { resultLineWithAside } from "./result-line";
import { SearchControl } from "./search-control";

export function FilterRack({
  params,
  lane,
  onChange,
  shown,
  total,
  excludedByExactly,
  sleevedByFree,
  orderPending = false,
  forceWide,
  chooseLink = false,
  printedInOptions,
}: {
  /** `Printed in ▾`'s rows: the sets this lane's rows were printed in, counted under the other
      controls. Absent where the lane shipped no index (`/about`'s specimens), and then the
      control is not drawn at all rather than drawn empty. */
  printedInOptions?: PrintedInOption[];
  params: LaneParams;
  lane: Lane;
  onChange: (next: LaneParams) => void;
  /** Rows the current parameters leave. */
  shown: number;
  total: number;
  /** Null unless `Exactly` is active AND it costs rows `Any` would have shown. */
  excludedByExactly: number | null;
  /** Owned lane only. Null unless free mode is on AND it hid commanders whose
      own card a committed deck has sleeved. */
  sleevedByFree?: number | null;
  /** Discover only: a ranking order missed the payload cache and the server is
      answering. Every other control, and every other order, narrows or arranges
      a list already in memory. */
  orderPending?: boolean;
  /**
   * Pin the rack's form instead of reading the viewport. For a caller whose
   * container, not the window, decides what fits — `/about`'s specimens.
   */
  forceWide?: boolean;
  /** Discover only: Help me choose's link on the result line (HANDOFF §1). The route passes the
      feature's flag, so with it off the rack draws exactly what it drew before. */
  chooseLink?: boolean;
}) {
  // The chassis's breakpoint, and the only one there is. A 1024 hook used to sit
  // beside it, which would have left these two lanes compact from 1000 to 1023
  // while `/decks` was already wide — a route-specific breakpoint, which is the
  // thing one frame exists to stop. It had no callers and is retired.
  // `forceWide` overrides the query for a caller whose CONTAINER is the
  // constraint rather than the viewport. The route never passes it: there the
  // two always agree, because a wide viewport gives the lane a wide column.
  //
  // `/about` is the case where they do not. Its plate is about 750px inside a
  // 1300px window, so the query answers wide and the rack draws a form its
  // container cannot hold — the order control overlapping the join toggle and
  // clipping at the plate's edge. A figure of a broken layout teaches a
  // layout the reader will never meet.
  const viewportWide = useMinWidth(`(min-width: ${CHASSIS_WIDE_MIN_PX}px)`);
  const wide = forceWide ?? viewportWide;

  // Composed ONCE and handed to both forms. The rack draws it on the result line
  // and the sheet draws it in its header, and the sheet's own comment promises
  // they are the same sentence; composing it in each place is what let the two
  // disagree.
  const resultLine = resultLineWithAside(shown, total, lane, excludedByExactly, sleevedByFree);

  // NOT passed to the chassis as `announce`. That prop is for a message a
  // surface raises on an event — supplying it as a standing value makes it
  // `fresh` on mount, and the chassis reads its own count out on arrival, which
  // is the one thing `ResultLine` keeps a null for. The aside is therefore
  // spoken, because it is part of the visible sentence and the chassis speaks
  // its visible sentence. That is the right region for it: the aside explains
  // the count, and this is the region that owns the count.
  const [sheetOpen, setSheetOpen] = useState(false);

  // Discover's door into Help me choose, carrying the colors lit here and nothing else.
  const choose = chooseLink && lane === "discover"
    ? <DiscoverChooseLink colors={params.colors} exactly={params.match === "exactly"} wide={wide} />
    : null;

  // Same reason as `decks-view.tsx`: unmounting the sheet at the breakpoint
  // does not close it, so crossing back would remount an open modal. Adjusted
  // during render rather than in an effect, which this repo's lint rejects.
  // `FilterSheet` focuses its own dialog and has no focus-return cleanup, so
  // closing it at the breakpoint removes the focused element and focus falls to
  // `<body>`. The wide form's search field takes it, exactly as `/decks` does.
  const [handOffFocus, setHandOffFocus] = useState(false);
  const [wasWide, setWasWide] = useState(wide);
  if (wasWide !== wide) {
    setWasWide(wide);
    if (wide && sheetOpen) {
      setSheetOpen(false);
      setHandOffFocus(true);
    } else if (!wide && handOffFocus) {
      setHandOffFocus(false);
    }
  }
  const orders = ORDER_OPTIONS[lane];

  // The badge is `activeControlCount` and nothing else — not the chip count,
  // which can differ, and never search or order (call 4).
  const active = activeControlCount(params, lane);

  const search = (
    <SearchControl
      value={params.q}
      onChange={(q) => onChange({ ...params, q })}
      wide={wide}
      autoFocus={handOffFocus}
    />
  );
  // Keyed on the form so both popover controls get fresh state across the
  // breakpoint. `RackSelect` holds its own `open`, and the wide menu and the
  // compact radio group are two branches of it: without this, a desktop menu
  // left open vanishes on the way to compact and reappears unprompted on the
  // way back — the same stale-open bug the sheet had, in a control that has no
  // unmount to hide it.
  const order = (
    <OrderControl
      key={wide ? "wide" : "compact"}
      value={params.order}
      options={orders}
      onChange={(next) => onChange({ ...params, order: next })}
      // The rack treatment at both breakpoints: on the phone the order trigger
      // is on the persistent row beside `Filters`, not a row of pills. The
      // sheet's own copy of the control is the pill treatment.
      wide
      // 44px square on the phone row, where it is a touch target rather than a
      // desktop trigger sharing a 34px rhythm with search.
      iconOnly={!wide}
      triggerHeight={wide ? 32 : 44}
      pending={orderPending}
    />
  );

  // `chipsFor` already knows every dimension and how to unset one; the chassis
  // needs only a label and a callback, so this is a shape change rather than a
  // second source of truth about what is on.
  const chassisChips: FilterChip[] = chipsFor(params, lane).map((chip) => ({
    key: chip.key,
    label: chip.label,
    // The colour chip collapses its values to a count, so the swatches are the
    // only thing that says which hues are lit. Dropping them made "2 colors"
    // mean two unnamed colours.
    dots: chip.dots,
    spoken: chip.spoken,
    onRemove: () => onChange({ ...params, ...chip.next }),
  }));

  return (
    <FilterChassis
      form={wide ? "wide" : "compact"}
      chips={chassisChips}
      onClearAll={() =>
        // `defaultParams` resets the order too, and this control's accessible
        // name promises the sort is unchanged. Order lives in the chassis's
        // own slot now, so clearing a filter must not move it — on discover it
        // would also fire a fresh request for a ranking nobody asked for.
        onChange({ ...defaultParams(lane), order: params.order })
      }
      resultLine={resultLine}
      // At the result line's right end on the wide rack; under the count, on a line of its own, on
      // the compact one (`after`). Keyed to the rack's own breakpoint, the only one there is.
      resultTrailing={wide && choose ? choose : undefined}
      // Compact's persistent row is `search · sort · Filters` (STATES §156), so
      // the trigger joins the trailing cluster rather than sitting in the
      // controls ahead of it. Wide keeps sort alone past the hairline, where
      // the five filter controls are all inline.
      // The sheet is aria-modal and carries its own region, so the chassis's
      // stays quiet while it is open rather than announcing the same count from
      // behind the modal.
      silentResult={!wide && sheetOpen}
      sort={
        wide ? (
          order
        ) : (
          // The slot wrapper spaces the leading group, the hairline and this
          // slot — not the controls inside it, so the pair needs its own gap or
          // the trigger sits flush against the order glyph.
          <div className="flex items-center gap-[8px]">
            {order}
            <FiltersTrigger badge={active} onClick={() => setSheetOpen(true)} expanded={sheetOpen} />
          </div>
        )
      }
      controls={
        wide ? (
        // Leading-edge reading order (readiness decision 2): the controls run
        // left to right in the order a reader would reach for them, and each
        // lane's own control sits where its question is asked. Frame `I1`'s
        // trailing arrangement is deliberately not built.
        <>
          {search}
          <ColourControl
            colors={params.colors}
            match={params.match}
            onColorsChange={(colors) => onChange({ ...params, colors })}
            onMatchChange={(match) => onChange({ ...params, match })}
            wide
          />
          {/* Before score-against: the owned lane reads search · colour · printed-in ·
              score-against (STATES, the dimension list per route). */}
          {printedInOptions && (
            <PrintedInControl
              form="wide"
              options={printedInOptions}
              selected={params.printedIn}
              onChange={(printedIn) => onChange({ ...params, printedIn })}
              shown={shown}
              total={total}
            />
          )}
          {/* The owned lane's own control, and its only one. Discover mounts
              nothing here — not a greyed stand-in. */}
          {lane === "owned" && (
            <AvailabilityControl
              key={wide ? "wide" : "compact"}
              value={params.avail}
              onChange={(avail) => onChange({ ...params, avail })}
              wide
            />
          )}
        </>
      ) : (
        // The persistent row: search · order · `Filters`, all 44px. Everything
        // else is in the sheet, which is why search is here and not there — and
        // why the badge cannot count it.
        <div className="min-w-0 flex-auto">{search}</div>
      )
      }
      after={
        /* Mounted only while open, rather than mounted-and-returning-null. It is
           still never a hidden duplicate of the controls it replaces, and now it
           also carries no state across a closing: the announcement inside it
           belongs to one opening, and unmounting is what makes that true without
           a stamp tracking it. */
        <>
          {!wide && choose}
          {!wide && sheetOpen && (
            <FilterSheet
              open
              onOpenChange={setSheetOpen}
              params={params}
              lane={lane}
              onChange={onChange}
              shown={shown}
              total={total}
              resultLine={resultLine}
              printedInOptions={printedInOptions}
            />
          )}
        </>
      }
    />
  );
}

// Module scope, as everywhere in this directory: a component declared inside
// `FilterRack` would be a new type on every render and would remount its own
// subtree.
function FiltersTrigger({
  badge,
  onClick,
  expanded,
}: {
  /** `activeControlCount`. Zero draws no badge at all. */
  badge: number;
  onClick: () => void;
  expanded: boolean;
}) {
  return (
    <button
      type="button"
      // The name is the word, never the word plus the digit: the badge is a
      // restatement of the chips below for sighted readers, and folding it into
      // the accessible name would have a screen reader announce "Filters 2"
      // where the chip line has already said which two.
      aria-label={filterCopy.sheet.trigger}
      aria-haspopup="dialog"
      aria-expanded={expanded}
      onClick={onClick}
      className={[
        "inline-flex h-[44px] shrink-0 cursor-pointer items-center gap-[7px] rounded-[10px]",
        "border border-solid bg-[color:var(--surface-sunken)] font-sans text-[13px] text-[color:var(--fg)]",
        // One `px-*` either way: two would resolve by stylesheet order, not by
        // the order of this array. The badge takes the 2px the padding gives up,
        // so the trigger keeps its width whether or not a filter is on.
        badge > 0
          ? "px-[11px] border-[color:var(--accent)]"
          : "px-[13px] border-[color:var(--border-strong)]",
      ].join(" ")}
    >
      {filterCopy.sheet.trigger}
      {badge > 0 && (
        <span
          aria-hidden
          className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[color:var(--accent)] px-[5px] font-mono text-[11px] font-semibold text-[color:var(--bg)]"
        >
          {badge}
        </span>
      )}
    </button>
  );
}
