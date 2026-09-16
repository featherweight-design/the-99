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
  REPLACE_ROWS,
  REPLACE_SUMMARY,
} from "../../lib/about/fixtures";
import { cardAssignmentsCopy } from "../../lib/copy/card-assignments";
import { ReceiptRow } from "../collection/arrivals-summary";
import { issueInspectorCopy } from "../../lib/copy/issue-inspector";
import {
  ParseErrorRowView,
  UnmatchedRowView,
} from "../collection/issue-inspector-list";
import { KeyNumeral } from "./numeral";

const fmt = (n: number) => n.toLocaleString("en-US");

/**
 * The four doors, and the one fact that decides whether a reader is about to
 * lose something: an import REPLACES. The old figure was four mono lines and a
 * warning string; §3 draws the sources as a row of plates with the replace
 * sentence beneath, because "these are the four things you can bring" is a
 * shape rather than a list.
 */
export function ImportFigureBody() {
  return (
    <div className="flex flex-col gap-[10px]">
      <div className="flex flex-wrap items-center gap-[6px]">
        {IMPORT_SOURCES.map((source) => (
          <span
            key={source}
            className="rounded-[7px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--elevated)] px-[9px] py-[5px] text-[11.5px] text-[color:var(--fg-body)]"
          >
            {source}
          </span>
        ))}
        <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">
          · CSV or a pasted list
        </span>
      </div>

      {/* The warning is a BAND, not a mono line in the stack. It is the one
          thing on this figure a reader cannot afford to skim, and it earned
          its own edge in the drawing for that reason. */}
      <p className="rounded-[7px] border-l-[3px] border-solid border-l-[color:var(--warning)] bg-[color:var(--surface)] px-[10px] py-[7px] text-[11.5px] text-[color:var(--fg-body)]">
        An import <strong className="text-[color:var(--fg)]">replaces</strong> what is there
        rather than adding to it — and you see a preview before anything is written.
      </p>
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
