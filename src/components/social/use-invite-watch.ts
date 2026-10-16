"use client";
// /friends watches the reader's own links while one is shown or open, so a friend who scans the QR code and
// accepts appears without a refresh. A light poll of `/api/friend-invites` every WATCH_MS, only while the tab is
// visible: a hidden tab polls nothing, and coming back polls at once. It stops when no link is watched. A link it
// has already reported is never reported again, so the page's redraw (which drops it) is not raced by a repeat.

import { useEffect, useRef } from "react";
import type { InviteOutcome } from "../../lib/social/friends";
import { MAX_OPEN_INVITES } from "../../lib/social/client-rules";

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
      const signal = inFlight.signal;
      const ended: InviteOutcome[] = [];
      // The route answers at most MAX_OPEN_INVITES tokens, and the shown link beside ten open ones is eleven, so
      // the watch asks in batches; a token a successful batch leaves out is no longer the reader's open link.
      for (let i = 0; i < left.length && !stopped; i += MAX_OPEN_INVITES) {
        const batch = left.slice(i, i + MAX_OPEN_INVITES);
        try {
          const res = await fetch(`/api/friend-invites?t=${batch.join(",")}`, { signal, cache: "no-store" });
          if (!res.ok) continue;
          const { links } = (await res.json()) as { links: InviteOutcome[] };
          const answered = new Map(links.map((l) => [l.token, l]));
          for (const t of batch) {
            const l = answered.get(t) ?? { token: t, open: false, friend: null };
            if (!l.open) ended.push(l);
          }
        } catch {
          // A failed batch (offline, aborted) changes nothing; the next poll asks again.
        }
      }
      inFlight = null;
      // A watch that stopped while an answer was in flight records nothing: the watch that replaced it asks
      // again, and reports what it finds.
      if (ended.length > 0 && !stopped) {
        for (const l of ended) reported.current.add(l.token);
        latest.current(ended);
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
