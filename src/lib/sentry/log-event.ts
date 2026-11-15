// The one way the app writes a Sentry log (`docs/agents/ops.md`, Sentry). A closed event name and allowlisted attributes
// (`log-scrub.ts`): an attribute that is not allowed is stripped here, before the SDK sees it, and `beforeSendLog` runs the same
// rule again on what leaves. ESLint refuses `Sentry.logger` anywhere but this file. A no-op until Sentry is initialised, and
// it never throws: a log is never worth a failed request.
import * as Sentry from "@sentry/nextjs";
import { after } from "next/server";

import { cleanAttributes, type LogAttrs, type LogEventName } from "./log-scrub";

export type { LogEventName } from "./log-scrub";

export function logEvent(name: LogEventName, attrs: LogAttrs = {}, level: "info" | "warn" | "error" = "info"): void {
  try {
    const { kept, stripped } = cleanAttributes(attrs);
    Sentry.logger[level](name, stripped.length > 0 ? { ...kept, stripped_attrs: stripped.length } : kept);
  } catch {
    // Logging is best effort.
  }
}

/**
 * A Server Action's logs, flushed once the response has gone (`after`), so the reader never waits on Sentry and a function
 * frozen after the response does not lose them. Route handlers need nothing: the SDK flushes those at response end.
 * A no-op outside a request (Next's `after` throws there) or without a client.
 */
export function flushLogsAfterResponse(): void {
  try {
    after(() => Sentry.flush(2000).then(() => undefined));
  } catch {
    // Not inside a request: nothing to wait for.
  }
}
