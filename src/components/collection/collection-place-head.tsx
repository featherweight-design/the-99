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
import Link from "next/link";
import { GhostButton } from "../ui/button";
import { PendingReporter } from "../shell/pending-reporter";
import { collectionTabsCopy } from "../../lib/copy/collection";
import { refreshCollectionHeader } from "../../app/collection/actions";

export type CollectionPlace = "cards" | "sets" | "proxies";

/* The handoff spells this mark as the "↻" glyph, but glyph metrics render it
   noticeably smaller than the label it sits beside and no font stack agrees on
   its size. Same mark, drawn at an explicit 14px so it matches the 13px text. */
function ReplaceIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="inline-block align-[-2px] mr-[6px]"
    >
      <path d="M13.5 8a5.5 5.5 0 1 1-1.9-4.16" />
      <path d="M13.5 1.5v3.2h-3.2" />
    </svg>
  );
}

const TABS: { place: CollectionPlace; href: string; label: string }[] = [
  { place: "cards", href: "/collection", label: collectionTabsCopy.cards },
  { place: "sets", href: "/collection/sets", label: collectionTabsCopy.sets },
  { place: "proxies", href: "/collection/proxies", label: collectionTabsCopy.proxies },
];

/**
 * Which tabs the strip draws. Sets is ABSENT, not disabled, on an empty collection, as the
 * `By set` pill was. The one exception is the route the reader is on: no page is missing
 * from its own strip (E10), so an empty collection that lands on /collection/sets still
 * sees Sets, lit. Proxies is never gated.
 */
export function visibleTabs(current: CollectionPlace, hasCollection: boolean) {
  return TABS.filter((tab) => tab.place !== "sets" || hasCollection || current === "sets");
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
  return null;
}

export function CollectionPlaceHead({
  stats: initialStats,
  lastUpdatedLabel: initialLastUpdatedLabel,
}: {
  stats: { totalCards: number; uniqueCards: number };
  // Pre-formatted on the server ("today", "yesterday", or a dated string) rather than a raw
  // `Date` — this component runs in the browser now, and `formatLastUpdated`'s `now` default
  // reads the BROWSER's clock and local timezone on every (re)render; recomputed there it can
  // disagree with what the server rendered, which is a hydration mismatch on the initial
  // paint and a label that visibly flips on a later refresh.
  lastUpdatedLabel: string | null;
}) {
  const pathname = usePathname();
  const current = placeFromPathname(pathname);

  // The layout that mounts this once fetches its two props on first mount only; a Next
  // layout does not re-run on a sibling navigation. So the figures are re-read here on every
  // tab switch and on window focus (the same cross-tab trigger `DeltaStrip` polls on), and
  // only the latest of possibly several in-flight reads may apply — a focus firing while a
  // tab switch is still loading must not let the switch's answer land after and overwrite it.
  const [live, setLive] = useState({ stats: initialStats, lastUpdatedLabel: initialLastUpdatedLabel });
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
    return () => window.removeEventListener("focus", onFocus);
  }, []);
  const { stats, lastUpdatedLabel } = live;
  const hasCollection = stats.totalCards > 0;
  // The group's layout mounts this only on the three routes `placeFromPathname` answers for
  // (see the file header) — a null here would mean this component were reached from
  // somewhere it was never meant to be, which is a build-time wiring question, not a state
  // this render should paper over with a guess.
  if (current === null) {
    throw new Error(`CollectionPlaceHead rendered on an unrecognised path: ${pathname}`);
  }
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
        {hasCollection ? (
          <GhostButton
            href="/collection/replace"
            className="hidden md:inline-block text-[13px] px-[16px] py-[9px]"
          >
            <ReplaceIcon />
            Replace collection
          </GhostButton>
        ) : null}
      </div>

      {/* Place navigation, so a nav of links rather than ARIA tabs (E10): each one changes
          the path, carries no query, and Back is a route change. */}
      <nav
        aria-label={collectionTabsCopy.regionAria}
        className="flex h-[48px] items-stretch gap-[2px] pl-[8px] pr-[4px] border-b border-[color:var(--border)] md:mt-[14px] md:h-[40px] md:gap-[4px] md:px-[24px]"
      >
        {visibleTabs(current, hasCollection).map((tab) => {
          const on = tab.place === current;
          return (
            <Link
              key={tab.place}
              href={tab.href}
              aria-current={on ? "page" : undefined}
              data-testid={`collection-tab-${tab.place}`}
              className={[
                "flex items-center px-[11px] md:px-[10px] text-[14px]",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--accent)]",
                on
                  ? "font-semibold text-[color:var(--fg)] shadow-[inset_0_-2px_0_var(--accent)]"
                  : "font-medium text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]",
              ].join(" ")}
            >
              {tab.label}
              <PendingReporter href={tab.href} />
            </Link>
          );
        })}
        {hasCollection ? (
          <a
            href="/collection/replace"
            className="md:hidden ml-auto flex min-h-[44px] items-center px-[10px] text-[13px] text-[color:var(--accent)]"
          >
            <ReplaceIcon />
            Replace
          </a>
        ) : null}
      </nav>
    </div>
  );
}
