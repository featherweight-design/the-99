"use client";
// Sort menu (§7.2) — the discovery scope's `Order` slot. A menu rather than the
// segmented control the availability toggle uses, because one option can be
// unavailable WITH A REASON (ruling 8), and a segment has nowhere to put one.
//
// Each option names its own sort key on a sub-line. Ruling 3 forbids a blend, so
// the two keys are genuinely different questions and the menu says which.

import { useEffect, useId, useRef, useState } from "react";
import { discoveryCopy } from "../../lib/copy/commander-discovery";
import { PENDING_OPACITY } from "./pending";

const { sort: copy } = discoveryCopy;

export type SortKey = "fit" | "new";

export function SortMenu({
  sort: committed,
  pending = null,
  hasDecks,
  onChange,
}: {
  sort: SortKey;
  /** The key a re-rank is heading for, or null. See `Nav` in list-nav.ts. */
  pending?: SortKey | null;
  hasDecks: boolean;
  onChange: (next: SortKey) => void;
}) {
  // Only two orderings exist on the server, so a flip is a fetch. The trigger
  // and the diamond name the key the reader chose from the moment they choose
  // it; the subtitle and the rows still name the ordering that is on screen.
  const sort = pending ?? committed;
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  // Roving focus, matching `AccountMenu`: exactly one option is tabbable and
  // ↑/↓ move between them with wrap. A disabled option is still reachable —
  // `aria-disabled` rather than `disabled` precisely so the reason it carries
  // can be read.
  const [active, setActive] = useState(0);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const trigger = useRef<HTMLButtonElement>(null);
  // Generated rather than a literal: the bar renders its desktop and mobile
  // subtrees at once, so this component mounts twice and a fixed id would put
  // two of them in the document.
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    // `pointerdown`, not `mousedown`: on a touch device the latter arrives only
    // as a synthesised event after the gesture completes, so a tap outside the
    // menu would dismiss it a beat late. `AccountMenu` already listens this way.
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

  // Opening lands on the active sort rather than the first row, so ↓ from the
  // trigger moves to the option the reader would actually be choosing next.
  // `active` follows from the option's own `onFocus`, which fires on this
  // programmatic focus too — the effect never sets it directly.
  const selectedIndex = sort === "new" ? 1 : 0;
  useEffect(() => {
    if (!open) return;
    items.current[selectedIndex]?.focus();
  }, [open, selectedIndex]);

  function move(delta: number) {
    const next = (active + delta + options.length) % options.length;
    setActive(next);
    items.current[next]?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    }
  }

  const currentLabel = sort === "new" ? copy.new : copy.fit;

  const options = [
    { key: "fit" as const, label: copy.fit, sub: copy.fitKey, aria: copy.fitAria, off: false },
    {
      key: "new" as const,
      label: copy.new,
      // Ruling 8: the reason replaces the sort key, because a key you cannot
      // choose is not the thing the row needs to explain.
      sub: hasDecks ? copy.newKey : copy.newDisabled,
      aria: hasDecks ? copy.newAria : copy.newDisabledAria,
      off: !hasDecks,
    },
  ];

  return (
    <div ref={root} className="relative flex items-center gap-[8px]">
      {/* Desktop only: on the phone the trigger shares its row with the window
          count and there is no room for a caption. The button's `aria-label`
          names the control at both widths, so this span stays out of the tree. */}
      <span
        aria-hidden
        className="hidden sm:inline font-mono text-[10px] tracking-[0.12em] uppercase text-[color:var(--fg-faint)]"
      >
        {copy.label}
      </span>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        // Only while open, matching `AccountMenu`: the menu is unmounted when
        // closed, and pointing at an absent id is a broken relationship rather
        // than an empty one.
        aria-controls={open ? menuId : undefined}
        aria-label={copy.triggerAria(currentLabel)}
        // The trigger only. See the note on ScopeControl's radiogroup: the
        // ruling that forbids a dimmed list is about the list.
        aria-busy={pending !== null || undefined}
        style={{ opacity: pending !== null ? PENDING_OPACITY : undefined }}
        onClick={() => setOpen((v) => !v)}
        className={[
          "font-mono inline-flex items-center cursor-pointer rounded-lg px-[12px]",
          "bg-[color:var(--surface-sunken)] border border-[color:var(--border-strong)]",
          "text-[color:var(--fg)]",
          "gap-[7px] h-[38px] text-[11.5px]",
          "sm:gap-[8px] sm:h-[30px] sm:text-[12px]",
        ].join(" ")}
      >
        {currentLabel}
        <span aria-hidden className="text-[color:var(--accent)]">▾</span>
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={copy.label}
          className={[
            "absolute right-0 z-10 mt-[6px] w-[300px] rounded-[10px] p-[6px]",
            "bg-[color:var(--surface-rail)] border border-[color:var(--border-strong)]",
          ].join(" ")}
        >
          {options.map((o, i) => {
            const selected = o.key === sort;
            return (
              <button
                key={o.key}
                ref={(el) => {
                  items.current[i] = el;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                aria-disabled={o.off || undefined}
                aria-label={o.aria}
                tabIndex={active === i ? 0 : -1}
                onFocus={() => setActive(i)}
                onKeyDown={onKeyDown}
                onClick={() => {
                  // A disabled option neither acts nor closes the menu: the
                  // reason it gives is the thing worth staying open for.
                  if (o.off) return;
                  setOpen(false);
                  // The row this click landed on unmounts with the menu, so
                  // without this the keyboard reader is left on the document
                  // body. Same handback as Escape.
                  trigger.current?.focus();
                  onChange(o.key);
                }}
                className={[
                  "flex w-full items-center gap-[10px] rounded-[7px] border-0 px-[12px] py-[11px] text-left",
                  o.off ? "cursor-not-allowed" : "cursor-pointer",
                  selected ? "bg-[color:var(--elevated-hover)]" : "bg-transparent",
                ].join(" ")}
              >
                {/* Selection diamond — filled on the active key. */}
                <span
                  aria-hidden
                  className={[
                    "block h-[6px] w-[6px] rotate-45 shrink-0",
                    selected
                      ? "bg-[color:var(--accent)]"
                      : "border-[1.5px] border-[color:var(--border-strong)]",
                  ].join(" ")}
                />
                {/* The label and its sub-line share one column, so the reason
                    starts under the label rather than under the diamond. */}
                <span className="min-w-0 flex-1">
                  <span
                    className={[
                      "block text-[13.5px] font-semibold",
                      o.off
                        ? "text-[color:var(--fg-locked)] line-through"
                        : "text-[color:var(--fg)]",
                    ].join(" ")}
                  >
                    {o.label}
                  </span>
                  {/* The reason keeps full contrast even when the label is
                      struck: it is the one part of a disabled row that must stay
                      readable, and at this width it wraps. */}
                  <span className="block font-mono text-[10.5px] leading-[1.5] mt-[2px] text-[color:var(--fg-faint)]">
                    {o.sub}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
