"use client";
// The Role Coverage sort — one control for all four panels.
//
// A menu rather than a segmented control, because each option has to name the
// question it answers on a sub-line, and a segment has nowhere to put one. The
// interaction is `sort-menu.tsx`'s, deliberately: same roving focus, same
// pointerdown dismissal, same focus handback. Only the measurements differ.
//
// Neither option is ever disabled. "Most played" without figures is still the
// order the page ships in, so it keeps its selection and swaps its sub-line.

import { useEffect, useId, useRef, useState } from "react";
import { explainedCopy } from "../../lib/copy/commander-explained";
import type { RoleCard } from "../../lib/recs/score";

import { availabilityState } from "../../lib/decks/availability";
import { Chevron } from "../ui/chevron";

const { coverageSort: copy } = explainedCopy;

export type CoverageSortKey = "played" | "availability";

export const COVERAGE_SORT_LABELS: Record<CoverageSortKey, string> = {
  played: copy.mostPlayed.label,
  availability: copy.availability.label,
};

/**
 * Free first, then by how hard the card is to get: free, wanted by a brew, in
 * use, over-committed.
 *
 * FOUR buckets where this shipped two. The old partition read `committedTo`,
 * which cannot tell a brew's soft want from a committed deck's sleeved claim, so
 * two readings the marker draws differently sorted the same.
 *
 * The order keeps the shipped promise — free first — and ranks the rest by
 * severity, which is the order `availabilityState` itself is written in.
 *
 * Stable within each bucket, so this stays the shipped order partitioned rather
 * than a second ranking: a card does not move relative to its neighbours of the
 * same availability. `Most played` is the incoming order and needs no branch,
 * including where every figure is null and the incoming order is pool order.
 *
 * A card with no availability row sorts as free. Null is NO ROW, not "unowned" —
 * and on a panel built from the owned pool, a card with no claim row has no
 * claim to rank.
 */
const AVAILABILITY_RANK = { free: 0, soft: 1, hard: 2, over: 3 } as const;

function availabilityRank(card: RoleCard): number {
  if (!card.availability) return AVAILABILITY_RANK.free;
  return AVAILABILITY_RANK[availabilityState(card.availability)];
}

export function sortRoleCards(cards: RoleCard[], key: CoverageSortKey): RoleCard[] {
  if (key === "played") return cards;
  // Index carried so the sort is stable on every engine, rather than relying on
  // one: two cards in the same bucket keep the incoming order, which is what
  // makes this a partition of `Most played` and not a re-rank.
  return cards
    .map((card, i) => ({ card, i }))
    .sort((a, b) => availabilityRank(a.card) - availabilityRank(b.card) || a.i - b.i)
    .map(({ card }) => card);
}

export function CoverageSortMenu({
  sort,
  showFigures,
  isDesktop,
  onChange,
}: {
  sort: CoverageSortKey;
  /** Only reaches the sub-line. No option is disabled by its absence. */
  showFigures: boolean;
  isDesktop: boolean;
  onChange: (next: CoverageSortKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const trigger = useRef<HTMLButtonElement>(null);
  // Generated: the page can mount both width variants at once, and a fixed id
  // would put two of them in the document.
  const menuId = useId();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!open) return;
    // `pointerdown`, not `mousedown`: on a touch device the latter arrives only
    // after the gesture completes, so a tap outside would dismiss a beat late.
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
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

  // Opening lands on the chosen option, so ↓ from the trigger moves to the one
  // the reader would be switching to.
  const selectedIndex = sort === "availability" ? 1 : 0;
  useEffect(() => {
    if (!open) return;
    // `active` is not set alongside this. Each option's own `onFocus` owns it, and
    // that fires for a programmatic focus too, so the roving tabindex follows the
    // focus here by the same path it does for an arrow key or a tab from outside.
    items.current[selectedIndex]?.focus();
  }, [open, selectedIndex]);

  const options = [
    {
      key: "played" as const,
      label: copy.mostPlayed.label,
      sub: showFigures ? copy.mostPlayed.sub : copy.mostPlayed.subNoFigures,
    },
    { key: "availability" as const, label: copy.availability.label, sub: copy.availability.sub },
  ];

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

  return (
    <div ref={root} className={isDesktop ? "relative shrink-0" : "relative"}>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        // Only while open: the menu is unmounted when closed, and pointing at an
        // absent id is a broken relationship rather than an empty one.
        aria-controls={open ? menuId : undefined}
        aria-label={copy.triggerAria}
        onClick={() => setOpen((v) => !v)}
        className={[
          "font-mono font-medium inline-flex items-center cursor-pointer gap-[8px]",
          "bg-[color:var(--surface-sunken)] border border-[color:var(--border-strong)]",
          "text-[color:var(--fg)]",
          // The default hairline pill spelled out rather than merged from
          // `HAIRLINE`: `isDesktop` here is a JS boolean, not a media query, and
          // the same boolean places the menu. Converting this component to
          // responsive classes is a change with its own review.
          //
          // 32px is the desktop figure. The phone takes 44px because a sort
          // control is the only route to that order, and nothing that is the
          // sole route to its action may sit under the target floor. R3 §2.
          isDesktop
            ? "h-[32px] rounded-[8px] px-[14px] text-[12.5px]"
            : "h-[44px] w-full rounded-[10px] px-[16px] text-[14px]",
        ].join(" ")}
      >
        <span aria-hidden className="text-[color:var(--fg-faint)]">{copy.triggerPrefix}</span>
        {COVERAGE_SORT_LABELS[sort]}
        {/* Desktop sits the caret against the label; at phone width the trigger
            is full-width, so it goes to the far edge instead. */}
        <Chevron className={isDesktop ? "text-[color:var(--accent)]" : "ml-auto text-[color:var(--accent)]"} />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={copy.triggerAria}
          className={[
            // 340px is the design's width. The cap only bites below a 372px viewport,
            // where the menu would otherwise push the page sideways.
            "absolute right-0 z-10 mt-[6px] w-[340px] max-w-[calc(100vw-32px)] rounded-[10px] p-[6px]",
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
                tabIndex={active === i ? 0 : -1}
                onFocus={() => setActive(i)}
                onKeyDown={onKeyDown}
                onClick={() => {
                  setOpen(false);
                  // The row unmounts with the menu, so without this the keyboard
                  // reader is left on the document body. Same handback as Escape.
                  trigger.current?.focus();
                  onChange(o.key);
                }}
                className={[
                  "flex w-full items-center gap-[10px] rounded-[7px] border-0 px-[12px] py-[11px] text-left cursor-pointer",
                  selected ? "bg-[color:var(--elevated-hover)]" : "bg-transparent",
                ].join(" ")}
              >
                <span
                  aria-hidden
                  className={[
                    "block h-[6px] w-[6px] rotate-45 shrink-0",
                    selected
                      ? "bg-[color:var(--accent)]"
                      : "border-[1.5px] border-[color:var(--border-strong)]",
                  ].join(" ")}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold text-[color:var(--fg)]">
                    {o.label}
                  </span>
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
