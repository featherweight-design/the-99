/**
 * The kick (plan `2026-10-22-push.md`, D1): a new feed item that queued a push, written inside a request, flushes THAT
 * reader's outbox once the response is out (`after()`) and `KICK_DELAY_MS` has passed, so a spare ask reaches the friend in
 * seconds. Several items for one reader (a collection write noticing three combos, a notice's loop writing trade matches
 * from inside `after()`) are ONE flush: the delay lets them all land, and a kick already waiting or running absorbs the rest. The cron
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
 * One reader's kick on this server instance: scheduled (waiting out the delay; a later item rides along), running (a later
 * item asks for one more pass when it ends), or absent. A burst of items is one flush, never several flushes at once.
 */
type Kick = { scheduled: boolean; again: boolean };
const kicks = new Map<string, Kick>();

export function kickPush(userId: string): void {
  // Members only, never the env object itself (`check:switch-reads`).
  const config = pushConfig({
    VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    VAPID_SUBJECT: process.env.VAPID_SUBJECT,
  } as unknown as NodeJS.ProcessEnv);
  if (!config) return;
  const live = kicks.get(userId);
  if (live) {
    // Waiting: the flush it will run reads this row too. Running: one more pass once it ends.
    if (!live.scheduled) live.again = true;
    return;
  }
  const kick: Kick = { scheduled: true, again: false };
  kicks.set(userId, kick);
  try {
    after(async () => {
      try {
        await new Promise((done) => setTimeout(done, KICK_DELAY_MS));
        kick.scheduled = false;
        const [{ flushPush }, { sendWebPush }, { resolveSwitchEnvStrict }] = await Promise.all([
          import("./flush"), import("./send"), import("../switches/snapshot"),
        ]);
        do {
          kick.again = false;
          await flushPush({ config, now: new Date(), send: sendWebPush, resolveEnv: resolveSwitchEnvStrict, onlyUser: userId });
        } while (kick.again);
      } catch (error) {
        captureServerError("push-kick", error);
      } finally {
        kicks.delete(userId);
      }
    });
  } catch {
    // No request to run after (a job or a script): the cron delivers it.
    kicks.delete(userId);
  }
}
