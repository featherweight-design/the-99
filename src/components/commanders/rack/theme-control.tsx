"use client";

// `Themes ▾` (#159): narrow Discover by the EDHREC themes a commander is built around. The same
// tags the row's play-style sentence names, so a picked theme always has a word on the row to
// point at.
//
// Built from the rack's two existing multi-select shapes, never a third:
//
// - WIDE: the shipped `FilterPanel`, searchable, ordered by how many commanders each theme has
//   under the OTHER controls, with the Any / All match in the panel's head.
// - SHEET: the most-played themes inline as 44px pills (one tap, no second layer), then a 44px
//   row that opens the whole list as the shared `SetListSheet` layer, exactly as `Printed in`
//   nests (decision 23).

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { COVERED_WITH_MAIN } from "../../shell/covered-layer";
import type { ThemeMatch } from "../../../lib/commanders/lane-params";
import { filterCopy, themesPanelCopy } from "../../../lib/copy/lanes";
import { FilterPanel } from "../../ui/filter-panel";
import { SetListSheet, type SetListSheetCopy } from "../../ui/set-list-sheet";

const copy = filterCopy.themes;

export type ThemeOption = {
  /** EDHREC's slug, lower-case: what `LaneParams.themes` and `?t=` hold. */
  code: string;
  /** EDHREC's label, as the row's sentence prints it. */
  label: string;
  /** `typal` for a creature-type theme; absent for a mechanic. */
  hint?: string;
  /** Commanders on this lane with the theme, under the other controls. */
  count: number;
  disabled: boolean;
};

/** How many themes the sheet draws inline before the `All N themes` row. */
export const SHEET_INLINE = 6;

const LIST_COPY: SetListSheetCopy = {
  panelAriaLabel: themesPanelCopy.panelAriaLabel,
  sheetTitle: themesPanelCopy.sheetTitle,
  footerSelected: themesPanelCopy.footerSelected,
  searchPlaceholder: themesPanelCopy.searchPlaceholder,
  searchAriaLabel: themesPanelCopy.searchAriaLabel,
  none: copy.listNone,
  empty: copy.listEmpty,
  optionAriaUnavailable: themesPanelCopy.optionAriaUnavailable,
  announceMatches: themesPanelCopy.announceMatches,
  announceResult: copy.listShown,
  done: "Back to filters",
};

function toggle(list: readonly string[], code: string): string[] {
  return list.includes(code) ? list.filter((c) => c !== code) : [...list, code];
}

/** Any / All. Live only at two or more themes; below that it is greyed in place and says why. */
function MatchControl({
  form,
  selected,
  match,
  onMatchChange,
}: {
  form: "wide" | "sheet";
  selected: number;
  match: ThemeMatch;
  onMatchChange: (next: ThemeMatch) => void;
}) {
  const live = selected > 1;
  const wide = form === "wide";
  const segments = [
    { mode: "any" as const, label: wide ? copy.match.anyShort : copy.match.any },
    { mode: "all" as const, label: wide ? copy.match.allShort : copy.match.all },
  ];
  const group = (
    <div
      role="radiogroup"
      aria-label={copy.match.legend}
      aria-disabled={live ? undefined : true}
      className={wide ? "flex items-center gap-[2px] shrink-0" : "flex gap-[8px]"}
    >
      {segments.map((s) => {
        const on = s.mode === match;
        return (
          <button
            key={s.mode}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => live && onMatchChange(s.mode)}
            className={[
              "flex items-center justify-center border border-solid",
              live ? "cursor-pointer" : "cursor-default",
              wide
                ? "relative font-mono rounded-[6px] px-[8px] h-[22px] text-[10.5px] after:absolute after:-inset-x-px after:-inset-y-[2px] after:content-['']"
                : "rounded-full h-[44px] px-[16px] text-[13.5px]",
              !live
                ? [
                    "bg-[color:var(--surface-sunken)] text-[color:var(--fg-locked)]",
                    on ? "border-[color:var(--border-strong)]" : "border-[color:var(--border)]",
                  ].join(" ")
                : on
                  ? wide
                    ? "bg-[color:var(--elevated)] border-[color:var(--border-strong)] text-[color:var(--fg)]"
                    : "bg-[color-mix(in_oklab,var(--accent)_16%,transparent)] border-[color:var(--accent)] text-[color:var(--fg)]"
                  : wide
                    ? "bg-transparent border-transparent text-[color:var(--fg-muted)]"
                    : "bg-transparent border-[color:var(--border-strong)] text-[color:var(--fg-body)]",
            ].join(" ")}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );

  if (wide) {
    return (
      <div className="flex items-center justify-between gap-[12px] rounded-lg border border-solid border-[color:var(--border)] px-[10px] py-[6px]">
        <span
          className={`font-sans text-[12px] ${live ? "text-[color:var(--fg-body)]" : "text-[color:var(--fg-faint)]"}`}
        >
          {live ? copy.match.legend : copy.match.idleShort}
        </span>
        {group}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-[8px]">
      <p className="font-mono m-0 text-[10px] tracking-[0.12em] uppercase text-[color:var(--fg-faint)]">
        {copy.match.legend}
      </p>
      {group}
      {!live && <p className="m-0 font-sans text-[12px] text-[color:var(--fg-faint)]">{copy.match.idle}</p>}
    </div>
  );
}

export function ThemeControl({
  form,
  options,
  selected,
  match,
  onChange,
  onMatchChange,
  coloursLit,
  shown,
  total,
  onLayerChange,
}: {
  form: "wide" | "sheet";
  /** Most commanders first; ties alphabetical. */
  options: ThemeOption[];
  selected: readonly string[];
  match: ThemeMatch;
  onChange: (next: string[]) => void;
  onMatchChange: (next: ThemeMatch) => void;
  /** Pips lit: the counts are inside those colors, and the head says so. */
  coloursLit: boolean;
  shown: number;
  total: number;
  onLayerChange?: (open: boolean) => void;
}) {
  const [layerOpen, setLayerOpen] = useState(false);
  const row = useRef<HTMLButtonElement>(null);
  const note = coloursLit ? copy.countedInColors : undefined;

  if (form === "wide") {
    return (
      <span data-testid="themes" className="contents">
        <FilterPanel
          key="wide"
          compact={false}
          copy={themesPanelCopy}
          options={options}
          selected={[...selected]}
          searchable
          desktopTriggerHeightPx={34}
          desktopRowMinPx={44}
          note={note}
          headExtra={
            <MatchControl form="wide" selected={selected.length} match={match} onMatchChange={onMatchChange} />
          }
          onToggle={(code) => onChange(toggle(selected, code))}
          onClear={() => onChange([])}
        />
      </span>
    );
  }

  const open = (next: boolean) => {
    setLayerOpen(next);
    onLayerChange?.(next);
  };
  // Picked themes lead, so a pick made in the full list is never off-screen here.
  const picked = options.filter((o) => selected.includes(o.code));
  const top = options.filter((o) => !selected.includes(o.code)).slice(0, Math.max(0, SHEET_INLINE - picked.length));
  const inline = [...picked, ...top];

  return (
    <div role="group" aria-label={copy.legend} className="flex flex-col gap-[10px]">
      <p className="font-mono m-0 text-[10px] tracking-[0.12em] uppercase text-[color:var(--fg-faint)]">
        {copy.legend}
      </p>
      {/* A fixed two-column grid, each pill filling its cell with the count pinned to the right edge
          (SetListSheet's H8 rule): a count changing under another control never resizes a pill or
          reflows the row. */}
      <div className="grid grid-cols-2 gap-[8px]">
        {inline.map((o) => {
          const on = selected.includes(o.code);
          return (
            <button
              key={o.code}
              type="button"
              aria-pressed={on}
              aria-disabled={o.disabled && !on ? true : undefined}
              onClick={() => (!o.disabled || on) && onChange(toggle(selected, o.code))}
              className={[
                "flex h-[44px] min-w-0 w-full items-center justify-between gap-[8px] rounded-full border border-solid px-[14px] text-[13.5px]",
                on
                  ? "bg-[color-mix(in_oklab,var(--accent)_16%,transparent)] border-[color:var(--accent)] text-[color:var(--fg)]"
                  : o.disabled
                    ? "bg-[color:var(--surface-sunken)] border-[color:var(--border)] text-[color:var(--fg-locked)]"
                    : "bg-transparent border-[color:var(--border-strong)] text-[color:var(--fg-body)]",
              ].join(" ")}
            >
              <span className="min-w-0 truncate">{o.label}</span>
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-[color:var(--fg-faint)]">{o.count.toLocaleString("en-US")}</span>
            </button>
          );
        })}
      </div>
      <button
        ref={row}
        type="button"
        data-testid="themes-row"
        onClick={() => open(true)}
        aria-haspopup="dialog"
        aria-expanded={layerOpen}
        className="flex h-[44px] w-full cursor-pointer items-center justify-between gap-[10px] rounded-lg border border-solid border-[color:var(--border-strong)] bg-transparent px-[13px] text-left font-sans text-[13px] text-[color:var(--fg-body)]"
      >
        <span className="truncate">{copy.rowAll(options.length)}</span>
        <span aria-hidden className="shrink-0 text-[color:var(--fg-faint)]">›</span>
      </button>
      {note && <p className="m-0 font-sans text-[12px] text-[color:var(--fg-faint)]">{note}</p>}
      <MatchControl form="sheet" selected={selected.length} match={match} onMatchChange={onMatchChange} />
      {layerOpen &&
        createPortal(
          <div onKeyDown={(e) => e.stopPropagation()} {...{ [COVERED_WITH_MAIN]: "" }}>
            <SetListSheet
              copy={LIST_COPY}
              note={note}
              onDismiss={() => open(false)}
              options={options}
              selected={selected}
              onToggle={(code) => onChange(toggle(selected, code))}
              shown={shown}
              total={total}
              returnFocusTo={row}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
