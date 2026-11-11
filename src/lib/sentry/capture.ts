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
