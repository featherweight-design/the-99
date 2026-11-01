// What leaves the app for Sentry. Errors only, and nothing about who the player is: no user, no
// cookies, no headers, no request body (a webhook's body and signature included), no query string,
// no exception message beyond a closed list of exact framework strings (`KEPT_EXCEPTION_MESSAGES`). A client error's message is the
// original and can carry a card name, a deck name or a query (see `logBoundaryError`), so an event keeps its type, stack and digest
// tag and not its words. Pure: it imports nothing from the app, so every runtime and the tests load it.
import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";

const REDACTED = "[redacted]";

// An exception's message is kept only when it is one of a CLOSED set of strings the app or its framework write whole, none of
// them built from player input, and then only on an EXACT match: a message that merely starts like one (`unauthenticated: Sol
// Ring`) is redacted like any other. Never a shape rule (a pattern would let a card name through the first time it was
// interpolated). Everything else reads `[redacted]`: a client error's message is the original and can carry a card name, a
// deck name or a query.
//
// Clerk's `auth()` without the middleware: the message is a template whose only variable parts are the file reference and the
// "exists at" step (`app-router/server/auth.js`), so the exact texts for this app's Next 16 (`middleware or proxy`) are written
// out here, with and without `src/` and with no step, and `scrub.test.ts` fails if Clerk's source stops saying them.
const CLERK_FILE = "middleware or proxy";
const clerkNoMiddleware = (step: string | null) =>
  `Clerk: auth() was called but Clerk can't detect usage of clerkMiddleware(). Please ensure the following:\n- ${step === null ? "" : `${step}\n- `}clerkMiddleware() is used in your Next.js ${CLERK_FILE} file.\n- Your ${CLERK_FILE} matcher is configured to match this route or page.\n- If you are using the src directory, make sure the ${CLERK_FILE} file is inside of it.\n\nIf you've verified your configuration and are still seeing this error, there may be a runtime issue or a problem communicating with Clerk.\n\nFor more details, see https://clerk.com/err/auth-middleware\n`;
const clerkStep = (dir: string) => `Your ${CLERK_FILE} file exists at ./${dir}middleware.(ts|js) or proxy.(ts|js)`;

export const KEPT_EXCEPTION_MESSAGES: ReadonlySet<string> = new Set([
  "unauthenticated",
  "NEXT_NOT_FOUND",
  "NEXT_HTTP_ERROR_FALLBACK;404", // what `notFound()` throws since Next 15; `NEXT_NOT_FOUND` is the older spelling
  "NEXT_REDIRECT",
  clerkNoMiddleware(null),
  clerkNoMiddleware(clerkStep("")),
  clerkNoMiddleware(clerkStep("src/")),
]);

// React's production errors say the number, then a link, then (for some) the offending text as `?args[]=`. Only the number is kept.
const MINIFIED_REACT = /^Minified React error #(\d{1,4})\b/;

/** What an exception's message becomes: itself when it is on the closed list, the bare React error number, else `[redacted]`. */
export function scrubExceptionValue(value: string | undefined): string {
  if (typeof value !== "string") return REDACTED;
  if (KEPT_EXCEPTION_MESSAGES.has(value)) return value;
  const react = MINIFIED_REACT.exec(value);
  return react ? `Minified React error #${react[1]}` : REDACTED;
}

// A friend link and a join link are capabilities: whoever holds the token can use it. They travel as
// a path segment, which a URL in a breadcrumb, a request or a transaction name would carry.
// The admin account page is addressed by a raw Clerk user id, the one route that is.
const TOKEN_PATHS: RegExp[] = [/(\/friend\/)[^/?#]+/g, /(\/join\/)[^/?#]+/g, /(\/admin\/accounts\/)[^/?#]+/g];

/** Any link token in a string replaced, everything else kept. Product analytics uses it too (`lib/analytics`). */
export function redactLinkTokens(value: string): string {
  return TOKEN_PATHS.reduce((acc, re) => acc.replace(re, `$1${REDACTED}`), value);
}

/** A URL or route name with the query and hash cut off and any link token replaced. */
export function scrubUrl(value: string): string {
  return redactLinkTokens(value.split(/[?#]/, 1)[0]);
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
      values: next.exception.values.map((v) => ({ ...v, value: scrubExceptionValue(v.value), stacktrace: scrubStacktrace(v.stacktrace) })),
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
