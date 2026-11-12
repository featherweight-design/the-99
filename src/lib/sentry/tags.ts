// The tags every Sentry event carries (FWD Sentry plan item 2), set in `beforeSend` after the scrubber. Pure: every runtime
// loads it. `app` is fixed; `route` is the route PATTERN (`route-pattern.ts`), read from Next's own `router_path` when the
// event came through `onRequestError`, else from the request's path, else (in the browser) from the address bar's path.
// `user` and `tier` are set on the browser's scope by the shell (`SentryReaderTags`); a server event carries `app` and `route`.
import type { ErrorEvent } from "@sentry/nextjs";

import { routePattern } from "./route-pattern";

export const APP_TAG = "the-99";

/** The path an event happened on, before it is turned into a pattern. */
function pathOf(event: ErrorEvent): string | null {
  const nextjs = event.contexts?.nextjs as { router_path?: unknown; request_path?: unknown } | undefined;
  // Next's `routePath` is the route's FILE (`/decks/[id]/page`, `/commanders/(list)/page`, `/api/health/route`): its pattern
  // is that path with groups and the file dropped. When it is not a route this app has, the request's own path decides.
  if (typeof nextjs?.router_path === "string") {
    const pattern = routeFileToPattern(nextjs.router_path);
    if (routePattern(pattern) === pattern) return pattern;
  }
  if (typeof nextjs?.request_path === "string") return nextjs.request_path;
  if (event.request?.url) {
    try {
      return new URL(event.request.url, "http://x").pathname;
    } catch {
      return null;
    }
  }
  return typeof window !== "undefined" ? window.location.pathname : null;
}

/** `/commanders/(list)/page` → `/commanders`: route groups and the trailing `page` or `route` file dropped. */
export function routeFileToPattern(file: string): string {
  const parts = file.split("/").filter((s) => s && !/^\(.*\)$/.test(s));
  if (parts.length > 0 && /^(page|route)$/.test(parts[parts.length - 1])) parts.pop();
  return `/${parts.join("/")}`;
}

export function tagEvent(event: ErrorEvent): ErrorEvent {
  const path = pathOf(event);
  return { ...event, tags: { ...event.tags, app: APP_TAG, ...(path !== null ? { route: routePattern(path) } : {}) } };
}
