"use client";
// Issue Inspector — full-list modal (desktop) / full-screen sheet (mobile) for
// the review page's unmatched-names and parse-errors lists. Opens against the
// already-loaded UploadPreview payload; no fetch, no route.
//
// A11y (READINESS #5 baseline + Yellow-item locks):
// - Focus trap via useDialogA11y; Esc closes; backdrop click closes (desktop).
// - First focus = filter input, via useDialogA11y's initialFocusRef option
//   (no focus flash on the close button).
// - role=tablist/role=tab/aria-selected + roving arrow-key focus between enabled tabs.
// - Disabled tab: aria-disabled + native disabled + tabindex=-1.
// - role=tabpanel + aria-labelledby on each panel.
// - Filter count span is visual-only; a sibling sr-only live region announces
//   only the zero-match state (no per-keystroke SR noise).
// - Filter debounced 120ms per brief.md §2; input value stays responsive.

import React, { useEffect, useRef, useState } from "react";
import type { UploadPreview } from "../../app/collection/actions";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { issueInspectorCopy } from "../../lib/copy/issue-inspector";
import {
  filterParseErrors,
  filterUnmatched,
} from "../../lib/collection/issue-filter";
import { IssueInspectorList } from "./issue-inspector-list";
import { CardFanMark } from "./card-fan-mark";

type Tab = "unmatched" | "errors";

export function IssueInspector({
  preview,
  initialTab,
  onClose,
}: {
  preview: UploadPreview;
  initialTab: Tab;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>(initialTab);
  // Two-state debounce: rawQuery drives the input; query drives filtering/
  // counts/highlights. 120ms per brief.md §2 — small enough to feel live at
  // ≤200 rows, large enough to avoid re-render churn on rapid typing.
  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQuery(rawQuery), 120);
    return () => clearTimeout(t);
  }, [rawQuery]);

  // Focus trap + Esc + focus-return + first-focus = filter input.
  useDialogA11y(dialogRef, onClose, { initialFocusRef: filterInputRef });

  // Filter resets on tab switch (per handoff decision #7).
  function switchTab(next: Tab) {
    setTab(next);
    setRawQuery("");
    setQuery("");
    // Re-focus filter after switch so keyboard flow continues there.
    queueMicrotask(() => filterInputRef.current?.focus());
  }

  const unmatchedTotal = preview.unmatchedRows.length;
  const errorsTotal = preview.parseErrors.length;
  const isUnmatchedDisabled = unmatchedTotal === 0;
  const isErrorsDisabled = errorsTotal === 0;
  const skipped = unmatchedTotal + errorsTotal;

  const filteredUnmatched = filterUnmatched(preview.unmatchedRows, query);
  const filteredErrors = filterParseErrors(preview.parseErrors, query);
  const activeTotal = tab === "unmatched" ? unmatchedTotal : errorsTotal;
  const activeShown =
    tab === "unmatched" ? filteredUnmatched.length : filteredErrors.length;
  const isFiltering = query.trim() !== "";
  const showEmptyFilter = isFiltering && activeShown === 0;

  // Count color: --fg-faint idle; --fg-body when filtering with hits;
  // --warning at 0 (per handoff Result count spec).
  const countColor =
    activeShown === 0 && isFiltering
      ? "var(--warning)"
      : isFiltering
        ? "var(--fg-body)"
        : "var(--fg-faint)";

  return (
    <div
      // §Backdrop: rgba(8,6,4,0.72) over the blurred (blur(3px)) review page.
      className="fixed inset-0 z-50 flex md:items-center md:justify-center"
      role="presentation"
      onClick={onClose}
      style={{
        background: "rgba(8,6,4,0.72)",
        backdropFilter: "blur(3px)",
        WebkitBackdropFilter: "blur(3px)",
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="issue-inspector-title"
        onClick={(e) => e.stopPropagation()}
        // Mobile: full-screen sheet on --bg (design's #14110E).
        // Desktop: 660px × 640px (fixed height, not max-height — the dialog
        // must not shrink as filter results narrow), --surface-rail, 1px
        // --border-strong, radius 16px, shadow 0 40px 100px rgba(0,0,0,0.7).
        // `relative` anchors the absolutely-positioned close button below.
        className="relative flex flex-col w-full h-full md:w-[660px] md:h-[640px] md:rounded-2xl bg-[color:var(--bg)] md:bg-[color:var(--surface-rail)] md:[border:1px_solid_var(--border-strong)] overflow-hidden"
        style={{ boxShadow: "0 40px 100px rgba(0,0,0,0.7)" }}
      >
        {/* Header — title + subtitle only. Close button renders at the end of
            the dialog (below) so DOM tab order goes filter → clear → tabs →
            close (per handoff A11y tab-order spec). Close is anchored top-right
            via absolute positioning against the `relative` dialog container. */}
        <div className="p-[18px_60px_10px_20px] md:p-[22px_66px_12px_26px]">
          <h2
            id="issue-inspector-title"
            className="font-display font-bold text-[19px] md:text-[22px]"
            style={{ color: "var(--fg)" }}
          >
            {issueInspectorCopy.header.title}
          </h2>
          <p
            className="font-mono text-[11.5px] mt-[4px]"
            style={{ color: "var(--fg-faint)" }}
          >
            {issueInspectorCopy.header.subtitle(
              preview.filename,
              skipped,
              preview.rowCount,
            )}
          </p>
        </div>

        {/* Header help line — or hoisted zero-note when a tab is empty. */}
        {isUnmatchedDisabled || isErrorsDisabled ? (
          <div
            className="mx-[20px] md:mx-[26px] mb-[10px] rounded-lg p-[10px_12px] flex items-start gap-[10px]"
            style={{
              background: "var(--surface-sunken)",
              borderLeft: "3px solid var(--success)",
            }}
          >
            <span
              aria-hidden
              className="rounded-full flex-none mt-[6px]"
              style={{ width: 8, height: 8, background: "var(--success)" }}
            />
            <p className="text-[12.5px]" style={{ color: "var(--fg-muted)" }}>
              {isErrorsDisabled
                ? issueInspectorCopy.zeroState.noParseErrors
                : issueInspectorCopy.zeroState.noUnmatched}
            </p>
          </div>
        ) : (
          <p
            className="mx-[20px] md:mx-[26px] mb-[10px] text-[12px]"
            style={{ color: "var(--fg-muted)" }}
          >
            {issueInspectorCopy.header.help}
          </p>
        )}

        {/* Tabs + filter row */}
        <div className="px-[20px] md:px-[26px]">
          <TabList
            tab={tab}
            unmatchedTotal={unmatchedTotal}
            errorsTotal={errorsTotal}
            onSwitch={switchTab}
          />

          <div className="mt-[12px] flex items-center gap-[10px]">
            {/* §Filter input: --surface-sunken, 1px --border-strong, radius 8, 40px (44 mobile).
                Focus: border → --brass + 3px ring rgba(201,162,75,.16) via focus-within. */}
            <div
              className="flex-1 flex items-center gap-[10px] rounded-lg px-[12px] h-[44px] md:h-[40px] border border-[color:var(--border-strong)] focus-within:border-[color:var(--brass)] focus-within:shadow-[0_0_0_3px_rgba(201,162,75,0.16)]"
              style={{ background: "var(--surface-sunken)" }}
            >
              <span
                aria-hidden
                className="font-mono text-[15px]"
                style={{ color: "var(--fg-faint)" }}
              >
                ⌕
              </span>
              <input
                ref={filterInputRef}
                type="text"
                value={rawQuery}
                onChange={(e) => setRawQuery(e.target.value)}
                placeholder={
                  tab === "unmatched"
                    ? issueInspectorCopy.filter.placeholderUnmatched(unmatchedTotal)
                    : issueInspectorCopy.filter.placeholderErrors(errorsTotal)
                }
                aria-label={
                  tab === "unmatched"
                    ? issueInspectorCopy.filter.placeholderUnmatched(unmatchedTotal)
                    : issueInspectorCopy.filter.placeholderErrors(errorsTotal)
                }
                autoComplete="off"
                spellCheck={false}
                // Focus indicator lives on the parent container (focus-within
                // brass border + ring). The input itself must not render its
                // own outline/border/shadow — nuke all three so only the
                // container ring shows.
                className="flex-1 bg-transparent text-[14px] focus:outline-none focus-visible:outline-none"
                style={{
                  color: "var(--fg)",
                  outline: "none",
                  border: "none",
                  boxShadow: "none",
                  background: "transparent",
                }}
              />
              {/* Clear button — always rendered; hidden via visibility when
                  input is empty so its 22px doesn't reflow the input width
                  (avoids the visual jump when the last character is deleted). */}
              <button
                type="button"
                onClick={() => {
                  setRawQuery("");
                  setQuery("");
                  filterInputRef.current?.focus();
                }}
                aria-label={issueInspectorCopy.filter.clearAriaLabel}
                aria-hidden={rawQuery === "" || undefined}
                tabIndex={rawQuery === "" ? -1 : 0}
                className="flex-none rounded-full flex items-center justify-center"
                style={{
                  width: 22,
                  height: 22,
                  background: "var(--border)",
                  color: "var(--fg-muted)",
                  fontSize: 12,
                  visibility: rawQuery === "" ? "hidden" : "visible",
                }}
              >
                ✕
              </button>
            </div>
            {/* Visual count — no aria-live (would announce every keystroke).
                Fixed min-width + right-align + tabular-nums so the text can't
                narrow as digit counts change (e.g. "110 of 110" → "7 of 110"),
                which was previously letting the filter container grow into
                the recovered space and causing a visible input jump. */}
            <span
              className="font-mono text-[11px] flex-none whitespace-nowrap tabular-nums text-right min-w-[150px]"
              style={{ color: countColor }}
            >
              {issueInspectorCopy.filter.count(activeShown, activeTotal)}
            </span>
            {/* SR-only live region — announces only the zero-match state. */}
            <span className="sr-only" aria-live="polite" aria-atomic="true">
              {showEmptyFilter
                ? `No matches for ${query}. ${activeTotal.toLocaleString()} total in this tab.`
                : ""}
            </span>
          </div>
        </div>

        {/* Panels — tabpanel gets h-full + flex so IssueInspectorList's plain
            <ul> can flex-fill (fixes last-row clipping at fixed height cap). */}
        <div className="flex-1 min-h-0 p-[14px_20px_20px] md:p-[16px_26px_22px] flex flex-col">
          <div
            role="tabpanel"
            id={`issue-inspector-panel-${tab}`}
            aria-labelledby={`issue-inspector-tab-${tab}`}
            className="flex-1 min-h-0 flex flex-col"
          >
            {showEmptyFilter ? (
              <EmptyFilter
                query={query}
                total={activeTotal}
                onClear={() => {
                  setRawQuery("");
                  setQuery("");
                  filterInputRef.current?.focus();
                }}
                bodyText={
                  tab === "unmatched"
                    ? issueInspectorCopy.emptyFilter.body(unmatchedTotal)
                    : issueInspectorCopy.emptyFilterErrors.body(errorsTotal)
                }
              />
            ) : tab === "unmatched" ? (
              <IssueInspectorList
                variant="unmatched"
                rows={filteredUnmatched}
                query={query}
              />
            ) : (
              <IssueInspectorList
                variant="errors"
                rows={filteredErrors}
                query={query}
              />
            )}
          </div>
        </div>

        {/* Close button — rendered LAST in DOM so keyboard Tab order matches
            the handoff spec (filter → clear → tabs → close). Positioned
            absolutely against the `relative` dialog container. */}
        <button
          type="button"
          onClick={onClose}
          aria-label={issueInspectorCopy.header.closeAriaLabel}
          // §Close: --surface-raised circle, 1px --border-strong, hover brass.
          className="absolute top-[18px] right-[20px] md:top-[22px] md:right-[26px] flex-none rounded-full flex items-center justify-center hover:[color:var(--brass)]"
          style={{
            width: 32,
            height: 32,
            background: "var(--surface-raised)",
            border: "1px solid var(--border-strong)",
            color: "var(--fg-muted)",
            fontSize: 15,
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function TabList({
  tab,
  unmatchedTotal,
  errorsTotal,
  onSwitch,
}: {
  tab: Tab;
  unmatchedTotal: number;
  errorsTotal: number;
  onSwitch: (t: Tab) => void;
}) {
  const enabled: Tab[] = [
    ...(unmatchedTotal > 0 ? (["unmatched"] as const) : []),
    ...(errorsTotal > 0 ? (["errors"] as const) : []),
  ];

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (enabled.length < 2) return;
    if (
      e.key !== "ArrowRight" &&
      e.key !== "ArrowLeft" &&
      e.key !== "Home" &&
      e.key !== "End"
    )
      return;
    e.preventDefault();
    const currentIdx = enabled.indexOf(tab);
    let next = currentIdx;
    if (e.key === "ArrowRight") next = (currentIdx + 1) % enabled.length;
    else if (e.key === "ArrowLeft")
      next = (currentIdx - 1 + enabled.length) % enabled.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = enabled.length - 1;
    onSwitch(enabled[next]);
  }

  return (
    <div
      role="tablist"
      aria-label={issueInspectorCopy.tabs.ariaLabel}
      onKeyDown={onKeyDown}
      className="flex items-center gap-[18px]"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <TabButton
        id="issue-inspector-tab-unmatched"
        panelId="issue-inspector-panel-unmatched"
        label={issueInspectorCopy.tabs.unmatched}
        count={unmatchedTotal}
        selected={tab === "unmatched"}
        disabled={unmatchedTotal === 0}
        onSelect={() => onSwitch("unmatched")}
        pillTint={
          unmatchedTotal === 0
            ? { color: "var(--success)", bg: "rgba(111,163,104,0.14)" }
            : { color: "var(--warning)", bg: "rgba(224,145,60,0.14)" }
        }
      />
      <TabButton
        id="issue-inspector-tab-errors"
        panelId="issue-inspector-panel-errors"
        label={issueInspectorCopy.tabs.parseErrors}
        count={errorsTotal}
        selected={tab === "errors"}
        disabled={errorsTotal === 0}
        onSelect={() => onSwitch("errors")}
        pillTint={
          errorsTotal === 0
            ? { color: "var(--success)", bg: "rgba(111,163,104,0.14)" }
            : { color: "var(--danger)", bg: "rgba(198,83,63,0.16)" }
        }
      />
    </div>
  );
}

function TabButton({
  id,
  panelId,
  label,
  count,
  selected,
  disabled,
  onSelect,
  pillTint,
}: {
  id: string;
  panelId: string;
  label: string;
  count: number;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  pillTint: { color: string; bg: string };
}) {
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-selected={selected}
      aria-controls={panelId}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      // §Tab: Plex Sans 600 14px; active --fg + inset -2px --brass; idle --fg-faint.
      // Disabled: --fg-locked adjacent, opacity .7, cursor not-allowed.
      // Padding matches the mock's 10px 4px 13px (pt/px/pb) — split classes to
      // avoid a Tailwind class-order conflict (py-[10px] + pt-[4px] loses to pt-[4px]).
      className="flex items-center gap-[8px] pt-[10px] px-[4px] pb-[13px] font-sans font-semibold text-[14px] cursor-pointer disabled:cursor-not-allowed"
      style={{
        background: "none",
        border: "none",
        color: disabled
          ? "var(--fg-locked)"
          : selected
            ? "var(--fg)"
            : "var(--fg-faint)",
        opacity: disabled ? 0.7 : 1,
        boxShadow: selected ? "inset 0 -2px 0 var(--brass)" : "none",
      }}
    >
      {label}
      <span
        className="font-mono text-[11px] rounded-full px-[8px] py-[2px]"
        style={{ color: pillTint.color, background: pillTint.bg }}
      >
        {count.toLocaleString()}
      </span>
    </button>
  );
}

function EmptyFilter({
  query,
  total,
  onClear,
  bodyText,
}: {
  query: string;
  total: number;
  onClear: () => void;
  bodyText: string;
}) {
  return (
    <div
      className="flex flex-col items-center text-center gap-[10px] py-[36px]"
      style={{ color: "var(--fg-muted)" }}
    >
      <div style={{ color: "var(--brass-mid)" }}>
        <CardFanMark size={56} />
      </div>
      <p
        className="font-display font-semibold text-[16px]"
        style={{ color: "var(--fg)" }}
      >
        {issueInspectorCopy.emptyFilter.title(query)}
      </p>
      <p className="text-[13px] max-w-[380px]">{bodyText}</p>
      <p className="sr-only">Total available: {total.toLocaleString()}</p>
      <button
        type="button"
        onClick={onClear}
        className="mt-[8px] rounded-lg font-sans font-semibold text-[13px] px-[16px] py-[9px] cursor-pointer"
        style={{
          background: "var(--brass)",
          color: "var(--bg)",
          border: "none",
        }}
      >
        {issueInspectorCopy.emptyFilter.action}
      </button>
    </div>
  );
}
