"use client";
// The invite QR's own screen watches its QR while it is live (plan `2026-10-16-invites.md`, Q1 to Q4), so a newcomer's
// claim, or the QR running out, redraws the screen without a refresh. The same shape as `useInviteWatch`: a light poll
// of `/api/invite-qr?t=` every WATCH_MS, only while the tab is visible (a hidden tab polls nothing, and coming back
// polls at once). It stops when no token is given (the screen is not showing a live QR) and once it has reported an
// end, claimed or expired, for that token: the end is final.

import { useEffect, useRef } from "react";
import { WATCH_MS } from "./use-invite-watch";

export type QrWatchAnswer = { state: "live"; secondsLeft: number } | { state: "claimed" } | { state: "expired" };

export function useInviteQrWatch(token: string | null, onEnded: (state: "claimed" | "expired") => void) {
  const latest = useRef(onEnded);
  useEffect(() => {
    latest.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    if (!token) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let inFlight: AbortController | null = null;
    let stopped = false;
    const hidden = () => document.visibilityState === "hidden";
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      if (!stopped && !hidden()) timer = setTimeout(() => void poll(), WATCH_MS);
    };
    async function poll() {
      timer = null;
      if (stopped || inFlight) return;
      inFlight = new AbortController();
      let ended: "claimed" | "expired" | null = null;
      try {
        const res = await fetch(`/api/invite-qr?t=${encodeURIComponent(token as string)}`, { signal: inFlight.signal, cache: "no-store" });
        if (res.ok) {
          const answer = (await res.json()) as QrWatchAnswer;
          if (answer.state === "claimed" || answer.state === "expired") ended = answer.state;
        }
      } catch {
        // A failed poll (offline, aborted) changes nothing; the next one asks again.
      }
      inFlight = null;
      if (stopped) return;
      if (ended) {
        stopped = true;
        latest.current(ended);
        return;
      }
      schedule();
    }
    const onVisibility = () => {
      if (hidden()) {
        if (timer) clearTimeout(timer);
        timer = null;
      } else void poll();
    };
    document.addEventListener("visibilitychange", onVisibility);
    schedule();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      inFlight?.abort();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [token]);
}
