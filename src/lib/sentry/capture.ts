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
export function captureServerWarning(tag: string, message: string, tags: Record<string, string> = {}): void {
  Sentry.captureMessage(message, { level: "warning", tags: { ...tags, site: tag } });
}

const SEEN_TAGS = new Set<string>();
const ERROR_NAME = /^[A-Za-z][A-Za-z0-9]{0,39}$/;
// A V8 frame (`    at fn (file:1:2)`) or a Firefox/Safari one (`fn@file:1:2`, no spaces after the `@`). A message's own lines
// can hold a card or deck name, so only a line shaped like a frame leaves.
const FRAME = /^\s+at\s|^[\w$.<>/-]*@\S+:\d+:\d+$/;

/**
 * Reports an error a CLIENT component caught and survived (a catch that settles to a failed view, a toast or nothing): the
 * browser never sees it otherwise, so a broken flow was invisible. Only what cannot name a player leaves: the fixed `tag` (the
 * event's message and its `site` tag), the error's class name when it is one word of letters and digits, and its stack frames
 * (file, line and column: code, never data). Its message never leaves, whatever it says: a message can carry a card or a deck
 * name, and the stack's own header line is cut for the same reason. `scrubEvent` still runs over the event.
 *
 * ONE event per tag per page session, so a render loop or a retry button cannot flood the quota. Never for an expected outcome
 * (a refusal, out of credits, an abort, offline): those stay silent, marked for `check:silent-catch`.
 */
export function captureClientError(tag: string, error: unknown): void {
  if (SEEN_TAGS.has(tag)) return;
  SEEN_TAGS.add(tag);
  const e = error as { name?: unknown; stack?: unknown } | null;
  const reported = new Error(tag);
  reported.name = typeof e?.name === "string" && ERROR_NAME.test(e.name) ? e.name : "Error";
  if (typeof e?.stack === "string") reported.stack = [`${reported.name}: ${tag}`, ...e.stack.split("\n").filter((l) => FRAME.test(l))].join("\n");
  Sentry.captureException(reported, { tags: { site: tag } });
}

/** Test seam: a fresh page session. */
export function resetClientCaptureForTest(): void {
  SEEN_TAGS.clear();
}
