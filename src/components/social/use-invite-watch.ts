"use client";
// /friends watches the reader's own links while one is shown or open, so a friend who scans the QR code and
// accepts appears without a refresh. A light poll of `/api/friend-invites` every WATCH_MS, only while the tab is
// visible: a hidden tab polls nothing, and coming back polls at once. It stops when no link is watched. A link it
// has already reported is never reported again, so the page's redraw (which drops it) is not raced by a repeat.

import { useEffect, useRef } from "react";
import type { InviteOutcome } from "../../lib/social/friends";

export const WATCH_MS = 4000;

export function useInviteWatch(tokens: readonly string[], onEnded: (ended: InviteOutcome[]) => void) {
  const latest = useRef(onEnded);
  useEffect(() => {
    latest.current = onEnded;
  }, [onEnded]);
  const reported = useRef(new Set<string>());
  const key = [...new Set(tokens)].sort().join(",");

  useEffect(() => {
    const watched = key ? key.split(",").filter((t) => !reported.current.has(t)) : [];
    if (watched.length === 0) return;
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
      const left = watched.filter((t) => !reported.current.has(t));
      if (left.length === 0) return;
      inFlight = new AbortController();
      try {
        const res = await fetch(`/api/friend-invites?t=${left.join(",")}`, { signal: inFlight.signal, cache: "no-store" });
        if (res.ok) {
          const { links } = (await res.json()) as { links: InviteOutcome[] };
          const answered = new Map(links.map((l) => [l.token, l]));
          // A token the answer leaves out is no longer the reader's open link either (it is gone).
          const ended = left
            .map((t) => answered.get(t) ?? { token: t, open: false, friend: null })
            .filter((l) => !l.open);
          if (ended.length > 0) {
            for (const l of ended) reported.current.add(l.token);
            if (!stopped) latest.current(ended);
          }
        }
      } catch {
        // A failed poll (offline, aborted) changes nothing; the next one asks again.
      } finally {
        inFlight = null;
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
  }, [key]);
}
