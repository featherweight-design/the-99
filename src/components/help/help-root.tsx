"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { afterDialogsReleased, afterScrollRestored } from "../../lib/a11y/dialog";
import type { EntryPayload } from "../../lib/about/entries-payload";
import type { DeckView } from "../../lib/copy/about";
import { helpPanelCopy } from "../../lib/copy/discovery";
import type { TargetId } from "../../lib/discovery/targets";
import { BuilderScreenContext } from "../decks/builder-screen";
import { HALO_MS, useTargets } from "../discovery/targets-provider";
import { useYieldMoment } from "../moments/moments-provider";
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

  const ctx = useMemo<HelpCtx>(() => ({ open, toggle, prefetch }), [open, toggle, prefetch]);

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

/** The ? itself, in the rail or the header. Nothing without the root, so a switched-off reader gets no ?. */
export function HelpButton({ place }: { place: keyof typeof PLACE }) {
  const help = useContext(HelpContext);
  if (help === null) return null;
  const p = PLACE[place];
  // Intent fetches only from `md` up (R2 gap 6), where the rail's ? lives.
  const intent = place === "rail" ? help.prefetch : undefined;
  return (
    <button
      type="button"
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
