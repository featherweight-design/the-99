"use client";
// Replace Flow — Step 2 (Review, 2a — Single Scroll) per property table.
// Single scrollable screen; sticky confirm bar at the bottom.
// unmatched rows carry {name, setCode, line}; parse errors carry {line, reason}.

import { useEffect, useRef, useState } from "react";
import type { UploadMode, UploadPreview } from "../../app/collection/actions";
import { IssueInspector } from "./issue-inspector";
import { issueInspectorCopy } from "../../lib/copy/issue-inspector";
import { GhostButton, PrimaryButton } from "../ui/button";
import { Crown } from "../ui/crown";
import { replaceCopy } from "../../lib/copy/replace";
import { cards, collectionEditCopy, rows } from "../../lib/copy/collection-edit";
import { ReplaceReviewDetail, type ReviewChange } from "./replace-review-detail";

const INITIAL_LIMIT = 8; // Per-section preview cap; full list lives in the Issue Inspector.

export function ReviewScreen({
  preview,
  onCancel,
  onContinue,
  pending = false,
  embedded,
  change,
  comparing = false,
  onRetry,
  mode = "replace",
  step = "STEP 2 OF 3",
  onSwitchToReplace,
}: {
  preview: UploadPreview;
  onCancel: () => void;
  onContinue: () => void;
  /** A first import confirms from this button, with no modal to carry the wait. */
  pending?: boolean;
  embedded?: boolean;
  /**
   * The ledger path's read of this Replace: the four figures, what it overwrites, the decks it
   * leaves short and the card lists, with the decision on the confirm bar. Absent, the review
   * is the shipped one and `onContinue` opens the confirm dialog.
   */
  change?: ReviewChange | null;
  /** The comparison is still being read. */
  comparing?: boolean;
  /** Runs the confirm again after a failure that wrote nothing (A5). */
  onRetry?: () => void;
  /** Which write the review is for. An Add lowers nothing, so it has no deck section or `edited` tag. */
  mode?: UploadMode;
  /** The step line: `STEP 3 OF 4` when the choice came first. */
  step?: string;
  /** An Add whose every card is already owned offers the other way (A3b). */
  onSwitchToReplace?: () => void;
}) {
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const failureRef = useRef<HTMLDivElement>(null);
  const failed = change?.failure ?? null;
  // A failed write keeps the review and puts the reader at the explanation (A5).
  useEffect(() => {
    if (failed) failureRef.current?.focus();
  }, [failed]);
  const e = collectionEditCopy.upload;

  const importCount = preview.matchedCardCount;
  const skipped = preview.unmatchedRows.length + preview.parseErrors.length;
  // Tokens and emblems are excluded from the Oracle catalog by design, so they are reported
  // on their own line rather than inside the unmatched tally — 113 of them reading as
  // "unmatched names" makes a working import look broken (§9.1).
  const skippedByDesign = preview.skippedByDesignCount ?? 0;
  // The footer counts every row that will not be imported; `skipped` above stays on the two
  // the issue inspector can actually show you, because it gates the button that opens it.
  const skippedTotal = skipped + skippedByDesign;
  const unmatchedShown = preview.unmatchedRows.slice(0, INITIAL_LIMIT);
  const errorsShown = preview.parseErrors.slice(0, INITIAL_LIMIT);
  // Inspector opens on the populated tab; Unmatched by default, Parse errors
  // when Unmatched is empty (handoff decision #4).
  const initialInspectorTab: "unmatched" | "errors" =
    preview.unmatchedRows.length === 0 ? "errors" : "unmatched";
  // Sticky-bar copy branches on initial-import vs replace (matches the
  // confirm-modal branching landed in #48 — "replace" language is wrong when
  // there's no existing collection to replace).
  const isInitialImport = preview.currentCollectionCount === 0;
  // An Add's banner states what the add does, in copies; the matched count is a Replace's figure.
  const addDetail = change && mode === "add" ? change.data.detail : null;

  return (
    // Wrapping section splits into scrollable content + sticky confirm bar
    <section className={embedded ? "flex flex-col" : "flex flex-col min-h-[calc(100vh-140px)]"}>
      {/* Mobile page header — "Review import" and the filename (first-run redesign D11, 5b).
          The ‹ is gone: Cancel in the confirm bar is the phone's exit now. Embedded in first
          run's step-1 card (5a) there is no header at all; the card's own title and its
          REVIEWING line say where the reader is. */}
      {!embedded && (
        <div
          className="md:hidden flex flex-none items-baseline gap-[12px] p-[18px_18px_14px]"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <span className="font-display font-semibold text-[18px]" style={{ color: "var(--fg)" }}>Review import</span>
          <span className="ml-auto font-mono text-[10px]" style={{ color: "var(--fg-faint)" }}>{preview.filename}</span>
        </div>
      )}

      {/* Desktop content area — §Desktop Content Area (padding 36px 56px 20px, max-width 940px). Cap widened to 1280px per #32 so the review fills the shell content column instead of leaving an empty right column at typical desktop widths. */}
      <div className={`flex-1 md:max-w-[1280px] md:mx-auto md:p-[36px_56px_20px] ${embedded ? "p-[0_14px]" : "p-[16px_18px]"}`}>
        {/* Desktop step indicator — §Desktop Step Indicator */}
        <p
          className="hidden md:block font-mono text-[11px] tracking-[0.06em]"
          style={{ color: "var(--fg-faint)" }}
        >
          {step} · {preview.filename} · {rows(preview.rowCount)}
        </p>
        <h1
          className="hidden md:block font-display font-bold text-[29px] mt-[12px]"
          style={{ color: "var(--fg)" }}
        >
          {mode === "add" ? e.reviewAdd : "Review before you replace"}
        </h1>

        {failed ? (
          <div
            ref={failureRef}
            role="alert"
            tabIndex={-1}
            className="mt-[16px] rounded-[10px] border border-[color:var(--border-strong)] border-l-[3px] border-l-[color:var(--danger)] bg-[color:var(--surface)] p-[12px_14px] outline-none"
          >
            <div className="text-[14px] font-semibold text-[color:var(--fg)]">{e.failedTitle}</div>
            <p className="m-0 mt-[4px] text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">{failed.body}</p>
            {onRetry ? (
              <button type="button" onClick={onRetry} disabled={pending} className="mt-[6px] min-h-[44px] text-[13.5px] text-[color:var(--accent)] underline underline-offset-2 disabled:opacity-60">
                {e.retry}
              </button>
            ) : null}
          </div>
        ) : null}

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
            {/* §Matched Count: Success Icon — 30/44px circle, a 15% wash of --success behind a --success checkmark */}
            <span
              aria-hidden
              className="rounded-full flex items-center justify-center flex-none text-[15px] md:text-[20px] w-[30px] h-[30px] md:w-[44px] md:h-[44px]"
              style={{ background: "color-mix(in oklab, var(--success) 15%, transparent)", color: "var(--success)" }}
            >
              ✓
            </span>
            <div>
              {/* §Matched Count: Number — mono 22/30px 600 --fg */}
              <div className="font-mono font-semibold text-[22px] md:text-[30px] leading-none" style={{ color: "var(--fg)" }}>
                {addDetail ? e.addedFigure(addDetail.copiesAfter - addDetail.copiesBefore) : importCount.toLocaleString()}
              </div>
              {/* §Matched Count: Label */}
              <div className="text-[11.5px] md:text-[13px] mt-[2px] md:mt-[4px] text-[color:var(--fg-faint)] md:text-[color:var(--fg-muted)]">
                {addDetail ? (
                  e.addedLabel(addDetail.copiesAfter - addDetail.copiesBefore, addDetail.distinctCards)
                ) : (
                  <>
                    <span className="md:hidden">{importCount === 1 ? "card" : "cards"} matched &amp; ready</span>
                    <span className="hidden md:inline">{importCount === 1 ? "card" : "cards"} matched to the Oracle database: ready to import</span>
                  </>
                )}
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
              <span className="text-[13px]" style={{ color: "var(--fg-muted)" }}>{preview.parseErrors.length === 1 ? "parse error" : "parse errors"}</span>
            </div>
            {skippedByDesign > 0 && (
              <div className="flex items-center gap-[10px]">
                <span aria-hidden className="rounded-full flex-none" style={{ width: 9, height: 9, background: "var(--fg-faint)" }} />
                <span className="font-mono text-[16px]" style={{ color: "var(--fg-faint)" }}>
                  {skippedByDesign.toLocaleString()}
                </span>
                <span className="text-[13px]" style={{ color: "var(--fg-muted)" }}>token and emblem {skippedByDesign === 1 ? "row" : "rows"} skipped</span>
              </div>
            )}
            <div
              className="text-[11.5px] pt-[9px]"
              style={{ color: "var(--fg-faint)", borderTop: "1px solid var(--border)" }}
            >
              {rows(skippedTotal)} will be skipped
            </div>
          </div>

          {/* Mobile mini stats — §Issue Summary Mini Stats */}
          <div className="md:hidden flex flex-col gap-[8px] mt-[14px]">
            <div className="flex gap-[8px]">
              <MiniStat number={preview.unmatchedRows.length} numberColor="var(--warning)" label="unmatched" />
              <MiniStat number={preview.parseErrors.length} numberColor="var(--danger)" label={preview.parseErrors.length === 1 ? "parse error" : "parse errors"} />
              <MiniStat number={preview.rowCount} numberColor="var(--fg)" label={preview.rowCount === 1 ? "row read" : "rows read"} />
            </div>
            {/* Matches the mini-stat label's 11px/--fg-faint. Its own line because a fourth cell
                would squeeze all four below the label's legible width on a 360px viewport. */}
            {skippedByDesign > 0 && (
              <p className="text-[11px]" style={{ color: "var(--fg-faint)" }}>
                {skippedByDesign.toLocaleString()} token and emblem {skippedByDesign === 1 ? "row" : "rows"} skipped
              </p>
            )}
          </div>
        </div>

        {change ? (
          <ReplaceReviewDetail
            change={change.data}
            decks={change.decks}
            freshDeckIds={change.fresh}
            changed={change.changed}
            mode={mode}
            onSwitchToReplace={onSwitchToReplace}
          />
        ) : comparing ? (
          <p role="status" className="m-0 mt-[16px] text-[13px] text-[color:var(--fg-muted)]">
            {e.preparing}
          </p>
        ) : null}

        {/* Desktop 2-column issues layout — §Desktop Issues Layout. Collapses to a single column when either section is empty (#32) so the remaining list spans the full width instead of leaving half the row blank. */}
        <div
          className={`grid grid-cols-1 gap-[22px] mt-[16px] md:mt-[24px] ${
            preview.unmatchedRows.length > 0 && preview.parseErrors.length > 0 ? "md:grid-cols-2" : ""
          }`}
        >
          {/* Unmatched section */}
          {preview.unmatchedRows.length > 0 && (
            <div>
              {/* §Issue Section Headers — mono uppercase 10px, letter-spacing 0.14em, color --warning */}
              <h2
                className="font-mono uppercase text-[10px] tracking-[0.14em] mb-[8px] md:mb-[10px]"
                style={{ color: "var(--warning)" }}
              >
                <span className="md:hidden">Unmatched: {preview.unmatchedRows.length} skipped</span>
                <span className="hidden md:inline">Unmatched names: {preview.unmatchedRows.length}</span>
              </h2>
              <ul className="flex flex-col gap-[6px]">
                {unmatchedShown.map((r, i) => (
                  <li
                    key={`${r.line}-${i}`}
                    // §Issue Row — Unmatched Name: bg var(--surface), border 1px var(--border), border-left 3px var(--warning), radius 8px, padding 9px 12px / 11px 14px
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
            </div>
          )}

          {/* Parse errors section */}
          {preview.parseErrors.length > 0 && (
            <div>
              <h2
                className="font-mono uppercase text-[10px] tracking-[0.14em] mb-[8px] md:mb-[10px]"
                style={{ color: "var(--danger)" }}
              >
                Parse errors: {preview.parseErrors.length}
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
            </div>
          )}
        </div>

        {/* Issue CTA strip — Surfaces v2 §Collection. The quiet crown is
            allowed here because nothing was lost; the replace confirm
            stays straight. */}
        {skipped > 0 && (
          <div
            className="mt-[16px] md:mt-[20px] flex flex-col md:flex-row md:items-center gap-[12px] md:gap-[16px] rounded-[12px] p-[14px_16px] md:p-[16px_20px]"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <Crown tone="quiet" className="flex-none self-start md:self-center" />
            <div className="min-w-0 flex-1">
              <div className="font-display font-bold text-[15px] md:text-[17px]" style={{ color: "var(--fg)" }}>
                {issueInspectorCopy.entry.heading}
              </div>
              <p className="mt-[4px] m-0 text-[13px] md:text-[13.5px] leading-[1.55]" style={{ color: "var(--fg-body)" }}>
                {issueInspectorCopy.entry.body(skipped)}
              </p>
            </div>
            <GhostButton
              type="button"
              onClick={() => setInspectorOpen(true)}
              className="w-full md:w-auto flex-none text-[13.5px] px-[18px] py-[11px]"
            >
              {issueInspectorCopy.entry.cta(skipped)}
            </GhostButton>
          </div>
        )}
      </div>

      {/* Confirm bar — §Sticky Confirm Bar: border-top 1px --border-strong, bg --surface-rail.
          On /collection/replace it is sticky at both widths, and on the phone it sits above the
          tab bar (D11, 5b). Embedded in first run it is the card's foot, in flow (5a). */}
      <div
        className={`${
          embedded
            ? "mt-[14px] p-[12px_14px_14px] md:mt-0"
            : "sticky bottom-[var(--tabbar-h)] md:bottom-0 p-[12px_18px_14px]"
        } z-10 md:p-[16px_56px] md:flex md:items-center md:gap-[20px]`}
        style={{ background: "var(--surface-rail)", borderTop: "1px solid var(--border-strong)" }}
      >
        {/* Summary sentence — §Sticky Confirm Bar: Summary Sentence */}
        <p
          className="text-[11.5px] md:text-[13.5px] text-center md:text-left mb-[10px] md:mb-0 text-[color:var(--fg-faint)] md:text-[color:var(--fg-body)]"
        >
          {change && mode === "add" ? (
            e.barAdd(change.data.detail.copiesAfter - change.data.detail.copiesBefore, skippedTotal, change.data.detail.copiesBefore)
          ) : change ? (
            e.barReplace(change.data.detail.copiesBefore, change.data.detail.copiesAfter, new Set(change.decks.map((d) => d.deckId)).size)
          ) : isInitialImport ? (
            <>
              <span className="md:hidden">
                Imports {cards(importCount)} · skips {rows(skipped)}
              </span>
              <span className="hidden md:inline">
                Importing {cards(importCount)} and skipping {skipped}.
              </span>
            </>
          ) : (
            <>
              <span className="md:hidden">
                Skips {rows(skipped)} · replaces your {cards(preview.currentCollectionCount)} with {importCount.toLocaleString()}
              </span>
              <span className="hidden md:inline">
                Importing {cards(importCount)} and skipping {skipped}. This replaces your current {cards(preview.currentCollectionCount)}.
              </span>
            </>
          )}
        </p>

        {/* Buttons — Cancel then Continue at both widths (D11: the phone's exit is this Cancel,
            a 46px hairline left of Continue). md:whitespace-nowrap on Continue keeps the label on
            one line when the summary sentence eats horizontal space (#32); md:flex-none on the
            group blocks flex-shrink so the label and padding stay intact. */}
        <div className="md:ml-auto md:flex-none flex gap-[10px] md:gap-[12px]">
          <GhostButton
            type="button"
            onClick={onCancel}
            // A write already in flight cannot be taken back: leaving the review would not
            // stop it, and its receipt would open anyway (Copilot, #1097).
            disabled={pending}
            className="flex-none h-[46px] md:h-auto rounded-[10px] md:rounded-lg px-[18px] md:px-[20px] md:py-[12px] text-[14px] max-md:font-normal disabled:opacity-60"
          >
            {replaceCopy.review.cancel}
          </GhostButton>
          <PrimaryButton
            type="button"
            onClick={onContinue}
            // Held while the comparison is read, so Continue cannot slip past it into the dialog.
            disabled={pending || comparing}
            className="flex-1 md:flex-none h-[46px] md:h-auto rounded-[10px] md:rounded-lg text-[15px] md:text-[14px] md:whitespace-nowrap md:py-[12px] px-0 md:px-[24px] disabled:opacity-60 disabled:cursor-wait"
          >
            {/* "Importing…" is the confirm modal's own pending label, which this button now
                carries when a first import skips the modal. */}
            {change
              ? mode === "add"
                ? pending
                  ? e.pendingAdd
                  : e.confirmAdd(change.data.detail.copiesAfter - change.data.detail.copiesBefore)
                : pending
                  ? e.pendingReplace
                  : e.confirmReplace
              : pending
                ? "Importing…"
                : isInitialImport
                  ? "Continue to import →"
                  : "Continue to replace →"}
          </PrimaryButton>
        </div>
      </div>

      {inspectorOpen && (
        <IssueInspector
          preview={preview}
          initialTab={initialInspectorTab}
          onClose={() => setInspectorOpen(false)}
        />
      )}
    </section>
  );
}

function MiniStat({ number, numberColor, label }: { number: number; numberColor: string; label: string }) {
  return (
    // §Mini Stat Cell: flex 1, bg --surface-sunken, border 1px --border, radius 8px, padding 10px 12px (was 9/11 — bumped for #33 to match the mock's tighter-looking pill with more prominent number/label breathing).
    <div
      className="flex-1 rounded-lg p-[10px_12px]"
      style={{ background: "var(--surface-sunken)", border: "1px solid var(--border)" }}
    >
      <div className="font-mono text-[16px] leading-none" style={{ color: numberColor }}>{number.toLocaleString()}</div>
      <div className="text-[11px] mt-[3px]" style={{ color: "var(--fg-faint)" }}>{label}</div>
    </div>
  );
}
