// The flip strip (handoff `design_handoff_the99_deck_flip_order`): `‹ All decks` on the left, `k of N` and two squares on
// the right. One state for both widths (`useDeckFlip`, called once by BuilderSpine), drawn once per width by the spines.
"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deckFlipCopy } from "../../lib/copy/deck-flip";
import { DECK_SORT_KEY } from "../../lib/decks/sort";
import { FLIP_KEY, parseTrail, resolveFlip, type FlipDeck } from "../../lib/decks/flip";
import { GhostButton } from "../ui/button";
import { readRaw } from "../ui/local-store";

const noop = () => () => {};
const ready = () => true;
const notReady = () => false;

/** Storage is a browser fact: the server and the hydration pass agree on absence, and the strip lands on the pass after. */
function readTrailRaw(): string | null {
  try {
    return window.sessionStorage.getItem(FLIP_KEY);
  } catch {
    return null;
  }
}

// The keys that belong to the control the reader is in, never to the strip.
const OWN_ARROWS = 'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="tablist"], [role="listbox"], [role="menu"], [role="radiogroup"], [role="slider"], [data-carousel]';
const OPEN_LAYER = '[role="dialog"], [aria-modal="true"], dialog[open], [role="menu"]';

/** ← and → on a wide screen, unless the key is doing something else (a field, a tab row, an open sheet) or is a shortcut. */
export function arrowFlips(e: KeyboardEvent): boolean {
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return false;
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return false;
  const target = e.target instanceof Element ? e.target : null;
  if (target?.closest(OWN_ARROWS)) return false;
  return !document.querySelector(OPEN_LAYER);
}

/**
 * The flip for `id`, or null while the browser has not been read, for a one-deck list and for a deck the list does not
 * hold. `search` is the builder's live view as a query (`?tab=`, `?panel=`), kept on the next deck.
 */
export function useDeckFlip(decks: readonly FlipDeck[] | undefined, id: string, search: string) {
  const router = useRouter();
  const mounted = useSyncExternalStore(noop, ready, notReady);
  const flip = useMemo(
    () => (mounted && decks ? resolveFlip(decks, parseTrail(readTrailRaw()), readRaw(DECK_SORT_KEY), id) : null),
    [mounted, decks, id],
  );
  const prevId = flip?.prev.id;
  const nextId = flip?.next.id;
  useEffect(() => {
    if (!prevId || !nextId) return;
    router.prefetch(`/decks/${prevId}${search}`);
    router.prefetch(`/decks/${nextId}${search}`);
  }, [router, prevId, nextId, search]);
  useEffect(() => {
    if (!prevId || !nextId) return;
    const onKey = (e: KeyboardEvent) => {
      if (!window.matchMedia("(min-width: 768px)").matches || !arrowFlips(e)) return;
      e.preventDefault();
      router.push(`/decks/${e.key === "ArrowLeft" ? prevId : nextId}${search}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, prevId, nextId, search]);
  return { flip, search, mounted };
}

export type DeckFlip = ReturnType<typeof useDeckFlip>;

function Arrow({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === "prev" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}

/**
 * One drawing of the strip at one width. The left link is drawn before the browser is read (it is `All decks` until the
 * trail says otherwise), so the row keeps its height; the right side lands with the order.
 */
export function DeckFlipStrip({ flipState, width }: { flipState: DeckFlip; width: "phone" | "desktop" }) {
  const { flip, search, mounted } = flipState;
  // Read and nothing to flip to (a deck the list does not hold): no strip, rather than a link to a list the deck is not in.
  if (mounted && !flip) return null;
  const phone = width === "phone";
  const square = phone ? "h-[44px] w-[44px]" : "h-[36px] w-[36px]";
  return (
    <nav
      aria-label={deckFlipCopy.region}
      data-flip-strip={width}
      className={`flex w-full items-center justify-between ${phone ? "min-h-[44px]" : "min-h-[36px]"}`}
    >
      <Link
        href={flip?.href ?? "/decks"}
        className={`flex min-h-[44px] items-center gap-[6px] text-[color:var(--fg-body)] ${phone ? "text-[15px]" : "text-[14px]"}`}
      >
        <Arrow dir="prev" />
        <span>{flip?.caption ?? deckFlipCopy.allDecks}</span>
      </Link>
      {flip && (
        <div className="flex items-center gap-[8px]">
          <span className="font-mono text-[12px] text-[color:var(--fg-muted)]">{deckFlipCopy.place(flip.k, flip.n)}</span>
          <GhostButton
            href={`/decks/${flip.prev.id}${search}`}
            aria-label={deckFlipCopy.prev(flip.prev.name, !phone)}
            className={`flex items-center justify-center ${square}`}
          >
            <Arrow dir="prev" />
          </GhostButton>
          <GhostButton
            href={`/decks/${flip.next.id}${search}`}
            aria-label={deckFlipCopy.next(flip.next.name, !phone)}
            className={`flex items-center justify-center ${square}`}
          >
            <Arrow dir="next" />
          </GhostButton>
        </div>
      )}
    </nav>
  );
}
