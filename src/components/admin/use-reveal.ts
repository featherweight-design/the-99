"use client";

// The reveal's state for one view (Admin R3, D6, D7): the accounts list and the account page each mount their own,
// so a list reveal never carries to the account page. An entry stands until its `hidesAt` (5 minutes after the Show,
// as the server stamped it), a Hide, or the view unmounting (a navigation, a reload, a closed tab), and re-masks
// quietly. A Show that answers after the view is gone, or after a Hide, sets nothing.

import { useCallback, useEffect, useRef, useState } from "react";
import { revealAccount } from "../../app/admin/accounts/actions";
import type { RevealResult } from "../../lib/admin/reveal";

export type Revealed = { name: string | null; email: string | null; id: string; hidesAt: Date };
/** The failed Show the view's toast names, by the account's masked name. */
export type RevealFailure = { id: string; masked: string; n: number };

/** `onShown`: after a Show lands, for a view that draws its own log (the account page's History, D8). */
export function useReveal(reveal: (id: string) => Promise<RevealResult> = revealAccount, onShown?: () => void) {
  const [revealed, setRevealed] = useState<ReadonlyMap<string, Revealed>>(new Map());
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [failure, setFailure] = useState<RevealFailure | null>(null);
  // Numbers each failure, so its toast is a new one with a whole window.
  const failures = useRef(0);
  const timers = useRef(new Map<string, number>());
  const mounted = useRef(true);
  // A Show asked again, or a Hide, retires the answer still in flight for that account.
  const asked = useRef(new Map<string, number>());

  useEffect(() => {
    mounted.current = true;
    const all = timers.current;
    // Leaving by a full-document navigation can keep this view in the back/forward cache without unmounting it, so
    // leaving re-masks here too (D7): every reveal and timer goes, every answer in flight is retired, and a Show after
    // the page comes back is a new one. Cleared again on a restore, in case the page froze before the first render.
    const leave = () => {
      for (const t of all.values()) window.clearTimeout(t);
      all.clear();
      for (const id of asked.current.keys()) asked.current.set(id, (asked.current.get(id) ?? 0) + 1);
      setRevealed((prev) => (prev.size ? new Map() : prev));
      setPending((prev) => (prev.size ? new Set() : prev));
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) leave();
    };
    window.addEventListener("pagehide", leave);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      mounted.current = false;
      window.removeEventListener("pagehide", leave);
      window.removeEventListener("pageshow", onPageShow);
      for (const t of all.values()) window.clearTimeout(t);
      all.clear();
    };
  }, []);

  const drop = useCallback((id: string) => {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setRevealed((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const hide = useCallback(
    (id: string) => {
      asked.current.set(id, (asked.current.get(id) ?? 0) + 1);
      drop(id);
    },
    [drop],
  );

  const show = useCallback(
    async (id: string, masked: string) => {
      const ticket = (asked.current.get(id) ?? 0) + 1;
      asked.current.set(id, ticket);
      setFailure(null);
      setPending((prev) => new Set(prev).add(id));
      let answer: RevealResult;
      try {
        answer = await reveal(id);
      } catch {
        answer = { ok: false, error: "failed" };
      }
      if (!mounted.current) return;
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (asked.current.get(id) !== ticket) return;
      if (!answer.ok) {
        setFailure({ id, masked, n: ++failures.current });
        return;
      }
      const hidesAt = new Date(answer.hidesAt);
      setRevealed((prev) => new Map(prev).set(id, { name: answer.name, email: answer.email, id: answer.id, hidesAt }));
      window.clearTimeout(timers.current.get(id));
      timers.current.set(
        id,
        window.setTimeout(() => drop(id), Math.max(0, hidesAt.getTime() - Date.now())),
      );
      onShown?.();
    },
    [reveal, drop, onShown],
  );

  return { revealed, pending, failure, show, hide, dismissFailure: () => setFailure(null) };
}

/** `HH:MM` in UTC, the admin's clock (D6). */
export function utcHourMinute(at: Date): string {
  return `${String(at.getUTCHours()).padStart(2, "0")}:${String(at.getUTCMinutes()).padStart(2, "0")}`;
}
