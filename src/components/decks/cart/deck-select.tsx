"use client";

// DeckSelect — the cart's selections (handoff A2–A4, E1). Every deck missing cards starts selected
// (ruling 1); unselecting is a view for this visit only and writes nothing (lock 8). Desktop always
// shows the list; the phone folds it under its head.

import { useId, useState } from "react";
import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";
import { formatCents } from "../../../lib/decks/price";
import type { CartDeck } from "../../../lib/decks/cart";

export function DeckSelect({
  decks,
  selected,
  priced,
  onToggle,
  onAll,
}: {
  decks: CartDeck[];
  selected: ReadonlySet<string>;
  /** False when the price read failed (T2): each figure is copies only. */
  priced: boolean;
  onToggle: (deckId: string) => void;
  /** Select every deck (true) or none (false). */
  onAll: (on: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const on = decks.filter((d) => selected.has(d.id)).length;
  const allOn = on === decks.length;
  // One deck has nothing to select between (E1).
  const bulk = decks.length >= 2 ? (
    <button
      type="button"
      onClick={() => onAll(!allOn)}
      className="min-h-[44px] flex-none text-[13px] text-[color:var(--accent)]"
    >
      {allOn ? copy.selections.unselectAll : copy.selections.selectAll}
    </button>
  ) : null;

  return (
    <section
      className="min-w-0 rounded-[12px] border border-[color:var(--border)] px-[14px] pt-[2px] pb-[4px] [grid-area:selections]"
      style={{ background: "var(--surface)" }}
    >
      <div className="flex min-h-[44px] items-center gap-[10px]">
        {/* Phone: the head is the fold's toggle, label then `Select all` then the chevron (the
            canvas order). The two toggles are separate buttons, never nested with `Select all`;
            the chevron's is a pointer target only, so a keyboard meets one toggle. Desktop never folds. */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-label={copy.selections.toggleAria(open)}
          className="flex min-h-[44px] flex-1 items-center text-left md:hidden"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">
            {copy.selections.headPhone(on, decks.length)}
          </span>
        </button>
        <span className="hidden flex-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)] md:block">
          {copy.selections.head(on, decks.length)}
        </span>
        {bulk ? <span className={open ? "" : "hidden md:inline"}>{bulk}</span> : null}
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={() => setOpen((v) => !v)}
          className="flex h-[44px] w-[28px] flex-none items-center justify-center text-[12px] text-[color:var(--fg-muted)] md:hidden"
        >
          {open ? "▴" : "▾"}
        </button>
      </div>
      <div id={listId} className={open ? "" : "hidden md:block"}>
        <ul className="m-0 list-none p-0">
          {decks.map((d) => {
            const isOn = selected.has(d.id);
            return (
              <li key={d.id}>
                <label className="flex min-h-[44px] cursor-pointer items-start gap-[10px] border-t border-[color:var(--border)] pt-[11px] pb-[10px]">
                  <input
                    type="checkbox"
                    checked={isOn}
                    onChange={() => onToggle(d.id)}
                    aria-label={copy.selections.aria(d.name, isOn)}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden
                    className="mt-[1px] flex h-[18px] w-[18px] flex-none items-center justify-center rounded-[4px] text-[12px] font-bold peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[color:var(--accent)]"
                    style={isOn
                      ? { background: "var(--accent)", color: "var(--bg)" }
                      : { border: "1.5px solid var(--border-strong)" }}
                  >
                    {isOn ? "✓" : null}
                  </span>
                  <span
                    className="min-w-0 flex-1 text-[13px] leading-[1.4] [text-wrap:pretty]"
                    style={{ color: isOn ? "var(--fg)" : "var(--fg-muted)" }}
                  >
                    {d.name}
                  </span>
                  <span
                    className="flex-none font-mono text-[11px] leading-[1.6]"
                    style={{ color: isOn ? "var(--fg-body)" : "var(--fg-locked)" }}
                  >
                    {priced && d.cents > 0
                      ? copy.selections.figure(d.copies, formatCents(d.cents))
                      : copy.selections.figureNoPrice(d.copies)}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        <p className="m-0 border-t border-[color:var(--border)] py-[9px] text-[11.5px] leading-[1.5] text-[color:var(--fg-faint)]">
          {copy.selections.note}
        </p>
      </div>
    </section>
  );
}
