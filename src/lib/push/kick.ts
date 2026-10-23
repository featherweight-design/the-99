/**
 * The kick (plan `2026-10-22-push.md`, D1): a new feed item that queued a push, written inside a request, flushes THAT
 * reader's outbox once the response is out (`after()`) and `KICK_DELAY_MS` has passed, so a spare ask reaches the friend in
 * seconds. Several items for one reader (a collection write noticing three combos, a notice's loop writing trade matches
 * from inside `after()`) are ONE flush: the delay lets them all land, and a flush already running absorbs the rest as one
 * more pass. The cron
 * (`/api/cron/push-flush`, every 15 minutes) stays the guarantee: outside a request (a job, a script, a probe) `after()`
 * cannot be scheduled and nothing happens here, and a kick that fails leaves the rows for the next run.
 *
 * The flush is imported lazily, so the writer that calls this (`recordFeedItem`) does not load the sender. Dormant without
 * the VAPID keys, like the cron.
 */
import { after } from "next/server";

import { captureServerError } from "../sentry/capture";
import { pushConfig } from "./config";

/** How long a kick waits before it flushes: every item a request (or a notice's loop) records lands first, as one batch. */
export const KICK_DELAY_MS = 2000;

/**
 * One reader's running flush on this server instance. Every request that queued a push schedules its OWN callback, so each
 * one runs after that request's transaction has committed; the coalescing is decided there, never at the call (inside the
 * transaction): a callback that finds a flush already running for the reader asks it for one more pass, and does nothing
 * else. A burst is one flush and at most one more pass, never two flushes at once.
 */
type Running = { again: boolean };
const running = new Map<string, Running>();

export function kickPush(userId: string): void {
  // Members only, never the env object itself (`check:switch-reads`).
  const config = pushConfig({
    VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    VAPID_SUBJECT: process.env.VAPID_SUBJECT,
  } as unknown as NodeJS.ProcessEnv);
  if (!config) return;
  try {
    after(async () => {
      await new Promise((done) => setTimeout(done, KICK_DELAY_MS));
      const live = running.get(userId);
      if (live) {
        // Its last pass may have read the outbox before this request committed: one more, once it ends.
        live.again = true;
        return;
      }
      const run: Running = { again: false };
      running.set(userId, run);
      try {
        const [{ flushPush }, { sendWebPush }, { resolveSwitchEnvStrict }] = await Promise.all([
          import("./flush"), import("./send"), import("../switches/snapshot"),
        ]);
        do {
          run.again = false;
          await flushPush({ config, now: new Date(), send: sendWebPush, resolveEnv: resolveSwitchEnvStrict, onlyUser: userId });
        } while (run.again);
      } catch (error) {
        captureServerError("push-kick", error);
      } finally {
        // No await between the last `again` check and this delete, so no callback can slip in between them.
        running.delete(userId);
      }
    });
  } catch {
    // No request to run after (a job or a script): the cron delivers it.
  }
}
