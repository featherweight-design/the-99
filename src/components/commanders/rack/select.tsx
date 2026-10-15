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
import { Chevron } from "../../ui/chevron";

export type RackOption<K extends string> = {
  key: K;
  label: string;
  /** A second line under the label. The rack menu draws it whenever the option
      carries one; the sheet draws it only where the caller asks. */
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
  pinnedOpen = false,
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
  /**
   * Hold the list open and refuse every dismissal. For a caller that cannot
   * open it and must not lose it — `/about`'s specimens, which are inert.
   */
  pinnedOpen?: boolean;
}) {
  // `pinnedOpen` holds the list open and makes it UNDISMISSABLE. No route
  // passes it — a reader opens and closes the control — and `/about` does:
  // a specimen is inert, so a figure of the closed state draws a trigger and
  // none of the options, which on the discover lane are the entry's subject.
  //
  // Starting it merely open was not enough, and the difference was a real
  // defect: this dismisses on a `pointerdown` ANYWHERE in the document, so the
  // figure collapsed the first time a reader clicked on the About page and
  // left the space it had reserved empty. Pinned, the listeners are never
  // installed.
  const [open, setOpen] = useState(pinnedOpen);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const [active, setActive] = useState(0);
  // Generated: a lane may mount more than one of these, and a literal id would
  // put two of them in the document.
  const menuId = useId();

  useEffect(() => {
    if (!open || pinnedOpen) return;
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
  }, [open, pinnedOpen]);

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
                "flex cursor-pointer border border-solid",
                // Two shapes, and the gloss is what picks between them: a row of
                // capsules where the label is the whole option, a stack of
                // cards where each option carries a second line. A capsule
                // cannot hold two lines and a card in a row cannot be read.
                showGlosses
                  ? "w-full items-start gap-[11px] rounded-[10px] px-[12px] py-[9px] text-left"
                  : "flex-1 items-center justify-center rounded-full px-[16px]",
                selected
                  ? "border-[color:var(--accent)] bg-[color-mix(in_oklab,var(--accent)_16%,transparent)] text-[color:var(--fg)]"
                  : "border-[color:var(--border-strong)] bg-transparent text-[color:var(--fg-body)]",
              ].join(" ")}
              style={showGlosses ? { minHeight: 48 } : { height: rowHeight }}
            >
              {/* Selection diamond, filled brass when picked — on the stacked
                  treatment only. A capsule says the same thing with its border,
                  and a marker inside it would say it twice. */}
              {showGlosses && (
                <span
                  aria-hidden
                  className={[
                    "mt-[5px] block h-[8px] w-[8px] rotate-45 shrink-0",
                    selected
                      ? "bg-[color:var(--accent)]"
                      : "border border-solid border-[color:var(--border-strong)]",
                  ].join(" ")}
                />
              )}
              <span className={showGlosses ? "min-w-0 flex-1" : ""}>
                {/* The mark rides the selected pill, which is already the one
                    the reader pressed — selection goes optimistic on press. */}
                <span
                  className={
                    showGlosses ? "block text-[14px] font-semibold" : "block text-[13.5px]"
                  }
                >
                  <PendingLabel pending={pending && selected}>{o.label}</PendingLabel>
                </span>
                {showGlosses && o.gloss && (
                  <span className="block font-mono text-[10.5px] leading-[1.5] mt-[3px] text-[color:var(--fg-muted)]">
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
        onClick={() => setOpen((v) => (pinnedOpen ? v : !v))}
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
              {pending ? <PendingMark /> : <Chevron open={open} />}
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
            "absolute right-0 z-10 mt-[6px] w-[280px] rounded-[10px] p-[6px]",
            "bg-[color:var(--surface-rail)] border border-solid border-[color:var(--border-strong)]",
            "shadow-[0_16px_40px_rgba(0,0,0,0.5)]",
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
                  // A pinned menu does not close on a pick either, and the
                  // focus hand-back goes with it: nothing unmounts, so there
                  // is nowhere the reader needs putting back to.
                  if (!pinnedOpen) {
                    setOpen(false);
                    // The row this click landed on unmounts with the menu, so
                    // without this the keyboard reader is left on the body.
                    trigger.current?.focus();
                  }
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
                <span className="min-w-0">
                  <span className="block text-[13.5px] text-[color:var(--fg)]">{o.label}</span>
                  {/* Three orders that all sound plausible need one line each
                      saying what they actually sort on. An option without a
                      gloss draws a single-line row, as it did before. */}
                  {o.gloss && (
                    <span className="block font-mono text-[10px] leading-[1.5] mt-[2px] text-[color:var(--fg-faint)]">
                      {o.gloss}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
