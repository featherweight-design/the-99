"use client";

// The phone filter surface. Same `DeckFilters` in, same whole-new-value out as
// the desktop column, through the same `toggleIn` — which is what stops the two
// from ever disagreeing. Neither reads or writes a URL; the view does.
//
// The sheet carries the filters. It used to carry the sort too, because the
// phone header had nowhere to put it; §3.4 retires that group now the chassis
// gives sort its own slot on both forms.
//
// Historic note, kept because it explains the shape: the phone header
// has nowhere to put it (plan ruling 6). Everything else is the column's
// vocabulary re-drawn as chips at the 44px touch floor.

import { useRef } from "react";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { refreshCopy } from "../../lib/copy/refresh";
import {
  COLOUR_ORDER,
  EMPTY_FILTERS,
  STATUS_ORDER,
  type PlayedWindow,
} from "../../lib/decks/filter";
import { STATUS_TOKEN } from "../../lib/decks/status-style";
import {
  ColourSwatch,
  PLAYED_LABEL,
  STATUS_COPY_KEY,
  SearchField,
  toggleIn,
} from "./deck-filter-column";
import type { DeckFilters } from "../../lib/decks/filter";

/**
 * Filters only. The sheet carried the sort until §3.4 retired that group — the
 * chassis gives sort its own slot on both forms — so these props no longer
 * inherit the sort state nothing in here reads.
 */
type DeckFilterSheetProps = {
  filters: DeckFilters;
  onChange: (next: DeckFilters) => void;
  shown: number;
  total: number;
  open: boolean;
  onDismiss: () => void;
  autoFocusSearch: boolean;
};

// 44px, not 36: this sheet is the phone's only filter surface, so each chip is
// the sole route to its filter and cannot sit under the target floor. R3 §2.
const CHIP =
  "flex h-[44px] cursor-pointer items-center rounded-full border border-solid px-[12px] font-sans text-[13px]";

const HEADING =
  "mx-0 mt-0 mb-[9px] p-0 font-mono text-[10px] tracking-[0.14em] uppercase text-[color:var(--fg-faint)]";

/**
 * A pill-shaped toggle. Its on state is the status's own token at 15% over a
 * full-strength edge of the same token, so the chip and the tile's pill agree
 * without a second colour table. The token rides in on a custom property: an
 * inline colour on a button outranks any utility beside it.
 */
function Chip({
  label,
  on,
  token,
  onToggle,
  role = "checkbox",
  chipRef,
  tabIndex,
  onKeyDown,
}: {
  label: string;
  on: boolean;
  /** Absent for a Sort or Last-played chip: only a status owns a colour. */
  token?: string;
  onToggle: () => void;
  role?: "checkbox" | "radio";
  /** The three below are the radiogroup's roving tab stop; a checkbox uses none. */
  chipRef?: (node: HTMLButtonElement | null) => void;
  tabIndex?: number;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}) {
  return (
    <button
      ref={chipRef}
      type="button"
      role={role}
      aria-checked={on}
      tabIndex={tabIndex}
      onKeyDown={onKeyDown}
      onClick={onToggle}
      style={token ? ({ "--chip": `var(${token})` } as React.CSSProperties) : undefined}
      className={`${CHIP} ${
        on
          ? token
            ? "border-[color:var(--chip)] bg-[color-mix(in_srgb,var(--chip)_15%,transparent)] text-[color:var(--fg)]"
            : "border-[color:var(--fg)] text-[color:var(--fg)]"
          : "border-[color:var(--border-strong)] bg-transparent text-[color:var(--fg-body)]"
      }`}
    >
      {label}
    </button>
  );
}

function Group({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <fieldset
      role="group"
      aria-label={heading}
      className="m-0 border-none p-0"
    >
      <legend className={HEADING}>{heading}</legend>
      {children}
    </fieldset>
  );
}

/**
 * Absent rather than hidden: a CSS-hidden sheet keeps its controls in the tab
 * order and its search field focusable behind the page. The body is a separate
 * component so `useDialogA11y` mounts and unmounts with the dialog itself,
 * which is what makes its focus-return and its counted scroll lock correct.
 */
export function DeckFilterSheet({ open, ...rest }: DeckFilterSheetProps) {
  return open ? <SheetBody {...rest} /> : null;
}

function SheetBody({
  filters,
  onChange,
  shown,
  total,
  onDismiss,
  autoFocusSearch,
}: Omit<DeckFilterSheetProps, "open">) {
  const dialog = useRef<HTMLDivElement>(null);
  // Focus trap, Escape and focus-return, shared with every other dialog here.
  // Escape never restores the filters the reader arrived with: filtering
  // already happened as they ticked, so there is nothing to undo and swiping
  // the sheet away must lose nothing either.
  //
  // The dialog itself takes initial focus unless the reader came in through the
  // search affordance. The hook would otherwise land on the first focusable,
  // which is the search input — and raising the phone keyboard on a reader who
  // pressed `Filter decks` is not what they asked for.
  useDialogA11y(dialog, onDismiss, { initialFocusRef: autoFocusSearch ? undefined : dialog });


  const c = refreshCopy.filters;

  return (
    // z-50, not z-40: the phone tab bar is z-40 and paints later, so at z-40 it
    // sits over the sheet's own footer and Clear cannot be clicked at all.
    // Visible wherever the chassis is compact. This was `sm:hidden`, which is
    // 640px: between 640 and 999 the compact triggers opened this dialog and
    // CSS hid it, leaving the filters unreachable across that whole band.
    // `max-[999px]:flex` rather than a `sm:` utility, because the chassis owns
    // the breakpoint and Tailwind has no stop at 1000.
    <div className="fixed inset-0 z-50 hidden flex-col justify-end max-[999px]:flex">
      <div
        aria-hidden="true"
        onClick={onDismiss}
        className="absolute inset-0 bg-[rgba(16,13,10,0.74)]"
      />
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={c.sheetTitle}
        // Focusable only as the trap's landing point, never as a tab stop.
        tabIndex={-1}
        className="relative z-10 flex flex-col gap-[14px] rounded-t-[22px] border-x-0 border-b-0 border-t border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-inset)] px-[16px] pt-[12px] pb-[16px]"
      >
        <div
          aria-hidden="true"
          className="h-[4px] w-[38px] self-center rounded-[2px] bg-[color:var(--border-strong)]"
        />

        <div className="flex items-baseline gap-[10px]">
          <h2 className="m-0 font-display text-[18px] font-semibold text-[color:var(--fg)]">
            {c.sheetTitle}
          </h2>
          <span className="ml-auto font-mono text-[11px] text-[color:var(--fg-faint)]">
            {c.sheetMatch(shown, total)}
          </span>
        </div>

        <SearchField
          value={filters.search}
          onChange={(search) => onChange({ ...filters, search })}
          size="sheet"
          autoFocus={autoFocusSearch}
        />


        <Group heading={c.statusHeading}>
          <div className="flex flex-wrap gap-[8px]">
            {STATUS_ORDER.map((status) => (
              <Chip
                key={status}
                label={refreshCopy.status[STATUS_COPY_KEY[status]]}
                on={filters.statuses.includes(status)}
                token={STATUS_TOKEN[status]}
                onToggle={() =>
                  onChange({
                    ...filters,
                    statuses: toggleIn(STATUS_ORDER, filters.statuses, status),
                  })
                }
              />
            ))}
          </div>
        </Group>

        <Group heading={c.colourHeading}>
          <div className="flex gap-[8px]">
            {COLOUR_ORDER.map((code) => (
              <ColourSwatch
                key={code}
                code={code}
                size="sheet"
                on={filters.colours.includes(code)}
                onToggle={() =>
                  onChange({ ...filters, colours: toggleIn(COLOUR_ORDER, filters.colours, code) })
                }
              />
            ))}
          </div>
        </Group>

        <Group heading={c.lastPlayedHeading}>
          <div className="flex flex-wrap gap-[8px]">
            {(["thisMonth", "never"] as const).map((window: PlayedWindow) => (
              <Chip
                key={window}
                label={PLAYED_LABEL[window]}
                on={filters.played === window}
                onToggle={() =>
                  onChange({ ...filters, played: filters.played === window ? null : window })
                }
              />
            ))}
          </div>
        </Group>

        <div className="flex items-center gap-[10px]">
          <button
            type="button"
            // Dismiss only. It applies nothing, because nothing is pending.
            onClick={onDismiss}
            className="flex h-[44px] flex-auto cursor-pointer items-center justify-center rounded-[10px] border-none bg-[color:var(--fg)] text-[14px] font-semibold text-[color:var(--bg)]"
          >
            {c.sheetDismiss(shown)}
          </button>
          <button
            type="button"
            // Never the sort, matching the column: a reader who chose an order
            // did not ask for it back.
            onClick={() => onChange(EMPTY_FILTERS)}
            className="flex h-[44px] cursor-pointer items-center border-none bg-transparent px-[14px] text-[14px] text-[color:var(--fg-muted)]"
          >
            {c.clear}
          </button>
        </div>
      </div>
    </div>
  );
}
