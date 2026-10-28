"use client";

// The cart's phone Sort sheet (handoff Controls B2): the ⇅ button opens the view's orders as a sheet with 48px rows.
// Below the chassis's 1000px the sort is this; from there up it is the `OrderMenu` the other chassis routes draw. A
// pick applies and closes, since there is nothing to undo and nothing else in the sheet to set.

import { useRef, useState } from "react";
import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";
import type { CartView } from "../../../lib/decks/cart-sort";
import { useDialogA11y } from "../../../lib/a11y/dialog";
import { Sheet, SheetHeader } from "../../ui/sheet";

export type CartSortSheetProps = {
  open: boolean;
  view: CartView;
  value: string;
  order: readonly string[];
  labels: Readonly<Record<string, string>>;
  onPick: (next: string) => void;
  onDismiss: () => void;
};

/** Absent rather than hidden, so its focus trap and scroll lock exist only while it is open. */
export function CartSortSheet({ open, ...rest }: CartSortSheetProps) {
  return open ? <SheetBody open={open} {...rest} /> : null;
}

function SheetBody({ open, view, value, order, labels, onPick, onDismiss }: CartSortSheetProps) {
  const dialog = useRef<HTMLDivElement>(null);
  const selected = useRef<HTMLButtonElement | null>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  // The roving Tab stop: the option holding focus, so Shift+Tab from it leaves the group rather than returning to it.
  const [stop, setStop] = useState(() => Math.max(0, order.indexOf(value)));
  // Landing on the order already in force, so a keyboard or screen reader starts from where the list is.
  useDialogA11y(dialog, onDismiss, { initialFocusRef: selected });
  return (
    <Sheet
      open={open}
      onDismiss={onDismiss}
      ariaLabel={copy.sort.sheetAria}
      panelRef={dialog}
      portal
      // Compact is everything under the chassis's 1000px, which `min-[1000px]:hidden` states without a 999px edge a
      // fractional width could fall through.
      frameClassName="fixed inset-0 z-50 flex flex-col justify-end min-[1000px]:hidden bottom-auto top-[var(--vv-top,0px)] h-[var(--vv-h,100%)]"
      scrimClassName="absolute inset-0 bg-[rgba(16,13,10,0.74)]"
      panelClassName="relative z-10 flex max-h-[86dvh] flex-col rounded-t-[16px] border-x-0 border-b-0 border-t border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-rail)]"
    >
      <SheetHeader title={copy.sort.label} closeLabel={copy.sort.close} onDismiss={onDismiss} />
      <p className="m-0 px-[16px] pb-[8px] font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)]">
        {copy.sort.viewOf[view]}
      </p>
      <div role="menu" aria-label={copy.sort.sheetAria} className="flex flex-col pb-[16px]">
        {order.map((option, i) => {
          const on = option === value;
          return (
            <button
              key={option}
              type="button"
              role="menuitemradio"
              aria-checked={on}
              // Roving focus: one Tab stop, the arrows move between the orders, as a radiogroup promises.
              tabIndex={stop === i ? 0 : -1}
              onFocus={() => setStop(i)}
              ref={(el) => { items.current[i] = el; if (on) selected.current = el; }}
              onKeyDown={(e) => {
                const to = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
                if (!to) return;
                e.preventDefault();
                items.current[(i + to + order.length) % order.length]?.focus();
              }}
              onClick={() => onPick(option)}
              className={`flex h-[48px] w-full cursor-pointer items-center justify-between border-0 border-t border-solid border-t-[color:var(--elevated)] px-[16px] text-left font-sans text-[14px] text-[color:var(--fg)] ${
                on ? "bg-[color:var(--elevated)]" : "bg-transparent"
              }`}
            >
              {labels[option]}
              {on ? <span aria-hidden className="text-[color:var(--accent-text)]">✓</span> : null}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
