import type { KeyboardEvent } from "react";

/**
 * Arrow, Home and End keys for a two-or-more segment control that claims a composite role (the switch's
 * `tablist`, the filter's `radiogroup`): the group is one tab stop (roving `tabIndex`, set by the caller) and
 * the keys move the selection and the focus together, the pattern `builder-tabs.tsx` follows. Only a key from
 * one of the group's own segments is acted on.
 */
export function onSegmentKeys<T extends string>(
  e: KeyboardEvent<HTMLElement>,
  values: readonly T[],
  idOf: (v: T) => string,
  select: (v: T) => void,
  /** A segment the keys pass over, as a disabled button cannot take focus. */
  isDisabled: (v: T) => boolean = () => false,
): void {
  const from = values.findIndex((v) => idOf(v) === (e.target as HTMLElement).id);
  if (from < 0) return;
  const n = values.length;
  // Walks from `start` in `step` direction to the first enabled segment, wrapping; -1 when none is.
  const walk = (start: number, step: 1 | -1) => {
    for (let i = 0; i < n; i++) {
      const at = (((start + step * i) % n) + n) % n;
      if (!isDisabled(values[at])) return at;
    }
    return -1;
  };
  let to: number;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") to = walk(from + 1, 1);
  else if (e.key === "ArrowLeft" || e.key === "ArrowUp") to = walk(from - 1, -1);
  else if (e.key === "Home") to = walk(0, 1);
  else if (e.key === "End") to = walk(n - 1, -1);
  else return;
  e.preventDefault();
  // Only when no segment can take focus. A key landing on the focused segment still selects it, since focus need
  // not be the selection (a failed read leaves focus on its tab); callers drop a repeat of their own value.
  if (to < 0) return;
  select(values[to]);
  document.getElementById(idOf(values[to]))?.focus();
}
