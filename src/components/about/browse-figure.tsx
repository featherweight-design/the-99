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

import {
  collectionChassisCopy,
  collectionFilterCopy,
  collectionTabsCopy,
} from "../../lib/copy/collection";
import { chassisCopy, PIP_ORDER, PIP_BACKGROUND } from "../../lib/copy/filter-chassis";
import { sortOrderLabel } from "../../lib/collection/sort-options";
import { CardTileCaption } from "../ui/card-tile-caption";
import { identityGradient } from "../../lib/collection/gradients";
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
  { key: "set", label: collectionChassisCopy.chip.sets(1, "The Hobbit"), onRemove: noop },
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
function Cell({
  name,
  copies,
  rarity,
  colorIdentity,
}: {
  name: string;
  copies: number;
  rarity: string;
  colorIdentity: string[];
}) {
  return (
    // §Grid Tile Container, and it belongs to the ROUTE: a `--surface` plate
    // inside a `--border`, owning the radius and the clipping. Without it the
    // caption sat directly on the specimen's ground and the art carried the
    // rounding alone, so the tile had no edge at all.
    <div className="min-w-0 overflow-hidden rounded-[9px] border border-solid border-[color:var(--border)] bg-[color:var(--surface)] md:rounded-[10px]">
      {/* The ROUTE's own art placeholder, via `identityGradient`. The canvas
          draws `linear-gradient(150deg, var(--g), var(--surface))`, and for one
          round this figure drew that — but `/collection` has never drawn it: a
          missing-art tile there is the three-stop mono ramp this helper
          returns. Where the drawing and the surface disagree about something
          the SURFACE owns, the surface wins, or the reference page teaches a
          card art nobody will ever see. */}
      <div
        data-identity={colorIdentity.join(",")}
        style={{ aspectRatio: "63/88", background: identityGradient(colorIdentity) }}
      />
      {/* The route's caption, with the route's own contents. Nothing sits on the art:
          `GridView` moved every modifier off it, and the count is ABSENT at one copy — on a
          collection one copy is the ordinary case, so `×1` is the one figure there that
          tells a reader nothing. The figure once drew a `×N` badge over the art on every
          cell, which is a result `/collection` stopped drawing.

          The count then left the META line too, when the card mark arrived: at 157px that
          line cannot hold a chip, a count, a set code and up to three glyphs. It rides
          `nameTrail` now, in the route's own mono treatment — this figure exists to show
          what `/collection` draws, so a count sitting where the route no longer puts it,
          in an ink the route no longer uses, is the exact drift it is here to prevent. */}
      <CardTileCaption
        nameTrail={
          copies > 1 ? (
            <span
              aria-hidden
              className="flex-none font-mono text-[10px] md:text-[10.5px] tabular-nums"
              style={{ color: "var(--fg-faint)" }}
            >
              ×{copies}
            </span>
          ) : undefined
        }
        nameSub={
          <>
            {BROWSE_SET_CODE} · {rarity}
          </>
        }
        name={name}
      />
    </div>
  );
}

export function BrowseFigureBody() {
  return (
    <div className="flex flex-col gap-[10px]">
      {/* ROW 0 — key 1's subject: the place strip the route opens with. Drawn rather than
          mounted, because `CollectionPlaceHead` is a server component that reads the
          reader's stats; its three names are the route's copy, so a rename reaches here. */}
      <div className="flex items-center gap-[8px]">
        <span className="flex h-[30px] items-stretch gap-[2px] border-b border-solid border-[color:var(--border)]">
          {[
            { label: collectionTabsCopy.cards, on: true },
            { label: collectionTabsCopy.sets, on: false },
            { label: collectionTabsCopy.proxies, on: false },
          ].map((tab) => (
            <span
              key={tab.label}
              className={`flex items-center px-[8px] text-[11.5px] ${
                tab.on
                  ? "font-semibold text-[color:var(--fg)] shadow-[inset_0_-2px_0_var(--accent)]"
                  : "font-medium text-[color:var(--fg-muted)]"
              }`}
            >
              {tab.label}
            </span>
          ))}
        </span>
        <KeyNumeral n={1} />
      </div>

      {/* ROW 1 — the persistent row. The route forks here at 1000px and so does
          this: wide, the search field sits beside the pips and the four
          dimension panels; compact, those controls are behind one `Filters`
          trigger and the field keeps its own shorter placeholder. Drawing the
          wide bar to a phone reader would show them four controls their phone
          does not have. */}
      {/* `flex-wrap`, as §3's own row carries. At 390px the field's 150px
          floor plus `Filters` plus the persistent `Sort` exceeds the plate, and
          without wrapping the sort trigger ran off the right edge — visible in
          a screenshot and invisible to every assertion here, because jsdom
          lays nothing out. */}
      <div className="flex flex-wrap items-center gap-[8px]">
        {/* §3's own geometry, value for value: 30px tall, `flex:1` over a
            150px floor, `--bg` fill inside a `border-strong` edge, 11px
            `--fg-locked`. The first version was a bare bordered span with no
            fill and no floor, so it collapsed below the canvas's minimum at
            narrow plate widths. */}
        <span className="flex h-[30px] min-w-[150px] flex-1 items-center truncate rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--bg)] px-[11px] text-[11px] text-[color:var(--fg-locked)]">
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
              style={PIP_BACKGROUND[code]}
            />
          ))}
        </span>
        <span className="hidden items-center gap-[6px] min-[1000px]:flex">
          <Trigger label={collectionFilterCopy.type.triggerCount!(0)} />
          <Trigger label={collectionFilterCopy.set.triggerCount!(1)} active />
          <Trigger label={collectionFilterCopy.availability.triggerCount!(0)} />
        </span>

        {/* Sort does NOT move into the sheet. `FilterChassis` keeps it in its
            own slot past a hairline, and the hairline is the separation that
            makes it read as not-a-filter — only colour, type, set and
            availability go behind `Filters`. Hiding it here told a phone
            reader the order lived behind that trigger. */}
        <span
          aria-hidden
          className="hidden h-[20px] w-px flex-none bg-[color:var(--border)] min-[1000px]:block"
        />
        <Trigger label={collectionFilterCopy.sort.triggerOne(sortOrderLabel("name", "asc"))} active />
      </div>

      {/* ROW 2 — key 2's subject: a chip per narrowing, each removable on its
          own, and one link that clears the lot. */}
      <div className="flex flex-wrap items-center gap-[8px]">
        <KeyNumeral n={2} />
        {CHIPS.map((chip) => (
          <FilterChipPill key={chip.key} chip={chip} />
        ))}
        <span className="ml-auto font-mono text-[10.5px] text-[color:var(--fg-muted)] underline">
          {chassisCopy.chips.clearAll}
        </span>
      </div>

      {/* ROW 3 — the count, and key 3. The count is the route's own
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
                className={`flex h-[22px] w-[24px] items-center justify-center rounded-[5px] text-[11px] ${
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
          {/* AFTER the well, which is where §3 puts it: key line 3 is about the
              reading choice. */}
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
