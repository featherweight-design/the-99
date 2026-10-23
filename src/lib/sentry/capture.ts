// Reports an error a route HANDLED (it answered 500 itself, so Next's `onRequestError` never sees
// it). Nothing of the error travels: not its message, which a driver or Stripe error fills with ids,
// and not its parameters. A fixed tag names the site and the SQLSTATE, when there is one, says what
// failed. A no-op until Sentry is initialised.
import * as Sentry from "@sentry/nextjs";

export function sqlState(error: unknown): string | null {
  const e = error as { cause?: { code?: unknown }; code?: unknown } | null;
  const code = e?.cause?.code ?? e?.code;
  return typeof code === "string" && /^[0-9A-Z]{5}$/.test(code) ? code : null;
}

export function captureServerError(tag: string, error: unknown): void {
  const code = sqlState(error);
  Sentry.captureException(new Error(tag), { tags: { site: tag, ...(code && { sqlstate: code }) } });
}
