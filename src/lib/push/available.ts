/**
 * Whether push can work for this reader: the switch (`pushEnabled`, which needs Home's news) AND the VAPID keys
 * (`pushConfigured`). A switch raised on a deployment without the keys draws nothing and sends nothing, rather than
 * offering a tick that cannot work. Kept apart from `flag.ts` so the cached pages' switch path never imports key parsing.
 */
import { pushConfigured } from "./config";
import { pushEnabled } from "./flag";

export const pushAvailable = (env: NodeJS.ProcessEnv): boolean => pushEnabled(env) && pushConfigured(env);
