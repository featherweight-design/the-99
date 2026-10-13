import { after } from "next/server";

/**
 * Per-request server timing, for `pnpm measure:load` (the performance lane, PR 1).
 *
 * A `Server-Timing` HEADER cannot carry this: an App Router page streams, so its headers are
 * sent before its reads finish, and a server action sets no headers at all. So the spans are
 * gathered per request and LOGGED, one line per request, once the response has finished:
 *
 *   [perf] /decks/[id] total=1154 getDeckDetail=325 candidateFacts=459 availability=306 ...
 *
 * Off unless `PERF_TIMING=1`, and then only on the server that set it: the harness runs its own
 * `next start` with it and reads the line off that server's output. Off, `perfRoute` hands back
 * one shared, frozen tracker whose `timed` is a bare pass-through (no clock read, nothing allocated
 * per span), which is what makes leaving the spans in the page code free.
 *
 * The line carries the ROUTE PATTERN, the span labels and milliseconds, and nothing else: no user
 * id, no deck or card name, no URL with an id in it. Labels are string literals at each call site.
 */

export type Perf = { timed<T>(label: string, fn: () => Promise<T>): Promise<T> };

const enabled = () => process.env.PERF_TIMING === "1";

/** Off: one shared object whose `timed` returns `fn()`'s own promise and does nothing else. */
const OFF: Perf = Object.freeze({ timed: <T,>(_label: string, fn: () => Promise<T>) => fn() });

/**
 * Starts timing one request and returns its tracker: `perf.timed("label", () => read())`. Call once,
 * at the top of a page or an action, with the route PATTERN (`/decks/[id]`), never the concrete
 * path; the line is logged once the response has finished.
 *
 * An explicit tracker rather than a request-scoped store: React's `cache` is scoped to a render,
 * and inside a server action it is not, so a store keyed on it logged the action's total with none
 * of its spans (measured on the first run of `measure:load`).
 */
export function perfRoute(route: string): Perf {
  if (!enabled()) return OFF;
  const started = performance.now();
  const spans: [label: string, ms: number][] = [];
  after(() => {
    const total = Math.round(performance.now() - started);
    const line = spans.map(([label, ms]) => `${label}=${ms}`).join(" ");
    console.log(`[perf] ${route} total=${total}${line ? ` ${line}` : ""}`);
  });
  return {
    timed(label, fn) {
      const t = performance.now();
      return fn().finally(() => {
        spans.push([label, Math.round(performance.now() - t)]);
      });
    },
  };
}

/**
 * One read, timed on its own: `[perf] read <label>=<ms> pool=<idle>/<total>`, logged when it settles.
 * For reads no page's tracker reaches (the shell, a layout, a cache key), whose cost is paid before or
 * beside the page's own spans. `pool` is the shared database pool's idle and open connections just
 * before the read. An idle count of 0 means no warm connection was free, so this read opened a
 * websocket (or waited on one): the cost a cold instance pays. Read the IDLE half, not `0/0`: a
 * sibling read started first in the same `Promise.all` has already counted its own new connection
 * in the total. Off, it is `fn()` and nothing else.
 */
export function perfRead<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (!enabled()) return fn();
  const pool = (globalThis as { __the99Pool?: { idleCount: number; totalCount: number } }).__the99Pool;
  const state = pool ? `${pool.idleCount}/${pool.totalCount}` : "none";
  const t = performance.now();
  return fn().finally(() => {
    console.log(`[perf] read ${label}=${Math.round(performance.now() - t)} pool=${state}`);
  });
}

