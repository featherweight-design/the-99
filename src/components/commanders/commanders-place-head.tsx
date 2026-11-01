// The head every route of the Commanders place starts with: the title on desktop, then the strip of
// place tabs (menu and Home, PR 1). The Collection place's strip, reused (`PlaceStrip`).
//
// MOUNTED ONCE from `commanders/(list)/layout.tsx`, a route group holding the four tab routes and
// leaving `/commanders/[slug]` outside it, so a tab press swaps the page below and never remounts
// the strip. Each tab keeps its own title and line under the strip (the page's `h1`), so "Commanders"
// here is a `<p>` and every route has exactly one h1. On the phone the title collapses to nothing
// and the strip comes first, as Collection's does.
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { PlaceStrip, type PlaceTab } from "../place/place-strip";
import { refreshCommanderCounts } from "../../app/commanders/actions";
import type { CommanderCounts } from "../../lib/commanders/counts";
import { HIDDEN_PATH } from "../../lib/commanders/place-paths";
import { commandersPlaceCopy } from "../../lib/copy/commanders-place";
import { COMMANDER_COUNTS_STALE_EVENT } from "./counts-event";

export type CommandersPlace = "foryou" | "discover" | "choose" | "hidden";

/**
 * The strip's four tabs (hide-commander README §3): Hidden sits beside the lists it takes from and is there before
 * anything is hidden, so its empty state is real. It carries the strip's shipped count once something is hidden,
 * and none at 0. Four fit a 390 phone at the strip's own spacing: `PlaceStrip` closes up only from five.
 */
export function commandersTabs(hidden: number): readonly (PlaceTab & { place: CommandersPlace })[] {
  return [
    { place: "foryou", href: "/commanders", label: commandersPlaceCopy.tabs.foryou },
    { place: "discover", href: "/commanders/discover", label: commandersPlaceCopy.tabs.discover },
    { place: "choose", href: "/commanders/choose", label: commandersPlaceCopy.tabs.choose },
    { place: "hidden", href: HIDDEN_PATH, label: commandersPlaceCopy.tabs.hidden, count: hidden > 0 ? hidden : undefined },
  ];
}

/** The four routes the head mounts on and nothing past them (`/commanders/[slug]` is outside the group). A path
    the group holds and this does not know is a 500 (the head throws), so each new tab route adds its case here. */
export function commandersPlaceFromPathname(pathname: string): CommandersPlace | null {
  if (pathname === "/commanders") return "foryou";
  if (pathname === "/commanders/discover") return "discover";
  if (pathname === "/commanders/choose") return "choose";
  if (pathname === HIDDEN_PATH) return "hidden";
  return null;
}

/** Null only for a caller with nothing to say yet; the layout always reads them (`loadPlaceCounts`). */
type Counts = CommanderCounts | null;

export function CommandersPlaceHead({ counts: initialCounts }: { counts: Counts }) {
  const pathname = usePathname();
  const current = commandersPlaceFromPathname(pathname);
  if (current === null) {
    throw new Error(`CommandersPlaceHead rendered on an unrecognised path: ${pathname}`);
  }
  // The layout that mounts this does not re-run on a sibling navigation, so the figures are re-read here on every
  // tab switch, on window focus and after a row's hide, unhide or undo, and only the latest of several in-flight reads may apply. A failed read leaves
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
        tabs={commandersTabs(counts?.hidden ?? 0)}
        current={current}
        ariaLabel={commandersPlaceCopy.regionAria}
        testIdPrefix="commanders-tab"
      />
    </div>
  );
}
