"use client";

import { createContext, useContext, useEffect } from "react";

import {
  CONNECTIONS,
  pathPattern,
  STALL_AFTER_MS,
  type StallReport,
} from "../../lib/nav-stall/report";

/**
 * The stuck-loader diagnostic's browser half (`NAV_STALL_LOG_ENABLED`). A loading screen still up
 * after `STALL_AFTER_MS` sends ONE report to `/api/nav-stall`: the navigation provider watches a
 * navigation still pending, and `StallWatch` (inside every in-page `LoadingScreen`) watches a page
 * that committed into its fallback. Off, neither starts a timer.
 */

/** What the shell hands the watchers: null while the switch is off for this reader. */
export type StallConfig = { deployment: string | null } | null;

/** The shell's config, for the `StallWatch` in every in-page loading screen. */
export const StallContext = createContext<StallConfig>(null);

// One report per navigation: the page a report was sent for, until the next navigation starts. A
// navigation that hangs pending and then commits into a hanging fallback reports once, as pending.
let reportedFor: string | null = null;
// When the current navigation started (`performance.now()`, 0 on a document load), and the one
// before it. The router starts its RSC request on the press, a few milliseconds BEFORE the provider
// hears of the navigation, so a request is matched from the previous navigation's start: the latest
// one for the target since then is this navigation's.
let navigationStartedAt = 0;
let previousStartedAt = 0;

/** Called by the provider when a navigation starts, so the next hang reports again. */
export function newNavigation(): void {
  reportedFor = null;
  previousStartedAt = navigationStartedAt;
  navigationStartedAt = performance.now();
}

/** Which loading screens are on the page right now, read from the page as the reader sees it. */
function loaderNow(): StallReport["loader"] {
  const overlay = document.querySelector('[data-testid="pending-overlay"]') !== null;
  const fallback = document.querySelector("main [data-loading-screen]") !== null;
  return overlay && fallback ? "both" : overlay ? "overlay" : fallback ? "fallback" : "none";
}

// The router's own RSC requests, as `watchFetches` saw them start and answer. Prefetches are left
// out: one for the same path can finish while the navigation's request is still held, and Resource
// Timing alone cannot tell the two apart, nor see a request still in flight.
type Flight = {
  path: string;
  url: string;
  startedAt: number;
  headersAt: number | null;
  status: number;
  /** Resource Timing's entry for THIS request, once its body arrived whole. */
  whole: { ms: number; bytes: number } | null;
};
const flights: Flight[] = [];
let watching = false;

function headerOf(init: RequestInit | undefined, name: string): string | null {
  try {
    return new Headers(init?.headers).get(name);
  } catch {
    return null;
  }
}

/**
 * Notes when each of the router's RSC requests starts and when its response begins. It wraps
 * `fetch` without touching a request or its response: the same promise goes back to the caller, and
 * a failure in the noting is swallowed. Installed once, and only while the switch is on.
 */
export function watchFetches(): void {
  if (watching || typeof window === "undefined") return;
  watching = true;
  // An observer rather than `getEntriesByType`: the browser's resource buffer stops recording at its
  // default 250 entries, which one cold `/collection` grid can fill, and an observer is not bound by it.
  // An entry is matched to the request that STARTED it (Next's `_rsc` is a hash of the router state,
  // so a second visit from the same place asks for the same URL), never to an older one.
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as PerformanceResourceTiming[]) {
        const flight = flights.findLast((f) => f.url === e.name && f.whole === null && e.startTime >= f.startedAt);
        if (flight) flight.whole = { ms: e.duration, bytes: e.transferSize };
      }
    }).observe({ type: "resource" });
  } catch {
    // No observer, no `done`: a request whose body arrived reads as `headers`.
  }
  const original = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    // Taken before the request starts, so its Resource Timing entry never starts earlier.
    const startedAt = performance.now();
    const pending = original.call(this, input, init);
    try {
      if (headerOf(init, "rsc") === "1" && !headerOf(init, "next-router-prefetch") && !headerOf(init, "next-router-segment-prefetch")) {
        const url = new URL(input instanceof Request ? input.url : String(input), location.origin);
        const flight: Flight = { path: url.pathname, url: url.href, startedAt, headersAt: null, status: 0, whole: null };
        flights.push(flight);
        if (flights.length > 20) flights.shift();
        pending.then(
          (response) => {
            flight.headersAt = performance.now();
            flight.status = response.status;
          },
          () => {},
        );
      }
    } catch {
      // Noting a request never fails it.
    }
    return pending;
  };
}

function bounded(n: number, max: number): number {
  return Math.min(max, Math.max(0, Math.round(n)));
}

/** How far the latest of the router's own RSC requests for `to` started since `since` has got. */
function rscFor(to: string, since: number): Pick<StallReport, "rsc" | "rscStatus" | "rscMs" | "rscBytes"> {
  const flight = flights.filter((f) => f.path === to && f.startedAt >= since).at(-1);
  if (!flight) return { rsc: "none", rscStatus: 0, rscMs: 0, rscBytes: 0 };
  const status = flight.status >= 0 && flight.status <= 599 ? flight.status : 0;
  if (flight.whole) {
    return { rsc: "done", rscStatus: status, rscMs: bounded(flight.whole.ms, 3_600_000), rscBytes: bounded(flight.whole.bytes, 100_000_000) };
  }
  if (flight.headersAt !== null) {
    return { rsc: "headers", rscStatus: status, rscMs: bounded(flight.headersAt - flight.startedAt, 3_600_000), rscBytes: 0 };
  }
  return { rsc: "waiting", rscStatus: 0, rscMs: bounded(performance.now() - flight.startedAt, 3_600_000), rscBytes: 0 };
}

function connection(): StallReport["connection"] {
  const type = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType;
  return (CONNECTIONS as readonly string[]).includes(type ?? "") ? (type as StallReport["connection"]) : "unknown";
}

/**
 * Watches one wait: from now, for `STALL_AFTER_MS`. Its report times the wait from the navigation's
 * start (the document's, on a direct load). Returns the cleanup that cancels it, which the
 * caller runs when the wait ends. `to` is the raw pathname the reader is waiting for.
 */
export function watchStall(args: {
  kind: StallReport["kind"];
  from: string;
  to: string;
  config: NonNullable<StallConfig>;
}): () => void {
  const since = navigationStartedAt;
  let wasHidden = document.visibilityState === "hidden";
  const onVisibility = () => {
    if (document.visibilityState === "hidden") wasHidden = true;
  };
  document.addEventListener("visibilitychange", onVisibility);
  const timer = window.setTimeout(() => {
    if (reportedFor === args.to) return;
    reportedFor = args.to;
    const report: StallReport = {
      kind: args.kind,
      from: pathPattern(args.from),
      to: pathPattern(args.to),
      at: pathPattern(location.pathname),
      moved: location.pathname === args.to,
      elapsedMs: Math.min(3_600_000, Math.round(performance.now() - since)),
      loader: loaderNow(),
      ...rscFor(args.to, previousStartedAt),
      visible: document.visibilityState === "visible",
      wasHidden,
      online: navigator.onLine,
      connection: connection(),
      worker: Boolean(navigator.serviceWorker?.controller),
      deployment: args.config.deployment,
    };
    try {
      const body = new Blob([JSON.stringify(report)], { type: "application/json" });
      if (!navigator.sendBeacon?.("/api/nav-stall", body)) {
        void fetch("/api/nav-stall", { method: "POST", body, keepalive: true }).catch(() => {});
      }
    } catch {
      // A diagnostic never throws into the page it is watching.
    }
  }, STALL_AFTER_MS);
  return () => {
    window.clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

/**
 * Rendered inside an in-page `LoadingScreen` (a Suspense fallback or a route's loading.tsx): reports
 * a page that committed into its loading screen and is still there `STALL_AFTER_MS` later.
 */
export function StallWatch() {
  const config = useContext(StallContext);
  useEffect(() => {
    if (!config) return;
    const here = location.pathname;
    return watchStall({ kind: "fallback", from: here, to: here, config });
  }, [config]);
  return null;
}
