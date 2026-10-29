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

import { createContext, useContext, useState, type ReactNode } from "react";
import { ABOUT_PAGE_STRINGS } from "../../../lib/copy/about-pages";
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

export function PinDock({ label, onClose }: { label: ScreenLabel; onClose: () => void }) {
  return (
    <div
      data-about-dock={label.key}
      className="fixed bottom-[calc(var(--tabbar-h)+12px)] left-[12px] right-[12px] z-[34] flex max-h-[40dvh] items-start gap-[12px] rounded-[12px] border border-solid border-[color:color-mix(in_oklab,var(--accent)_55%,var(--border-strong))] bg-[color:var(--elevated)] py-[12px] pl-[14px] pr-[12px] text-[14px] leading-[1.5] text-[color:var(--fg-body)] shadow-[0_-12px_36px_rgb(0_0_0/0.45)] md:hidden"
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
        {label.text}
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
