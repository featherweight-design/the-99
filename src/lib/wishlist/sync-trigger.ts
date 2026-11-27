/**
 * The wishlist sync's trigger (cart on your wishlist): `requireUserId` calls `scheduleWishlistSyncAfterAction` on every
 * authenticated request, and it schedules a pass (`sync.ts`) after the response only when the request is a Server
 * Action (orchestrator ruling, 2026-11-27). Every write a player makes goes through an action, and every action calls
 * `requireUserId`, so no write path can miss it; page renders and prefetches only read, so they schedule nothing and
 * pay one header read. Apart from `sync.ts` so `auth.ts` loads the database only for an action.
 */
import { headers } from "next/headers";

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
 * Schedules a sync pass after the response when this request is a Server Action. Never throws and never delays the
 * caller beyond the header read: outside a request scope (a script, a test, a cached function) it does nothing.
 */
export async function scheduleWishlistSyncAfterAction(userId: string): Promise<void> {
  try {
    const h = await headers();
    if (!isServerActionRequest({ action: h.get("next-action"), contentType: h.get("content-type") })) return;
    const { syncWishlistLater } = await import("./sync");
    await syncWishlistLater(userId);
  } catch (error) {
    // No request scope (headers() throws): nothing to schedule after. Anything else is logged, never thrown: the
    // action the player pressed must not fail because its after-work could not be scheduled.
    if (!(error instanceof Error && /outside a request scope|was called outside/i.test(error.message))) {
      console.error("wishlist sync could not be scheduled", error);
    }
  }
}
