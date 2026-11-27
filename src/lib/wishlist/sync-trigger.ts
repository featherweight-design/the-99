/**
 * The wishlist sync's trigger (cart on your wishlist): `requireUserId` calls `scheduleWishlistSyncAfterAction` on every
 * authenticated request, and it schedules a pass (`sync.ts`) after the response only when the request is a Server
 * Action (orchestrator ruling, 2026-11-27). The player's writes go through actions, and every action calls
 * `requireUserId`; a write that reaches their data another way (a script, a webhook) is caught by the hourly reconcile.
 * Page renders and prefetches only read, so they schedule nothing and pay one header read. Apart from `sync.ts` so `auth.ts` loads the database only for an action.
 */
import { headers } from "next/headers";
import { captureServerError } from "../sentry/capture";

/**
 * Whether this request is a Server Action, by Next's own rule (`server-action-request-meta.js`): the `next-action`
 * header (a fetch action), or a form body (a form posted before hydration, which sends no header). `headers()` carries
 * no method, and a page render or prefetch is a GET with neither, so the two headers decide. Pure, so a test pins it.
 */
export function isServerActionRequest(h: { action: string | null; contentType: string | null }): boolean {
  if (h.action !== null) return true;
  const type = h.contentType ?? "";
  return type.startsWith("application/x-www-form-urlencoded") || type.startsWith("multipart/form-data");
}

/**
 * The requests that already scheduled their pass. An action commonly calls `requireUserId` more than once (the action,
 * then a loader or guard it calls); one pass per request is enough. Keyed on the request's headers object: `headers()`
 * memoizes its answer per request (`CachedHeaders`, a WeakMap on the request's own headers, in
 * `next/dist/server/request/headers.js`), so the entry goes when the request does. Were that ever to change, each call
 * would schedule a pass, and the lock and `raced` result keep that correct, one extra read each.
 */
const scheduled = new WeakSet<object>();

/**
 * Schedules one sync pass after the response when this request is a Server Action. A Route Handler that takes a form
 * or multipart POST also counts (its headers look the same, and it is a write too). Never throws and never delays the
 * caller beyond the header read: outside a request scope (a script, a test, a cached function) it does nothing.
 */
export async function scheduleWishlistSyncAfterAction(userId: string): Promise<void> {
  let h: Awaited<ReturnType<typeof headers>>;
  try {
    h = await headers();
  } catch {
    // not a fallback: nothing is drawn from this. No request scope, or a scope with no headers (a cached function):
    // nothing to schedule after.
    return;
  }
  if (!isServerActionRequest({ action: h.get("next-action"), contentType: h.get("content-type") })) return;
  if (scheduled.has(h)) return;
  scheduled.add(h);
  try {
    const { syncWishlistLater } = await import("./sync");
    await syncWishlistLater(userId);
  } catch (error) {
    // not a fallback: nothing is drawn from this. Logged, never thrown: the action the player pressed must not fail because its after-work could not be scheduled.
    console.error("wishlist sync could not be scheduled", error);
    captureServerError("cart-sync-schedule-failed", error);
  }
}
