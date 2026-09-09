"use client";
// Order — the rack's trailing control, and the one whose options come from the
// lane rather than from here: the owned lane sorts on Fit · Name, discover on
// Best fit · Something new · Popularity · Name · Recently released, and this
// component knows neither list.
//
// Order is never chipped and never counted by the badge (call 4): it always has
// a value, and the trigger beside the badge already shows which one. That holds
// on discover too, where the first two options are server rankings: the reader
// has picked one of five orders either way, and a chip saying so would be a
// second readout of the trigger next to it.

import { filterCopy } from "../../../lib/copy/lanes";
import type { LaneOrder } from "../../../lib/commanders/lane-params";
import { RackSelect } from "./select";

/** The order glyph — three rules of decreasing length. Decorative: the trigger
    carries the control and its value as its accessible name. */
export function OrderGlyph() {
  return (
    <svg
      aria-hidden
      width="17"
      height="17"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <path d="M5 5h10M6.5 10h7M8.5 15h3" />
    </svg>
  );
}

export function OrderControl({
  value,
  options,
  onChange,
  wide,
  iconOnly = false,
  triggerHeight = 32,
  pending = false,
}: {
  value: LaneOrder;
  options: readonly { key: LaneOrder; label: string; gloss?: string }[];
  onChange: (o: LaneOrder) => void;
  wide: boolean;
  /** The phone row's treatment: a square glyph button rather than a labelled
      trigger, because search needs the width more than the order name does. */
  iconOnly?: boolean;
  /** Rack treatment only. 32px inline on the desktop rack, where it shares a
      row with 34px controls; 44px on the phone's persistent row, where the
      trigger is a touch target. */
  triggerHeight?: number;
  /** Discover only, and only for its two ranking orders: the flip is a server
      round-trip and the answer is still out (#338). The other three arrange a
      list already in memory and never set this. */
  pending?: boolean;
}) {
  const current = options.find((o) => o.key === value) ?? options[0];
  return (
    <RackSelect
      legend={filterCopy.order.legend}
      // The trigger names the control and its value in one string, so the rack
      // needs no separate caption for it.
      triggerLabel={filterCopy.order.trigger(current.label)}
      triggerIcon={iconOnly ? <OrderGlyph /> : undefined}
      // The lane's first option is its default; anything else is a choice, and
      // the border says so.
      brass={value !== options[0].key}
      wide={wide}
      value={value}
      options={options}
      onChange={onChange}
      triggerHeight={triggerHeight}
      rowHeight={44}
      pending={pending}
    />
  );
}
