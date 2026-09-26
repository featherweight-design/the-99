"use client";

// `Printed in ▾` (filter-chassis decision 9): a commander matches a set when ANY of its printings
// is from it, owned or not. One control for both lanes and both forms, so `/commanders` and
// `/discover` cannot drift apart:
//
// - WIDE: the shipped `FilterPanel`, searchable, anchored under its trigger in the rack.
// - SHEET: a 44px row that opens the shared set list as a second layer over the filter sheet
//   (decision 23 — `Set` and `Printed in` are the one place the compact form nests).
//
// The layer is portalled to the body. The filter sheet goes `inert` while it is up (the parent
// hears about it through `onLayerChange`), and a layer nested inside an inert subtree would be
// unreachable by the very readers the sheet's trap exists for. Its keys are stopped at its own
// root because a portal still bubbles through the React tree, and the sheet closes on Escape.

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PrintedInOption } from "../../../lib/commanders/printed-in-lane";
import { filterCopy, printedInPanelCopy } from "../../../lib/copy/lanes";
import { FilterPanel } from "../../ui/filter-panel";
import { SetListSheet, type SetListSheetCopy } from "../../ui/set-list-sheet";

const copy = filterCopy.printedIn;

const LIST_COPY: SetListSheetCopy = {
  panelAriaLabel: printedInPanelCopy.panelAriaLabel,
  sheetTitle: printedInPanelCopy.sheetTitle,
  footerSelected: printedInPanelCopy.footerSelected,
  searchPlaceholder: printedInPanelCopy.searchPlaceholder,
  searchAriaLabel: printedInPanelCopy.searchAriaLabel,
  none: copy.listNone,
  empty: copy.listEmpty,
  optionAriaUnavailable: printedInPanelCopy.optionAriaUnavailable,
  announceMatches: printedInPanelCopy.announceMatches,
  announceResult: copy.listShown,
  done: printedInPanelCopy.done,
};

function toggle(list: readonly string[], code: string): string[] {
  return list.includes(code) ? list.filter((c) => c !== code) : [...list, code];
}

export function PrintedInControl({
  form,
  options,
  selected,
  onChange,
  shown,
  total,
  onLayerChange,
}: {
  form: "wide" | "sheet";
  options: PrintedInOption[];
  /** Lower-case codes, as `LaneParams.printedIn` holds them. */
  selected: readonly string[];
  onChange: (next: string[]) => void;
  /** The rows the lane shows now, spoken from inside the sheet's layer. */
  shown: number;
  total: number;
  /** Sheet form: the layer opened or closed, so the sheet under it can go inert. */
  onLayerChange?: (open: boolean) => void;
}) {
  const [layerOpen, setLayerOpen] = useState(false);
  const row = useRef<HTMLButtonElement>(null);

  if (form === "wide") {
    return (
      <span data-testid="printed-in" className="contents">
        <FilterPanel
          key="wide"
          compact={false}
          copy={printedInPanelCopy}
          options={options}
          selected={[...selected]}
          searchable
          desktopTriggerHeightPx={34}
          // 44px rows, as every chassis panel draws them (STATES §4).
          desktopRowMinPx={44}
          note={copy.hint}
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
  const names = selected.map((code) => options.find((o) => o.code === code)?.label ?? code.toUpperCase());

  return (
    <div role="group" aria-label={copy.legend} className="flex flex-col gap-[10px]">
      <p className="font-mono m-0 text-[10px] tracking-[0.12em] uppercase text-[color:var(--fg-faint)]">
        {copy.legend}
      </p>
      <button
        ref={row}
        type="button"
        data-testid="printed-in-row"
        onClick={() => open(true)}
        aria-haspopup="dialog"
        aria-expanded={layerOpen}
        className="flex h-[44px] w-full cursor-pointer items-center justify-between gap-[10px] rounded-lg border border-solid border-[color:var(--border-strong)] bg-transparent px-[13px] text-left font-sans text-[13px] text-[color:var(--fg-body)]"
      >
        {/* The row says what is CHOSEN; the legend above it already names the dimension. */}
        <span className="truncate">
          {selected.length === 0 ? copy.rowAny : selected.length === 1 ? names[0] : copy.many(selected)}
        </span>
        <span aria-hidden className="shrink-0 text-[color:var(--fg-faint)]">›</span>
      </button>
      {layerOpen &&
        createPortal(
          <div onKeyDown={(e) => e.stopPropagation()}>
            <SetListSheet
              copy={LIST_COPY}
              note={copy.hint}
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
