/**
 * `PUSH_ENABLED`: push notifications (plan `2026-10-22-push.md`). Unset on production and held out of All features
 * until close-out. Needs `HOME_FEED_ENABLED` (a push announces a feed item). Exactly `'true'` turns the SWITCH on; every caller passes the reader's resolved env
 * (`requestSwitchEnv`).
 *
 * The switch alone is not enough to push: `pushAvailable` also needs the VAPID keys (`pushConfigured`), so a switch
 * raised on a deployment without them draws nothing and sends nothing, rather than offering a tick that cannot work.
 */
import { homeFeedEnabled } from "../feed/flag";
import { pushConfigured } from "./config";

export function pushEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.PUSH_ENABLED === "true" && homeFeedEnabled(env);
}

export function pushAvailable(env: NodeJS.ProcessEnv): boolean {
  return pushEnabled(env) && pushConfigured(env);
}
