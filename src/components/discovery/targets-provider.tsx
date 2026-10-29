"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { TargetId } from "../../lib/discovery/targets";
import { isDrawn } from "../../lib/ui/drawn";
import { reveal, type RevealOptions } from "../../lib/ui/reveal";

/**
 * The one registry of halo targets (discovery R2/R3, plan `2026-10-16-discovery-r2-r3.md`, decision 2). Mounted once by
 * the shell, on whatever the switches say. A control registers through `useTarget(id)`, or through `useMomentAnchor`,
 * which calls it, so a moment's control is a target with no second registration. A consumer (the landing, Show me, the
 * tour) asks for a target's rect, scrolls to it, haloes it, or waits for it to register.
 *
 * One id can have several controls (each Shopping row's other-ways press); the target is the FIRST of them in the
 * document that is drawn, so the landing reaches the top one.
 *
 * The halo is R1's own look, drawn by the rule that draws a bubble's (`data-target-halo` beside `data-moment-halo`),
 * set on the control and taken off after `ms`. It never draws a bubble and never presses anything.
 */
export const HALO_MS = 2400;
/** The landing's own halo attribute, drawn by the same rule as a bubble's `data-moment-halo` (globals.css). Its own,
 *  so a bubble's teardown never takes a landing's halo off, and a landing's timer never takes a bubble's off. */
export const HALO_ATTR = "data-target-halo";

export type Targets = {
  targetRect: (id: TargetId) => DOMRect | null;
  /** Brings the target to the middle of the view through the app's own `reveal` (eased, marked as the app's scroll,
   *  instant under reduced motion). False when it is not drawn. `{ beat: false }` skips the motion beat: the Try it
   *  landing's alone (Hugh's ruling 2026-10-29), since no press of the reader's precedes it. */
  scrollToTarget: (id: TargetId, options?: RevealOptions) => boolean;
  /** Haloes the target for `ms`. False when it is not drawn. */
  haloTarget: (id: TargetId, ms?: number) => boolean;
  /** The target's element once it registers, or null when `timeoutMs` passes first (never, for `Infinity`) or `signal`
   *  aborts. */
  whenTarget: (id: TargetId, timeoutMs: number, signal?: AbortSignal) => Promise<HTMLElement | null>;
  /** A landing that waits for a control inside a card's details asks for the phone's next such card to open at the full
   *  sheet (R3 addendum, item 12). Returns the call that withdraws the ask. One ask per id; `wantsFull` reads it, `takeFull`
   *  spends it. */
  askFull: (id: TargetId) => () => void;
  wantsFull: (id: TargetId) => boolean;
  takeFull: (id: TargetId) => void;
};

type Ctx = Targets & {
  register: (id: TargetId, el: HTMLElement) => () => void;
  /** A change to what `targetRect` would answer: a registration, an unregistration, or a control shown or hidden. */
  subscribe: (listener: () => void) => () => void;
  version: () => number;
};

const TargetsContext = createContext<Ctx | null>(null);

/** While a landing waits, how often it looks again for a target that is registered but not yet shown. */
const LOOK_AGAIN_MS = 200;
/** The attributes whose change can show a registered control (`isDrawn`), watched while a landing waits. */
const SHOWN_BY = ["hidden", "class", "style"];

/** The first of an id's controls in the document that is drawn (`isDrawn`): one under `hidden` is passed over until it
 *  shows, and so is the copy of a control a stylesheet hides at this width. */
function firstInDocument(els: Iterable<HTMLElement>): HTMLElement | null {
  let first: HTMLElement | null = null;
  for (const el of els) {
    if (!el.isConnected || !isDrawn(el)) continue;
    if (first === null || (first.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING) !== 0) first = el;
  }
  return first;
}

/**
 * Whether the shell draws its nav locked (`uniqueCards === 0`), handed down by the shell itself. The tour taken again
 * (R3·2) reads it, not Home's own figures: a dashboard with decks and no cards still has a locked nav, and the tour's
 * captions follow what the shell draws. Null outside the provider.
 */
const NavLockedContext = createContext<boolean | null>(null);

export function useNavLocked(): boolean | null {
  return useContext(NavLockedContext);
}

export function TargetsProvider({ children, navLocked = null }: { children: ReactNode; navLocked?: boolean | null }) {
  const regs = useRef(new Map<TargetId, Set<HTMLElement>>());
  const waiters = useRef(new Set<() => void>());
  const asks = useRef(new Set<TargetId>());
  // Each haloed element and the timer that takes its halo off, so a second halo replaces the first.
  const halos = useRef(new Map<HTMLElement, number>());

  const unhalo = useCallback((el: HTMLElement) => {
    const timer = halos.current.get(el);
    if (timer === undefined) return;
    window.clearTimeout(timer);
    halos.current.delete(el);
    el.removeAttribute(HALO_ATTR);
  }, []);

  const resolve = useCallback((id: TargetId) => firstInDocument(regs.current.get(id) ?? []), []);

  // The change signal (`useTargetsVersion`): a count bumped on every registration and unregistration, and, while
  // anyone listens, on a control shown or hidden, read by the same look-again a landing uses. Nobody listening, no
  // look-again runs: the ? panel subscribes only while it is open.
  const changes = useRef({ version: 0, listeners: new Set<() => void>(), look: 0, seen: "" });
  const drawnNow = useCallback(() => {
    let sig = "";
    for (const id of regs.current.keys()) if (resolve(id) !== null) sig += `${id}\n`;
    return sig;
  }, [resolve]);
  const bump = useCallback(() => {
    const c = changes.current;
    c.version += 1;
    if (c.listeners.size > 0) c.seen = drawnNow();
    for (const l of [...c.listeners]) l();
  }, [drawnNow]);
  const subscribe = useCallback(
    (listener: () => void) => {
      const c = changes.current;
      c.listeners.add(listener);
      if (c.listeners.size === 1) {
        c.seen = drawnNow();
        // A subscription attaches after commit, so the first reader rendered against the DOM before it: mounted in the
        // same update that took `hidden` off a control already registered, it read the control as not drawn, and
        // `seen`, read now, already holds it drawn, so no look-again would ever move the count for it. The bump makes
        // the store's own post-subscribe check render that reader again, against the committed DOM (PR #2054, round 1).
        c.version += 1;
        c.look = window.setInterval(() => {
          if (drawnNow() !== c.seen) bump();
        }, LOOK_AGAIN_MS);
      }
      return () => {
        c.listeners.delete(listener);
        if (c.listeners.size === 0) window.clearInterval(c.look);
      };
    },
    [drawnNow, bump],
  );
  const version = useCallback(() => changes.current.version, []);

  const register = useCallback(
    (id: TargetId, el: HTMLElement) => {
      let set = regs.current.get(id);
      if (set === undefined) {
        set = new Set();
        regs.current.set(id, set);
      }
      set.add(el);
      for (const w of [...waiters.current]) w();
      bump();
      return () => {
        const now = regs.current.get(id);
        now?.delete(el);
        if (now !== undefined && now.size === 0) regs.current.delete(id);
        // An element that leaves while haloed takes its halo with it, unless another id still holds it.
        if (![...regs.current.values()].some((s) => s.has(el))) unhalo(el);
        bump();
      };
    },
    [unhalo, bump],
  );

  const targetRect = useCallback((id: TargetId) => resolve(id)?.getBoundingClientRect() ?? null, [resolve]);

  const scrollToTarget = useCallback(
    (id: TargetId, options?: RevealOptions) => {
      const el = resolve(id);
      if (el === null) return false;
      if (options) reveal(el, "center", undefined, undefined, options);
      else reveal(el, "center");
      return true;
    },
    [resolve],
  );

  const haloTarget = useCallback(
    (id: TargetId, ms = HALO_MS) => {
      const el = resolve(id);
      if (el === null) return false;
      unhalo(el);
      el.setAttribute(HALO_ATTR, "");
      halos.current.set(
        el,
        window.setTimeout(() => {
          halos.current.delete(el);
          el.removeAttribute(HALO_ATTR);
        }, ms),
      );
      return true;
    },
    [resolve, unhalo],
  );

  const whenTarget = useCallback(
    (id: TargetId, timeoutMs: number, signal?: AbortSignal) =>
      new Promise<HTMLElement | null>((done) => {
        if (signal?.aborted) return done(null);
        const now = resolve(id);
        if (now !== null) return done(now);
        let timer = 0;
        // A registration wakes the wait at once, and so does the DOM change that shows a registered control (its panel's
        // `hidden` lifted, a class or style that drew it): the observer reads it in the same task, so the landing scrolls
        // as soon as the control can be seen, never a look-again later. The look-again stays behind it for a change no
        // mutation reports (a stylesheet arriving, the viewport crossing a breakpoint).
        const look = window.setInterval(() => check(), LOOK_AGAIN_MS);
        const shown = typeof MutationObserver === "function" ? new MutationObserver(() => check()) : null;
        shown?.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: SHOWN_BY });
        const finish = (el: HTMLElement | null) => {
          window.clearTimeout(timer);
          window.clearInterval(look);
          shown?.disconnect();
          waiters.current.delete(check);
          signal?.removeEventListener("abort", abort);
          done(el);
        };
        const check = () => {
          const el = resolve(id);
          if (el !== null) finish(el);
        };
        const abort = () => finish(null);
        waiters.current.add(check);
        signal?.addEventListener("abort", abort);
        // An unbounded wait (`Infinity`) ends only on its target or the signal: a timer that long would fire at once.
        if (Number.isFinite(timeoutMs)) timer = window.setTimeout(() => finish(null), timeoutMs);
      }),
    [resolve],
  );

  const askFull = useCallback((id: TargetId) => {
    asks.current.add(id);
    return () => void asks.current.delete(id);
  }, []);
  const wantsFull = useCallback((id: TargetId) => asks.current.has(id), []);
  const takeFull = useCallback((id: TargetId) => void asks.current.delete(id), []);

  // Leaving the shell takes every halo off, and stops a look-again still running.
  useEffect(() => {
    const live = halos.current;
    const c = changes.current;
    return () => {
      for (const el of [...live.keys()]) unhalo(el);
      window.clearInterval(c.look);
    };
  }, [unhalo]);

  const ctx = useMemo<Ctx>(
    () => ({ register, targetRect, scrollToTarget, haloTarget, whenTarget, askFull, wantsFull, takeFull, subscribe, version }),
    [register, targetRect, scrollToTarget, haloTarget, whenTarget, askFull, wantsFull, takeFull, subscribe, version],
  );
  return (
    <TargetsContext.Provider value={ctx}>
      <NavLockedContext.Provider value={navLocked}>{children}</NavLockedContext.Provider>
    </TargetsContext.Provider>
  );
}

/**
 * Makes a control a target: spread nothing, attach the returned callback ref. `null` registers nothing, so a caller can
 * gate its registration without breaking the rules of hooks. Outside the provider it does nothing.
 */
export function useTarget(id: TargetId | null): (el: HTMLElement | null) => void {
  const register = useContext(TargetsContext)?.register;
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!register || id === null || el === null) return;
    return register(id, el);
  }, [register, id, el]);
  return setEl;
}

/**
 * A target drawn as a box over its parent (which must be positioned): for a control whose own ref is already taken by
 * a callback, or that renders in a list where a hook per item cannot run. `null` registers nothing.
 */
export function TargetBox({ id }: { id: TargetId | null }) {
  const ref = useTarget(id);
  return <span ref={ref} aria-hidden data-target={id ?? undefined} className="pointer-events-none absolute inset-0" />;
}

/** The consumer API, or null outside the provider. */
export function useTargets(): Targets | null {
  const ctx = useContext(TargetsContext);
  return useMemo(
    () =>
      ctx === null
        ? null
        : {
            targetRect: ctx.targetRect,
            scrollToTarget: ctx.scrollToTarget,
            haloTarget: ctx.haloTarget,
            whenTarget: ctx.whenTarget,
            askFull: ctx.askFull,
            wantsFull: ctx.wantsFull,
            takeFull: ctx.takeFull,
          },
    [ctx],
  );
}

const NO_CHANGES = () => () => {};
const NO_VERSION = () => 0;

/**
 * A number that moves whenever what `targetRect` would answer may have changed: a control registered or gone, or one
 * shown or hidden (checked every `LOOK_AGAIN_MS` while a component reads this). A consumer that decides from
 * `targetRect` during render reads it, so it renders again on the change with nothing else pressed. 0 outside the
 * provider.
 */
export function useTargetsVersion(): number {
  const ctx = useContext(TargetsContext);
  return useSyncExternalStore(ctx?.subscribe ?? NO_CHANGES, ctx?.version ?? NO_VERSION, NO_VERSION);
}
