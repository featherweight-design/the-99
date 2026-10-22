/**
 * `PUSH_ENABLED`: push notifications (plan `2026-10-22-push.md`). Unset on production and held out of All features
 * until close-out. Needs `HOME_FEED_ENABLED` (a push announces a feed item). Exactly `'true'` turns the SWITCH on; every caller passes the reader's resolved env
 * (`requestSwitchEnv`).
 *
 * The switch alone is not enough to push: `pushAvailable` (`available.ts`, apart so this file, which every page's switch
 * resolution imports, carries no key parsing) also needs the VAPID keys.
 */
import { homeFeedEnabled } from "../feed/flag";

export function pushEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.PUSH_ENABLED === "true" && homeFeedEnabled(env);
}
