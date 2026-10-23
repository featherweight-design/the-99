/**
 * The kick (plan `2026-10-22-push.md`, D1): a new feed item that queued a push, written inside a request, flushes THAT
 * reader's outbox once the response is out (`after()`), so a spare ask reaches the friend in seconds. The cron
 * (`/api/cron/push-flush`, every 15 minutes) stays the guarantee: outside a request (a job, a script, a probe) `after()`
 * cannot be scheduled and nothing happens here, and a kick that fails leaves the rows for the next run.
 *
 * The flush is imported lazily, so the writer that calls this (`recordFeedItem`) does not load the sender. Dormant without
 * the VAPID keys, like the cron.
 */
import { after } from "next/server";

import { captureServerError } from "../sentry/capture";
import { pushConfig } from "./config";

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
      try {
        const [{ flushPush }, { sendWebPush }, { resolveSwitchEnvStrict }] = await Promise.all([
          import("./flush"), import("./send"), import("../switches/snapshot"),
        ]);
        await flushPush({ config, now: new Date(), send: sendWebPush, resolveEnv: resolveSwitchEnvStrict, onlyUser: userId });
      } catch (error) {
        captureServerError("push-kick", error);
      }
    });
  } catch {
    // No request to run after (a job or a script): the cron delivers it.
  }
}
