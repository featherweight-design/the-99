"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { afterDialogsReleased, afterScrollRestored } from "../../lib/a11y/dialog";
import { HELP_STOP_ID, useCardDetailsIsUp, useHelpStop } from "../../lib/a11y/help-over-dialog";
import type { EntryPayload } from "../../lib/about/entries-payload";
import type { DeckView } from "../../lib/copy/about";
import { helpPanelCopy } from "../../lib/copy/discovery";
import type { TargetId } from "../../lib/discovery/targets";
import { BuilderScreenContext } from "../decks/builder-screen";
import { HALO_MS, useTargets } from "../discovery/targets-provider";
import { useYieldMoment } from "../moments/moments-provider";
import { useIsDesktop } from "../ui/use-is-desktop";
import { HelpPanel } from "./help-panel";

/**
 * The ? on every screen (discovery R2·8, README-r2 C4, design table `discovery-r2-8-help.md`). Mounted by the shell only
 * when `HELP_PANEL_ENABLED` resolves on for the reader; off, there is no root, so neither ? draws and nothing fetches.
 *
 * The root holds what the two ?s (the rail's from `md`, the header's below it) and the panel share: whether it is open,
 * the press that opened it (focus goes back there), the deck view the builder publishes, and the reader's entries.
 * The entries come from `GET /api/about/entries` on the first open, or on intent at the rail's ? (R2 gap 6), and are
 * kept for the visit: the shell outlives the page, and the answer follows only the reader's switches and allowance.
 */

export type HelpEntries = { state: "idle" | "loading" | "ready" | "error"; entries: readonly EntryPayload[] };

type HelpCtx = {
  open: boolean;
  /** Opens from `opener`, or closes when open (the ? again closes, row 40). */
  toggle: (opener: HTMLElement) => void;
  /** Fetches the entries ahead of a press. */
  prefetch: () => void;
  /**
   * A ? mounted anew takes over as the opener when the one that opened the panel has left the document: the rail's ?
   * moves to and from its lift over card details (R2·9), so focus still has a ? to go back to on close.
   */
  adopt: (el: HTMLElement | null) => void;
};

const HelpContext = createContext<HelpCtx | null>(null);

export function HelpRoot({ on, children }: { on: boolean; children: ReactNode }) {
  return on ? <HelpOn>{children}</HelpOn> : <>{children}</>;
}

function HelpOn({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [deckView, setDeckView] = useState<DeckView | null>(null);
  const [data, setData] = useState<HelpEntries>({ state: "idle", entries: [] });
  const requested = useRef(false);
  const opener = useRef<HTMLElement | null>(null);
  // Show me: the target to reach once the panel has closed and handed focus back (row 101).
  const [showMe, setShowMe] = useState<{ target: TargetId } | null>(null);
  const targets = useTargets();

  const prefetch = useCallback(() => {
    if (requested.current) return;
    requested.current = true;
    setData((d) => ({ ...d, state: "loading" }));
    fetch("/api/about/entries", { credentials: "same-origin" })
      .then((r) => (r.ok ? (r.json() as Promise<{ entries: EntryPayload[] }>) : Promise.reject(new Error(String(r.status)))))
      .then((body) => setData({ state: "ready", entries: body.entries }))
      .catch(() => {
        // A failed read is tried again on the next open; meanwhile the panel draws no rows.
        requested.current = false;
        setData({ state: "error", entries: [] });
      });
  }, []);

  const toggle = useCallback(
    (el: HTMLElement) => {
      if (open) {
        setOpen(false);
        return;
      }
      opener.current = el;
      prefetch();
      setOpen(true);
    },
    [open, prefetch],
  );

  const close = useCallback(() => setOpen(false), []);

  const adopt = useCallback((el: HTMLElement | null) => {
    const was = opener.current;
    if (el === null || was === null || was.isConnected) return;
    if (was.dataset.helpButton === el.dataset.helpButton) opener.current = el;
  }, []);

  // Leaving the page closes the panel (H1). Adjusted during render, so the next page never paints under it.
  const pathname = usePathname();
  const [path, setPath] = useState(pathname);
  if (pathname !== path) {
    setPath(pathname);
    if (open) setOpen(false);
  }

  // No bubble from the press to the halo's end (rows 101 to 104): the panel's own hold ends as it closes, which would
  // start the moments' arrival timer under the halo. So a delivery hold is taken BEFORE the close and kept until the
  // halo ends, or the root goes.
  const yieldBubble = useYieldMoment();
  const hold = useRef<{ release: () => void; timer: number | null } | null>(null);
  const endHold = useCallback(() => {
    const h = hold.current;
    hold.current = null;
    if (h === null) return;
    if (h.timer !== null) window.clearTimeout(h.timer);
    h.release();
  }, []);
  useEffect(() => endHold, [endHold]);

  const onShowMe = useCallback(
    (target: TargetId) => {
      endHold();
      hold.current = { release: yieldBubble(), timer: null };
      setShowMe({ target });
      setOpen(false);
    },
    [endHold, yieldBubble],
  );

  // After the close has committed: the panel's own cleanup has put focus back on the ? and, for the sheet, queued the
  // release of its history entry. The scroll waits for that release, so the pop cannot land after it.
  // That pop also starts the page's scroll restoration, which puts the offset the sheet opened over back for about
  // half a second; a reveal made inside it (at once, under reduced motion) is pulled straight back, so it waits too.
  useEffect(() => {
    if (showMe === null || targets === null) return;
    let unpin = () => {};
    const unrelease = afterDialogsReleased(() => {
      unpin = afterScrollRestored(() => {
        setShowMe(null);
        // Scrolled into view and haloed for 2.4s; never pressed, and no bubble (rows 101 to 104).
        targets.scrollToTarget(showMe.target);
        if (targets.haloTarget(showMe.target) && hold.current !== null) {
          hold.current.timer = window.setTimeout(endHold, HALO_MS);
        } else {
          endHold();
        }
      });
    });
    return () => {
      unrelease();
      unpin();
    };
  }, [showMe, targets, endHold]);

  const ctx = useMemo<HelpCtx>(() => ({ open, toggle, prefetch, adopt }), [open, toggle, prefetch, adopt]);

  return (
    <HelpContext.Provider value={ctx}>
      <BuilderScreenContext.Provider value={setDeckView}>
        {children}
        {open && (
          <HelpPanel data={data} deckView={deckView} onClose={close} onShowMe={onShowMe} returnFocusRef={opener} />
        )}
      </BuilderScreenContext.Provider>
    </HelpContext.Provider>
  );
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
  // Intent fetches only from `md` up (R2 gap 6), where the rail's ? lives.
  const intent = place === "rail" ? help.prefetch : undefined;
  const { adopt } = help;
  const ref = useCallback(
    (el: HTMLButtonElement | null) => {
      buttonRef?.(el);
      adopt(el);
    },
    [buttonRef, adopt],
  );
  return (
    <button
      ref={ref}
      id={id}
      type="button"
      style={style}
      data-help-button={place}
      aria-label={helpPanelCopy.button}
      aria-expanded={help.open}
      onClick={(e) => help.toggle(e.currentTarget)}
      onPointerEnter={intent}
      onFocus={intent}
      className={`flex shrink-0 cursor-pointer items-center justify-center border-0 p-0 font-mono font-medium ${p.box} ${
        help.open ? "bg-[color:var(--elevated)] text-[color:var(--fg)]" : p.rest
      }`}
    >
      ?
    </button>
  );
}
