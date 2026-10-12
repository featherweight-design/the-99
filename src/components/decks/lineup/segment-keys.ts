import type { KeyboardEvent } from "react";

/**
 * Arrow, Home and End keys for a two-or-more segment control that claims a composite role (the switch's
 * `tablist`, the filter's `radiogroup`): the group is one tab stop (roving `tabIndex`, set by the caller) and
 * the keys move the selection and the focus together, the pattern `builder-tabs.tsx` follows. Only a key from
 * one of the group's own segments is acted on.
 */
export function onSegmentKeys<T extends string>(e: KeyboardEvent<HTMLElement>, values: readonly T[], idOf: (v: T) => string, select: (v: T) => void): void {
  const from = values.findIndex((v) => idOf(v) === (e.target as HTMLElement).id);
  if (from < 0) return;
  let to: number;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") to = (from + 1) % values.length;
  else if (e.key === "ArrowLeft" || e.key === "ArrowUp") to = (from - 1 + values.length) % values.length;
  else if (e.key === "Home") to = 0;
  else if (e.key === "End") to = values.length - 1;
  else return;
  e.preventDefault();
  select(values[to]);
  document.getElementById(idOf(values[to]))?.focus();
}
