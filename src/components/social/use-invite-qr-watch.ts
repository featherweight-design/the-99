"use client";
// The invite QR's own screen watches its QR while it is live (plan `2026-10-16-invites.md`, Q1 to Q4), so a newcomer's
// claim, or the QR running out, redraws the screen without a refresh. The same shape as `useInviteWatch`: a light poll
// of `/api/invite-qr?t=` every WATCH_MS, only while the tab is visible (a hidden tab polls nothing, and coming back
// polls at once). A live answer hands its `secondsLeft` on, so the screen's countdown follows the server's clock. It
// stops when no token is given (the screen is not showing a live QR) and once it has reported an end, claimed or
// expired, for that token: the end is final.

import { useEffect, useRef } from "react";
import { WATCH_MS } from "./use-invite-watch";

export type QrWatchAnswer = { state: "live"; secondsLeft: number } | { state: "claimed" } | { state: "expired" };

/** One ask of `/api/invite-qr` for a QR's state, or null for a failed ask. */
export async function readQrState(token: string, signal?: AbortSignal): Promise<QrWatchAnswer | null> {
  try {
    const res = await fetch(`/api/invite-qr?t=${encodeURIComponent(token)}`, { signal, cache: "no-store" });
    if (!res.ok) return null;
    const answer = (await res.json()) as QrWatchAnswer;
    if (answer.state === "claimed" || answer.state === "expired") return { state: answer.state };
    if (answer.state === "live" && typeof answer.secondsLeft === "number" && Number.isFinite(answer.secondsLeft)) {
      return { state: "live", secondsLeft: Math.max(0, answer.secondsLeft) };
    }
    return null;
  } catch {
    // A failed poll (offline, aborted) changes nothing; the next one asks again.
    return null;
  }
}

export function useInviteQrWatch(
  token: string | null,
  onEnded: (state: "claimed" | "expired") => void,
  /** A live answer, with the server's time left: the screen re-bases its countdown on it (a device clock may run ahead). */
  onLive?: (secondsLeft: number) => void,
) {
  const latest = useRef(onEnded);
  const latestLive = useRef(onLive);
  useEffect(() => {
    latest.current = onEnded;
    latestLive.current = onLive;
  }, [onEnded, onLive]);

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
      const answer = await readQrState(token as string, inFlight.signal);
      inFlight = null;
      if (stopped) return;
      if (answer && answer.state !== "live") {
        stopped = true;
        latest.current(answer.state);
        return;
      }
      if (answer) latestLive.current?.(answer.secondsLeft);
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
