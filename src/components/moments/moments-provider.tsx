"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { spendMomentAction } from "../../app/moments-actions";
import { overPageCount, subscribeOverPage } from "../../lib/moments/hold";
import { pickMoment, type MomentId } from "../../lib/moments/registry";
import { takeVisit, touchVisit } from "../../lib/moments/visit";
import type { MomentCopy } from "../../lib/copy/moments";
import { MomentBubble, type MomentPlace } from "./moment-bubble";

/**
 * The moments' one controller (discovery R1, plan `2026-10-16-moments.md`). Mounted once by the shell, which hands it
 * the moments live for this reader (`liveMoments`) and their spent set; with `MOMENTS_ENABLED` off it is never given
 * any, and every anchor stays inert.
 *
 * A control registers through `useMomentAnchor` while its moment's condition holds. One IntersectionObserver watches
 * every registered control. The first one on screen opens the tie window (`ARRIVE_MS`, audit resolution 8); when it
 * closes, `pickMoment` chooses among the controls on screen then, and the winner's bubble arrives. A moment never
 * arrives while anything is open over the page (`lib/moments/hold.ts`), except a control inside the topmost open modal
 * (M8, M9 in card details).
 *
 * Spent (G5): a bubble the reader closes (✕, Esc, a press of the control or elsewhere) is spent at once; one torn down
 * by the page (the control scrolled out, a surface opened over it, the page left) is spent only once it has been on
 * screen for `SPENT_AFTER_MS`. Spending takes the visit in every tab (`lib/moments/visit.ts`) and writes the id to the
 * account through `spendMomentAction`.
 */
export const ARRIVE_MS = 600;
export const SPENT_AFTER_MS = 1000;
/** `--motion-exit-quick`. */
const LEAVE_MS = 140;
/** Activity closer together than this touches the visit once. */
const TOUCH_EVERY_MS = 60_000;

type Anchor = { id: MomentId; el: HTMLElement; copy: MomentCopy; place: MomentPlace };
type Showing = Anchor & { since: number };

type Ctx = {
  register: (anchor: Anchor) => () => void;
  showing: MomentId | null;
  noteId: string;
};

const MomentsContext = createContext<Ctx | null>(null);

/** The topmost open modal surface, which is the last one in the document: every sheet and dialog portals to the end. */
function topModal(): Element | null {
  const all = document.querySelectorAll('[aria-modal="true"]');
  return all.length > 0 ? all[all.length - 1] : null;
}

/** Whether a moment for this control may show now: nothing over the page, or the control is inside what is on top. */
function clearOver(el: HTMLElement): boolean {
  const { locks, holds } = overPageCount();
  if (locks === 0 && holds === 0) return true;
  if (holds > 0) return false;
  const top = topModal();
  return top !== null && top.contains(el);
}

export function MomentsProvider({
  live,
  spent: spentAtLoad,
  children,
}: {
  live: readonly MomentId[];
  spent: readonly string[];
  children: ReactNode;
}) {
  // Keyed on the ids, not the array: each shell render hands a new one, and the observer must not restart for it.
  const liveKey = live.join(",");
  const liveSet = useMemo(() => new Set<string>(liveKey === "" ? [] : liveKey.split(",")), [liveKey]);
  const spent = useRef(new Set<string>(spentAtLoad));
  // A fresh server render of the shell carries the account's set again; union, never replace, so a spend the
  // server has not yet answered is not forgotten.
  useEffect(() => {
    for (const id of spentAtLoad) spent.current.add(id);
  }, [spentAtLoad]);

  const anchors = useRef(new Map<MomentId, Anchor>());
  const visible = useRef(new Set<MomentId>());
  const observer = useRef<IntersectionObserver | null>(null);
  const windowTimer = useRef<number | null>(null);
  const spendTimer = useRef<number | null>(null);
  const [showing, setShowing] = useState<Showing | null>(null);
  // Mirrors `showing` for the callbacks, written beside every `setShowing`.
  const showingRef = useRef<Showing | null>(null);
  const [leaving, setLeaving] = useState<Showing | null>(null);
  const [announce, setAnnounce] = useState("");
  const lastTouch = useRef(0);
  const noteId = useId();

  const touch = useCallback(() => {
    const now = Date.now();
    if (now - lastTouch.current < TOUCH_EVERY_MS) return;
    lastTouch.current = now;
    touchVisit(now);
  }, []);

  const spend = useCallback((id: MomentId) => {
    if (spent.current.has(id)) return;
    spent.current.add(id);
    takeVisit();
    spendMomentAction(id).catch(() => {
      // The visit is already taken and the set holds it for this page; the account learns on the next spend.
    });
  }, []);

  /** Closes the bubble. `byReader` spends it at once; a teardown spends it only past `SPENT_AFTER_MS`. */
  const close = useCallback(
    (byReader: boolean) => {
      const s = showingRef.current;
      if (s === null) return;
      if (spendTimer.current !== null) window.clearTimeout(spendTimer.current);
      spendTimer.current = null;
      if (byReader || Date.now() - s.since >= SPENT_AFTER_MS) spend(s.id);
      showingRef.current = null;
      setShowing(null);
      setAnnounce("");
      // The leave fade (140ms), drawn by a copy that takes no press; instant under reduced motion.
      if (!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
        setLeaving(s);
        window.setTimeout(() => setLeaving((l) => (l === s ? null : l)), LEAVE_MS);
      }
    },
    [spend],
  );

  const decide = useCallback(() => {
    windowTimer.current = null;
    if (showingRef.current !== null) return;
    const onScreen = [...visible.current].filter((id) => {
      const a = anchors.current.get(id);
      return a !== undefined && clearOver(a.el);
    });
    if (onScreen.length === 0) return;
    const visit = touchVisit();
    lastTouch.current = Date.now();
    const id = pickMoment({ onScreen, live: liveSet, spent: spent.current, visitTaken: visit.taken });
    if (id === null) return;
    const anchor = anchors.current.get(id)!;
    const next = { ...anchor, since: Date.now() };
    showingRef.current = next;
    setShowing(next);
    setAnnounce(`${anchor.copy.tool} ${anchor.copy.line}`);
    spendTimer.current = window.setTimeout(() => {
      spendTimer.current = null;
      spend(id);
    }, SPENT_AFTER_MS);
  }, [liveSet, spend]);

  const arm = useCallback(() => {
    if (windowTimer.current !== null || showingRef.current !== null || visible.current.size === 0) return;
    windowTimer.current = window.setTimeout(decide, ARRIVE_MS);
  }, [decide]);

  useEffect(() => {
    // Nothing live (the switch off, or every tool off): no observer, and every anchor stays inert.
    if (liveSet.size === 0 || typeof IntersectionObserver === "undefined") return;
    observer.current = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).dataset.momentAnchor as MomentId | undefined;
          if (id === undefined) continue;
          if (e.isIntersecting) visible.current.add(id);
          else {
            visible.current.delete(id);
            if (showingRef.current?.id === id) close(false);
          }
        }
        arm();
      },
      { threshold: 0.6 },
    );
    for (const a of anchors.current.values()) observer.current.observe(a.el);
    return () => {
      observer.current?.disconnect();
      observer.current = null;
      if (windowTimer.current !== null) window.clearTimeout(windowTimer.current);
      if (spendTimer.current !== null) window.clearTimeout(spendTimer.current);
    };
  }, [arm, close, liveSet]);

  // Something opening over the page tears a page moment down; its closing lets a waiting one arrive.
  useEffect(
    () =>
      subscribeOverPage(() => {
        const s = showingRef.current;
        if (s !== null && !clearOver(s.el)) close(false);
        arm();
      }),
    [arm, close],
  );

  // Leaving the page ends the bubble, and is activity.
  const pathname = usePathname();
  useEffect(() => {
    touch();
    return () => close(false);
  }, [pathname, touch, close]);

  useEffect(() => {
    window.addEventListener("pointerdown", touch, { passive: true });
    window.addEventListener("keydown", touch);
    return () => {
      window.removeEventListener("pointerdown", touch);
      window.removeEventListener("keydown", touch);
    };
  }, [touch]);

  const register = useCallback(
    (anchor: Anchor) => {
      if (!liveSet.has(anchor.id) || spent.current.has(anchor.id)) return () => {};
      anchor.el.dataset.momentAnchor = anchor.id;
      anchors.current.set(anchor.id, anchor);
      observer.current?.observe(anchor.el);
      return () => {
        observer.current?.unobserve(anchor.el);
        delete anchor.el.dataset.momentAnchor;
        if (anchors.current.get(anchor.id)?.el === anchor.el) anchors.current.delete(anchor.id);
        visible.current.delete(anchor.id);
        if (showingRef.current?.id === anchor.id) close(false);
      };
    },
    [liveSet, close],
  );

  const ctx = useMemo<Ctx>(() => ({ register, showing: showing?.id ?? null, noteId }), [register, showing, noteId]);

  return (
    <MomentsContext.Provider value={ctx}>
      {children}
      {showing && (
        <MomentBubble
          key={showing.since}
          id={noteId}
          anchor={showing.el}
          copy={showing.copy}
          place={showing.place}
          onDismiss={() => close(true)}
        />
      )}
      {leaving && leaving.el.isConnected && (
        <MomentBubble
          key={`leaving-${leaving.since}`}
          id={`${noteId}-leaving`}
          anchor={leaving.el}
          copy={leaving.copy}
          place={leaving.place}
          leaving
          onDismiss={() => {}}
        />
      )}
      {/* The one polite live region every moment is spoken through, once, as it arrives. */}
      <div aria-live="polite" className="sr-only">
        {announce}
      </div>
    </MomentsContext.Provider>
  );
}

/**
 * Makes a control a moment's anchor while `eligible` (its condition holds on the reader's own data). Spread the
 * result on the control: `ref` registers it, and `aria-describedby` points at the bubble while it shows. Outside the
 * provider, or for a moment that is not live or already spent, it does nothing.
 */
export function useMomentAnchor(
  id: MomentId,
  { eligible, copy, place = "below" }: { eligible: boolean; copy: MomentCopy; place?: MomentPlace },
): { ref: (el: HTMLElement | null) => void; "aria-describedby"?: string } {
  const ctx = useContext(MomentsContext);
  const [el, setEl] = useState<HTMLElement | null>(null);
  const register = ctx?.register;
  const { tool, line } = copy;
  useEffect(() => {
    if (!register || !eligible || el === null) return;
    return register({ id, el, copy: { tool, line }, place });
  }, [register, eligible, el, id, tool, line, place]);
  const shown = ctx !== null && ctx.showing === id;
  return { ref: setEl, ...(shown ? { "aria-describedby": ctx.noteId } : {}) };
}
