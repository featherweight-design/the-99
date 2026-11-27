// The browser's half of the handled-error reporter. It lives apart from capture.ts because that file reads SQLSTATE
// from src/db, which no client component may reach (client-imports.test.ts).
import * as Sentry from "@sentry/nextjs";

const SEEN_TAGS = new Set<string>();
const ERROR_NAME = /^[A-Za-z][A-Za-z0-9]{0,39}$/;
// A V8 frame (`    at fn (file:1:2)`, ending in line:column) or a Firefox/Safari one (`fn@file:1:2`, no spaces after the `@`). A message's own lines
// can hold a card or deck name, so only a line shaped like a frame leaves.
const FRAME = /^\s+at\s.*:\d+:\d+\)?$|^[\w$.<>/-]*@\S+:\d+:\d+$/;

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
  const frames = typeof e?.stack === "string" ? e.stack.split("\n").filter((l) => FRAME.test(l)) : [];
  reported.stack = [`${reported.name}: ${tag}`, ...frames].join("\n");
  Sentry.captureException(reported, { tags: { site: tag } });
}

/** Test seam: a fresh page session. */
export function resetClientCaptureForTest(): void {
  SEEN_TAGS.clear();
}
