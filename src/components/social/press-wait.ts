"use client";
// The give-up every invite press shares (Show an invite QR, Send invitation, and the friend link's two makeLink
// sites). A request that never answers would hold its press for good: iOS suspends a home-screen app mid-request,
// and nothing comes back. So each wait is given up after PRESS_WAIT_MS, and on coming back to the app (no timer runs
// while it is suspended) once the request is older than that. A given-up request answers "late"; its caller says the
// failure with Try again, and reads a reply that still comes as news, never draws it.

import { useCallback, useEffect, useRef } from "react";
import { socialCopy } from "../../lib/copy/social";
import type { InviteScreen } from "./invite-sheet";
import type { SocialToastState } from "./social-toast";

/** How long an invite request may hold its press before it is given up and said as a failure (Try again re-asks). */
export const PRESS_WAIT_MS = 15_000;

type Waiter = { since: number; timer: ReturnType<typeof setTimeout> | null; giveUp: () => void };

/**
 * `wait(call)` answers the call's own result, or `"late"` once it has waited PRESS_WAIT_MS (on the timer, or on the
 * app coming back after longer than that), whichever comes first. A call that throws rejects as it would have. Once
 * the caller unmounts no wait is given up: its timers are cleared, so no `"late"` lands in a screen that is gone (the
 * call's own answer still does, and the caller's mounted checks decide what it draws).
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
    return () => {
      document.removeEventListener("visibilitychange", back);
      for (const w of set) if (w.timer !== null) clearTimeout(w.timer);
      set.clear();
    };
  }, []);
  return useCallback(<T,>(call: Promise<T>) => new Promise<T | "late">((resolve, reject) => {
    let done = false;
    const finish = (then: () => void) => {
      if (done) return;
      done = true;
      if (w.timer !== null) clearTimeout(w.timer);
      waiting.current.delete(w);
      then();
    };
    const w: Waiter = { since: Date.now(), timer: null, giveUp: () => finish(() => resolve("late")) };
    w.timer = setTimeout(w.giveUp, PRESS_WAIT_MS);
    waiting.current.add(w);
    call.then((v) => finish(() => resolve(v)), (e: unknown) => finish(() => reject(e)));
  }), []);
}

type Say = (text: string, retry?: SocialToastState["retry"]) => void;

/**
 * A friend link (makeLink) given up on, for its two sites (/friends and the Home section): a link that is still made
 * stands, and the page reads again to list it, never drawn over the failure said here. The failure is said where a
 * failure is said: on the page with no chooser open, in the sheet while its chooser stands, nowhere once the reader
 * has moved on. Try again makes another, as any failure's does.
 */
export function linkGivenUp(
  call: Promise<{ ok: boolean } | null>,
  { began, now, refresh, say, sheetSay, retry }: {
    /** The chooser screen the press was made on, and the one standing now (null: none open). */
    began: InviteScreen | null;
    now: InviteScreen | null;
    refresh: () => void;
    say: Say;
    sheetSay: Say;
    retry: () => void;
  },
): void {
  void call.then((late) => { if (late?.ok) refresh(); });
  const again = { label: socialCopy.invites.retry, run: retry };
  if (began === null) say(socialCopy.invites.createFailed, again);
  else if (now === "choose") sheetSay(socialCopy.invites.createFailed, again);
}
