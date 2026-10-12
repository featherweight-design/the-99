"use client";

// Registers `public/sw.js`, the worker that serves a returning reader's static files from the device
// (see that file for what it caches and why). Production only: in development `next dev` rebuilds
// files under the same URLs, and a cached one would be yesterday's code, so any worker left over
// from a production build on localhost is removed instead.
//
// After the `load` event, so registering never competes with the page's own startup downloads.
import { useEffect } from "react";

export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then((all) => all.forEach((r) => void r.unregister()));
      return;
    }
    const register = () => void navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);
  return null;
}
