"use client";
// Order — the rack's trailing control, and the one whose options come from the
// lane rather than from here: the owned lane sorts on Fit · Name · Recently
// added, discover on Popularity · Name · Recently released, and this component
// knows neither list.
//
// Order is never chipped and never counted by the badge (call 4): it always has
// a value, and the trigger beside the badge already shows which one.

import { filterCopy } from "../../../lib/copy/lanes";
import type { LaneOrder } from "../../../lib/commanders/lane-params";
import { RackSelect } from "./select";

export function OrderControl({
  value,
  options,
  onChange,
  wide,
  triggerHeight = 32,
}: {
  value: LaneOrder;
  options: readonly { key: LaneOrder; label: string }[];
  onChange: (o: LaneOrder) => void;
  wide: boolean;
  /** Rack treatment only. 32px inline on the desktop rack, where it shares a
      row with 34px controls; 44px on the phone's persistent row, where the
      trigger is a touch target. */
  triggerHeight?: number;
}) {
  const current = options.find((o) => o.key === value) ?? options[0];
  return (
    <RackSelect
      legend={filterCopy.order.legend}
      // The trigger names the control and its value in one string, so the rack
      // needs no separate caption for it.
      triggerLabel={filterCopy.order.trigger(current.label)}
      // The lane's first option is its default; anything else is a choice, and
      // the border says so.
      brass={value !== options[0].key}
      wide={wide}
      value={value}
      options={options}
      onChange={onChange}
      triggerHeight={triggerHeight}
      rowHeight={44}
    />
  );
}
