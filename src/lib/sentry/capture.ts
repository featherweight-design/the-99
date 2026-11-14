// Reports an error a route HANDLED (it answered 500 itself, so Next's `onRequestError` never sees
// it). Nothing of the error travels: not its message, which a driver or Stripe error fills with ids,
// and not its parameters. A fixed tag names the site and the SQLSTATE, when there is one, says what
// failed. A no-op until Sentry is initialised.
import * as Sentry from "@sentry/nextjs";
import { sqlState } from "../../db/sql-state";

export function captureServerError(tag: string, error: unknown): void {
  const code = sqlState(error);
  Sentry.captureException(new Error(tag), { tags: { site: tag, ...(code && { sqlstate: code }) } });
}

/**
 * Notes an expected, survived error as a breadcrumb rather than an event: it rides on the next real
 * error from this process, and counts toward no issue or alert. For what recurs by design, such as a
 * pooled connection meeting a Neon suspend (about every 15 minutes in production), which as events
 * would trip the hourly error-spike monitor. Same privacy as above: the tag and SQLSTATE only.
 */
export function noteServerError(tag: string, error: unknown): void {
  const code = sqlState(error);
  Sentry.addBreadcrumb({ category: tag, level: "warning", data: code ? { sqlstate: code } : undefined });
}

/**
 * A warning with no error behind it: a fixed tag and a fixed message, never an address, a name or a count of anyone. For a
 * threshold reached on purpose (the daily mail cap at 80%), so it can alert once without being an exception.
 */
export function captureServerWarning(tag: string, message: string): void {
  Sentry.captureMessage(message, { level: "warning", tags: { site: tag } });
}
