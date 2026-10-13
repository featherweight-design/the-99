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

import { useEffect, useRef, useState } from "react";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { deckStateMarksCopy } from "../../lib/copy/deck-state-marks";
import { deckChassisCopy } from "../../lib/copy/filter-chassis";
import { refreshCopy } from "../../lib/copy/refresh";
import {
  COLOUR_ORDER,
  EMPTY_FILTERS,
  STATE_ORDER,
  STATUS_ORDER,
  type PlayedWindow,
} from "../../lib/decks/filter";
import { STATUS_TOKEN } from "../../lib/decks/status-style";
import {
  PLAYED_LABEL,
  STATE_LABEL,
  STATUS_COPY_KEY,
  DeckSearchField,
  toggleIn,
} from "./deck-filter-column";
import type { DeckFilters } from "../../lib/decks/filter";
import { ColourPips } from "../ui/colour-pips";
import { Sheet } from "../ui/sheet";

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
  // The gate stays HERE as well as inside `Sheet`, and they are not the same
  // gate. `Sheet` decides what is painted; this decides what is MOUNTED — and
  // the body owns a focus trap and a debounced announcement. Mounted while
  // closed, the trap runs against a hidden panel and the announcement effect
  // fires where nothing can read it.
  // `{ open, ... }` destructured, never `props.open` read off a bare `open`:
  // an unbound `open` resolves to `window.open`, which is a function and so
  // always truthy. No ReferenceError, no type error — `open` is a DOM global —
  // and the gate silently never closes.
  return open ? <SheetBody open={open} {...rest} /> : null;
}

function SheetBody({
  open,
  filters,
  onChange,
  shown,
  total,
  onDismiss,
  autoFocusSearch,
}: DeckFilterSheetProps) {
  const dialog = useRef<HTMLDivElement>(null);

  // The sheet is `aria-modal`, so the chassis's result line sits outside it and
  // is not a surface assistive tech can be relied on to read. Without a region
  // in here a filter changed inside the sheet is announced nowhere. Debounced
  // at the same 300ms as every other count in this codebase, so four taps are
  // one number — and the chassis stays silent while this is open, the two
  // handing over on dismissal.
  const [announcement, setAnnouncement] = useState("");
  const announced = useRef<number | null>(null);
  useEffect(() => {
    if (announced.current === null || announced.current === shown) {
      announced.current = shown;
      return;
    }
    announced.current = shown;
    const t = setTimeout(() => setAnnouncement(deckChassisCopy.result(shown, total)), 300);
    return () => clearTimeout(t);
  }, [shown, total]);
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
    <Sheet
      open={open}
      onDismiss={onDismiss}
      ariaLabel={c.sheetTitle}
      panelRef={dialog}
      // z-50, not z-40: the phone tab bar is z-40 and paints later, so at z-40
      // it sits over the sheet's own footer and Clear cannot be clicked at all.
      // Visible wherever the chassis is compact. This was `sm:hidden`, which is
      // 640px: between 640 and 999 the compact triggers opened this dialog and
      // CSS hid it, leaving the filters unreachable across that whole band.
      // `max-[999px]:flex` rather than a `sm:` utility, because the chassis owns
      // the breakpoint and Tailwind has no stop at 1000.
      frameClassName="fixed inset-0 z-50 hidden flex-col justify-end max-[999px]:flex"
      scrimClassName="absolute inset-0 bg-[rgba(16,13,10,0.74)]"
      // This route's handle and its offset, to the pixel. The shell's default is
      // 36px round in a 9px/4px wrapper; this is 38px at 2px radius under 12px
      // of padding, which with the 14px below puts the first heading 30px from
      // the panel top exactly as it did before.
      handleClassName="flex touch-none justify-center pt-[12px] pb-0"
      handleBarClassName="h-[4px] w-[38px] rounded-[2px] bg-[color:var(--border-strong)]"
      // This route's box, kept as it is: the chassis handoff specifies the
      // anchored panel and not the sheet, so the 22px/`--surface-inset` pair
      // here and the 16px/`--surface-rail` pair on `/commanders` are an undrawn
      // detail answered twice. Collapsing them is a design ruling.
      panelClassName="relative z-10 flex max-h-[86vh] flex-col rounded-t-[22px] border-x-0 border-b-0 border-t border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-inset)]"
    >
      <div className="flex flex-col gap-[14px] px-[16px] pt-[14px] pb-[16px]">
        <div className="flex items-baseline gap-[10px]">
          <h2 className="m-0 font-display text-[18px] font-semibold text-[color:var(--fg)]">
            {c.sheetTitle}
          </h2>
          <span className="ml-auto font-mono text-[11px] text-[color:var(--fg-faint)]">
            {c.sheetMatch(shown, total)}
          </span>
        </div>

        <DeckSearchField
          value={filters.search}
          onChange={(search) => onChange({ ...filters, search })}
          size="sheet"
          autoFocus={autoFocusSearch}
        />


        <Group heading={c.colourHeading}>
          {/* The same control the wide form draws. It was `ColourSwatch`, which
              made the phone a different visual AND a different role — checkbox
              against the pips' switch — for one filter. Decision 22 also puts
              the pips first in the sheet. */}
          <ColourPips
            form="sheet"
            value={filters.colours}
            onToggle={(code) =>
              onChange({ ...filters, colours: toggleIn(COLOUR_ORDER, filters.colours, code) })
            }
          />
        </Group>

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


        {/* The same heading the wide form draws, directly after Status and for
            the same reason. Two rows, OR within the heading: they are mutually
            exclusive, so ticking both returns every deck that is not settled. */}
        <Group heading={deckStateMarksCopy.filter.heading}>
          <div className="flex flex-wrap gap-[8px]">
            {STATE_ORDER.map((code) => (
              <Chip
                key={code}
                label={STATE_LABEL[code]}
                on={filters.states.includes(code)}
                onToggle={() =>
                  onChange({
                    ...filters,
                    states: toggleIn(STATE_ORDER, filters.states, code),
                  })
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
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
    </Sheet>
  );
}
