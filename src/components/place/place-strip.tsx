// The strip of place tabs under a place's title: Collection's (surfaces, Call 4; R2 §Q1) and Commanders'
// (menu and Home, PR 1). Extracted from `collection-place-head.tsx` so both places draw one strip.
//
// Links, not ARIA tabs (E10): each tab changes the path, and Back is a route change. The strip is
// mounted by a route group's layout, so a tab press swaps the page below it and never remounts it.
//
// Optimistic highlight (#1222 follow-up, Hugh's ruling): a press moves the underline and
// `aria-current` to the pressed tab at once, not once its content has loaded. Set by `onNavigate`,
// fired only for a real client-side navigation (never a modifier-key click that opens a new tab), and
// cleared whenever the pathname next commits, whatever it commits to. That one rule covers a normal
// commit, a second tab pressed before the first lands, and a Back that lands on a sibling tab.
// Abandoning the navigation without a pathname change (an offline press) is the one case it cannot
// see, the blind spot every Link in the app already has.

"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { PendingReporter } from "../shell/pending-reporter";

export type PlaceTab = {
  place: string;
  href: string;
  label: string;
  /** A figure drawn small after the label (a friend page's Spares, Wishlist and Decks). Absent draws none. */
  count?: number;
};

/** Collection's and Commanders' strip: flush under the place head, padded to the page's gutter. */
export const PLACE_STRIP_FRAME = "pl-[8px] pr-[4px] md:mt-[14px] md:px-[24px]";

export function PlaceStrip({
  tabs,
  current,
  ariaLabel,
  testIdPrefix,
  frame = PLACE_STRIP_FRAME,
  children,
}: {
  tabs: readonly PlaceTab[];
  /** The tab the committed path belongs to. */
  current: string;
  ariaLabel: string;
  /** Each tab carries `data-testid="<prefix>-<place>"`. */
  testIdPrefix: string;
  /** The strip's margin and side padding. A place under a page's own head (a friend's page) draws its own. */
  frame?: string;
  /** The trailing control beside the tabs (Collection's `+ Add` / Replace); inside the strip's scroll row. */
  children?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [pending, setPending] = useState<string | null>(null);
  // Adjusted DURING RENDER (react.dev's own pattern for resetting state when a prop changes), not in
  // an effect: this compares against the pathname LAST SEEN here and fires only on an actual commit.
  const [committedFor, setCommittedFor] = useState(pathname);
  if (pathname !== committedFor) {
    setCommittedFor(pathname);
    if (pending !== null) setPending(null);
  }
  const effective = pending ?? current;
  // Five tabs and a labelled trailing control outgrow a 390px phone, so beside five the tabs close up.
  const compact = tabs.length >= 5;
  return (
    <nav
      aria-label={ariaLabel}
      // Scrolls sideways rather than widening the page when the tabs and a trailing control outgrow a narrow phone (320px).
      className={`flex h-[48px] items-stretch gap-[2px] overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*]:shrink-0 ${frame} border-b border-b-[color:var(--border)] border-[color:var(--border)] md:h-[40px] md:gap-[4px]`}
    >
      {tabs.map((tab) => {
        const on = tab.place === effective;
        return (
          <Link
            key={tab.place}
            href={tab.href}
            aria-current={on ? "page" : undefined}
            data-testid={`${testIdPrefix}-${tab.place}`}
            onNavigate={() => setPending(tab.place)}
            className={[
              `flex min-w-[44px] items-center justify-center ${compact ? "px-[7px]" : "px-[11px]"} md:px-[10px] text-[14px]`,
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--accent)]",
              on
                ? "font-semibold text-[color:var(--fg)] shadow-[inset_0_-2px_0_var(--accent)]"
                : "font-medium text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] transition-colors",
            ].join(" ")}
          >
            {tab.label}
            {tab.count !== undefined && (
              <em
                data-testid={`${testIdPrefix}-${tab.place}-count`}
                className={`ml-[6px] font-mono text-[11px] font-normal not-italic ${on ? "text-[color:var(--accent-text)]" : "text-[color:var(--fg-faint)]"}`}
              >
                {/* Pinned to en-US as the count lines are: the Hidden tab's figure can pass a thousand. */}
                {tab.count.toLocaleString("en-US")}
              </em>
            )}
            <PendingReporter href={tab.href} />
          </Link>
        );
      })}
      {children}
    </nav>
  );
}
