"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { spendMomentAction } from "../../app/moments-actions";
import { overPageCount, subscribeOverPage } from "../../lib/moments/hold";
import { pickMoment, type MomentId } from "../../lib/moments/registry";
import { claimVisit, peekVisit, releaseClaim, takeVisit, touchVisit, withVisitLock, VISIT_KEY } from "../../lib/moments/visit";
import type { MomentCopy } from "../../lib/copy/moments";
import { MomentBubble, type MomentPlace } from "./moment-bubble";
import { useTarget } from "../discovery/targets-provider";
import { useMergedRef } from "../ui/use-merged-ref";

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
/** The channel every tab hears a spend on. */
const SPENT_CHANNEL = "the99.moments.spent";

export const ARRIVE_MS = 600;
export const SPENT_AFTER_MS = 1000;
/** How long a failed spend waits before it is written again. */
const PERSIST_RETRY_MS = 15_000;
/** `--motion-exit-quick`. */
const LEAVE_MS = 140;
/** Activity closer together than this touches the visit once. */
const TOUCH_EVERY_MS = 60_000;

/** `fallback`: this control stands in for the moment's own, and counts only while no other control of that moment is
 *  registered (audit resolution 2: M3 and M4 fall back to the Analysis tab when their shortcut is not drawn). */
type Anchor = { id: MomentId; el: HTMLElement; copy: MomentCopy; place: MomentPlace; fallback?: boolean };
type Showing = Anchor & { since: number };

type Ctx = {
  register: (anchor: Anchor) => () => void;
  /** Spends a moment without showing it (the landing, discovery R2 E11). */
  suppress: (id: MomentId) => void;
  /** The control the bubble shows beside: one moment can have several anchors (each row, the rail and the tab bar). */
  showingEl: HTMLElement | null;
  noteId: string;
};

/** This tab, for the visit's provisional claim. */
const TAB_ID = Math.random().toString(36).slice(2);

const MomentsContext = createContext<Ctx | null>(null);

/**
 * Whether a moment for this control may show now: nothing open over the page, or the control is inside what is on
 * top. Read two ways, because neither alone sees every surface: the counters (`lib/moments/hold.ts`) see what locks
 * scroll or holds the moments, and the DOM sees every drawn dialog or menu, including the many that lock nothing.
 */
const OVER_PAGE = '[aria-modal="true"], [role="dialog"], [role="menu"]';
function clearOver(el: HTMLElement): boolean {
  // An inert control is covered by something inside its own surface (card details' zoom and inner views).
  if (el.closest("[inert]") !== null) return false;
  const { locks, holds } = overPageCount();
  if (holds > 0) return false;
  const open = [...document.querySelectorAll<HTMLElement>(OVER_PAGE)].filter((n) => n.getClientRects().length > 0);
  if (locks === 0 && open.length === 0) return true;
  // A control in a modal may show while nothing is drawn over that modal. Every surface portals to the end of the
  // document, so one drawn over it FOLLOWS it; one before it (a covered card details behind the foreground one) is
  // under it and does not count.
  const mine = el.closest<HTMLElement>('[aria-modal="true"]');
  if (mine === null) return false;
  return open.every(
    (n) =>
      n.contains(el) ||
      n.contains(mine) ||
      (mine.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING) === 0,
  );
}

/** While a control is on screen but something is open over it, how often to look again. */
const RETRY_MS = 1000;

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
  const liveSize = useRef(liveSet.size);
  useEffect(() => {
    liveSize.current = liveSet.size;
  }, [liveSet]);
  const spent = useRef(new Set<string>(spentAtLoad));
  // A fresh server render of the shell carries the account's set again; union, never replace, so a spend the
  // server has not yet answered is not forgotten.
  useEffect(() => {
    for (const id of spentAtLoad) spent.current.add(id);
  }, [spentAtLoad]);

  // One registration per (control, moment): a moment may have several controls (repeated rows, the rail and the tab
  // bar) and a control several moments (M5 and M6 share the other-ways press). Each is cleaned up on its own.
  const regs = useRef(new Map<number, Anchor>());
  const byEl = useRef(new Map<Element, Set<number>>());
  const visible = useRef(new Set<number>());
  const nextReg = useRef(0);
  const observer = useRef<IntersectionObserver | null>(null);
  const windowTimer = useRef<number | null>(null);
  const spendTimer = useRef<number | null>(null);
  const [showing, setShowing] = useState<Showing | null>(null);
  // Mirrors `showing` for the callbacks, written beside every `setShowing`.
  const showingRef = useRef<Showing | null>(null);
  const [leaving, setLeaving] = useState<Showing | null>(null);
  const [announce, setAnnounce] = useState("");
  const lastTouch = useRef(0);
  // Spent ids reach every other open tab of this browser, so a tab loaded before a spend never shows it again.
  const channel = useRef<BroadcastChannel | null>(null);
  const noteId = useId();

  // A spend the server has not acknowledged is kept and written again, after a pause and on the next activity: the
  // write is idempotent, and a lost one would show a dismissed moment again after a reload.
  const unsaved = useRef(new Set<MomentId>());
  const persist = useCallback((id: MomentId) => {
    unsaved.current.add(id);
    spendMomentAction(id).then(
      () => unsaved.current.delete(id),
      () => window.setTimeout(() => {
        if (unsaved.current.has(id)) persistRef.current(id);
      }, PERSIST_RETRY_MS),
    );
  }, []);
  const persistRef = useRef(persist);

  // Activity touches the visit, and a visit that just began after 30 minutes away reconsiders every control already on
  // screen, since none of them will report a fresh intersection.
  const armRef = useRef<() => void>(() => {});
  const touch = useCallback(() => {
    // Nothing live: the visit is not this page's business, and storage is left alone.
    if (liveSize.current === 0) return;
    const now = Date.now();
    if (now - lastTouch.current < TOUCH_EVERY_MS) return;
    lastTouch.current = now;
    // The clock is read inside the lock: one read before it can trail a write another holder made since, and a visit
    // stamped after `now` reads as a clock gone backwards, which starts a fresh visit and drops a live claim.
    void withVisitLock(() => touchVisit()).then(() => armRef.current());
    for (const id of unsaved.current) persistRef.current(id);
  }, []);


  // Tells every other tab a moment is spent. Before the provider's own channel is open (a descendant's mount effect
  // runs first), a one-off sender carries it, so an early spend is never lost to the other tabs.
  const broadcast = useCallback((id: MomentId) => {
    if (channel.current !== null) return channel.current.postMessage(id);
    if (typeof BroadcastChannel === "undefined") return;
    const once = new BroadcastChannel(SPENT_CHANNEL);
    once.postMessage(id);
    once.close();
  }, []);

  const spend = useCallback((id: MomentId) => {
    if (spent.current.has(id)) return;
    spent.current.add(id);
    void withVisitLock(() => takeVisit());
    broadcast(id);
    persist(id);
  }, [persist, broadcast]);

  /** Closes the bubble. `byReader` spends it at once; a teardown spends it only past `SPENT_AFTER_MS`. */
  const close = useCallback(
    (byReader: boolean) => {
      const s = showingRef.current;
      if (s === null) return;
      if (spendTimer.current !== null) window.clearTimeout(spendTimer.current);
      spendTimer.current = null;
      if (byReader || Date.now() - s.since >= SPENT_AFTER_MS) spend(s.id);
      // Torn down unspent: give the visit back to every tab.
      else void withVisitLock(() => releaseClaim(TAB_ID));
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

  const show = useCallback(
    (anchor: Anchor) => {
      const id = anchor.id;
      const next = { ...anchor, since: Date.now() };
      showingRef.current = next;
      setShowing(next);
      setAnnounce(`${anchor.copy.tool} ${anchor.copy.line}`);
      spendTimer.current = window.setTimeout(() => {
        spendTimer.current = null;
        spend(id);
      }, SPENT_AFTER_MS);
    },
    [spend],
  );

  // The retry re-enters `decide` through this, since a callback cannot name itself before it is declared.
  const decideRef = useRef<() => void>(() => {});
  const decide = useCallback(() => {
    windowTimer.current = null;
    // A hidden page shows nothing: its time on screen would be counted without a reader seeing it.
    if (showingRef.current !== null || document.hidden) return;
    // A fallback gives way to the moment's own control whenever that control is drawn, on screen or not.
    const primaries = new Set([...regs.current.values()].filter((a) => !a.fallback).map((a) => a.id));
    const clear = [...visible.current]
      .map((reg) => regs.current.get(reg))
      .filter((a): a is Anchor => a !== undefined && !(a.fallback && primaries.has(a.id)) && clearOver(a.el));
    const onScreen = [...new Set(clear.map((a) => a.id))];
    if (onScreen.length === 0) {
      // Covered, not gone: look again shortly, since a surface that locks nothing reports no close.
      if (visible.current.size > 0) windowTimer.current = window.setTimeout(() => decideRef.current(), RETRY_MS);
      return;
    }
    // Read only: a write here would race another tab's claim, and ping its storage listener into deciding again.
    const visit = peekVisit();
    const id = pickMoment({ onScreen, live: liveSet, spent: spent.current, visitTaken: visit.taken });
    if (id === null) return;
    // An exclusive claim on the visit across tabs, made under the visit lock and held until the spend takes it or a
    // teardown releases it, so two tabs whose windows close together never both show one. Refused while another tab
    // holds it: look again, since that claim may be released or expire.
    void withVisitLock(() => claimVisit(TAB_ID)).then((ok) => {
      if (!ok) {
        if (windowTimer.current === null) windowTimer.current = window.setTimeout(() => decideRef.current(), RETRY_MS);
        return;
      }
      const anchor = clear.find((a) => a.id === id)!;
      // Suppressed while the claim was in flight: the landing spent it, so it never shows, and the window decides again
      // once the claim is back, since a control already on screen fires no new intersection to wake it.
      if (spent.current.has(anchor.id)) {
        void withVisitLock(() => releaseClaim(TAB_ID)).then(() => decideRef.current());
        return;
      }
      if (showingRef.current !== null || document.hidden || ![...regs.current.values()].includes(anchor) || !clearOver(anchor.el)) {
        void withVisitLock(() => releaseClaim(TAB_ID));
        return;
      }
      show(anchor);
    });
  }, [liveSet, show]);



  // Hidden, a bubble is torn down (unspent inside its second); visible again, the controls on screen are reconsidered.
  // Another tab releasing or taking the visit, or spending a moment, is heard here too.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) close(false);
      else armRef.current();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === VISIT_KEY) armRef.current();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("storage", onStorage);
    if (typeof BroadcastChannel !== "undefined") {
      channel.current = new BroadcastChannel(SPENT_CHANNEL);
      channel.current.onmessage = (e: MessageEvent) => {
        if (typeof e.data !== "string") return;
        const added = !spent.current.has(e.data);
        spent.current.add(e.data);
        const s = showingRef.current;
        if (s !== null && s.id === e.data) close(false);
        // Another tab's landing spends without taking the visit (`suppress`), so a control here may still be owed its
        // bubble, freed by the close or by the spend itself (`after`): the window opens again, as it does when another
        // tab's claim is heard. A spend that took the visit finds nothing owed.
        if (added) armRef.current();
      };
    }
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("storage", onStorage);
      channel.current?.close();
      channel.current = null;
    };
  }, [close]);

  const arm = useCallback(() => {
    if (windowTimer.current !== null || showingRef.current !== null || visible.current.size === 0) return;
    windowTimer.current = window.setTimeout(decide, ARRIVE_MS);
  }, [decide]);
  useEffect(() => {
    decideRef.current = decide;
    armRef.current = arm;
  }, [decide, arm]);

  useEffect(() => {
    // Nothing live (the switch off, or every tool off): no observer, and every anchor stays inert.
    if (liveSet.size === 0 || typeof IntersectionObserver === "undefined") return;
    observer.current = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          for (const reg of byEl.current.get(e.target) ?? []) {
            if (e.isIntersecting) visible.current.add(reg);
            else visible.current.delete(reg);
          }
          if (!e.isIntersecting && showingRef.current?.el === e.target) close(false);
        }
        arm();
      },
      { threshold: 0.6 },
    );
    for (const el of byEl.current.keys()) observer.current.observe(el);
    return () => {
      observer.current?.disconnect();
      observer.current = null;
      if (windowTimer.current !== null) window.clearTimeout(windowTimer.current);
      if (spendTimer.current !== null) window.clearTimeout(spendTimer.current);
      windowTimer.current = null;
      spendTimer.current = null;
    };
  }, [arm, close, liveSet]);

  // Something opening over the page tears a page moment down; its closing lets a waiting one arrive.
  useEffect(
    () =>
      subscribeOverPage(() => {
        const s = showingRef.current;
        if (s !== null && !clearOver(s.el)) close(false);
        // A surface closing restarts the window at once rather than waiting out a retry.
        if (windowTimer.current !== null) window.clearTimeout(windowTimer.current);
        windowTimer.current = null;
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
      const reg = nextReg.current++;
      regs.current.set(reg, anchor);
      let onEl = byEl.current.get(anchor.el);
      if (onEl === undefined) {
        onEl = new Set();
        byEl.current.set(anchor.el, onEl);
        observer.current?.observe(anchor.el);
      } else if (observer.current) {
        // Already watched: observe again so this registration hears the control's current state.
        observer.current.unobserve(anchor.el);
        observer.current.observe(anchor.el);
      }
      onEl.add(reg);
      return () => {
        regs.current.delete(reg);
        visible.current.delete(reg);
        const set = byEl.current.get(anchor.el);
        set?.delete(reg);
        if (set !== undefined && set.size === 0) {
          byEl.current.delete(anchor.el);
          observer.current?.unobserve(anchor.el);
        }
        const s = showingRef.current;
        if (s !== null && s.el === anchor.el && s.id === anchor.id) close(false);
      };
    },
    [liveSet, close],
  );

  // The landing (discovery R2, E11) spends a tool's moment through here, before it scrolls, so no bubble can show for
  // it. The id goes into the spent set, which every pending delivery reads (`decide` skips a spent moment, so a tie
  // window already open passes over it); a bubble already showing for it closes as the reader's own close would; and
  // the spend is written through the shipped persistence path. Only a live moment is spent: with `MOMENTS_ENABLED` off
  // nothing is live, and nothing is written.
  const suppress = useCallback(
    (id: MomentId) => {
      if (!liveSet.has(id)) return;
      // Recorded once, and never by `spend`, which takes the visit: a landing is not the reader seeing a bubble.
      const added = !spent.current.has(id);
      if (added) {
        spent.current.add(id);
        broadcast(id);
        persist(id);
      }
      // Closed as a teardown, not as the reader's close: under `SPENT_AFTER_MS` the claim goes back (the id is already
      // spent, so the moment never returns); past it the timer has already spent the id and taken the visit, which
      // stays taken.
      const closed = showingRef.current?.id === id;
      if (closed) close(false);
      // Then the window decides again whenever the spent set or the bubble moved: a closed bubble frees the window, and
      // a new spend can free a moment that waits on it (`after`: Mana Balance on Suggested changes). A control already
      // on screen fires no new intersection to wake it.
      if (added || closed) decideRef.current();
    },
    [liveSet, close, persist, broadcast],
  );

  const ctx = useMemo<Ctx>(
    () => ({ register, suppress, showingEl: showing?.el ?? null, noteId }),
    [register, suppress, showing, noteId],
  );

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

/** Spends a moment without showing it (the landing, discovery R2 E11). Outside the provider it does nothing. */
export function useSuppressMoment(): (id: MomentId) => void {
  return useContext(MomentsContext)?.suppress ?? noop;
}
const noop = () => {};

/**
 * Makes a control a moment's anchor while `eligible` (its condition holds on the reader's own data). Spread the
 * result on the control: `ref` registers it, and `aria-describedby` points at the bubble while it shows. Outside the
 * provider, or for a moment that is not live or already spent, it does nothing. A `fallback` anchor stands in for the
 * moment's own control and counts only while no other anchor of that moment is registered.
 *
 * While eligible the control is also the moment's TARGET (`useTarget`, discovery R2), so the landing and Show me reach
 * it with no second registration. A fallback is never a target, and `target: false` is for a shortcut that is not the
 * tool's own control, so the landing reaches the tool rather than the shortcut. No caller passes it yet: the deck
 * tools' shortcuts take it with the landing that reads their targets (R2·2b).
 */
export function useMomentAnchor(
  id: MomentId,
  {
    eligible,
    copy,
    place = "below",
    fallback = false,
    target = true,
  }: { eligible: boolean; copy: MomentCopy; place?: MomentPlace; fallback?: boolean; target?: boolean },
): { ref: (el: HTMLElement | null) => void; "aria-describedby"?: string } {
  const ctx = useContext(MomentsContext);
  const [el, setEl] = useState<HTMLElement | null>(null);
  const register = ctx?.register;
  const { tool, line } = copy;
  useEffect(() => {
    if (!register || !eligible || el === null) return;
    return register({ id, el, copy: { tool, line }, place, fallback });
  }, [register, eligible, el, id, tool, line, place, fallback]);
  const targetRef = useTarget(eligible && target && !fallback ? id : null);
  const ref = useMergedRef(setEl, targetRef);
  const shown = ctx !== null && el !== null && ctx.showingEl === el;
  return { ref, ...(shown ? { "aria-describedby": ctx.noteId } : {}) };
}
