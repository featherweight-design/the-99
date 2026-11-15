// The one set of `Sentry.init` options, for the server, the edge and the browser (`docs/agents/ops.md`, Sentry).
// Errors, 10% tracing and allowlisted logs, approved by Hugh 2026-11-15 for poster readiness; feeds fwd's monitoring
// dashboards. Session REPLAY STAYS OFF: no replay integration is installed anywhere, and none may be. No tunnel, no default
// PII. Dormant until a DSN is set AND the environment is named: an unset `*_SENTRY_ENVIRONMENT` reads as `local`, which
// never sends, so a dev machine or a preview deployment (neither has the variables) reports nothing.
import type { BrowserOptions } from "@sentry/nextjs";

import { scrubLog } from "./log-scrub";
import { traceRate } from "./sampler";
import { scrubBreadcrumb, scrubEvent } from "./scrub";
import { scrubSpan } from "./span-scrub";
import { APP_TAG, tagEvent } from "./tags";

/**
 * `release` is the deploy's commit, `VERCEL_GIT_COMMIT_SHA` on the server and its inlined `NEXT_PUBLIC_` twin in the browser:
 * the same name the build plugin gives the source maps (`next.config.ts`), so sessions, errors and spans group per deploy
 * and crash-free rates read per release. Empty (a local build) leaves it to the SDK.
 */
export function sentryOptions(dsn: string | undefined, environment: string | undefined, release?: string): BrowserOptions {
  const env = environment?.trim() || "local";
  const key = dsn?.trim() || undefined;
  return {
    dsn: key,
    environment: env,
    ...(release?.trim() ? { release: release.trim() } : {}),
    enabled: key !== undefined && env !== "local",
    // Tracing: one rate, health, liveness, crons and the CSP sink dropped, chatty routes at a hundredth (`sampler.ts`).
    // Spans stream (Sentry 11's default, set here so the edge, which otherwise reads `SENTRY_TRACE_LIFECYCLE`, agrees);
    // in that mode every span, the segment included, passes `beforeSendSpan`, and `beforeSendTransaction` is never called.
    traceLifecycle: "stream",
    tracesSampler: traceRate,
    beforeSendSpan: scrubSpan,
    // Logs are always on in Sentry 11 (there is no `enableLogs`); only `logEvent`'s closed events leave, and console capture
    // (`consoleLoggingIntegration`) is never installed.
    beforeSendLog: scrubLog,
    // Sentry 11 replaced `sendDefaultPii` with `dataCollection`; everything is off. The scrubber is the
    // second line: this stops the SDK collecting, `scrubEvent` removes what a captured error still carries.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
    },
    // React's own Suspense fallback, #419 ("the server could not finish this Suspense boundary, so the client renders it"): benign,
    // and the one issue that filled the project (THE-99-3). Matched by number, so #4190 is not swallowed with it.
    ignoreErrors: [/^Minified React error #419\b/],
    maxBreadcrumbs: 20,
    // Scrubbed first, then tagged: the tags are built from what is left (a route PATTERN, never the URL).
    beforeSend: (event) => tagEvent(scrubEvent(event)),
    initialScope: { tags: { app: APP_TAG } },
    beforeBreadcrumb: scrubBreadcrumb,
  };
}

/**
 * The host the browser posts events to, for the CSP's `connect-src`: the DSN's own host, https only,
 * a bare hostname. Null when there is no DSN or it is not that shape, so the policy names nothing.
 */
export function sentryIngestHost(dsn: string | undefined): string | null {
  try {
    const url = new URL(dsn ?? "");
    return url.protocol === "https:" && /^[a-z0-9.-]+$/i.test(url.hostname) ? url.hostname : null;
  } catch {
    return null;
  }
}
