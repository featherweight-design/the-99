"use client";
// The rack — the one component that knows which controls a lane has, in which
// order, at which breakpoint. Every control under this directory is lane-blind
// on purpose; this is where the lane is spent.
//
// Three rows, always in this order and always all three: controls, chips,
// result line. The rack never collapses, never reorders and never changes
// height when the results change (STATES invariants).
//
// `useIsWide()` is called HERE and nowhere below: the controls take `wide` as a
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
import { filterCopy } from "../../../lib/copy/lanes";
import { useIsWide } from "../../ui/use-is-wide";
import { AvailabilityControl } from "./availability-control";
import { chipsFor } from "./chip-line";
import { FilterChassis, type FilterChip } from "../../ui/filter-chassis";
import { ColourControl } from "./colour-control";
import { FilterSheet } from "./filter-sheet";
import { OrderControl } from "./order-control";
import { ORDER_OPTIONS } from "./order-options";
import { resultSentence } from "./result-line";
import { SearchControl } from "./search-control";

export function FilterRack({
  params,
  lane,
  onChange,
  shown,
  total,
  excludedByExactly,
  orderPending = false,
}: {
  params: LaneParams;
  lane: Lane;
  onChange: (next: LaneParams) => void;
  /** Rows the current parameters leave. */
  shown: number;
  total: number;
  /** Null unless `Exactly` is active AND it costs rows `Any` would have shown. */
  excludedByExactly: number | null;
  /** Discover only: a ranking order missed the payload cache and the server is
      answering. Every other control, and every other order, narrows or arranges
      a list already in memory. */
  orderPending?: boolean;
}) {
  const wide = useIsWide();
  const [sheetOpen, setSheetOpen] = useState(false);
  const orders = ORDER_OPTIONS[lane];

  // The badge is `activeControlCount` and nothing else — not the chip count,
  // which can differ, and never search or order (call 4).
  const active = activeControlCount(params, lane);

  const search = (
    <SearchControl
      value={params.q}
      onChange={(q) => onChange({ ...params, q })}
      wide={wide}
    />
  );
  const order = (
    <OrderControl
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
    onRemove: () => onChange({ ...params, ...chip.next }),
  }));

  return (
    <FilterChassis
      form={wide ? "wide" : "compact"}
      chips={chassisChips}
      onClearAll={() => onChange(defaultParams(lane))}
      resultLine={`${resultSentence(shown, total, lane)}${
        excludedByExactly === null
          ? ""
          : ` — ${filterCopy.match.excludedAside(excludedByExactly)}`
      }`}
      sort={order}
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
          {/* The owned lane's own control, and its only one. Discover mounts
              nothing here — not a greyed stand-in. */}
          {lane === "owned" && (
            <AvailabilityControl
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
        <>
          <div className="min-w-0 flex-auto">{search}</div>
          <FiltersTrigger
            badge={active}
            onClick={() => setSheetOpen(true)}
            expanded={sheetOpen}
          />
        </>
      )
      }
      after={
        /* Closed, this returns null: the sheet is never a hidden duplicate of
           the controls it replaces. */
        !wide && (
        <FilterSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          params={params}
          lane={lane}
          onChange={onChange}
          shown={shown}
          total={total}
        />
      )
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
