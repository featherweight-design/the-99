"use client";
// The rack's single-select shape, shared by Order and Scope. Both are "one of
// three / one of two, closes on pick, never a checkbox list", and both draw a
// hairline trigger that turns brass off its default — one implementation rather
// than two that drift.
//
// It renders ONE treatment: a menu behind a trigger on the rack, a row of pills
// in the sheet. Never both. A hidden duplicate would carry a second copy of the
// same options in the accessibility tree (call 3).

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { PENDING_OPACITY } from "../pending";
import { PendingLabel, PendingMark } from "../../ui/pending-mark";

export type RackOption<K extends string> = {
  key: K;
  label: string;
  /** Sheet only, and only where the caller asks for it. */
  gloss?: string;
};

export function RackSelect<K extends string>({
  legend,
  triggerLabel,
  triggerLeading,
  triggerIcon,
  brass,
  wide,
  value,
  options,
  onChange,
  triggerHeight = 32,
  rowHeight = 44,
  showGlosses = false,
  pending = false,
}: {
  /** Names the control for AT at both treatments. Never rendered as chrome on
      the rack — the trigger already says what it is. */
  legend: string;
  triggerLabel: string;
  triggerLeading?: ReactNode;
  /** Draws the trigger as a square icon button rather than a labelled one, for
      the phone row where it shares 44px with search and `Filters`. The label is
      not dropped: it becomes the accessible name, so the control still says
      which order is on. */
  triggerIcon?: ReactNode;
  /** True off the default value. The border is the state, so it does not depend
      on reading the label. */
  brass: boolean;
  wide: boolean;
  value: K;
  options: readonly RackOption<K>[];
  onChange: (next: K) => void;
  triggerHeight?: number;
  rowHeight?: number;
  showGlosses?: boolean;
  /** A flip on this control is a server round-trip and the answer is still out.
      The value shown is already the one being navigated to — every caller sets
      it optimistically — so what is left to say is that the press registered
      (#338). Never paired with `disabled`: disabling the focused element blurs
      it and the reader loses their place mid-flip. */
  pending?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const [active, setActive] = useState(0);
  // Generated: a lane may mount more than one of these, and a literal id would
  // put two of them in the document.
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    // `pointerdown`, not `mousedown`: on a touch device the latter arrives only
    // as a synthesised event after the gesture completes, so a tap outside would
    // dismiss a beat late. `SortMenu` already listens this way.
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      // Focus is inside the menu by then, so dismissing without handing it back
      // would drop the reader at the top of the document.
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Opening lands on the current value rather than the first row, so ↓ from the
  // trigger moves to what the reader would actually be choosing next.
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.key === value),
  );
  useEffect(() => {
    if (!open || !wide) return;
    items.current[selectedIndex]?.focus();
  }, [open, wide, selectedIndex]);

  const move = (from: number, dir: 1 | -1) => {
    const next = (from + dir + options.length) % options.length;
    setActive(next);
    items.current[next]?.focus();
    return next;
  };

  // ── Sheet: the options are the control, at a 44/48px target each. ──────────
  if (!wide) {
    return (
      <div
        role="radiogroup"
        aria-label={legend}
        aria-busy={pending || undefined}
        style={{ opacity: pending ? PENDING_OPACITY : undefined }}
        className={showGlosses ? "flex flex-col gap-[6px]" : "flex gap-[6px]"}
      >
        {options.map((o, i) => {
          const selected = o.key === value;
          return (
            <button
              key={o.key}
              ref={(node) => {
                items.current[i] = node;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={o.label}
              // Roving: the checked pill is the group's single tab stop.
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(o.key)}
              onKeyDown={(e) => {
                const dir =
                  e.key === "ArrowRight" || e.key === "ArrowDown"
                    ? 1
                    : e.key === "ArrowLeft" || e.key === "ArrowUp"
                      ? -1
                      : 0;
                if (dir === 0) return;
                e.preventDefault();
                // Selection follows focus, as it does on every other radiogroup
                // in this rack.
                onChange(options[move(i, dir)].key);
              }}
              className={[
                "flex items-center gap-[8px] cursor-pointer rounded-lg border border-solid px-[12px]",
                showGlosses ? "w-full text-left" : "flex-1 justify-center",
                selected
                  ? "border-[color:var(--accent)] bg-[color:var(--elevated-hover)] text-[color:var(--fg)]"
                  : "border-[color:var(--border-strong)] bg-transparent text-[color:var(--fg-body)]",
              ].join(" ")}
              style={{ height: rowHeight }}
            >
              {/* Selection diamond, filled brass when picked. */}
              <span
                aria-hidden
                className={[
                  "block h-[7px] w-[7px] rotate-45 shrink-0",
                  selected
                    ? "bg-[color:var(--accent)]"
                    : "border-[1.5px] border-solid border-[color:var(--border-strong)]",
                ].join(" ")}
              />
              <span className={showGlosses ? "min-w-0 flex-1" : ""}>
                {/* The mark rides the selected pill, which is already the one
                    the reader pressed — selection goes optimistic on press. */}
                <span className="block text-[13.5px]">
                  <PendingLabel pending={pending && selected}>{o.label}</PendingLabel>
                </span>
                {/* The sheet is the only place the glosses render — the rack has
                    no room for a second line. */}
                {showGlosses && o.gloss && (
                  <span className="block font-mono text-[10.5px] leading-[1.5] mt-[2px] text-[color:var(--fg-faint)]">
                    {o.gloss}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  // ── Rack: a hairline trigger and the menu it opens. ────────────────────────
  return (
    <div ref={root} role="group" aria-label={legend} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        // Only while open, matching `SortMenu`: the menu is unmounted when
        // closed, and pointing at an absent id is a broken relationship rather
        // than an empty one.
        aria-controls={open ? menuId : undefined}
        aria-busy={pending || undefined}
        aria-label={triggerIcon ? triggerLabel : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key !== "ArrowDown") return;
          e.preventDefault();
          setOpen(true);
        }}
        className={[
          "font-mono inline-flex items-center gap-[7px] cursor-pointer rounded-lg",
          triggerIcon ? "shrink-0 justify-center px-0" : "px-[12px]",
          "border border-solid bg-[color:var(--surface-sunken)] text-[color:var(--fg)] text-[12px]",
          brass ? "border-[color:var(--accent)]" : "border-[color:var(--border-strong)]",
        ].join(" ")}
        style={{
          height: triggerHeight,
          width: triggerIcon ? triggerHeight : undefined,
          opacity: pending ? PENDING_OPACITY : undefined,
        }}
      >
        {triggerIcon ? (
          // One glyph slot either way, so the row does not resize mid-wait.
          pending ? <PendingMark /> : triggerIcon
        ) : (
          <>
            {triggerLeading}
            {triggerLabel}
            {/* The mark takes the chevron's place rather than sitting beside it,
                so the trigger keeps one glyph slot at both states and the rack
                does not resize mid-wait. The trigger still opens the menu while
                the request is out — a control that stopped responding would be
                the worse answer. */}
            <span
              aria-hidden
              className="inline-flex w-[28px] justify-center text-[color:var(--accent)]"
            >
              {pending ? <PendingMark /> : "▾"}
            </span>
          </>
        )}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={legend}
          className={[
            "absolute right-0 z-10 mt-[6px] w-[260px] rounded-[10px] p-[6px]",
            "bg-[color:var(--surface-rail)] border border-solid border-[color:var(--border-strong)]",
          ].join(" ")}
        >
          {options.map((o, i) => {
            const selected = o.key === value;
            return (
              <button
                key={o.key}
                ref={(node) => {
                  items.current[i] = node;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                aria-label={o.label}
                tabIndex={active === i ? 0 : -1}
                onFocus={() => setActive(i)}
                onKeyDown={(e) => {
                  const dir =
                    e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
                  if (dir === 0) return;
                  e.preventDefault();
                  move(i, dir);
                }}
                onClick={() => {
                  setOpen(false);
                  // The row this click landed on unmounts with the menu, so
                  // without this the keyboard reader is left on the body.
                  trigger.current?.focus();
                  onChange(o.key);
                }}
                className={[
                  "flex w-full items-center gap-[10px] rounded-[7px] border-0 px-[12px] py-[9px] text-left",
                  "cursor-pointer",
                  selected ? "bg-[color:var(--elevated-hover)]" : "bg-transparent",
                ].join(" ")}
              >
                <span
                  aria-hidden
                  className={[
                    "block h-[6px] w-[6px] rotate-45 shrink-0",
                    selected
                      ? "bg-[color:var(--accent)]"
                      : "border-[1.5px] border-solid border-[color:var(--border-strong)]",
                  ].join(" ")}
                />
                <span className="text-[13.5px] text-[color:var(--fg)]">{o.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
