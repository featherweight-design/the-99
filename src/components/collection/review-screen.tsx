"use client";
// Replace Flow — Step 2 (Review, 2a — Single Scroll) per property table.
// Single scrollable screen; sticky confirm bar at the bottom.
// unmatched rows carry {name, setCode, line}; parse errors carry {line, reason}.

import { useState } from "react";
import type { UploadPreview } from "../../app/collection/actions";

const INITIAL_LIMIT = 8; // Show first N per section; "Show all" reveals the rest.

export function ReviewScreen({
  preview,
  onCancel,
  onContinue,
  embedded,
}: {
  preview: UploadPreview;
  onCancel: () => void;
  onContinue: () => void;
  embedded?: boolean;
}) {
  const [unmatchedExpanded, setUnmatchedExpanded] = useState(false);
  const [errorsExpanded, setErrorsExpanded] = useState(false);

  const importCount = preview.matchedCardCount;
  const skipped = preview.unmatchedRows.length + preview.parseErrors.length;
  const unmatchedShown = unmatchedExpanded
    ? preview.unmatchedRows
    : preview.unmatchedRows.slice(0, INITIAL_LIMIT);
  const errorsShown = errorsExpanded
    ? preview.parseErrors
    : preview.parseErrors.slice(0, INITIAL_LIMIT);

  return (
    // Wrapping section splits into scrollable content + sticky confirm bar
    <section className={embedded ? "flex flex-col" : "flex flex-col min-h-[calc(100vh-140px)]"}>
      {/* Mobile page header (Cinzel title + filename) — §Page Header (mobile) / §Mobile Page Title */}
      <div
        className="md:hidden flex items-center gap-[12px] p-[20px_18px_14px]"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <button type="button" onClick={onCancel} aria-label="Back to upload" className="text-[20px]" style={{ color: "var(--brass)" }}>‹</button>
        <span className="font-display font-semibold text-[18px]" style={{ color: "var(--fg)" }}>Review import</span>
        <span className="ml-auto font-mono text-[10px]" style={{ color: "var(--fg-faint)" }}>{preview.filename}</span>
      </div>

      {/* Desktop content area — §Desktop Content Area: padding 36px 56px 20px, max-width 940px */}
      <div className="flex-1 md:max-w-[940px] md:mx-auto md:p-[36px_56px_20px] p-[16px_18px]">
        {/* Desktop step indicator — §Desktop Step Indicator */}
        <p
          className="hidden md:block font-mono text-[11px] tracking-[0.06em]"
          style={{ color: "var(--fg-faint)" }}
        >
          STEP 2 OF 3 · {preview.filename} · {preview.rowCount.toLocaleString()} rows
        </p>
        <h1
          className="hidden md:block font-display font-bold text-[29px] mt-[12px]"
          style={{ color: "var(--fg)" }}
        >
          Review before you replace
        </h1>

        {/* Summary section — flex row on desktop */}
        <div className="mt-[16px] md:mt-[24px] flex flex-col md:flex-row gap-[16px]">
          {/* Matched banner — §Review Summary Banner: Matched Card */}
          <div
            className="rounded-[12px] p-[16px] md:p-[20px_22px] flex items-center gap-[10px] md:gap-[16px] md:flex-[1.4]"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderLeft: "3px solid var(--success)",
            }}
          >
            {/* §Matched Count: Success Icon — 30/44px circle rgba(111,163,104,0.15) with #6FA368 (--success) checkmark */}
            <span
              aria-hidden
              className="rounded-full flex items-center justify-center flex-none text-[15px] md:text-[20px] w-[30px] h-[30px] md:w-[44px] md:h-[44px]"
              style={{ background: "rgba(111,163,104,0.15)", color: "var(--success)" }}
            >
              ✓
            </span>
            <div>
              {/* §Matched Count: Number — mono 22/30px 600 --fg */}
              <div className="font-mono font-semibold text-[22px] md:text-[30px] leading-none" style={{ color: "var(--fg)" }}>
                {importCount.toLocaleString()}
              </div>
              {/* §Matched Count: Label */}
              <div className="text-[11.5px] md:text-[13px] mt-[2px] md:mt-[4px] text-[color:var(--fg-faint)] md:text-[color:var(--fg-muted)]">
                <span className="md:hidden">cards matched &amp; ready</span>
                <span className="hidden md:inline">cards matched to the Oracle database — ready to import</span>
              </div>
            </div>
          </div>

          {/* Desktop issue tally panel — §Desktop Summary: Issue Tally Panel */}
          <div
            className="hidden md:flex flex-1 flex-col justify-center gap-[10px] rounded-[12px] p-[16px_18px]"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-[10px]">
              <span aria-hidden className="rounded-full flex-none" style={{ width: 9, height: 9, background: "var(--warning)" }} />
              <span className="font-mono text-[16px]" style={{ color: "var(--warning)" }}>
                {preview.unmatchedRows.length.toLocaleString()}
              </span>
              <span className="text-[13px]" style={{ color: "var(--fg-muted)" }}>unmatched names</span>
            </div>
            <div className="flex items-center gap-[10px]">
              <span aria-hidden className="rounded-full flex-none" style={{ width: 9, height: 9, background: "var(--danger)" }} />
              <span className="font-mono text-[16px]" style={{ color: "var(--danger)" }}>
                {preview.parseErrors.length.toLocaleString()}
              </span>
              <span className="text-[13px]" style={{ color: "var(--fg-muted)" }}>parse errors</span>
            </div>
            <div
              className="text-[11.5px] pt-[9px]"
              style={{ color: "var(--fg-faint)", borderTop: "1px solid var(--border)" }}
            >
              {skipped.toLocaleString()} rows will be skipped
            </div>
          </div>

          {/* Mobile mini stats — §Issue Summary Mini Stats */}
          <div className="md:hidden flex gap-[8px] mt-[14px]">
            <MiniStat number={preview.unmatchedRows.length} numberColor="var(--warning)" label="unmatched" />
            <MiniStat number={preview.parseErrors.length} numberColor="var(--danger)" label="parse errors" />
            <MiniStat number={preview.rowCount} numberColor="var(--fg)" label="rows read" />
          </div>
        </div>

        {/* Desktop 2-column issues layout — §Desktop Issues Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[22px] mt-[16px] md:mt-[24px]">
          {/* Unmatched section */}
          {preview.unmatchedRows.length > 0 && (
            <div>
              {/* §Issue Section Headers — mono uppercase 10px, letter-spacing 0.14em, color #E0913C (--warning) */}
              <h2
                className="font-mono uppercase text-[10px] tracking-[0.14em] mb-[8px] md:mb-[10px]"
                style={{ color: "var(--warning)" }}
              >
                <span className="md:hidden">Unmatched — {preview.unmatchedRows.length} skipped</span>
                <span className="hidden md:inline">Unmatched names — {preview.unmatchedRows.length}</span>
              </h2>
              <ul className="flex flex-col gap-[6px]">
                {unmatchedShown.map((r, i) => (
                  <li
                    key={`${r.line}-${i}`}
                    // §Issue Row — Unmatched Name: bg #1E1A15, border 1px #2A241D, border-left 3px #E0913C, radius 8px, padding 9px 12px / 11px 14px
                    className="flex items-center justify-between gap-[10px] md:gap-[12px] rounded-lg p-[9px_12px] md:p-[11px_14px]"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderLeft: "3px solid var(--warning)",
                    }}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] md:text-[14px]" style={{ color: "var(--fg)" }}>{r.name}</span>
                      <span
                        className="font-mono text-[10px] md:text-[10.5px] mt-0 md:mt-[2px]"
                        style={{ color: "var(--fg-faint)" }}
                      >
                        Line {r.line}{r.setCode ? ` · ${r.setCode}` : ""}
                      </span>
                    </span>
                    {/* §Issue Row — Quantity (right): mono 11/12px --fg-faint */}
                    <span
                      className="font-mono text-[11px] md:text-[12px] flex-none"
                      style={{ color: "var(--fg-faint)" }}
                    >
                      ×{r.quantity}
                    </span>
                  </li>
                ))}
              </ul>
              {preview.unmatchedRows.length > INITIAL_LIMIT && !unmatchedExpanded && (
                <button
                  type="button"
                  onClick={() => setUnmatchedExpanded(true)}
                  className="mt-[8px] text-[12.5px] p-[4px_2px]"
                  style={{ color: "var(--brass)" }}
                >
                  Show all {preview.unmatchedRows.length} unmatched →
                </button>
              )}
            </div>
          )}

          {/* Parse errors section */}
          {preview.parseErrors.length > 0 && (
            <div>
              <h2
                className="font-mono uppercase text-[10px] tracking-[0.14em] mb-[8px] md:mb-[10px]"
                style={{ color: "var(--danger)" }}
              >
                Parse errors — {preview.parseErrors.length}
              </h2>
              <ul className="flex flex-col gap-[6px]">
                {errorsShown.map((e, i) => (
                  <li
                    key={`${e.line}-${i}`}
                    className="flex items-start gap-[10px] md:gap-[12px] rounded-lg p-[9px_12px] md:p-[11px_14px]"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderLeft: "3px solid var(--danger)",
                    }}
                  >
                    <span
                      className="font-mono text-[10px] md:text-[11px] flex-none pt-[1px]"
                      style={{ color: "var(--danger)" }}
                    >
                      L{e.line}
                    </span>
                    <span className="text-[13px]" style={{ color: "var(--fg-body)", lineHeight: 1.45 }}>
                      {e.reason}
                    </span>
                  </li>
                ))}
              </ul>
              {preview.parseErrors.length > INITIAL_LIMIT && !errorsExpanded && (
                <button
                  type="button"
                  onClick={() => setErrorsExpanded(true)}
                  className="mt-[8px] text-[12.5px] p-[4px_2px]"
                  style={{ color: "var(--brass)" }}
                >
                  Show all {preview.parseErrors.length} errors →
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sticky confirm bar — §Sticky Confirm Bar: border-top 1px #3A3229 (--border-strong), bg #1A160F (--surface-rail), padding 14px 18px 22px mobile / 16px 56px desktop */}
      <div
        className={`${embedded ? "" : "md:sticky"} bottom-0 z-10 p-[14px_18px_22px] md:p-[16px_56px] md:flex md:items-center md:gap-[20px]`}
        style={{ background: "var(--surface-rail)", borderTop: "1px solid var(--border-strong)" }}
      >
        {/* Summary sentence — §Sticky Confirm Bar: Summary Sentence */}
        <p
          className="text-[11.5px] md:text-[13.5px] text-center md:text-left mb-[10px] md:mb-0 text-[color:var(--fg-faint)] md:text-[color:var(--fg-body)]"
        >
          <span className="md:hidden">
            Skips {skipped} rows · replaces your {preview.currentCollectionCount.toLocaleString()} cards with {importCount.toLocaleString()}
          </span>
          <span className="hidden md:inline">
            Importing {importCount.toLocaleString()} cards and skipping {skipped}. This replaces your current {preview.currentCollectionCount.toLocaleString()} cards.
          </span>
        </p>

        {/* Buttons — mobile: full-width continue only, desktop: cancel + continue right-aligned */}
        <div className="md:ml-auto flex gap-[12px]">
          <button
            type="button"
            onClick={onCancel}
            className="hidden md:inline-block rounded-lg font-sans font-semibold text-[14px] px-[20px] py-[12px] cursor-pointer hover:[border:1px_solid_var(--brass)]"
            style={{ color: "var(--fg)", background: "transparent", border: "1px solid var(--border-strong)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="rounded-lg font-sans font-semibold text-[15px] md:text-[14px] w-full md:w-auto py-[13px] md:py-[12px] px-0 md:px-[24px] cursor-pointer hover:bg-[color:var(--brass-hover)]"
            style={{ color: "var(--bg)", background: "var(--brass)", border: "none" }}
          >
            Continue to replace →
          </button>
        </div>
      </div>
    </section>
  );
}

function MiniStat({ number, numberColor, label }: { number: number; numberColor: string; label: string }) {
  return (
    // §Mini Stat Cell: flex 1, bg #181410 (--surface-sunken), border 1px #2A241D (--border), radius 8px, padding 9px 11px
    <div
      className="flex-1 rounded-lg p-[9px_11px]"
      style={{ background: "var(--surface-sunken)", border: "1px solid var(--border)" }}
    >
      <div className="font-mono text-[15px]" style={{ color: numberColor }}>{number.toLocaleString()}</div>
      <div className="text-[10.5px] mt-[1px]" style={{ color: "var(--fg-faint)" }}>{label}</div>
    </div>
  );
}
