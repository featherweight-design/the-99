"use client";
// Row two of the rack: what is filtered, and the one control that undoes it.
//
// The row reserves its height with nothing active and says "no filters —
// nothing to clear" rather than collapsing, and `Clear` stays present and
// disabled rather than being removed. The shipped page popped both in and out
// and the stack jumped under the reader's thumb.
//
// One chip per CONTROL, never one per hue: two pips lit is "2 colours", the
// same collapse `activeControlCount` counts. Removing a chip returns its
// control to the lane's default; `Clear` returns all of them.

import { WUBRG_COLOR } from "../../../lib/collection/browse";
import {
  activeControlCount,
  defaultParams,
  type Lane,
  type LaneParams,
} from "../../../lib/commanders/lane-params";
import { commandersCopy, discoverCopy, filterCopy } from "../../../lib/copy/lanes";

type ChipSpec = {
  key: string;
  label: string;
  /** WUBRG fills, drawn as leading swatches on the colour chip — one per lit
      hue, even where the label has already collapsed them to a count. The chip
      is still one chip; the swatches say which pips it stands for. */
  dots?: string[];
  removeAria: string;
  next: Partial<LaneParams>;
};

// The tail collapses at a fixed chip count rather than at a measured width.
// The row must not wrap, and the design's cue is "past one line, +N" — but a
// width is not knowable at render time (and is zero in jsdom, which is why the
// plan's measured version could never pass its own test). A count is the same
// promise held deterministically: four chips is the most either lane can
// produce (search, colours, match, and availability or scope), so the rack at
// 1024px+ never collapses, and the phone row shows the newest-read chip plus a
// +N for the rest.
const CAP: Record<"wide" | "narrow", number> = { wide: 4, narrow: 1 };

export function ChipLine({
  params,
  lane,
  onChange,
  wide,
  onOverflowOpen,
}: {
  params: LaneParams;
  lane: Lane;
  onChange: (next: LaneParams) => void;
  wide: boolean;
  /** Opens the sheet the collapsed chips' controls live in. Absent at 1024px+,
      where the cap is four and nothing can collapse. */
  onOverflowOpen?: () => void;
}) {
  const chips = chipsFor(params, lane);
  // Search is not in `activeControlCount` — it sits outside the sheet — so it
  // is asked for separately here. Clear undoes everything the row can show.
  const anyActive = activeControlCount(params, lane) > 0 || params.q !== "";

  const cap = CAP[wide ? "wide" : "narrow"];
  const shown = chips.length > cap ? chips.slice(0, cap) : chips;
  const overflow = chips.length - shown.length;

  return (
    <div
      className={[
        "flex items-center gap-[6px] overflow-hidden",
        // Height is reserved, not grown into: the rows below must not move when
        // the first chip appears.
        wide ? "min-h-[22px] gap-[8px]" : "min-h-[30px]",
      ].join(" ")}
    >
      {chips.length === 0 ? (
        <span className="font-mono text-[10.5px] text-[color:var(--fg-locked)]">
          {filterCopy.chips.none}
        </span>
      ) : (
        shown.map((chip) => (
          <Chip
            key={chip.key}
            label={chip.label}
            dots={chip.dots}
            wide={wide}
            removeAria={chip.removeAria}
            onRemove={() => onChange({ ...params, ...chip.next })}
          />
        ))
      )}

      {overflow > 0 && (
        // Dashed, and a second door to the sheet: the chips it stands for are
        // the controls it opens, so pressing what hid them is what shows them.
        // Named for the chips it stands in for rather than for the sheet, which
        // already has a button by that name one row above.
        <button
          type="button"
          onClick={onOverflowOpen}
          aria-label={filterCopy.chips.overflowAria(overflow)}
          aria-haspopup="dialog"
          className={[
            "inline-flex shrink-0 cursor-pointer items-center rounded-full border border-dashed",
            "bg-[color:var(--surface-sunken)] border-[color:var(--border-strong)] font-mono text-[color:var(--fg-body)]",
            // The same height as the chips it stands in for, so the row reads as
            // one line of chips with the last one dashed.
            wide ? "h-[22px] px-[9px] text-[10.5px]" : "h-[30px] px-[11px] text-[11px]",
          ].join(" ")}
        >
          {filterCopy.chips.overflow(overflow)}
        </button>
      )}

      <button
        type="button"
        // Present and inert, never absent — the affordance is part of what the
        // row teaches, and a button that comes and goes has to be re-found.
        disabled={!anyActive}
        onClick={() => onChange(defaultParams(lane))}
        className={[
          "ml-auto shrink-0 border-0 bg-transparent p-0 font-mono",
          wide ? "text-[10.5px]" : "text-[11px]",
          anyActive
            ? "cursor-pointer text-[color:var(--accent)]"
            : "cursor-default text-[color:var(--fg-locked)]",
        ].join(" ")}
      >
        {filterCopy.chips.clear}
      </button>
    </div>
  );
}

// Control order, and search first: the row reads in the order the rack above it
// is laid out, so a chip and the control that made it are on the same sight line.
function chipsFor(params: LaneParams, lane: Lane): ChipSpec[] {
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

  if (lane === "owned" && params.avail === "free") {
    chips.push({
      key: "avail",
      label: commandersCopy.availability.freeShort,
      removeAria: `Remove ${commandersCopy.availability.freeShort} filter`,
      next: { avail: "all" },
    });
  }

  if (lane === "discover" && params.scope === "new") {
    chips.push({
      key: "scope",
      label: discoverCopy.scope.somethingNew,
      removeAria: `Remove ${discoverCopy.scope.somethingNew} filter`,
      next: { scope: "bestfit" },
    });
  }

  return chips;
}

// Module scope, as everywhere in this directory: a component declared inside
// `ChipLine` would be a new type each render and would remount its own input.
function Chip({
  label,
  dots,
  wide,
  removeAria,
  onRemove,
}: {
  label: string;
  dots?: string[];
  wide: boolean;
  removeAria: string;
  onRemove: () => void;
}) {
  return (
    <span
      data-testid="filter-chip"
      className={[
        "inline-flex shrink-0 items-center gap-[7px] whitespace-nowrap rounded-full",
        // Mono, and the plain border rather than the strong one: the chip is a
        // readout of state, drawn in the same face as the result line it sits
        // above, not a control competing with the rack.
        "border border-solid border-[color:var(--border)] bg-[color:var(--elevated)]",
        "font-mono text-[color:var(--fg-body)]",
        wide ? "h-[22px] px-[9px] text-[10.5px]" : "h-[30px] px-[11px] text-[11px]",
      ].join(" ")}
    >
      {dots && dots.length > 0 && (
        <span aria-hidden className="flex shrink-0 items-center gap-[3px]">
          {dots.map((fill) => (
            <span
              key={fill}
              className="block shrink-0 rounded-[2px]"
              style={{ width: wide ? 7 : 8, height: wide ? 7 : 8, background: fill }}
            />
          ))}
        </span>
      )}
      {label}
      {/* The ✕ draws about 10×19px, so its hit area is grown to 44px with a
          centred pseudo-element rather than with padding: padding would inflate
          the chip, and the chip's size is drawn. Carried from
          `collection/chip-row.tsx`, where the same trade was made. */}
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeAria}
        className={[
          "relative cursor-pointer border-0 bg-transparent p-0",
          "after:absolute after:left-1/2 after:top-1/2 after:h-[44px] after:w-[44px]",
          "after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']",
          "text-[color:var(--fg-faint)]",
        ].join(" ")}
      >
        ✕
      </button>
    </span>
  );
}
