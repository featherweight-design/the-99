// The card mark's hover tooltip.
//
// AN ENHANCEMENT, NEVER THE GLOSS. It does not exist on a phone, so the key still carries
// the vocabulary and the modal still spells all three out. If this were the only
// explanation, this would be the retired deck-status design with a desktop-only escape
// hatch — a signal the owner cannot read is not a signal.
//
// POINTER-FINE ONLY, and that is a capability query rather than a width one: a touch
// device at 1400px has no hover, and a hover that needs a tap is a control the reader did
// not ask for. No tap target, no focus ring, no native `title` — the accessible name on
// the mark already says the fact, and a `title` would make a screen reader say it twice.
//
// ONE BOX PER MARK. A card carrying two facts shows two tooltips, one at a time, never a
// merged sentence — the facts are independent, and a merged line would imply they add up
// to something. They do not add up to anything until the deck-level verdict says so.

"use client";

import { useEffect, useRef, useState } from "react";

import { type CardFact, cardMarkCopy } from "../../lib/copy/card-mark";

/** The handoff's figure: long enough not to fire on a pointer crossing the row. */
export const OPEN_DELAY_MS = 400;

export function FactTooltip({ fact, children }: { fact: CardFact; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [fine, setFine] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Read once on mount rather than at module scope: `matchMedia` is a browser API and
    // this file is imported by a server-rendered tree.
    setFine(window.matchMedia?.("(pointer: fine)").matches ?? false);
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  if (!fine) return <>{children}</>;

  const cancel = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };

  return (
    <span
      className="relative inline-flex"
      onPointerEnter={() => { cancel(); timer.current = setTimeout(() => setOpen(true), OPEN_DELAY_MS); }}
      onPointerLeave={() => { cancel(); setOpen(false); }}
    >
      {children}
      {open && (
        <span
          // aria-hidden: the mark it wraps already carries the fact as its accessible
          // name, and this sentence is the same fact in more words.
          aria-hidden
          className="pointer-events-none absolute left-1/2 bottom-[calc(100%+6px)] z-50 w-max max-w-[220px] -translate-x-1/2 rounded-[7px] px-[9px] py-[6px] text-[11.5px] leading-[1.45]"
          style={{
            background: "var(--elevated)",
            border: "1px solid var(--border)",
            color: "var(--fg-body)",
            boxShadow: "0 4px 14px color-mix(in srgb, var(--bg) 70%, transparent)",
          }}
        >
          {cardMarkCopy.tooltip[fact]}
        </span>
      )}
    </span>
  );
}
