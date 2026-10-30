// The head every route of the collection place starts with: /collection's title block, then
// the strip of place tabs (collection surfaces, Call 4; R2 §Q1).
//
// ONE BLOCK, MOUNTED ONCE, so the strip cannot move when a reader presses one of its
// own tabs. Every height in it comes from content, never from a measurement: 28px of top
// padding, a 45px title line, 4 + 18 for the stats line and a 14px gap put the strip's top
// at 109 on all three routes from `md`. That is why an empty collection keeps its stats line
// (`0 cards · 0 unique`) rather than dropping it, and why hiding Replace moves nothing: it is
// right-aligned and shorter than the text column.
//
// On the phone the title block collapses to nothing and the strip comes first, with
// `↻ Replace` at its trailing edge. /collection's h1 stays in the document as `sr-only`;
// Sets and Proxies keep their own section h1 below, so "Collection" is a `<p>` there and
// each route has exactly one h1 (E11).
//
// MOUNTED FROM A SHARED `layout.tsx` now, at `(list)/layout.tsx` — a route group holding
// exactly the three routes that take the strip (`(list)/page.tsx`, `(list)/sets/page.tsx`,
// `(list)/proxies/page.tsx`), with `/collection/replace` and `/collection/sets/[code]` as
// plain siblings OUTSIDE the group, so neither one takes it. A layout persists across a
// client-side navigation between its own children — only the page below it swaps — which is
// what keeps this strip from unmounting and remounting on every tab press; mounting it inside
// each page instead (the previous shape) could not do that, because three separate pages
// share no common ancestor below the group's own layout to persist a component in.
//
// `stats`/`lastUpdatedLabel` are SEED props, from the layout's own first mount — because the
// layout does not re-run on a sibling navigation, this re-reads both itself on every tab
// switch (not the first render, which already has them fresh) and on window focus, so a
// collection change made in another tab or on another device does not leave this header's
// counts (or Sets/Replace's visibility) stuck. The last-updated figure arrives pre-formatted
// — never a raw `Date` recomputed here against the browser's own clock and timezone, which
// could disagree with the server's render on hydration.
//
// `current` is read from the URL rather than passed in, which is what lets the layout mount
// this once with no idea which of its three children is active.

"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { GhostButton } from "../ui/button";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { settleCollectionWrite } from "../../app/collection/edit-actions";
import { AddCardsSheet } from "./add-cards-sheet";
import { COLLECTION_SAVED_EVENT, CollectionEditToast } from "./edit-toast";
import { ReplaceIcon } from "./replace-icon";
import { PlaceStrip } from "../place/place-strip";
import { collectionTabsCopy } from "../../lib/copy/collection";
import { refreshCollectionHeader } from "../../app/collection/actions";
import { wishlistCopy } from "../../lib/copy/wishlist";

export type CollectionPlace = "cards" | "sets" | "proxies" | "history" | "wishlist";

const TABS: { place: CollectionPlace; href: string; label: string }[] = [
  { place: "cards", href: "/collection", label: collectionTabsCopy.cards },
  { place: "sets", href: "/collection/sets", label: collectionTabsCopy.sets },
  { place: "proxies", href: "/collection/proxies", label: collectionTabsCopy.proxies },
  { place: "history", href: "/collection/history", label: collectionEditCopy.head.historyTab },
  { place: "wishlist", href: "/collection/wishlist", label: wishlistCopy.tab },
];

/**
 * Which tabs the strip draws. Sets is ABSENT, not disabled, on an empty collection, as the
 * `By set` pill was. The one exception is the route the reader is on: no page is missing
 * from its own strip (E10), so an empty collection that lands on /collection/sets still
 * sees Sets, lit. Proxies is never gated. Wishlist (Social R2) is always drawn by the layout (its switch is retired): a
 * wishlist is wanted cards, so it works on an empty collection.
 */
export function visibleTabs(
  current: CollectionPlace,
  hasCollection: boolean,
  history: { enabled: boolean; hasEntries: boolean } = { enabled: false, hasEntries: false },
  wishlist = false,
) {
  return TABS.filter((tab) => {
    if (tab.place === "sets") return hasCollection || current === "sets";
    // History is the ledger's page: absent with the switch off, and, like Sets, absent on an empty
    // collection with nothing in the ledger (a removal back to nothing still leaves an entry).
    if (tab.place === "history") return history.enabled && (hasCollection || history.hasEntries || current === "history");
    if (tab.place === "wishlist") return wishlist;
    return true;
  });
}

/**
 * The three routes this head mounts on, and nothing past them: a trailing segment (the set
 * detail route's `[code]`, or anything under `/replace`) means the reader has left the place
 * this head describes, and the group's layout does not render on those routes at all — this
 * is a defensive match, not the one that keeps them out.
 */
export function placeFromPathname(pathname: string): CollectionPlace | null {
  if (pathname === "/collection") return "cards";
  if (pathname === "/collection/sets") return "sets";
  if (pathname === "/collection/proxies") return "proxies";
  if (pathname === "/collection/history") return "history";
  if (pathname === "/collection/wishlist") return "wishlist";
  return null;
}

export function CollectionPlaceHead({
  stats: initialStats,
  lastUpdatedLabel: initialLastUpdatedLabel,
  editEnabled = false,
  historyHasEntries = false,
  preconPick = false,
  scan = false,
  wishlistEnabled = false,
}: {
  stats: { totalCards: number; uniqueCards: number };
  // Pre-formatted on the server ("today", "yesterday", or a dated string) rather than a raw
  // `Date` — this component runs in the browser now, and `formatLastUpdated`'s `now` default
  // reads the BROWSER's clock and local timezone on every (re)render; recomputed there it can
  // disagree with what the server rendered, which is a hydration mismatch on the initial
  // paint and a label that visibly flips on a later refresh.
  lastUpdatedLabel: string | null;
  /**
   * `COLLECTION_EDIT_ENABLED`, read by the layout. Off, the head is exactly what main draws: no
   * `+ Add`, and no slot reserved for one (collection edit §G).
   */
  editEnabled?: boolean;
  /** The ledger holds an entry inside the window: History shows on an empty collection when it does. */
  historyHasEntries?: boolean;
  /** The Add cards sheet's way into Precons I own (no-collection entry S18), decided by the layout from the switches. */
  preconPick?: boolean;
  /** Collection edit on for the reader (card scanning ends in its add), read by the layout: the Add cards sheet's Scan press (card-scan PR 3). */
  scan?: boolean;
  /** The Wishlist tab, fifth: always true from the layout (its switch is retired). */
  wishlistEnabled?: boolean;
}) {
  const pathname = usePathname();
  const current = placeFromPathname(pathname);

  // The layout that mounts this once fetches its two props on first mount only; a Next
  // layout does not re-run on a sibling navigation. So the figures are re-read here on every
  // tab switch and on window focus (the same cross-tab trigger `DeltaStrip` polls on), and
  // only the latest of possibly several in-flight reads may apply — a focus firing while a
  // tab switch is still loading must not let the switch's answer land after and overwrite it.
  const [live, setLive] = useState({ stats: initialStats, lastUpdatedLabel: initialLastUpdatedLabel, historyHasEntries });
  const latest = useRef(0);
  // The layout's own props are already fresh on the first render, so the first pass of the
  // effect below would repeat the exact read it just received — a server-action round trip
  // and two database reads on every entry into these routes, paid for a tab switch that has
  // not happened yet. Skipped by a flag rather than by comparing pathnames, since a reader
  // switching back to the tab they started on must still refresh.
  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    const ticket = ++latest.current;
    void refreshCollectionHeader()
      .then((next) => {
        if (ticket === latest.current) setLive(next);
      })
      // A failed read leaves the header exactly as it was — the same fallback `DeltaStrip`
      // takes on a failed focus-time check — rather than an unhandled rejection.
      .catch(() => {});
  }, [pathname]);
  useEffect(() => {
    const onFocus = () => {
      const ticket = ++latest.current;
      void refreshCollectionHeader()
        .then((next) => {
          if (ticket === latest.current) setLive(next);
        })
        .catch(() => {});
    };
    window.addEventListener("focus", onFocus);
    // An Edit copies save settles in the card modal's host, which this head cannot see.
    window.addEventListener(COLLECTION_SAVED_EVENT, onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(COLLECTION_SAVED_EVENT, onFocus);
    };
  }, []);
  const { stats, lastUpdatedLabel } = live;
  // The live answer, not the layout's first one: a removal made elsewhere can create the entry that earns the tab.
  const historyShows = live.historyHasEntries === true;
  // Add cards (collection edit §B). The control that opened the sheet gets focus back on close.
  const [adding, setAdding] = useState(false);
  const savedWhileOpen = useRef(false);
  const addTrigger = useRef<HTMLElement | null>(null);
  const openAdd = (e: React.MouseEvent<HTMLElement>) => {
    addTrigger.current = e.currentTarget;
    savedWhileOpen.current = false;
    setAdding(true);
  };
  const reread = () => {
    const ticket = ++latest.current;
    void refreshCollectionHeader()
      .then((next) => {
        if (ticket === latest.current) setLive(next);
      })
      .catch(() => {});
  };
  const hasCollection = stats.totalCards > 0;
  // The group's layout mounts this only on the three routes `placeFromPathname` answers for
  // (see the file header) — a null here would mean this component were reached from
  // somewhere it was never meant to be, which is a build-time wiring question, not a state
  // this render should paper over with a guess.
  if (current === null) {
    throw new Error(`CollectionPlaceHead rendered on an unrecognised path: ${pathname}`);
  }
  const tabs = visibleTabs(current, hasCollection, { enabled: editEnabled, hasEntries: historyShows }, wishlistEnabled);
  // Beside five tabs the strip closes them up (`PlaceStrip`) and the trailing control is drawn as its mark alone (board WP1).
  const compact = tabs.length >= 5;
  const titleClass =
    "font-display font-bold m-0 md:text-[30px] md:leading-[45px]";
  return (
    <div style={{ background: "var(--bg)" }}>
      <div className="md:flex md:items-end md:justify-between md:gap-[20px] md:p-[28px_34px_0]">
        <div>
          {current === "cards" ? (
            <h1 className={`sr-only md:not-sr-only ${titleClass}`} style={{ color: "var(--fg)" }}>
              Collection
            </h1>
          ) : (
            <p className={`hidden md:block ${titleClass}`} style={{ color: "var(--fg)" }}>
              Collection
            </p>
          )}
          <p
            className="hidden md:block font-mono text-[12px] leading-[18px] mt-[4px]"
            style={{ color: "var(--fg-faint)" }}
          >
            {/* Pinned to en-US: a bare toLocaleString() reads the browser's locale once this
                component hydrates, which can disagree with the server's render. */}
            {stats.totalCards.toLocaleString("en-US")} cards · {stats.uniqueCards.toLocaleString("en-US")} unique
            {lastUpdatedLabel ? ` · last updated ${lastUpdatedLabel}` : ""}
          </p>
        </div>
        {hasCollection && editEnabled ? (
          <div className="hidden md:flex md:gap-[10px]">
            <GhostButton
              href="/collection/replace"
              className="inline-block text-[13px] px-[16px] py-[9px]"
            >
              <ReplaceIcon />
              {collectionEditCopy.head.upload}
            </GhostButton>
            <GhostButton
              onClick={openAdd}
              aria-haspopup="dialog"
              data-testid="collection-add"
              className="inline-flex items-center gap-[6px] text-[13px] px-[16px] py-[9px]"
            >
              <span aria-hidden className="text-[15px] leading-none">+</span>
              {collectionEditCopy.head.add}
            </GhostButton>
          </div>
        ) : hasCollection ? (
          <GhostButton
            href="/collection/replace"
            className="hidden md:inline-block text-[13px] px-[16px] py-[9px]"
          >
            <ReplaceIcon />
            Replace collection
          </GhostButton>
        ) : null}
      </div>

      {/* Place navigation, so a nav of links rather than ARIA tabs (E10): `PlaceStrip`. */}
      <PlaceStrip tabs={tabs} current={current} ariaLabel={collectionTabsCopy.regionAria} testIdPrefix="collection-tab">
        {hasCollection && editEnabled ? (
          // The strip has room for one trailing control beside the tabs, and `+ Add` (70px) fits
          // where `↻ Replace` (92px) does not; the upload moves into the sheet (B0). Beside five
          // tabs only the mark fits, in a 44px square, as board WP1 draws its trailing control.
          <button
            type="button"
            onClick={openAdd}
            aria-haspopup="dialog"
            aria-label={compact ? collectionEditCopy.head.add : undefined}
            data-testid="collection-add-phone"
            data-about-press={compact ? undefined : ""}
            className={`md:hidden ml-auto flex min-h-[44px] cursor-pointer items-center text-[13px] text-[color:var(--accent-text)] ${compact ? "h-[44px] w-[44px] self-center justify-center" : "px-[10px]"}`}
          >
            {/* `data-about-press`, About's halo on the visible press (R1b, G7): beside five tabs a 36 square centred on the +,
                since the 44 button runs to the frame's edge; with "Add" drawn, the button itself. */}
            <span
              aria-hidden
              data-about-press={compact ? "" : undefined}
              className={compact ? "flex h-[36px] w-[36px] items-center justify-center text-[18px]" : "mr-[6px] text-[15px]"}
            >
              +
            </span>
            {compact ? null : collectionEditCopy.head.addShort}
          </button>
        ) : hasCollection ? (
          <a
            href="/collection/replace"
            className="md:hidden ml-auto flex min-h-[44px] items-center px-[10px] text-[13px] text-[color:var(--accent-text)]"
          >
            <ReplaceIcon />
            Replace
          </a>
        ) : null}
      </PlaceStrip>
      {editEnabled ? <CollectionEditToast /> : null}
      {editEnabled && adding ? (
        <AddCardsSheet
          mode="add"
          returnFocusRef={addTrigger}
          totalCards={stats.totalCards}
          preconPick={preconPick}
          scan={scan}
          onSaved={() => {
            savedWhileOpen.current = true;
            reread();
          }}
          // The list behind the sheet is refreshed once it closes: the add action invalidates
          // after its response, so nothing re-renders this route on its own, and doing it at the
          // save would unmount the sheet's saved state on an empty collection's page.
          onClose={() => {
            setAdding(false);
            if (savedWhileOpen.current) void settleCollectionWrite();
          }}
        />
      ) : null}
    </div>
  );
}
