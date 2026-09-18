"use client";

// Chapter 01's composition figures — the ones whose subject is a SURFACE
// rather than the states of a mark.
//
// A client module because two of these mount route components that carry
// handlers, and a fixture built on the server would hand a function across the
// boundary — which React refuses outright while jsdom never notices. That is
// how the `browse` figure shipped throwing on every real render with every
// unit test green.
//
// The rule these follow is the one the `browse` rebuild produced: where the
// canvas and the surface disagree about something the SURFACE owns, the
// surface wins. A reference page that draws its own version of a row teaches
// a row the reader will never meet.

import {
  IMPORT_SOURCES,
  ISSUE_PARSE_ERROR,
  ISSUE_UNMATCHED,
  CONTESTED_ARRIVAL,
  FIT_LEGEND,
  LANE_DISCOVER,
  PARTNER_PROPOSAL,
  LANE_ROW_OWNED,
  LANE_OWNED,
  PRINTING_ROWS,
  REPLACE_ROWS,
  REPLACE_SUMMARY,
} from "../../lib/about/fixtures";
import { cardAssignmentsCopy } from "../../lib/copy/card-assignments";
import { collectionChassisCopy } from "../../lib/copy/collection";
import { printingPickerCopy } from "../../lib/copy/collection";
import { COSTS } from "../../lib/about/fixtures";
import { COST_PIP_SIZE, CostPips } from "../ui/cost-pips";
import { TwoFacedMark } from "../cards/two-faced-mark";
import { ContestedCardRow } from "../decks/contested-card-row";
import { FitLegend } from "../commanders/fit-legend";
import { FilterRack } from "../commanders/rack/filter-rack";
import { CommanderRow } from "../commanders/commander-row";
import { PartnerSlot } from "../decks/partner-slot";
import { OrderControl } from "../commanders/rack/order-control";
import { ORDER_OPTIONS } from "../commanders/rack/order-options";
import type { Lane, LaneParams } from "../../lib/commanders/lane-params";
import { ReceiptRow } from "../collection/arrivals-summary";
import { issueInspectorCopy } from "../../lib/copy/issue-inspector";
import {
  ParseErrorRowView,
  UnmatchedRowView,
} from "../collection/issue-inspector-list";
import { KeyNumeral } from "./numeral";

const fmt = (n: number) => n.toLocaleString("en-US");

export function ImportFigureBody() {
  return (
    // TRANSCRIBED from §3, not interpreted. Every value is read off the
    // canvas's own inline styles: the dashed target, its two lines, and two
    // 30px controls at `flex:1` each.
    //
    // What this replaces drew the four sources as pill plates and gave the
    // replace sentence a warning band. Design drew neither. The sentence is
    // the ENTRY'S CAPTION — a figure repeating it is the stutter the close-out
    // already recorded once — and the drop target plus its two doors is what
    // the reader will actually meet on `/collection/replace`.
    <div className="flex flex-col gap-[9px]">
      <div className="rounded-[8px] border border-dashed border-[color:var(--border-dashed)] px-[12px] py-[14px] text-center">
        {/* The ROUTE's words, not §3's. The canvas says `Drop a CSV export`,
            `Upload a CSV`, `Paste a list`; `UploadEntry` has never said any of
            them. A reference page naming controls the app does not have is the
            one failure this page cannot afford, so the drawing's LAYOUT
            transfers and its labels do not. Both forms are drawn because the
            route forks them at `md`. */}
        <div className="mb-[3px] text-[12.5px] text-[color:var(--fg-body)]">
          <span className="md:hidden">{collectionChassisCopy.upload.dropCompact}</span>
          <span className="hidden md:inline">{collectionChassisCopy.upload.dropWide}</span>
        </div>
        <div className="font-mono text-[10px] text-[color:var(--fg-faint)]">
          {IMPORT_SOURCES.join(" · ")}
        </div>
      </div>
      <div className="flex gap-[6px]">
        {/* `--fg` on `--bg` — an inversion, and the only one in chapter 01. It
            is what makes `Upload a CSV` the default door and `Paste a list`
            the other one. */}
        <span className="flex h-[30px] flex-1 items-center justify-center rounded-[8px] bg-[color:var(--fg)] text-[11.5px] font-semibold text-[color:var(--bg)]">
          {collectionChassisCopy.upload.browse}
        </span>
        <span className="flex h-[30px] flex-1 items-center justify-center rounded-[8px] border border-solid border-[color:var(--border-strong)] text-[11.5px] text-[color:var(--fg-body)]">
          {collectionChassisCopy.upload.paste}
        </span>
      </div>
    </div>
  );
}

/**
 * The replace summary. The old figure printed three section headings as mono
 * strings; §3 draws the figure that makes the entry's three key lines legible —
 * before and after both printed, a line per deck that felt it, and a count of
 * the decks that did not.
 */
export function PostImportFigureBody() {
  const { before, after, noLongerOwned, unaffectedDecks } = REPLACE_SUMMARY;
  const c = cardAssignmentsCopy.summary;
  const heads: Record<string, string> = {
    cleared: c.sectionCleared(61),
    still: c.sectionStill(12),
    short: c.sectionShort(2),
  };
  return (
    <div className="flex flex-col gap-[10px]">
      {/* Key 1 — BEFORE and AFTER, both printed, so the change is checkable
          rather than asserted. One figure alone says nothing about the rule. */}
      <div className="flex flex-wrap items-center gap-x-[10px] gap-y-[3px]">
        <KeyNumeral n={1} />
        <span className="font-mono text-[10.5px] tracking-[0.1em] text-[color:var(--fg-faint)] uppercase">
          {c.eyebrow}
        </span>
        <span className="text-[12.5px] text-[color:var(--fg)]">
          {fmt(before)} → {fmt(after)} cards
        </span>
        <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">
          {noLongerOwned} no longer owned
        </span>
        {/* Decks nothing happened to are COUNTED, never listed — the summary
            is what changed, not an inventory. The fixture carried the figure
            and the rebuild into sections dropped the line that drew it. */}
        <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">
          {unaffectedDecks} other decks unaffected
        </span>
      </div>

      {/* Keys 2 and 3 — THREE SECTIONS, and a row that is a CARD carrying the
          deck that wanted it. The R4 canvas draws deck rows with a count each;
          the shipped summary does not, and the three captions printed directly
          under this figure describe the sections. A figure built from the
          drawing contradicted its own key lines on the page. */}
      <div className="flex items-start gap-[8px]">
        <KeyNumeral n={2} className="mt-[3px]" />
        <ul className="m-0 min-w-0 flex-1 list-none p-0">
          {REPLACE_ROWS.map((row) => (
            <li key={row.card} className="mb-[6px] last:mb-0">
              <span className="font-mono text-[10px] tracking-[0.12em] text-[color:var(--fg-body)] uppercase">
                {heads[row.section]}
              </span>
              {/* The route's own receipt row, mounted rather than restated. */}
              <ul className="m-0 list-none p-0">
                <ReceiptRow
                  cardName={row.card}
                  deckName={row.deck}
                  reason={row.reason}
                  // NOT `warn`. `ReceiptRow` reserves `--warning` for the one
                  // reason a player can act on without buying anything, and a
                  // contested shortage is not it — the real `sectionShort`
                  // hands that case to `ContestedCardRow`, which this figure
                  // now draws below.
                />
              </ul>
            </li>
          ))}
        </ul>
        <KeyNumeral n={3} className="mt-[3px]" />
      </div>

      {/* THE CHOOSER, and it was missing entirely.
          The three sections above say what the replace cost; this is the one
          thing on the summary a reader can act on. It appears under the two
          tests the receipt itself applies — demand above supply, and at least
          two COMMITTED claimants — because a shortage with one claimant is a
          purchase rather than a choice.
          The route's own row, mounted as-is. It is inert here like every
          specimen: `Specimen` puts `pointer-events: none` over the figure, so
          the server action it imports is unreachable. */}
      <div className="flex items-start gap-[8px]">
        <KeyNumeral n={4} className="mt-[3px]" />
        <div className="min-w-0 flex-1">
          <ContestedCardRow card={CONTESTED_ARRIVAL} />
        </div>
      </div>
    </div>
  );
}

/**
 * The inspector's two row KINDS, mounted from the route rather than described.
 * The old figure drew the two tab labels as pills, which says the inspector has
 * two tabs and nothing about the entry's actual subject — that a misspelling
 * and a printing nobody stocks read differently and are labelled differently.
 */
export function ImportIssuesFigureBody() {
  return (
    <div className="flex flex-col gap-[8px]">
      <div className="flex flex-col gap-[6px]">
        <span className="font-mono text-[10px] tracking-[0.1em] text-[color:var(--fg-faint)] uppercase">
          {issueInspectorCopy.tabs.unmatched}
        </span>
        {/* The route's own row. `query` is empty, so `HighlightedText` draws
            the name plain — there is no search on a reference page to be
            highlighting against. */}
        <UnmatchedRowView row={ISSUE_UNMATCHED} query="" />
      </div>
      <div className="flex flex-col gap-[6px]">
        <span className="font-mono text-[10px] tracking-[0.1em] text-[color:var(--fg-faint)] uppercase">
          {issueInspectorCopy.tabs.parseErrors}
        </span>
        <ParseErrorRowView row={ISSUE_PARSE_ERROR} query="" />
      </div>
    </div>
  );
}

/**
 * The printings list, TRANSCRIBED from §3: an uppercase mono heading, then a
 * row per printing carrying a mark, the set name and the collector number, the
 * current row on `--elevated`.
 *
 * What it replaces was four legend cells of glyphs — a tick, a hollow diamond,
 * a two-faced mark and a cost — which taught the marks without ever showing
 * the list they live in.
 *
 * The MARKS are the app's. §3's legend calls the filled diamond "the printing
 * you own"; the picker has never meant that, and #653 already corrected that
 * exact claim in the caption. ✓ is `Your pick`, ◇ is `Shown now`.
 */
export function CardDetailFigureBody() {
  return (
    <div className="flex flex-col gap-[7px]">
      <div className="font-mono text-[9.5px] tracking-[0.14em] text-[color:var(--fg-faint)] uppercase">
        Printings
      </div>
      {PRINTING_ROWS.map((row) => {
        const current = row.state !== "plain";
        return (
          <div
            key={row.set}
            className={`flex items-center gap-[8px] rounded-[6px] px-[8px] py-[6px] ${
              row.state === "picked" ? "bg-[color:var(--elevated)]" : ""
            }`}
          >
            <span
              aria-hidden
              className={`flex-none font-mono text-[11px] ${
                current ? "text-[color:var(--accent)]" : "text-[color:var(--fg-faint)]"
              }`}
            >
              {row.state === "picked" ? "✓" : row.state === "shown" ? "◇" : " "}
            </span>
            <span
              className={`min-w-0 flex-1 truncate text-[11.5px] ${
                row.state === "picked" ? "text-[color:var(--fg)]" : "text-[color:var(--fg-muted)]"
              }`}
            >
              {row.set}
            </span>
            {/* The state is SPOKEN, never left to the glyph: a screen reader
                gets `Your pick` and `Shown now`, which is what the picker's own
                badges say. */}
            {current && (
              <span className="sr-only">
                {row.state === "picked"
                  ? printingPickerCopy.printing.badgePicked
                  : printingPickerCopy.printing.badgeShownNow}
              </span>
            )}
            <span className="flex-none font-mono text-[10px] text-[color:var(--fg-faint)]">
              {row.collector}
            </span>
          </div>
        );
      })}

      {/* THE COST AND THE BACK FACE. The entry's caption promises both — "the
          cost beside the name is drawn with the real mana symbols, and a card
          that prints two costs shows both", and "the back of a double-faced
          card" — and the printings list alone substantiates neither. The first
          rebuild dropped them for the list, which left the figure unable to
          show what its own words claim. Same failure as the replace figure:
          an assertion about a figure cannot see the caption above it.

          `allFaces`, because the subject is a card printing TWO costs. The
          default draws the front alone, which is the right pips for the wrong
          card. */}
      <div className="mt-[3px] flex items-center gap-[10px] border-t border-solid border-[color:var(--border)] pt-[9px]">
        <CostPips cost={COSTS.twoFaced} allFaces spoken size={COST_PIP_SIZE} />
        <TwoFacedMark layout="transform" />
      </div>
    </div>
  );
}

/**
 * The fit key, expanded. `FitLegend` draws the legend row with each part's
 * points over its weight, the `Hide` trigger, and the three-column panel that
 * explains Pool, Roles and Synergy — which is the entry's whole subject and
 * was absent from the figure entirely.
 *
 * A client module because `FitLegend` holds `open` in state. `defaultOpen`
 * exists for this: a specimen is inert, so the collapsed form would show the
 * trigger and none of the three explanations.
 */
export function FitLegendFigureBody() {
  return <FitLegend segments={FIT_LEGEND} score={73} width="desktop" defaultOpen />;
}

/**
 * A lane's filter rack, mounted from the route.
 *
 * §3 draws the whole rack for both commander lanes — the search field, the
 * five hues, `Any`/`Exactly`, and the lane's own order control. The figures
 * these replace were mark-and-meaning legends: they named the Build from modes
 * and the five orders and drew neither control, so a reader met a vocabulary
 * before ever meeting the thing it belongs to.
 *
 * Inert like every specimen, so `onChange` is never called.
 */
function laneRack(params: LaneParams, lane: Lane, shown: number, total: number) {
  return (
    <FilterRack
      params={params}
      lane={lane}
      onChange={() => {}}
      shown={shown}
      total={total}
      excludedByExactly={null}
      // The plate is ~750px inside a 1300px window, so the viewport query
      // answers wide and the rack draws a form its container cannot hold.
      // Pinned compact: every control stays reachable in the chips row and the
      // result line, and nothing clips.
      forceWide={false}
    />
  );
}

/**
 * The rack, and then a ROW.
 *
 * §3 draws the rack alone for both lanes, so a reader met the controls and
 * never the thing they filter. Hugh asked for the row on 2026-09-18 — the one
 * addition on this page not transcribed from the canvas, and a Design item
 * rather than a quiet adoption.
 */
function laneWithRow(body: React.ReactNode, row: React.ReactNode) {
  return (
    <div className="flex flex-col gap-[12px]">
      {body}
      <div className="border-t border-solid border-[color:var(--border)] pt-[12px]">{row}</div>
    </div>
  );
}

export function CommanderLaneFigureBody() {
  // `avail: "free"` is the fixture's whole job — Build from is what this
  // entry's caption is about, and a rack on the default draws the control
  // without ever showing the choice being made.
  return laneWithRow(
    laneRack(LANE_OWNED, "owned", 34, 612),
    <CommanderRow item={LANE_ROW_OWNED} />,
  );

}

export function DiscoverFigureBody() {
  // THE ORDER CONTROL AND NOTHING ELSE.
  //
  // `/commanders` and `/discover` share one rack and, since #708, one row, so
  // two figures drawing both showed the same thing twice and differed by a
  // price line. This entry's caption is the five orders; the other lane's is
  // Build from. The row came out on 2026-09-18 for that reason, and the rack
  // with it.
  //
  // The panel is absolutely positioned and right-aligned to its container, so
  // in a full-width box it opened far from its own trigger and read as a
  // mistake. The container is the trigger's width instead, which puts the
  // options directly under the control that names them, and its height is
  // reserved because nothing here can dismiss a panel.
  return (
    // 380 = the trigger's 38px, the 4px it sits off, and the panel's measured
    // 320. At 330 the last order clipped against the plate's own edge by 13px,
    // which a reader reads as a list that ends early rather than as a figure
    // cut short.
    <div className="min-h-[380px] w-[300px]">
      <OrderControl
        value={LANE_DISCOVER.order}
        options={ORDER_OPTIONS.discover}
        onChange={() => {}}
        wide
        defaultOpen
      />
    </div>
  );
}

/** The import's partner proposal, mounted. Inert: `Specimen` blocks the taps. */
export function PartnerSlotFigureBody() {
  const p = PARTNER_PROPOSAL;
  return (
    <PartnerSlot
      primaryName={p.primaryName}
      ability={p.ability}
      partner={p.partner}
      pairableCount={p.pairableCount}
      onAdd={() => {}}
      onChange={() => {}}
      onRemove={() => {}}
    />
  );
}
