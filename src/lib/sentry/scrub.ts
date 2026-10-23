// What leaves the app for Sentry. Errors only, and nothing about who the player is: no user, no
// cookies, no headers, no request body (a webhook's body and signature included), no query string,
// no exception message. A client error's message is the original and can carry a card name, a deck
// name or a query (see `logBoundaryError`), so an event keeps its type, stack and digest tag and
// not its words. Pure: it imports nothing from the app, so every runtime and the tests load it.
import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";

const REDACTED = "[redacted]";

// A friend link and a join link are capabilities: whoever holds the token can use it. They travel as
// a path segment, which a URL in a breadcrumb, a request or a transaction name would carry.
// The admin account page is addressed by a raw Clerk user id, the one route that is.
const TOKEN_PATHS: RegExp[] = [/(\/friend\/)[^/?#]+/g, /(\/join\/)[^/?#]+/g, /(\/admin\/accounts\/)[^/?#]+/g];

/** A URL or route name with the query and hash cut off and any link token replaced. */
export function scrubUrl(value: string): string {
  const cut = value.split(/[?#]/, 1)[0];
  return TOKEN_PATHS.reduce((acc, re) => acc.replace(re, `$1${REDACTED}`), cut);
}

// Navigation and clicks say how a reader got to the error. Console, fetch and XHR breadcrumbs carry
// the app's own log lines and request URLs, and nothing else is worth the risk.
const KEPT_BREADCRUMBS = new Set(["navigation", "ui.click"]);

export function scrubBreadcrumb(crumb: Breadcrumb): Breadcrumb | null {
  if (!crumb.category || !KEPT_BREADCRUMBS.has(crumb.category)) return null;
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(crumb.data ?? {})) {
    if (key === "from" || key === "to") data[key] = typeof value === "string" ? scrubUrl(value) : REDACTED;
  }
  // No `message`: a click's is the element's selector, which carries its `aria-label` and `title`, and those
  // hold a member's name, a pod's name or a deck's name.
  return { category: crumb.category, level: crumb.level, timestamp: crumb.timestamp, data };
}

// An inline script's frame names the DOCUMENT it ran in, query and link token included.
function scrubStacktrace<T extends { frames?: { filename?: string; abs_path?: string }[] }>(trace: T | undefined): T | undefined {
  if (!trace?.frames) return trace;
  const frames = trace.frames.map((f) => ({
    ...f,
    ...(f.filename && { filename: scrubUrl(f.filename) }),
    ...(f.abs_path && { abs_path: scrubUrl(f.abs_path) }),
  }));
  return { ...trace, frames };
}

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  const next: ErrorEvent = { ...event };
  delete next.user;
  delete next.extra;
  delete next.server_name;
  delete next.message;
  delete next.logentry;
  delete next.modules;
  if (typeof next.transaction === "string") next.transaction = scrubUrl(next.transaction);
  if (next.request) {
    // Method and the path only: no data, cookies, headers, query string or env.
    next.request = { method: next.request.method, ...(next.request.url && { url: scrubUrl(next.request.url) }) };
  }
  if (next.contexts?.nextjs) {
    // `onRequestError` records the original path, query included, beside the (scrubbed) request.
    const nextjs = Object.fromEntries(
      Object.entries(next.contexts.nextjs).map(([k, v]) => [k, typeof v === "string" ? scrubUrl(v) : v]),
    );
    next.contexts = { ...next.contexts, nextjs };
  }
  if (next.exception?.values) {
    next.exception = {
      ...next.exception,
      values: next.exception.values.map((v) => ({ ...v, value: REDACTED, stacktrace: scrubStacktrace(v.stacktrace) })),
    };
  }
  if (next.threads?.values) {
    next.threads = { ...next.threads, values: next.threads.values.map((t) => ({ ...t, stacktrace: scrubStacktrace(t.stacktrace) })) };
  }
  if (next.breadcrumbs) {
    next.breadcrumbs = next.breadcrumbs.map(scrubBreadcrumb).filter((c): c is Breadcrumb => c !== null);
  }
  return next;
}
