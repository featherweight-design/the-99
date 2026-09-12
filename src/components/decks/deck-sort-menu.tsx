"use client";

// The `Sort · last played` trigger and its menu, at every width.
//
// The phone used to have no sort trigger and reached the order through the
// filter sheet (table §Ambiguities 2). The chassis gives sort its own trailing
// slot past a hairline on both forms (decision 11), so the sheet's sort group
// is retired and this is the one control for the value — which is why the
// trigger has to clear 44px on the compact form rather than staying at the
// desktop's 32.
//
// Not `FilterPanel`, which is the collection bar's control: its trigger is a
// 44px pill with a chevron and its own type scale, and every one of those is a
// property this surface draws differently. The menu below borrows the geometry
// the same surface already draws for the tile's overflow menu, which is the
// only menu the Decks frames specify.

import { useEffect, useId, useRef, useState } from "react";
import { refreshCopy } from "../../lib/copy/refresh";
import { DECK_SORT_LABELS, DECK_SORT_ORDER, type DeckSort } from "../../lib/decks/sort";

export function DeckSortMenu({
  sort,
  onChange,
}: {
  sort: DeckSort;
  onChange: (next: DeckSort) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  // Roving focus, matching `SortMenu` and `AccountMenu`: `role="menu"` promises
  // ↑/↓ navigation with exactly one tabbable option, and a menu that only
  // answered Escape would be making a promise the keyboard does not keep.
  const [active, setActive] = useState(0);
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    // `pointerdown` rather than `mousedown`, matching `SortMenu` and
    // `AccountMenu`: on touch the latter only arrives after the gesture ends.
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Focus is inside the menu by now; dismissing without handing it back
      // would drop the reader at the top of the document.
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Opening lands on the order already in force rather than the first row, so
  // ↓ moves to the one the reader would choose next. `active` follows from the
  // option's own `onFocus`, which fires on this programmatic focus too.
  const selectedIndex = DECK_SORT_ORDER.indexOf(sort);
  useEffect(() => {
    if (!open) return;
    items.current[selectedIndex]?.focus();
  }, [open, selectedIndex]);

  function move(delta: number) {
    const next = (active + delta + DECK_SORT_ORDER.length) % DECK_SORT_ORDER.length;
    setActive(next);
    items.current[next]?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const to =
      e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : e.key === "Home" ? "first" : e.key === "End" ? "last" : null;
    if (to === null) return;
    e.preventDefault();
    if (to === "first") return move(-active);
    if (to === "last") return move(DECK_SORT_ORDER.length - 1 - active);
    move(to);
  }

  // Visible at every width: the chassis gives sort its own trailing slot past a
  // hairline on both forms (decision 11), so the phone no longer reaches it
  // through the filter sheet.
  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        // 44px on the compact form, 32 on the desktop one: this is now the
        // only route to the sort at either width, so the phone target cannot
        // sit under the floor the way a desktop-only control could.
        className="flex h-[44px] cursor-pointer items-center rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[14px] py-0 font-sans text-[12.5px] font-medium text-[color:var(--fg-body)] sm:h-[32px]"
      >
        {refreshCopy.decks.sort(DECK_SORT_LABELS[sort])}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={refreshCopy.filters.sortHeading}
          className="absolute right-0 top-full z-20 mt-[6px] w-[186px] overflow-hidden rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] shadow-[0_22px_50px_rgba(0,0,0,0.6)]"
        >
          {DECK_SORT_ORDER.map((option, i) => (
            <button
              key={option}
              ref={(el) => {
                items.current[i] = el;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={sort === option}
              tabIndex={active === i ? 0 : -1}
              onFocus={() => setActive(i)}
              onKeyDown={onKeyDown}
              onClick={() => {
                onChange(option);
                setOpen(false);
                trigger.current?.focus();
              }}
              className={`flex h-[38px] w-full cursor-pointer items-center border-x-0 border-b-0 border-solid px-[13px] text-left font-sans text-[13px] ${
                i === 0 ? "border-t-0" : "border-t border-t-[color:var(--elevated)]"
              } ${
                sort === option
                  ? "bg-[color:var(--elevated)] text-[color:var(--fg)]"
                  : "bg-transparent text-[color:var(--fg)]"
              }`}
            >
              {DECK_SORT_LABELS[option]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
