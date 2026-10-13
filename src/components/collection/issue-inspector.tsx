"use client";
// Issue Inspector — full-list modal (desktop) / bottom sheet (phone) for the
// review page's unmatched-names and parse-errors lists. Opens against the
// already-loaded UploadPreview payload; no fetch, no route.
//
// Phone (first-run onboarding handoff D8): the shared `Sheet` in the collection
// filter sheet's vocabulary — 22px top, --surface-inset, the 38×4 handle under
// 12px — with a HELD height and a drag that starts from the handle or the title
// block only. Desktop's 660×640 modal is unchanged. The two are mounted by
// `useIsDesktop` rather than a `hidden md:block` pair, because both are
// aria-modal and a hidden duplicate would put two dialogs in the a11y tree.
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

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { UploadPreview } from "../../app/collection/actions";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { issueInspectorCopy } from "../../lib/copy/issue-inspector";
import {
  filterParseErrors,
  filterUnmatched,
} from "../../lib/collection/issue-filter";
import { IssueInspectorList } from "./issue-inspector-list";
import { CardFanMark } from "./card-fan-mark";
import { PrimaryButton } from "../ui/button";
import { SearchField } from "../ui/text-field";
import { Sheet } from "../ui/sheet";
import { useIsDesktop } from "../ui/use-is-desktop";
import { VIRTUALIZE_THRESHOLD } from "./issue-inspector-list";

/** The phone sheet's height cap, as a fraction of the viewport (86vh). */
const SHEET_CAP = 0.86;

/**
 * The phone sheet's held height, measured ONCE on open (handoff D8).
 *
 * Mechanism: on the first layout the panel renders at its natural height with
 * the opening tab's list in place, and the OTHER tab's list is rendered beside
 * it in an invisible, inert, absolutely-positioned copy of the same width. Then,
 * before paint:
 *
 *   chrome = panel height − the visible list's box
 *   held   = min(86vh, chrome + the longer of the two lists' content heights)
 *
 * and the copy unmounts. A list past the virtualisation threshold is taller than
 * any cap it could meet: 151 rows at the smallest measured row (64px on a
 * phone, plus the 6px gap) is over 10,000px, so either tab past it holds at
 * the cap without measuring. Measuring the real DOM rather than multiplying a row
 * height is deliberate: an unmatched row and a parse-error row are different
 * heights, and a constant would drift the moment either row's type moved.
 *
 * Held means held: the value is state set once, never recomputed, so filtering
 * and switching tabs change what is inside the panel and never its box.
 */
function useHeldSheetHeight(
  enabled: boolean,
  panelRef: React.RefObject<HTMLDivElement | null>,
  measureRef: React.RefObject<HTMLDivElement | null>,
  anyVirtualised: boolean,
) {
  const [held, setHeld] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (!enabled || held !== null) return;
    const panel = panelRef.current;
    if (!panel) return;
    const cap = Math.floor(window.innerHeight * SHEET_CAP);
    let next = cap;
    if (!anyVirtualised) {
      const list = panel.querySelector<HTMLElement>(
        "[data-issue-list]:not([data-issue-measure] *)",
      );
      const listBox = list?.clientHeight ?? 0;
      const listContent = list?.scrollHeight ?? 0;
      const other = measureRef.current?.getBoundingClientRect().height ?? 0;
      const chrome = panel.getBoundingClientRect().height - listBox;
      next = Math.min(cap, Math.ceil(chrome + Math.max(listContent, other)));
    }
    // A measured value has to reach state from a layout effect: it exists only
    // after layout, and setting it here re-renders before paint, so the reader
    // never sees the unheld frame. It runs once per visit (`held` gates it).
    setHeld(next);
  }, [enabled, held, panelRef, measureRef, anyVirtualised]);
  return held;
}

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
  const measureRef = useRef<HTMLDivElement>(null);
  const isDesktop = useIsDesktop();
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
  // `source` distinguishes click (→ jump focus to filter so typing continues)
  // from keyboard arrow (→ keep focus in the tablist on the newly-selected
  // tab, per WAI-ARIA roving-tabindex tabs pattern).
  function switchTab(next: Tab, source: "click" | "keyboard" = "click") {
    setTab(next);
    setRawQuery("");
    setQuery("");
    queueMicrotask(() => {
      if (source === "keyboard") {
        document.getElementById(`issue-inspector-tab-${next}`)?.focus();
      } else {
        filterInputRef.current?.focus();
      }
    });
  }

  const unmatchedTotal = preview.unmatchedRows.length;
  const errorsTotal = preview.parseErrors.length;
  const isUnmatchedDisabled = unmatchedTotal === 0;
  const isErrorsDisabled = errorsTotal === 0;
  // The subtitle says "N of M rows skipped", so N must be every skipped row — including the
  // tokens and emblems neither tab lists — or it contradicts the review screen's footer.
  const skipped = unmatchedTotal + errorsTotal + (preview.skippedByDesignCount ?? 0);
  const isInitialImport = preview.currentCollectionCount === 0;

  const heldHeight = useHeldSheetHeight(
    !isDesktop,
    dialogRef,
    measureRef,
    unmatchedTotal > VIRTUALIZE_THRESHOLD || errorsTotal > VIRTUALIZE_THRESHOLD,
  );
  // The other tab's list, rendered invisibly until the held height is taken.
  const measuring = !isDesktop && heldHeight === null;

  // Memoize so per-keystroke rawQuery re-renders (which don't yet change
  // `query` — 120ms debounce hasn't fired) don't repeat the filter work.
  const filteredUnmatched = useMemo(
    () => filterUnmatched(preview.unmatchedRows, query),
    [preview.unmatchedRows, query],
  );
  const filteredErrors = useMemo(
    () => filterParseErrors(preview.parseErrors, query),
    [preview.parseErrors, query],
  );
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

  const clearFilter = () => {
    setRawQuery("");
    setQuery("");
    filterInputRef.current?.focus();
  };

  // Title + subtitle. On the phone this is the sheet's header, and with the
  // handle it is the whole drag region (D8); the ✕ is NOT in it, because it
  // renders last in the DOM for the tab order below.
  const titleBlock = (
    <div className="p-[12px_60px_10px_16px] md:p-[22px_66px_12px_26px]">
      <h2
        id="issue-inspector-title"
        className="font-display font-bold text-[19px] md:text-[22px]"
        style={{ color: "var(--fg)" }}
      >
        {issueInspectorCopy.header.title}
      </h2>
      <p
        // 11px on the phone, as frame 3a draws it, so a usual filename and its
        // count fit one line at 390; desktop keeps 11.5.
        className="font-mono text-[11px] md:text-[11.5px] mt-[4px]"
        style={{ color: "var(--fg-faint)" }}
      >
        {issueInspectorCopy.header.subtitle(
          preview.filename,
          skipped,
          preview.rowCount,
        )}
      </p>
    </div>
  );

  const content = (
    <>
      {/* Header help line — or hoisted zero-note when a tab is empty. */}
      {isUnmatchedDisabled || isErrorsDisabled ? (
        <div
          className="mx-[16px] md:mx-[26px] mb-[10px] rounded-lg p-[10px_12px] flex items-start gap-[10px]"
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
          className="mx-[16px] md:mx-[26px] mb-[10px] text-[12px]"
          style={{ color: "var(--fg-muted)" }}
        >
          {isInitialImport
            ? issueInspectorCopy.header.helpInitial
            : issueInspectorCopy.header.help}
        </p>
      )}

      {/* Tabs + filter row */}
      <div className="px-[16px] md:px-[26px]">
        <TabList
          tab={tab}
          unmatchedTotal={unmatchedTotal}
          errorsTotal={errorsTotal}
          onSwitch={switchTab}
        />

        <div className="mt-[12px] flex items-center gap-[10px]">
          {/* §Filter input: --surface-sunken, 1px --border-strong, radius 8, 40px (44 mobile).
              Focus: border → --accent + 3px ring color-mix(in oklab, var(--accent) 16%, transparent) via focus-within. */}
          <SearchField
            ref={filterInputRef}
            type="text"
            containerClassName="flex-1 h-[44px] md:h-[40px]"
            // 16px on the phone, where the field takes focus as the sheet
            // opens: below 16px iOS Safari zooms the page on focus, just as
            // the held height is measured. This departs from frame 3a's 14px
            // on purpose (the repo convention, as quick-add-bar.tsx); desktop
            // keeps 14.
            className="text-[16px] md:text-[14px]"
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
            clearLabel={issueInspectorCopy.filter.clearAriaLabel}
            onClear={clearFilter}
          />
          {/* Visual count — no aria-live (would announce every keystroke).
              Fixed min-width + right-align + tabular-nums so the text can't
              narrow as digit counts change (e.g. "110 of 110" → "7 of 110"),
              which was previously letting the filter container grow into
              the recovered space and causing a visible input jump. 150px is
              desktop's; the phone's is 72 (D8), which still holds
              "214 of 214" and leaves the field its width at 390. */}
          <span
            className="font-mono text-[11px] flex-none whitespace-nowrap tabular-nums text-right min-w-[72px] md:min-w-[150px]"
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
      <div className="flex-1 min-h-0 p-[14px_16px_20px] md:p-[16px_26px_22px] flex flex-col">
        <div
          role="tabpanel"
          id={`issue-inspector-panel-${tab}`}
          aria-labelledby={`issue-inspector-tab-${tab}`}
          // `relative` anchors the phone's measuring copy; `overflow-y-auto`
          // lets the empty-filter state scroll inside a short held sheet
          // rather than pushing a second scroll body onto the sheet itself.
          className="relative flex-1 min-h-0 flex flex-col overflow-y-auto overscroll-contain"
        >
          {showEmptyFilter ? (
            <EmptyFilter
              query={query}
              total={activeTotal}
              onClear={clearFilter}
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
          {measuring && (
            // The OTHER tab's list at its natural height, the same width, never
            // painted and out of the a11y tree. See `useHeldSheetHeight`.
            <div
              ref={measureRef}
              aria-hidden
              inert
              data-issue-measure=""
              className="invisible pointer-events-none absolute inset-x-0 top-0"
            >
              {tab === "unmatched" ? (
                <IssueInspectorList variant="errors" rows={preview.parseErrors} query="" />
              ) : (
                <IssueInspectorList variant="unmatched" rows={preview.unmatchedRows} query="" />
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );

  const closeButton = (
    // Close button — rendered LAST in DOM so keyboard Tab order matches the
    // handoff spec (filter → clear → tabs → close). Positioned absolutely
    // against the `relative` dialog (desktop) or sheet panel (phone), where it
    // sits in the title block's corner: 12px handle padding + 4px bar + the
    // title block's 12px (D8, frame 3a).
    <button
      type="button"
      onClick={onClose}
      aria-label={issueInspectorCopy.header.closeAriaLabel}
      // §Close: --surface-raised circle, 1px --border-strong, hover accent.
      // Color is a utility, not inline style: an inline color outranks the
      // hover: variant and the accent hover never lands.
      className="absolute top-[28px] right-[16px] md:top-[22px] md:right-[26px] flex-none rounded-full flex items-center justify-center text-[color:var(--fg-muted)] hover:[color:var(--accent)] bg-[color:var(--surface-raised)] border border-[color:var(--border-strong)] transition-colors"
      style={{ width: 32, height: 32, fontSize: 15 }}
    >
      ✕
    </button>
  );

  if (!isDesktop) {
    return (
      <Sheet
        open
        onDismiss={onClose}
        ariaLabel={issueInspectorCopy.header.title}
        panelRef={dialogRef}
        header={titleBlock}
        headerDrag
        height={heldHeight ?? undefined}
        footer={closeButton}
        // z-50, over the tab bar (z-40), as the collection filter sheet.
        frameClassName="fixed inset-0 z-50 flex flex-col justify-end"
        // D8 names this scrim rather than the filter sheet's literal rgba,
        // which is one theme's --bg (READINESS O4).
        scrimClassName="absolute inset-0 bg-[color-mix(in_oklab,var(--bg)_74%,transparent)]"
        handleClassName="flex touch-none justify-center pt-[12px] pb-0"
        handleBarClassName="h-[4px] w-[38px] rounded-[2px] bg-[color:var(--border-strong)]"
        // The collection filter sheet's box (filter-sheet.tsx), which D8 names.
        panelClassName="relative z-10 flex max-h-[86vh] flex-col rounded-t-[22px] border-x-0 border-b-0 border-t border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-inset)]"
      >
        {content}
      </Sheet>
    );
  }

  return (
    <div
      // §Backdrop: color-mix(in oklab, var(--bg) 72%, transparent) over the blurred (blur(3px)) review page.
      className="fixed inset-0 z-50 flex md:items-center md:justify-center"
      role="presentation"
      onClick={onClose}
      style={{
        background: "color-mix(in oklab, var(--bg) 72%, transparent)",
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
        // Desktop: 660px × 640px (fixed height, not max-height — the dialog
        // must not shrink as filter results narrow), --surface-rail, 1px
        // --border-strong, radius 16px, shadow --modal-shadow.
        // `relative` anchors the absolutely-positioned close button.
        className="relative flex flex-col w-full h-full md:w-[660px] md:h-[640px] md:rounded-2xl bg-[color:var(--bg)] md:bg-[color:var(--surface-rail)] md:[border:1px_solid_var(--border-strong)] overflow-hidden"
        style={{ boxShadow: "var(--modal-shadow)" }}
      >
        {titleBlock}
        {content}
        {closeButton}
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
  onSwitch: (t: Tab, source?: "click" | "keyboard") => void;
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
    // Roving focus: keep focus on the newly-selected tab, don't steal to filter.
    onSwitch(enabled[next], "keyboard");
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
            ? { color: "var(--success)", bg: "color-mix(in oklab, var(--success) 14%, transparent)" }
            : { color: "var(--warning)", bg: "color-mix(in oklab, var(--warning) 14%, transparent)" }
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
            ? { color: "var(--success)", bg: "color-mix(in oklab, var(--success) 14%, transparent)" }
            : { color: "var(--danger)", bg: "color-mix(in oklab, var(--danger) 16%, transparent)" }
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
      // Only the ACTIVE tab's panel is rendered (id derived from `tab`).
      // Referencing a non-existent panel from an inactive tab confuses AT —
      // omit aria-controls unless selected.
      aria-controls={selected ? panelId : undefined}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      // §Tab: Plex Sans 600 14px; active --fg + inset -2px --accent; idle --fg-faint.
      // Disabled: --fg-locked adjacent, opacity .7, cursor not-allowed.
      // Padding matches the mock's 10px 4px 13px (pt/px/pb) — split classes to
      // avoid a Tailwind class-order conflict (py-[10px] + pt-[4px] loses to pt-[4px]).
      className={[
        "flex items-center gap-[8px] pt-[10px] px-[4px] pb-[13px] font-sans font-semibold text-[14px]",
        "cursor-pointer disabled:cursor-not-allowed bg-transparent border-none",
        disabled
          ? "text-[color:var(--fg-locked)]"
          : selected
            ? "text-[color:var(--fg)]"
            : "text-[color:var(--fg-faint)]",
      ].join(" ")}
      style={{
        opacity: disabled ? 0.7 : 1,
        boxShadow: selected ? "inset 0 -2px 0 var(--accent)" : "none",
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
      <CardFanMark />
      <p
        // Display face at 17px on the phone and 19px from md, as the Issue
        // Inspector mock draws it (first-run READINESS correction 4).
        className="font-display font-semibold text-[17px] md:text-[19px]"
        style={{ color: "var(--fg)" }}
      >
        {issueInspectorCopy.emptyFilter.title(query)}
      </p>
      <p className="text-[13px] max-w-[380px]">{bodyText}</p>
      <p className="sr-only">Total available: {total.toLocaleString()}</p>
      <PrimaryButton
        type="button"
        onClick={onClear}
        className="mt-[8px] text-[13px] px-[16px] py-[9px]"
      >
        {issueInspectorCopy.emptyFilter.action}
      </PrimaryButton>
    </div>
  );
}
