"use client";
// The Other decks group of the copy chooser (Move a copy, #2980, call 3): committed decks that do not list the card and
// whose colors allow it, picked like the decks above. Closed by default; closed with a pick, its header names the pick in
// accent so the choice is never hidden. Open, its rows are the chooser's own option rows (mark, name, `N cards`, `adds it`).
//
// ONE CHOICE ACROSS BOTH GROUPS lives in the caller (`pickedId`): this component draws it and reports presses, and a
// pick elsewhere simply arrives as `pickedId === null`. A pick stays picked while the Find a deck field filters it out.

import { useId, useMemo, useRef, useState } from "react";
import { moveCopyCopy } from "../../lib/copy/move-copy";
import type { OtherDeck } from "../../lib/decks/other-decks-read";
import { SearchField } from "../ui/text-field";
import { AllocationMark } from "./contested-card-row";

const c = moveCopyCopy.other;

/** Past this many decks the list gets its Find a deck field. */
const FIND_FROM = 6;
/** A deck at 99 cards or more is offered, and says what the add makes it. */
const LONG_FROM = 99;

export function OtherDecksDisclosure({
  cardName, copies, decks, pickedId, disabled, refusal, announce, onPick,
}: {
  cardName: string;
  /** The copies the collection holds: the mark is square above one, as the chooser's marks are. */
  copies: number;
  decks: OtherDeck[];
  pickedId: string | null;
  /** A write is out: a tap does nothing until it settles. */
  disabled: boolean;
  /** The sentence for the last refused pick, when there is one. */
  refusal: string | null;
  announce: string;
  onPick: (deck: OtherDeck) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const bodyId = useId();
  const list = useRef<HTMLUListElement>(null);
  const picked = decks.find((d) => d.id === pickedId) ?? null;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q === "" ? decks : decks.filter((d) => d.name.toLowerCase().includes(q));
  }, [decks, query]);
  if (decks.length === 0) return null;

  const step = (e: React.KeyboardEvent<HTMLElement>, id: string) => {
    const k = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (k === 0) return;
    e.preventDefault();
    const at = shown.findIndex((d) => d.id === id);
    const next = shown[(at + k + shown.length) % shown.length];
    if (next) list.current?.querySelector<HTMLElement>(`[data-deck="${CSS.escape(next.id)}"]`)?.focus();
  };

  return (
    <div
      className="mt-[12px] p-[12px_13px]"
      style={{ border: "1px solid var(--border)", borderRadius: 11, background: "var(--surface)" }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-[10px] border-0 bg-transparent p-0 text-left md:min-h-[32px]"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.13em]" style={{ color: "var(--fg-body)" }}>
          {c.heading(decks.length)}
        </span>
        <span className="flex min-w-0 items-center gap-[8px]">
          {!open && picked ? (
            <span className="min-w-0 truncate text-[13px]" style={{ color: "var(--accent-text)" }}>{picked.name}</span>
          ) : null}
          <span aria-hidden className="flex-none text-[10px]" style={{ color: "var(--fg-muted)" }}>{open ? "▼" : "▶"}</span>
        </span>
      </button>
      {open ? (
        <div id={bodyId} className="mt-[8px]">
          {decks.length > FIND_FROM ? (
            <SearchField
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClear={() => setQuery("")}
              placeholder={c.find}
              aria-label={c.find}
              maxLength={100}
              containerClassName="mb-[8px] h-[44px] rounded-[10px] bg-transparent md:h-[40px]"
              className="text-[16px] [@media(pointer:fine)]:text-[14.5px]"
            />
          ) : null}
          <ul
            ref={list}
            role="radiogroup"
            aria-label={c.group(cardName)}
            className="m-0 flex list-none flex-col gap-[4px] p-0"
          >
            {shown.map((d, i) => {
              const on = d.id === pickedId;
              const long = d.cards >= LONG_FROM;
              const first = i === 0;
              return (
                <li
                  key={d.id}
                  role="radio"
                  aria-checked={on}
                  aria-disabled={disabled || undefined}
                  data-deck={d.id}
                  tabIndex={on || (pickedId === null || !shown.some((x) => x.id === pickedId)) && first ? 0 : -1}
                  aria-label={on ? c.a11ySelected(d.name) : c.a11yOption(d.name, c.adds)}
                  onClick={disabled ? undefined : () => onPick(d)}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      if (!disabled) onPick(d);
                      return;
                    }
                    step(e, d.id);
                  }}
                  className="flex min-h-[52px] flex-col justify-center gap-[1px] px-[8px] py-[6px] md:min-h-[44px] md:flex-row md:items-center md:gap-[11px]"
                  style={{
                    borderRadius: 7,
                    background: "var(--bg)",
                    border: on ? "1px solid var(--accent)" : "1px solid transparent",
                    cursor: disabled ? "default" : "pointer",
                  }}
                >
                  <span className="flex min-w-0 items-center gap-[11px] md:flex-1">
                    <AllocationMark allocated={0} copies={copies} commander={false} picked={on} />
                    <span className="min-w-0 text-[13px] md:truncate" style={{ color: "var(--fg)" }}>{d.name}</span>
                  </span>
                  <span className="flex items-center gap-[8px] pl-[27px] font-mono text-[10.5px] md:flex-none md:pl-0 md:text-[11px]">
                    <span style={{ color: long ? "var(--avail-over-fg)" : "var(--fg-faint)" }}>
                      {c.cards(d.cards)}{long ? ` · ${c.makes(d.cards + 1)}` : ""}
                    </span>
                    <span style={{ color: on ? "var(--success)" : "var(--fg-muted)" }}>{on ? c.addsGets : c.adds}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          {shown.length === 0 ? (
            <p className="m-0 mt-[8px] text-[12.5px]" style={{ color: "var(--fg-muted)" }}>{c.findNone}</p>
          ) : null}
          <p className="mb-0 mt-[10px] text-[11.5px] leading-[1.5]" style={{ color: "var(--fg-faint)" }}>
            {picked ? c.footPicked(cardName, picked.name) : c.foot(cardName)}
          </p>
        </div>
      ) : null}
      {refusal ? (
        <p
          className="mb-0 mt-[9px] pl-[9px] text-[11.5px]"
          style={{ color: "var(--fg-body)", borderLeft: "3px solid var(--danger)" }}
        >
          {refusal}
        </p>
      ) : null}
      <span aria-live="polite" className="sr-only">{announce}</span>
    </div>
  );
}
