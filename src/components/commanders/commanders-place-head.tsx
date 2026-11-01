// The head every route of the Commanders place starts with: the title on desktop, then the strip of
// place tabs (menu and Home, PR 1). The Collection place's strip, reused (`PlaceStrip`).
//
// MOUNTED ONCE from `commanders/(list)/layout.tsx`, a route group holding the three tab routes and
// leaving `/commanders/[slug]` outside it, so a tab press swaps the page below and never remounts
// the strip. Each tab keeps its own title and line under the strip (the page's `h1`), so "Commanders"
// here is a `<p>` and every route has exactly one h1. On the phone the title collapses to nothing
// and the strip comes first, as Collection's does.
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { PlaceStrip, type PlaceTab } from "../place/place-strip";
import { refreshCommanderCounts } from "../../app/commanders/actions";
import { commandersPlaceCopy } from "../../lib/copy/commanders-place";
import { COMMANDER_COUNTS_STALE_EVENT } from "./counts-event";

export type CommandersPlace = "foryou" | "discover" | "choose";

const TABS: readonly (PlaceTab & { place: CommandersPlace })[] = [
  { place: "foryou", href: "/commanders", label: commandersPlaceCopy.tabs.foryou },
  { place: "discover", href: "/commanders/discover", label: commandersPlaceCopy.tabs.discover },
  { place: "choose", href: "/commanders/choose", label: commandersPlaceCopy.tabs.choose },
];

/** The tabs the place draws: Help me choose follows its own switch, and a reader already on it still sees it lit. */
export function visibleCommandersTabs(current: CommandersPlace, helpMeChoose: boolean) {
  return TABS.filter((tab) => tab.place !== "choose" || helpMeChoose || current === "choose");
}

/** The three routes the head mounts on and nothing past them (`/commanders/[slug]` is outside the group). */
export function commandersPlaceFromPathname(pathname: string): CommandersPlace | null {
  if (pathname === "/commanders") return "foryou";
  if (pathname === "/commanders/discover") return "discover";
  if (pathname === "/commanders/choose") return "choose";
  return null;
}

type Counts = { owned: number; discover: number } | null;

export function CommandersPlaceHead({ helpMeChoose, counts: initialCounts }: { helpMeChoose: boolean; counts: Counts }) {
  const pathname = usePathname();
  const current = commandersPlaceFromPathname(pathname);
  if (current === null) {
    throw new Error(`CommandersPlaceHead rendered on an unrecognised path: ${pathname}`);
  }
  // The layout that mounts this does not re-run on a sibling navigation, so the figures are re-read here on every
  // tab switch, on window focus and after a row's hide or undo, and only the latest of several in-flight reads may apply. A failed read leaves
  // the line as it was. The first pass is skipped: the layout's props are already fresh.
  const [counts, setCounts] = useState<Counts>(initialCounts);
  const latest = useRef(0);
  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    const ticket = ++latest.current;
    void refreshCommanderCounts()
      .then((next) => {
        if (ticket === latest.current) setCounts(next);
      })
      .catch(() => {});
  }, [pathname]);
  // On window focus, and when a row on the list below has just been hidden or brought back.
  useEffect(() => {
    const onFocus = () => {
      const ticket = ++latest.current;
      void refreshCommanderCounts()
        .then((next) => {
          if (ticket === latest.current) setCounts(next);
        })
        .catch(() => {});
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener(COMMANDER_COUNTS_STALE_EVENT, onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(COMMANDER_COUNTS_STALE_EVENT, onFocus);
    };
  }, []);
  const line = counts ? commandersPlaceCopy.count(counts.owned, counts.discover) : "";
  return (
    <div style={{ background: "var(--bg)" }}>
      <div className="hidden md:block md:p-[28px_34px_0]">
        <p className="font-display font-bold m-0 md:text-[30px] md:leading-[45px]" style={{ color: "var(--fg)" }}>
          {commandersPlaceCopy.title}
        </p>
        {/* A line is always reserved, so the strip's top does not move when the figures arrive or leave. */}
        <p className="font-mono text-[12px] leading-[18px] mt-[4px] mb-0 min-h-[18px]" style={{ color: "var(--fg-faint)" }}>
          {line}
        </p>
      </div>
      <PlaceStrip
        tabs={visibleCommandersTabs(current, helpMeChoose)}
        current={current}
        ariaLabel={commandersPlaceCopy.regionAria}
        testIdPrefix="commanders-tab"
      />
    </div>
  );
}
