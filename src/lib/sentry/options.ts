// The one set of `Sentry.init` options, for the server, the edge and the browser. ERRORS ONLY: no
// tracing, no replay, no logs, no default PII. Dormant until a DSN is set AND the environment is
// named: an unset `*_SENTRY_ENVIRONMENT` reads as `local`, which never sends, so a dev machine or a
// preview deployment (neither has the variables) reports nothing.
import type { BrowserOptions } from "@sentry/nextjs";

import { scrubBreadcrumb, scrubEvent } from "./scrub";

export function sentryOptions(dsn: string | undefined, environment: string | undefined): BrowserOptions {
  const env = environment?.trim() || "local";
  const key = dsn?.trim() || undefined;
  return {
    dsn: key,
    environment: env,
    enabled: key !== undefined && env !== "local",
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
    maxBreadcrumbs: 20,
    beforeSend: scrubEvent,
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
