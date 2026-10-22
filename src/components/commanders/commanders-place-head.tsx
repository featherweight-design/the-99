// The head every route of the Commanders place starts with: the title on desktop, then the strip of
// place tabs (menu and Home, PR 1). The Collection place's strip, reused (`PlaceStrip`).
//
// MOUNTED ONCE from `commanders/(list)/layout.tsx`, a route group holding the three tab routes and
// leaving `/commanders/[slug]` outside it, so a tab press swaps the page below and never remounts
// the strip. Each tab keeps its own title and line under the strip (the page's `h1`), so "Commanders"
// here is a `<p>` and every route has exactly one h1. On the phone the title collapses to nothing
// and the strip comes first, as Collection's does.
"use client";

import { usePathname } from "next/navigation";
import { PlaceStrip, type PlaceTab } from "../place/place-strip";
import { commandersPlaceCopy } from "../../lib/copy/commanders-place";

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

export function CommandersPlaceHead({ helpMeChoose }: { helpMeChoose: boolean }) {
  const pathname = usePathname();
  const current = commandersPlaceFromPathname(pathname);
  if (current === null) {
    throw new Error(`CommandersPlaceHead rendered on an unrecognised path: ${pathname}`);
  }
  return (
    <div style={{ background: "var(--bg)" }}>
      <div className="hidden md:block md:p-[28px_34px_0]">
        <p className="font-display font-bold m-0 md:text-[30px] md:leading-[45px]" style={{ color: "var(--fg)" }}>
          {commandersPlaceCopy.title}
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
