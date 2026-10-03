// The head every route of the collection place starts with: /collection's title block, then
// the strip of place tabs (collection surfaces, Call 4; R2 §Q1).
//
// ONE BLOCK, MOUNTED THREE TIMES, so the strip cannot move when a reader presses one of its
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
// NOT a `layout.tsx`: that would also wrap /collection/replace and /collection/sets/[code],
// neither of which takes the strip.

import Link from "next/link";
import { GhostButton } from "../ui/button";
import { PendingReporter } from "../shell/pending-reporter";
import { formatLastUpdated } from "../../lib/collection/browse";
import { collectionTabsCopy } from "../../lib/copy/collection";

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

export function CollectionPlaceHead({
  current,
  stats,
  lastUpdated,
}: {
  current: CollectionPlace;
  stats: { totalCards: number; uniqueCards: number };
  lastUpdated: Date | null;
}) {
  const hasCollection = stats.totalCards > 0;
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
            {stats.totalCards.toLocaleString()} cards · {stats.uniqueCards.toLocaleString()} unique
            {lastUpdated ? ` · last updated ${formatLastUpdated(lastUpdated)}` : ""}
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
