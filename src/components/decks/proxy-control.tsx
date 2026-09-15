"use client";

// ProxyControl — the tick in the card sheet that marks this deck's copy printed.
//
// DECK-SCOPED, and absent without a deck. Opened from `/collection`, a set cell
// or commander detail there is no deck to proxy into, so the block does not
// render at all. That is not the `grey in place, never absent` rule being
// broken: that rule protects a control's STATE, and here there is no state,
// because there is no deck the control could be about.
//
// A SQUARE tick, not a round one. `filter-panel` ships the ruling — round for
// single-select, square for many — and `card_assignments` spent a round
// confirming it, because one copy cannot be in two decks and the square promised
// otherwise. A proxy claims nothing, so here the promise is TRUE: every deck can
// print the same card at once, independently. Same rule, opposite answer.

import { useState, useTransition } from "react";
import { setCardProxied } from "../../app/decks/actions";
import { proxyCopy } from "../../lib/copy/proxies";
import { MutationError } from "./mutation-error";

export function ProxyControl({
  deckId,
  deckName,
  oracleId,
  cardName,
  proxied,
}: {
  deckId: string;
  deckName: string;
  oracleId: string;
  cardName: string;
  proxied: boolean;
}) {
  // Optimistic, and the tick IS the receipt — no spinner, no confirm, no undo
  // strip. Ruling 2 lands the toggle at once, and unmarking is one tap back.
  const [on, setOn] = useState(proxied);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  const toggle = () => {
    const next = !on;
    setOn(next);
    setError(null);
    start(async () => {
      const result = await setCardProxied(deckId, oracleId, next).catch(() => ({
        ok: false as const,
        message: proxyCopy.error.refused,
      }));
      if (!result.ok) {
        // The server refuses when the card left the deck between render and tap.
        // The tick reverts rather than staying in a state the deck does not hold.
        setOn(!next);
        setError(result.message);
      }
    });
  };

  return (
    <div
      className="rounded-[10px] mt-[16px] md:mt-[22px] p-[14px_16px] md:p-[18px_20px]"
      style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
    >
      <div
        className="font-mono text-[10px] tracking-[0.1em] uppercase"
        style={{ color: "var(--fg-faint)" }}
      >
        {proxyCopy.control.heading}
      </div>
      <button
        type="button"
        onClick={toggle}
        role="switch"
        aria-checked={on}
        className="mt-[8px] flex w-full items-center gap-[12px] md:gap-[11px] min-h-[44px] bg-transparent border-0 p-0 text-left cursor-pointer"
      >
        <span
          aria-hidden="true"
          className="flex h-[18px] w-[18px] md:h-[16px] md:w-[16px] flex-none items-center justify-center rounded-[2px]"
          style={{
            // `--fg-body`, never `--accent`: accent means *in use / to buy* on
            // every surface this sheet opens from.
            background: on ? "var(--fg-body)" : "transparent",
            boxShadow: on ? "none" : "inset 0 0 0 1px var(--fg-faint)",
            color: "var(--bg)",
          }}
        >
          {on ? "✓" : ""}
        </span>
        <span className="text-[13px]" style={{ color: "var(--fg-body)" }}>
          {proxyCopy.control.label(deckName)}
        </span>
      </button>
      {/* The marked state names what did NOT happen in the same breath as what
          did. "You're covered" alone is true and incomplete, and the incomplete
          half is the one a reader turns into a purchase they did not make. */}
      {on && (
        <p className="m-0 mt-[8px] text-[13px]" style={{ color: "var(--fg-body)" }}>
          {proxyCopy.control.marked(deckName)}
        </p>
      )}
      <p
        className="m-0 mt-[8px] font-mono text-[11px]"
        style={{ color: "var(--fg-faint)" }}
      >
        {proxyCopy.control.note}
      </p>
      {error && <MutationError message={error} />}
      <span className="sr-only" aria-live="polite">
        {on ? proxyCopy.control.announceMarked(cardName, deckName) : ""}
      </span>
    </div>
  );
}
