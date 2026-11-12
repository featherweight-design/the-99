// The tags every Sentry event carries (FWD Sentry plan item 2), set in `beforeSend` after the scrubber. Pure: every runtime
// loads it. `app` is fixed; `route` is the route PATTERN (`route-pattern.ts`), read from Next's own `router_path` when the
// event came through `onRequestError`, else from the request's path, else (in the browser) from the address bar's path.
// `user` and `tier` are set on the scope by the shell, server and browser both (`SentryReaderTags`), where the reader is known.
import type { ErrorEvent } from "@sentry/nextjs";

import { routePattern } from "./route-pattern";

export const APP_TAG = "the-99";

/** The path an event happened on, before it is turned into a pattern. */
function pathOf(event: ErrorEvent): string | null {
  const nextjs = event.contexts?.nextjs as { router_path?: unknown } | undefined;
  if (typeof nextjs?.router_path === "string") return nextjs.router_path;
  if (event.request?.url) {
    try {
      return new URL(event.request.url, "http://x").pathname;
    } catch {
      return null;
    }
  }
  return typeof window !== "undefined" ? window.location.pathname : null;
}

export function tagEvent(event: ErrorEvent): ErrorEvent {
  const path = pathOf(event);
  return { ...event, tags: { ...event.tags, app: APP_TAG, ...(path !== null ? { route: routePattern(path) } : {}) } };
}
