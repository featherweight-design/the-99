"use client";

// The phone's docked label (About Addendum R4 board 3, `build.py` `viewport(True)`, `canvas.css` `.dock`): below `md`, a
// pressed PIN lights its region and docks that label's words in a card above the tab bar, so region and words share
// one screen and the page never scrolls (README 3.2). Another pin swaps the card; the same pin again, or its ✕, puts
// both out. Desktop draws none: its labels sit beside the capture.
//
// One dock a page: each section's phone screen keeps its own lit state, so the page holds the docked section's
// `putOut` here and a dock opened in another section puts the first one out, its region with it ("tapping another
// pin swaps the card"). Without a provider (a screen drawn alone) each screen keeps its own slot.
//
// Plain content, not a dialog and not a live region: the pins that open it are pointer-only (`aria-hidden`), and the
// label list under the capture carries the same words for a keyboard. Fixed at `z-[34]`: over the quick-return header
// and sticky heads (`z-30`), under every shell layer (pending overlay `z-[35]`, tab bar and sheet scrims `z-40`). No
// `useDockClearance`: the card is transient, like `edit-toast.tsx`, and publishing `--dock-h` would jump the foot on
// every tap. Capped at 40% of the viewport, its words scrolling inside, so a landscape phone keeps the region in view.
//
// A low region (Small items 3 item 6, board `Dock-Low-Region.html`): when the dock at the foot would cover the region
// it describes, it docks at the top of the visible band instead (`dockPlace`). Top or foot is decided once, before the
// first paint of each tap's dock (the screen keys the dock on its label, so another tap mounts a new one and decides
// again). At the top it rides the header (Small items 4 item 3, board `Dock-Header.html`): `DOCK_AT_TOP` is live CSS,
// 12px under the back bar or the returned header, moving on the header's own slide, and 12px under a header still in
// the page as it scrolls off (`--about-dock-floor`, followed on scroll). Same look, gutters and ✕.

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AboutText } from "./about-text";
import { ABOUT_PAGE_STRINGS } from "../../../lib/copy/about-pages";
import { dockPlace, type DockPlace } from "../../../lib/about/dock-place";
import type { ScreenLabel } from "../../../lib/about/pins";

type Slot = { claim: (putOut: () => void) => void; release: (putOut: () => void) => void };

/** A dock slot: the screen holding it and its `putOut`. Claiming it puts out whichever other screen held it. */
function makeSlot(): Slot {
  let held: (() => void) | null = null;
  return {
    claim(putOut) {
      if (held && held !== putOut) held();
      held = putOut;
    },
    release(putOut) {
      if (held === putOut) held = null;
    },
  };
}

const DockSlot = createContext<Slot | null>(null);

/** The page's one dock slot: mounted once round an About page's sections. */
export function PinDockProvider({ children }: { children: ReactNode }) {
  const [slot] = useState(makeSlot);
  return <DockSlot.Provider value={slot}>{children}</DockSlot.Provider>;
}

/** The page's dock slot, or (a screen drawn alone) the screen's own. Stable across renders, so a screen's unmount
 *  cleanup releases only on unmount. */
export function useDockSlot(): Slot {
  const [own] = useState(makeSlot);
  return useContext(DockSlot) ?? own;
}

/** What holds the top of a phone screen above the dock that the dock's CSS cannot see: the quick-return header while it
 *  is in the page (away or back, `--header-offset` already places the dock, and a header mid-slide would read as a
 *  stale edge), and About's sticky back bar. */
const TOP_BARS = "header[data-quick-return=page], [data-about-back]";

/** The lowest bottom edge of what holds the top of the screen now: `max(0, rect.bottom)`. A header scrolled off ends
 *  at or above the screen's top and a back bar not drawn has no box, so neither counts (0 when nothing does). Both sit
 *  at the page's top, so neither is ever below the screen. */
export function topEdgeNow(): number {
  let edge = 0;
  for (const el of document.querySelectorAll<HTMLElement>(TOP_BARS)) {
    if (el.getClientRects().length > 0) edge = Math.max(edge, el.getBoundingClientRect().bottom);
  }
  return edge;
}

/**
 * The top dock's place (Small items 4 item 3): the higher of 12px under the notch's inset, 12px under the back bar and
 * the returned header (`--about-back-h` is the back bar's height while it shows, `--header-offset` the room a returned
 * header takes), and 12px under the live bottom edge of a header still in the page and the back bar (`--about-dock-floor`, set at the
 * tap and followed on scroll, cleared at 0). Its `top`
 * moves on the header's own slide (`--header-ms`, `--header-ease`: 200ms back, 160ms away); reduced motion jumps. At
 * the foot `top` is `auto`, which never animates. Following a header in the page (`data-about-dock-follow`) it moves
 * with the scroll, unanimated. Every class spelled whole so Tailwind sees it.
 */
export const DOCK_AT_TOP =
  "data-[about-dock-at=top]:top-[max(env(safe-area-inset-top,0px)_+_12px,var(--header-offset,0px)_+_var(--about-back-h,0px)_+_12px,var(--about-dock-floor,0px)_+_12px)] data-[about-dock-at=top]:bottom-auto transition-[top] duration-[var(--header-ms,200ms)] ease-[var(--header-ease,var(--motion-ease-out))] motion-reduce:transition-none data-[about-dock-follow]:transition-none";

/** A header still in the page and on screen: the floor then moves with every scroll, so the dock follows it frame by
 *  frame rather than easing after it (the slide is for the header's own return and departure). */
export function headerInPageNow(): boolean {
  const el = document.querySelector<HTMLElement>("header[data-quick-return=page]");
  return !!el && el.getClientRects().length > 0 && el.getBoundingClientRect().bottom > 0;
}

export function PinDock({
  label, onClose, region,
}: {
  label: ScreenLabel;
  onClose: () => void;
  /** The lit region as drawn, read once on mount to place the dock (null: the foot). */
  region: () => Element | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<DockPlace>({ at: "foot" });
  const [follow, setFollow] = useState(false);
  // Once, on the tap that mounted this dock, before it paints: measured at the foot, its shipped place, then at the
  // top as its CSS places it now (from `auto`, so nothing animates), and put back for React to settle.
  const read = useRef(region);
  useLayoutEffect(() => {
    const el = ref.current;
    const foot = el?.getBoundingClientRect();
    const lit = read.current()?.getBoundingClientRect();
    if (!el || !foot || !lit || lit.bottom <= foot.top) return;
    el.setAttribute("data-about-dock-at", "top");
    const top = el.getBoundingClientRect().top;
    el.setAttribute("data-about-dock-at", "foot");
    const next = dockPlace({ region: lit, foot, top, topEdge: topEdgeNow() });
    if (next.at === "top") {
      setPlace(next);
      setFollow(headerInPageNow());
    }
  }, []);
  // Docked at the top, the floor follows the bars' LIVE bottom edge (orchestrator ruling, 2026-10-29), so the dock
  // climbs 12px under a header scrolling off with the page. One read a frame, on a passive listener attached only
  // while docked at the top and removed on undock or unmount. At 0 the floor clears and the CSS formula alone places
  // it (the returned header, the back bar, the notch). The header's mode is watched too: `useQuickReturn` writes
  // `--header-offset` in its own frame but `data-quick-return` only on React's commit, so a read in between sees the
  // old mode, and at the page's top no further scroll comes to correct it.
  // The back bar rides the header's slide (UNDER_HEADER), so a read during that slide sees its edge mid-flight, and once
  // the scroll stops nothing else reads again: the end of its slide schedules one more read (Copilot round 4).
  const atTop = place.at === "top";
  useEffect(() => {
    if (!atTop) return;
    let frame: number | null = null;
    const tick = () => {
      frame = null;
      const edge = topEdgeNow();
      const floor = edge > 0 ? edge : null;
      setPlace((prev) => (prev.at === "top" && prev.floor !== floor ? { at: "top", floor } : prev));
      setFollow(headerInPageNow());
    };
    const onScroll = () => {
      if (frame === null) frame = requestAnimationFrame(tick);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    const header = document.querySelector("header[data-quick-return]");
    const modes = header ? new MutationObserver(onScroll) : null;
    if (header && modes) modes.observe(header, { attributes: true, attributeFilter: ["data-quick-return"] });
    const onSlideEnd = (e: Event) => {
      if (e.target instanceof Element && e.target.matches("[data-about-back]")) onScroll();
    };
    window.addEventListener("transitionend", onSlideEnd);
    window.addEventListener("transitioncancel", onSlideEnd);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("transitionend", onSlideEnd);
      window.removeEventListener("transitioncancel", onSlideEnd);
      modes?.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [atTop]);
  return (
    <div
      ref={ref}
      data-about-dock={label.key}
      data-about-dock-at={place.at}
      data-about-dock-follow={atTop && follow ? "" : undefined}
      style={place.at === "top" && place.floor !== null ? ({ "--about-dock-floor": `${place.floor}px` } as CSSProperties) : undefined}
      className={`${DOCK_AT_TOP} fixed bottom-[calc(var(--tabbar-h)+12px)] left-[12px] right-[12px] z-[34] flex max-h-[40dvh] items-start gap-[12px] rounded-[12px] border border-solid border-[color:color-mix(in_oklab,var(--accent)_55%,var(--border-strong))] bg-[color:var(--elevated)] py-[12px] pl-[14px] pr-[12px] text-[14px] leading-[1.5] text-[color:var(--fg-body)] shadow-[0_-12px_36px_rgb(0_0_0/0.45)] md:hidden`}
    >
      <span
        aria-hidden
        className="mt-[1px] h-[22px] w-[22px] flex-none rounded-full bg-[color:var(--accent)] text-center font-mono text-[11px] font-semibold leading-[22px] text-[color:var(--bg)]"
      >
        {label.n}
      </span>
      {/* 26px: the card's 12px padding top and foot and its 1px border, so the words scroll inside the cap. */}
      <p className="m-0 max-h-[calc(40dvh-26px)] min-w-0 flex-1 overflow-y-auto overscroll-contain [text-wrap:pretty]">
        <b className="font-semibold text-[color:var(--fg)]">{label.lead}</b>
        <AboutText text={label.text} />
      </p>
      <button
        type="button"
        aria-label={ABOUT_PAGE_STRINGS.dockClose}
        data-about-dock-close
        onClick={onClose}
        className="-mr-[4px] -mt-[4px] flex h-[28px] w-[28px] flex-none cursor-pointer items-center justify-center rounded-[6px] border-0 bg-transparent p-0 text-[14px] text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)]"
      >
        <span aria-hidden>✕</span>
      </button>
    </div>
  );
}
