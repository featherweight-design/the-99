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
  PRINTING_ROWS,
  REPLACE_ROWS,
  REPLACE_SUMMARY,
} from "../../lib/about/fixtures";
import { cardAssignmentsCopy } from "../../lib/copy/card-assignments";
import { printingPickerCopy } from "../../lib/copy/collection";
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
        <div className="mb-[3px] text-[12.5px] text-[color:var(--fg-body)]">
          Drop a CSV export
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
          Upload a CSV
        </span>
        <span className="flex h-[30px] flex-1 items-center justify-center rounded-[8px] border border-solid border-[color:var(--border-strong)] text-[11.5px] text-[color:var(--fg-body)]">
          Paste a list
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
  const { before, after, noLongerOwned } = REPLACE_SUMMARY;
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
                  warn={row.section === "short"}
                />
              </ul>
            </li>
          ))}
        </ul>
        <KeyNumeral n={3} className="mt-[3px]" />
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
    </div>
  );
}
