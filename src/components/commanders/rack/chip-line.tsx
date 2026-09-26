"use client";
// Row two of the rack: what is filtered, and the one control that undoes it.
//
// The row reserves its height with nothing active rather than collapsing, and
// `Clear` stays present and disabled rather than being removed. The shipped page
// popped both in and out and the stack jumped under the reader's thumb. The
// empty row says nothing: a disabled `Clear` beside no chips is already the
// whole of "nothing to clear".
//
// One chip per CONTROL, never one per hue: two pips lit is "2 colors", the
// same collapse `activeControlCount` counts. Removing a chip returns its
// control to the lane's default; `Clear` returns all of them.

import { WUBRG_COLOR } from "../../../lib/collection/browse";
import {
  type Lane,
  type LaneParams,
} from "../../../lib/commanders/lane-params";
import { commandersCopy, filterCopy } from "../../../lib/copy/lanes";

export type ChipSpec = {
  key: string;
  label: string;
  /** The collapsed values named, for readers who cannot see the swatches. */
  spoken?: string;
  /** WUBRG fills, drawn as leading swatches on the colour chip — one per lit
      hue, even where the label has already collapsed them to a count. The chip
      is still one chip; the swatches say which pips it stands for. */
  dots?: string[];
  removeAria: string;
  next: Partial<LaneParams>;
};

/**
 * The Printed in chip's label, and the control's name wherever the lane names it (the empty
 * state's one fix): one set by its code, two by both, more by a count.
 */
export function printedInLabel(codes: readonly string[]): string {
  if (codes.length === 1) return filterCopy.printedIn.one(codes[0]);
  if (codes.length === 2) return filterCopy.printedIn.many(codes);
  return filterCopy.printedIn.manyShort(codes.length);
}

// Control order, and search first: the row reads in the order the rack above it
// is laid out, so a chip and the control that made it are on the same sight line.
export function chipsFor(params: LaneParams, lane: Lane): ChipSpec[] {
  const chips: ChipSpec[] = [];

  if (params.q !== "") {
    chips.push({
      key: "q",
      label: filterCopy.chips.query(params.q),
      removeAria: filterCopy.search.clear,
      next: { q: "" },
    });
  }

  if (params.colors.length > 0) {
    const single = params.colors.length === 1 ? params.colors[0] : null;
    const label = single
      ? filterCopy.colour.names[single as keyof typeof filterCopy.colour.names]
      : filterCopy.colour.collapsed(params.colors.length);
    chips.push({
      key: "colors",
      label,
      // The swatches say which hues with colour alone and are `aria-hidden`, so
      // past one pip the label is a bare count for anyone not looking at them.
      // Undefined at a single value, where the label already IS the name.
      spoken: single
        ? undefined
        : params.colors
            .map((c) => filterCopy.colour.names[c as keyof typeof filterCopy.colour.names] ?? c)
            .join(", "),
      dots: params.colors.map((c) => WUBRG_COLOR[c.toUpperCase()]),
      removeAria: `Remove ${label} filter`,
      // Dropping the pips drops the modifier with them: `Exactly` with nothing
      // lit is the greyed state, and it would otherwise leave a chip behind.
      next: { colors: [], match: "contains" },
    });

    // The modifier is only a filter while there are pips for it to modify —
    // the same condition `activeControlCount` applies.
    if (params.match === "exactly") {
      chips.push({
        key: "match",
        label: filterCopy.match.exactlyShort,
        removeAria: `Remove ${filterCopy.match.exactly} filter`,
        next: { match: "contains" },
      });
    }
  }

  // One chip for the whole selection, like the colours: past two sets the codes collapse to a count,
  // and the spoken form still names every one.
  if (params.printedIn.length > 0) {
    const label = printedInLabel(params.printedIn);
    chips.push({
      key: "printedIn",
      label,
      spoken: params.printedIn.length > 2 ? filterCopy.printedIn.many(params.printedIn) : undefined,
      removeAria: filterCopy.printedIn.removeAria,
      next: { printedIn: [] },
    });
  }

  // Order is never chipped, on either lane: it always has a value, and the
  // trigger on the rack already names the one in force. That holds on discover
  // even though two of its five orders now decide what the list is ranked on —
  // a chip saying so would restate the control beside it.

  if (lane === "owned" && params.avail === "free") {
    chips.push({
      key: "avail",
      label: commandersCopy.availability.freeShort,
      removeAria: `Remove ${commandersCopy.availability.freeShort} filter`,
      next: { avail: "all" },
    });
  }

  return chips;
}
