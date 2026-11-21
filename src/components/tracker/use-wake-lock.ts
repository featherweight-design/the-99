"use client";

import { useEffect } from "react";

/**
 * Keeps the screen awake while `on` is true (a game is running). The browser drops the lock whenever the page is
 * hidden, so it is asked for again each time the page comes back. No Wake Lock API means nothing happens: the screen
 * just sleeps as it always has.
 */
export function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let stopped = false;

    const request = async () => {
      if (document.visibilityState !== "visible" || (lock && !lock.released)) return;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (stopped) void next.release();
        else lock = next;
      } catch {
        // Refused (battery saver, a page without focus): the game carries on without it.
      }
    };
    const onVisible = () => void request();

    void request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, [on]);
}
