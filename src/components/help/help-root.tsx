"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { HELP_STOP_ID, useCardDetailsIsUp, useHelpStop } from "../../lib/a11y/help-over-dialog";
import { questionHref, questionLanding } from "../../lib/about/question-landing";
import { screenForPath } from "../../lib/about/screen-for-path";
import { deckViewSearch } from "../../lib/decks/builder-view";
import { helpPanelCopy } from "../../lib/copy/discovery";
import { BuilderScreenContext, type BuilderScreen } from "../decks/builder-screen";
import { usePendingPush } from "../shell/pending-push";
import { useIsDesktop } from "../ui/use-is-desktop";

/**
 * The ? on every screen (discovery R2·8; About visual build, plan `2026-10-27-about-visual.md`, PR 6a, handoff call 5
 * and Addendum A1). Mounted by the shell only when `HELP_PANEL_ENABLED` resolves on for the reader; off, there is no
 * root, so neither ? draws.
 *
 * The ? opens no panel: it goes to its screen's About page, scrolled to the section that answers the screen, with the
 * screen's back bar (`questionLanding`). The root holds what the two ?s (the rail's from `md`, the header's below it)
 * share: the deck view the builder publishes, so a deck's ? answers for the view the reader is on.
 */

type HelpCtx = {
  /** Where the ? goes from the page the reader is on now: read off the LIVE address at the press. */
  go: () => void;
};

const HelpContext = createContext<HelpCtx | null>(null);

/** The md breakpoint, read at the press: card details is answered only where its ? can be pressed. */
const DESKTOP = "(min-width: 768px)";

export function HelpRoot({ on, children }: { on: boolean; children: ReactNode }) {
  return on ? <HelpOn>{children}</HelpOn> : <>{children}</>;
}

function HelpOn({ children }: { children: ReactNode }) {
  // A code-started navigation that reports its press as a link does (the 400ms screen, the stall watch).
  const { go: push } = usePendingPush();
  const [deck, setDeck] = useState<BuilderScreen | null>(null);
  const go = useCallback(() => {
    // The live address, never a render's: card details mirrors `?card=` without a navigation, and a deck's view is the
    // builder's own state.
    const { pathname, search } = window.location;
    const desktop = typeof window.matchMedia === "function" && window.matchMedia(DESKTOP).matches;
    push(questionHref(questionLanding(pathname, search, { deckView: deck?.view ?? null, desktop }), backFrom(pathname, search, deck)));
  }, [push, deck]);
  const ctx = useMemo<HelpCtx>(() => ({ go }), [go]);
  return (
    <HelpContext.Provider value={ctx}>
      <BuilderScreenContext.Provider value={setDeck}>{children}</BuilderScreenContext.Provider>
    </HelpContext.Provider>
  );
}

/**
 * The address "‹ Back to {screen}" returns to: the live one, and on a deck the view the builder shows, which the URL
 * does not carry (`?tab=` for a tab, Consider included, `?panel=` for Shopping, Stats or Notes, both read on arrival
 * only). The landing reads the About screen (`deck.view`); the way back reads the tab too (`deck.tab`).
 */
export function backFrom(pathname: string, search: string, deck: BuilderScreen | null): string {
  if (deck === null || screenForPath(pathname, search) !== "deck") return pathname + search;
  return pathname + deckViewSearch(search, deck.view, deck.tab);
}

const PLACE = {
  // Row 1 to 14: the rail's foot, 38 square, 6 above the offline pill.
  rail: {
    box: "mb-[6px] h-[38px] w-[38px] rounded-[10px] text-[16px]",
    rest: "bg-transparent text-[color:var(--fg-faint)]",
  },
  // Rows 15 to 24: the header's right, 44 square.
  header: {
    box: "h-[44px] w-[44px] rounded-[12px] text-[17px]",
    rest: "bg-transparent text-[color:var(--fg-muted)]",
  },
} as const;

/** Whether the ? is drawn for this reader: the phone header's install slot makes room for it. */
export function useHelpOn(): boolean {
  return useContext(HelpContext) !== null;
}

/** The ? itself, in the rail or the header. Nothing without the root, so a switched-off reader gets no ?. */
export function HelpButton({ place }: { place: keyof typeof PLACE }) {
  const help = useContext(HelpContext);
  const desk = useIsDesktop();
  const detailsUp = useCardDetailsIsUp();
  // Over card details at 1280 (R2·9, readiness gap 5) the rail's ? is drawn above the dialog's backdrop, at its own
  // place in the rail, which keeps an empty slot of its size. The backdrop is fixed over the whole viewport and the
  // rail is its own stacking layer under it, so the ? leaves the rail for the document's top layer while it is lifted.
  const lift = help !== null && place === "rail" && desk && detailsUp;
  // Where the slot is, for the slot it was read from: a lift that just started never draws at the last one's place.
  const [at, setAt] = useState<{ slot: HTMLElement; left: number; top: number } | null>(null);
  const [slot, setSlot] = useState<HTMLSpanElement | null>(null);
  const [lifted, setLifted] = useState<HTMLButtonElement | null>(null);
  useHelpStop(lift ? lifted : null);
  // Read before paint, and again whenever the window or the rail's foot changes size: the offline pill arriving under
  // the ? moves the slot up without resizing the window.
  useLayoutEffect(() => {
    if (slot === null) return;
    const measure = () => {
      const r = slot.getBoundingClientRect();
      setAt({ slot, left: r.left, top: r.top });
    };
    measure();
    window.addEventListener("resize", measure);
    const foot = typeof ResizeObserver === "undefined" || slot.parentElement === null ? null : new ResizeObserver(measure);
    if (foot !== null && slot.parentElement !== null) foot.observe(slot.parentElement);
    return () => {
      window.removeEventListener("resize", measure);
      foot?.disconnect();
    };
  }, [slot]);
  if (help === null) return null;
  const p = PLACE[place];
  if (lift) {
    return (
      <>
        <span ref={setSlot} aria-hidden data-help-slot className={`block shrink-0 ${p.box}`} />
        {at !== null &&
          at.slot === slot &&
          createPortal(
            <Button help={help} place={place} id={HELP_STOP_ID} buttonRef={setLifted} style={{ position: "fixed", left: at.left, top: at.top, zIndex: 51 }} />,
            document.body,
          )}
      </>
    );
  }
  return <Button help={help} place={place} />;
}

function Button({
  help,
  place,
  buttonRef,
  style,
  id,
}: {
  help: HelpCtx;
  place: keyof typeof PLACE;
  id?: string;
  buttonRef?: (el: HTMLButtonElement | null) => void;
  style?: CSSProperties;
}) {
  const p = PLACE[place];
  return (
    <button
      ref={buttonRef}
      id={id}
      type="button"
      style={style}
      data-help-button={place}
      aria-label={helpPanelCopy.button}
      onClick={help.go}
      className={`flex shrink-0 cursor-pointer items-center justify-center border-0 p-0 font-mono font-medium ${p.box} ${p.rest}`}
    >
      ?
    </button>
  );
}
