// The flip strip (handoff `design_handoff_the99_deck_flip_order`): `‹ All decks` on the left, `k of N` and two squares on
// the right. One state for both widths (`useDeckFlip`, called once by BuilderSpine), drawn once per width by the spines.
"use client";

import { useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { deckFlipCopy } from "../../lib/copy/deck-flip";
import { DECK_SORT_KEY } from "../../lib/decks/sort";
import { FLIP_KEY, parseTrail, resolveFlip, type FlipDeck } from "../../lib/decks/flip";
import { extendFlipTrail } from "../../lib/decks/flip-trail";
import { clearOpenEntry, placeAfter, writeOpenEntry, type OpenFacts } from "../../lib/decks/open-entry";
import { GhostButton } from "../ui/button";
import { PendingReporter } from "../shell/pending-reporter";
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
export function useDeckFlip(decks: readonly FlipDeck[] | undefined, id: string, search: string, facts?: Readonly<Record<string, OpenFacts>>) {
  // The context, not `useRouter`: the spine draws in places no app router is mounted (its tests), and `useRouter` throws there.
  const router = useContext(AppRouterContext);
  const mounted = useSyncExternalStore(noop, ready, notReady);
  // When this page opened: the trail's age is judged against it, so a render never reads the clock.
  const [openedAt] = useState(Date.now);
  const flip = useMemo(
    () => (mounted && decks ? resolveFlip(decks, parseTrail(readTrailRaw()), readRaw(DECK_SORT_KEY), id, openedAt) : null),
    [mounted, decks, id, openedAt],
  );
  // The deck has landed: the skeleton's hand-off is spent, and the next open must not inherit it.
  useEffect(() => clearOpenEntry(), [id]);
  const prevId = flip?.prev.id;
  const nextId = flip?.next.id;
  useEffect(() => {
    if (!router || !prevId || !nextId) return;
    extendFlipTrail(readTrailRaw(), [prevId, nextId]);
    router.prefetch(`/decks/${prevId}${search}`);
    router.prefetch(`/decks/${nextId}${search}`);
    // The neighbours' commander art, so a flip's skeleton band has its picture at once. Their facts are in hand; the image is not.
    for (const nid of [prevId, nextId]) {
      const src = facts?.[nid]?.artCropUri;
      if (src) new Image().src = src;
    }
  }, [router, prevId, nextId, search, facts]);
  // The press that flips writes the destination's header facts and its place for the skeleton (`open-entry`).
  const openEntry = useCallback(
    (to: string, step: -1 | 1) => {
      const f = facts?.[to];
      if (f && flip) writeOpenEntry(f, { k: placeAfter(flip.k, flip.n, step), n: flip.n, caption: flip.caption });
    },
    [facts, flip],
  );
  useEffect(() => {
    if (!router || !prevId || !nextId) return;
    const onKey = (e: KeyboardEvent) => {
      if (!window.matchMedia("(min-width: 768px)").matches || !arrowFlips(e)) return;
      e.preventDefault();
      const to = e.key === "ArrowLeft" ? prevId : nextId;
      openEntry(to, e.key === "ArrowLeft" ? -1 : 1);
      router.push(`/decks/${to}${search}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, prevId, nextId, search, openEntry]);
  return { flip, search, mounted, openEntry };
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
  const { flip, search, mounted, openEntry } = flipState;
  // Read and nothing to flip to (a deck the list does not hold): no strip, rather than a link to a list the deck is not in.
  if (mounted && !flip) return null;
  const phone = width === "phone";
  const square = phone ? "h-[44px] w-[44px]" : "h-[36px] w-[36px]";
  const backHref = flip?.href ?? "/decks";
  return (
    <nav
      aria-label={deckFlipCopy.region}
      data-flip-strip={width}
      className={`flex w-full items-center justify-between ${phone ? "min-h-[44px]" : "min-h-[36px]"}`}
    >
      <Link
        href={backHref}
        className={`flex min-h-[44px] items-center gap-[6px] text-[color:var(--fg-body)] ${phone ? "text-[15px]" : "text-[14px]"}`}
      >
        <Arrow dir="prev" />
        <span>{flip?.caption ?? deckFlipCopy.allDecks}</span>
        {/* The way back is a list route with no screen of its own that commits at press: a slow press reports. */}
        <PendingReporter href={backHref} />
      </Link>
      {flip && (
        <div className="flex items-center gap-[8px]">
          <span className="font-mono text-[12px] text-[color:var(--fg-muted)]">{deckFlipCopy.place(flip.k, flip.n)}</span>
          <GhostButton
            href={`/decks/${flip.prev.id}${search}`}
            aria-label={deckFlipCopy.prev(flip.prev.name, !phone)}
            onClick={() => openEntry(flip.prev.id, -1)}
            className={`flex items-center justify-center ${square}`}
          >
            <Arrow dir="prev" />
          </GhostButton>
          <GhostButton
            href={`/decks/${flip.next.id}${search}`}
            aria-label={deckFlipCopy.next(flip.next.name, !phone)}
            onClick={() => openEntry(flip.next.id, 1)}
            className={`flex items-center justify-center ${square}`}
          >
            <Arrow dir="next" />
          </GhostButton>
        </div>
      )}
    </nav>
  );
}

/**
 * The two squares of the strip, drawn inert for the deck's loading skeleton: the same boxes `DeckFlipStrip` draws once the order
 * is read, so the arrows are where they will be when the page lands. Disabled and hidden from assistive tech (not focusable, not pressable, not announced).
 */
export function InertFlipSquares({ width }: { width: "phone" | "desktop" }) {
  const square = width === "phone" ? "h-[44px] w-[44px]" : "h-[36px] w-[36px]";
  return (
    <>
      {(["prev", "next"] as const).map((dir) => (
        <GhostButton key={dir} disabled aria-hidden="true" tabIndex={-1} data-inert-flip={dir} className={`flex items-center justify-center ${square}`}>
          <Arrow dir={dir} />
        </GhostButton>
      ))}
    </>
  );
}
