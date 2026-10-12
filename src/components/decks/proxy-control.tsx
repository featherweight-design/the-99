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

import { useState } from "react";
import { setCardProxied } from "../../app/decks/actions";
import { proxyCopy } from "../../lib/copy/proxies";
import { MutationError } from "./mutation-error";

export function ProxyControl({
  deckId,
  deckName,
  oracleId,
  cardName,
  proxied,
  known = true,
  onSaved,
  footer,
}: {
  deckId: string;
  deckName: string;
  oracleId: string;
  cardName: string;
  proxied: boolean;
  /**
   * Whether the proxy state was actually READ. False when the query failed —
   * where `proxied` is not a fact but an absence of one, and pressing a toggle
   * drawn from it sends the mark a proxied card already has, leaving the reader
   * no way to unmark. Greyed in place rather than absent: the control belongs
   * here, it just cannot answer yet.
   */
  known?: boolean;
  /**
   * Fired after a write lands. The receipt above this control reads the
   * provider's CACHED card, so without an invalidation it keeps listing the
   * decks as they were before the tap — and paging away and back re-serves the
   * stale copy.
   *
   * A prop rather than the provider's hook, so this stays a leaf with explicit
   * inputs: reaching for context made it unrenderable outside a provider, which
   * is a cost paid by every test and every future caller.
   */
  onSaved?: () => void;
  /** One more line at the foot of the box (the tokens line). Nothing when absent. */
  footer?: React.ReactNode;
}) {
  // Optimistic, and the tick IS the receipt — no spinner, no confirm, no undo
  // strip. Ruling 2 lands the toggle at once, and unmarking is one tap back.
  const [on, setOn] = useState(proxied);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [pending, setPending] = useState(false);
  // The modal keys on oracle id alone, so this control stays mounted when the
  // card is refreshed — and after `onSaved` evicts the cache, the refreshed card
  // is exactly what arrives. Reconcile the server's value whenever nothing is in
  // flight, or the tick can end up showing the opposite of the receipt beside it
  // and submitting the wrong transition. During a write the optimistic value
  // wins, which is the whole point of it.
  // Keyed on the prop CHANGING, not on it differing. Differing is the normal
  // state straight after a write — the parent has not re-read yet — and
  // adopting it there reverted the tick the moment the write succeeded.
  const [lastProxied, setLastProxied] = useState(proxied);
  if (proxied !== lastProxied) {
    setLastProxied(proxied);
    // A write in flight keeps the optimistic value: a refreshed prop must not
    // yank the tick back under the reader's finger.
    if (!pending) setOn(proxied);
  }

  const toggle = () => {
    // SERIALISED, because two quick taps are two writes whose ORDER the network
    // does not promise: the server could finish `true` last while the reader's
    // last press was `false`, and a refusal rollback could overwrite a newer
    // tap. One in flight at a time makes the final state the final press.
    if (pending || !known) return;
    const next = !on;
    setOn(next);
    setError(null);
    setPending(true);
    void (async () => {
      const result = await setCardProxied(deckId, oracleId, next).catch(() => ({
        ok: false as const,
        message: proxyCopy.error.refused,
      }));
      setPending(false);
      if (!result.ok) {
        // The server refuses when the card left the deck between render and tap.
        // The tick reverts rather than staying in a state the deck does not hold.
        setOn(!next);
        setError(result.message);
        return;
      }
      // Announced ON THE TRANSITION, never from the state. Read off `on`, the
      // live region announced a change every time an already-proxied card was
      // opened, and said nothing at all on an unmark.
      setAnnouncement(
        next
          ? proxyCopy.control.announceMarked(cardName, deckName)
          : proxyCopy.control.announceUnmarked(cardName, deckName),
      );
      onSaved?.();
    })();
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
        aria-checked={known ? on : false}
        aria-disabled={!known}
        aria-busy={pending}
        className={`mt-[8px] flex w-full items-center gap-[12px] md:gap-[11px] min-h-[44px] bg-transparent border-0 p-0 text-left ${known ? "cursor-pointer" : "cursor-default opacity-60"}`}
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
      {!known && (
        <p className="m-0 mt-[8px] text-[13px]" style={{ color: "var(--fg-muted)" }}>
          {proxyCopy.control.unknown}
        </p>
      )}
      {known && on && (
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
      {footer}
      {error && <MutationError message={error} />}
      <span className="sr-only" aria-live="polite">{announcement}</span>
    </div>
  );
}
