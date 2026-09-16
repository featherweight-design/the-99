"use client";

// The `browse` figure's body, and it has to be a client module.
//
// `FilterChipPill` and `ViewToggle` are client components whose props include
// handlers, so a fixture built on the server hands a FUNCTION across the
// boundary — which React refuses outright. The figure threw on every real
// render while every unit test passed, because jsdom does not enforce the
// server/client split, and the contact sheet is what found it.
//
// Every label still comes from the route's own copy: a rename must reach this
// figure without anyone editing it.

import { collectionChassisCopy, collectionFilterCopy } from "../../lib/copy/collection";
import { chassisCopy, PIP_ORDER } from "../../lib/copy/filter-chassis";
import { PIP_SRC } from "../ui/colour-pips";
import { setPageCopy } from "../../lib/copy/set-collections";
import { sortOrderLabel } from "../../lib/collection/sort-options";
import { CardTileCaption } from "../ui/card-tile-caption";
import { viewToggleCopy } from "../../lib/copy/card-surfaces";
import { BROWSE_CELLS, BROWSE_SET_CODE } from "../../lib/about/fixtures";
import { FilterChipPill, type FilterChip } from "../ui/filter-chassis";
import { KeyNumeral } from "./numeral";

// Inert, like every specimen: `Specimen` sets `pointer-events: none` over the
// whole figure, so none of these is ever called. They exist because the types
// require them, and the figure's subject is that the control EXISTS.
const noop = () => {};

const CHIPS: FilterChip[] = [
  { key: "colour", label: collectionChassisCopy.chip.colours(1), dots: ["var(--g)"], onRemove: noop },
  { key: "set", label: "The Hobbit", onRemove: noop },
];

/**
 * A dimension trigger. `active` draws the accent border the route draws on a
 * dimension that is narrowing something — two of the four here, because a bar
 * where every control looks the same cannot show that state at all.
 */
function Trigger({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <span
      // §3 fills every trigger — `background: var(--elevated)` over
      // `border-strong` — and `FilterPanel` does the same. Setting only the
      // border and the ink drew four bare outlines against the specimen's own
      // ground, which is not what either the canvas or the route shows.
      className={`flex items-center gap-[6px] rounded-[7px] border border-solid bg-[color:var(--elevated)] px-[9px] py-[5px] text-[12px] whitespace-nowrap ${
        active
          ? "border-[color:var(--accent)] text-[color:var(--fg)]"
          : "border-[color:var(--border-strong)] text-[color:var(--fg-muted)]"
      }`}
    >
      {label}
      <span aria-hidden className="text-[9px] text-[color:var(--fg-faint)]">
        ▾
      </span>
    </span>
  );
}

/**
 * One grid cell: art, the copy badge, the name, and the set · rarity caption.
 *
 * The art is a flat wash rather than a real image — the canvas draws it that
 * way, and a reference page that fetched five card images to illustrate a
 * filter would be spending a network request on decoration. The 63/88 ratio is
 * §I's floor and the reason the cell is sized by aspect rather than height:
 * three across on a phone must not squash it.
 */
function Cell({ name, copies, rarity }: { name: string; copies: number; rarity: string }) {
  return (
    <div className="min-w-0">
      {/* The canvas's own wash, value for value:
          `linear-gradient(150deg, var(--g), var(--surface))`. The first pass
          substituted a neutral `--elevated`/`--surface-sunken` ramp and called
          it a judgment about not fetching art on a reference page — but §3
          states the value, so that was a divergence wearing a decision's
          clothes. These five are green cards and the wash carries their
          identity. Still no image request: it is a gradient. */}
      <div className="relative aspect-[63/88] overflow-hidden rounded-[8px] bg-[linear-gradient(150deg,var(--g),var(--surface))]">
        <span className="absolute top-[6px] right-[6px] rounded-[5px] bg-[color:var(--accent)] px-[5px] py-[1px] font-mono text-[9px] text-[color:var(--bg)]">
          ×{copies}
        </span>
      </div>
      {/* The ROUTE's caption, not a second one. `CardTileCaption` is pure
          presentation — ReactNode slots, no handlers — so a figure can mount it
          as-is, which is what §G3 asks and what keeps the truncation, the
          metrics and the meta line from drifting away from `/collection`. The
          grid around it is still the figure's own, because §I rules on the
          column count and the route does not. */}
      <CardTileCaption name={name} metaTrail={`${BROWSE_SET_CODE} · ${rarity}`} />
    </div>
  );
}

export function BrowseFigureBody() {
  return (
    <div className="flex flex-col gap-[10px]">
      {/* ROW 1 — the persistent row. The route forks here at 1000px and so does
          this: wide, the search field sits beside the pips and the four
          dimension panels; compact, those controls are behind one `Filters`
          trigger and the field keeps its own shorter placeholder. Drawing the
          wide bar to a phone reader would show them four controls their phone
          does not have. */}
      <div className="flex items-center gap-[8px]">
        <span className="min-w-0 flex-1 truncate rounded-[8px] border border-solid border-[color:var(--border)] px-[10px] py-[7px] text-[12px] text-[color:var(--fg-faint)]">
          {/* 768, not 1000. The route runs on TWO breakpoints: the chassis
              switches the pips and the panels at 1000, and `useIsDesktop` (768)
              governs this field alone. Forking both at 1000 made the figure
              describe a phone across 768-999 while the route was already wide
              there. */}
          <span className="md:hidden">{collectionChassisCopy.searchPlaceholder.compact}</span>
          <span className="hidden md:inline">{collectionChassisCopy.searchPlaceholder.wide}</span>
        </span>

        <span className="min-[1000px]:hidden">
          <Trigger label={collectionChassisCopy.sheet.trigger} active />
        </span>

        <span aria-hidden className="hidden items-center gap-[5px] min-[1000px]:flex">
          {/* The route's own five, in its own order, drawn from the same art
              the control draws — not five coloured discs that look like them.
              A hue added to `PIP_ORDER` reaches this figure by itself. */}
          {PIP_ORDER.map((code) => (
            <span
              key={code}
              className="h-[15px] w-[15px] rounded-full"
              style={{ background: `center / contain no-repeat url(${PIP_SRC[code]})` }}
            />
          ))}
        </span>
        <span className="hidden items-center gap-[6px] min-[1000px]:flex">
          <Trigger label={collectionFilterCopy.type.triggerLabel} />
          <Trigger label={collectionFilterCopy.set.triggerOne("The Hobbit")} active />
          <Trigger label={collectionFilterCopy.availability.triggerLabel} />
          <Trigger label={collectionFilterCopy.sort.triggerOne(sortOrderLabel("name", "asc"))} active />
        </span>
      </div>

      {/* ROW 2 — key 1's subject: a chip per narrowing, each removable on its
          own, and one link that clears the lot. */}
      <div className="flex flex-wrap items-center gap-[8px]">
        <KeyNumeral n={1} />
        {CHIPS.map((chip) => (
          <FilterChipPill key={chip.key} chip={chip} />
        ))}
        <span className="ml-auto font-mono text-[10.5px] text-[color:var(--fg-muted)] underline">
          {chassisCopy.chips.clearAll}
        </span>
      </div>

      {/* ROW 3 — the count, and keys 2 and 3. The count is the route's own
          line at each width: the long form has room beside two controls on the
          wide bar and does not on a phone, which is why the route carries a
          compact one at all. */}
      <div className="flex flex-wrap items-center justify-between gap-[10px]">
        <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">
          <span className="min-[1000px]:hidden">{collectionChassisCopy.resultCompact(34)}</span>
          <span className="hidden min-[1000px]:inline">
            {collectionChassisCopy.result(34, 2805, 4120, true)}
          </span>
        </span>
        <span className="flex items-center gap-[8px]">
          <KeyNumeral n={2} />
          <span className="flex items-center gap-[5px] rounded-[8px] border border-solid border-[color:var(--accent)] px-[9px] py-[5px] text-[11.5px] text-[color:var(--fg)]">
            <span aria-hidden className="text-[8px] text-[color:var(--accent)]">
              ◆
            </span>
            {setPageCopy.entryPoint.label}
          </span>
          {/* The well, drawn rather than mounted: `ViewToggle` is a radio group
              with a handler, and a specimen is inert. Its two glyphs and both
              names are the route's, so a renamed segment reaches this figure. */}
          <span className="flex items-center gap-[2px] rounded-[8px] border border-solid border-[color:var(--border)] p-[2px]">
            {[
              { glyph: "≣", label: viewToggleCopy.collection.rows, on: false },
              { glyph: "▦", label: viewToggleCopy.collection.grid, on: true },
            ].map((seg) => (
              <span
                key={seg.label}
                title={seg.label}
                className={`flex h-[24px] w-[28px] items-center justify-center rounded-[6px] text-[12px] ${
                  seg.on
                    ? "bg-[color:var(--elevated)] text-[color:var(--fg)]"
                    : "text-[color:var(--fg-faint)]"
                }`}
              >
                <span aria-hidden>{seg.glyph}</span>
                <span className="sr-only">{seg.label}</span>
              </span>
            ))}
          </span>
          {/* AFTER the well, which is where §3 puts it. Between `By set` and
              the toggle the mark reads as pointing at the grouping pill, and
              key line 3 is about the reading choice. */}
          <KeyNumeral n={3} />
        </span>
      </div>

      {/* THE RESULT. Without it the figure showed a filter bar over nothing —
          every one of the three key lines is about what happens to a result,
          and there was no result on the page. §I: five across at the wide stop,
          three on a phone, and never below the 63/88 ratio. */}
      <div className="grid grid-cols-3 gap-[8px] min-[1000px]:grid-cols-5 min-[1000px]:gap-[10px]">
        {BROWSE_CELLS.map((cell) => (
          <Cell key={cell.name} {...cell} />
        ))}
      </div>
    </div>
  );
}
