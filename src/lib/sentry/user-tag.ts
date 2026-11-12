// The `user` tag on a Sentry event (FWD Sentry plan item 2): a KEYED hash of the Clerk id, never the id or an email, so one
// player's errors group together and nobody outside this app can turn the tag back into the player. SERVER-ONLY: the key never
// reaches the browser, which gets the finished hash. `user-tag.test.ts` fails when a `"use client"` module imports this file
// (the repo carries no `server-only` package; that test is the guard).
import { createHmac } from "node:crypto";

/** The shortest key taken: a short one is guessable, so it is treated as no key at all. */
const MIN_KEY = 32;

/** HMAC-SHA256 of the user id under `SENTRY_USER_HASH_KEY`, 16 hex characters; null with no key (no `user` tag then). */
export function hashedUserTag(userId: string, key: string | undefined = process.env.SENTRY_USER_HASH_KEY): string | null {
  if (!key || key.length < MIN_KEY) return null;
  return createHmac("sha256", key).update(userId).digest("hex").slice(0, 16);
}
