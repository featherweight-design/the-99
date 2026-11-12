"use client";
// The give-up every invite press shares (Show an invite QR, Send invitation, and the friend link's two makeLink
// sites). A request that never answers would hold its press for good: iOS suspends a home-screen app mid-request,
// and nothing comes back. So each wait is given up after PRESS_WAIT_MS, and on coming back to the app (no timer runs
// while it is suspended) once the request is older than that. A given-up request answers "late"; its caller says the
// failure with Try again, and reads a reply that still comes as news, never draws it.

import { useCallback, useEffect, useRef } from "react";

/** How long an invite request may hold its press before it is given up and said as a failure (Try again re-asks). */
export const PRESS_WAIT_MS = 15_000;

type Waiter = { since: number; giveUp: () => void };

/**
 * `wait(call)` answers the call's own result, or `"late"` once it has waited PRESS_WAIT_MS (on the timer, or on the
 * app coming back after longer than that), whichever comes first. A call that throws rejects as it would have.
 */
export function usePressWait(): <T>(call: Promise<T>) => Promise<T | "late"> {
  const waiting = useRef(new Set<Waiter>());
  useEffect(() => {
    const set = waiting.current;
    const back = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      for (const w of [...set]) if (now - w.since >= PRESS_WAIT_MS) w.giveUp();
    };
    document.addEventListener("visibilitychange", back);
    return () => document.removeEventListener("visibilitychange", back);
  }, []);
  return useCallback(<T,>(call: Promise<T>) => new Promise<T | "late">((resolve, reject) => {
    let done = false;
    const finish = (then: () => void) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      waiting.current.delete(w);
      then();
    };
    const w: Waiter = { since: Date.now(), giveUp: () => finish(() => resolve("late")) };
    const timer = setTimeout(w.giveUp, PRESS_WAIT_MS);
    waiting.current.add(w);
    call.then((v) => finish(() => resolve(v)), (e: unknown) => finish(() => reject(e)));
  }), []);
}
