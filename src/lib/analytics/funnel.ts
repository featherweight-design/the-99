// The call sites' one entry to the funnel (`funnel-events.ts`): resolves the key and host from the environment and the page's hostname from
// the request, and sends after the response (`after()`), so a slow PostHog never holds an answer. Never throws. Outside a request (a test, a
// script) `headers()` or `after()` refuses and the refusal is swallowed, so nothing is sent: it is a no-op by that exception, not by a check.
// SERVER-ONLY.
import { after } from "next/server";
import { headers } from "next/headers";
import { accountId, captureFunnelEvent, claimId, type FunnelEvent } from "./funnel-events";

type Subject = { account: string } | { claim: string | null };

/** Fire-and-forget: one funnel event for an account or for a newcomer's claim, with its properties. */
export async function trackFunnel(
  event: FunnelEvent,
  subject: Subject,
  properties: Record<string, string | number | boolean> = {},
  hostname?: string,
): Promise<void> {
  try {
    const host = hostname ?? (await headers()).get("host")?.split(":")[0] ?? "";
    const env = { SENTRY_USER_HASH_KEY: process.env.SENTRY_USER_HASH_KEY, ANON_KEY_SALT: process.env.ANON_KEY_SALT };
    const distinctId = "account" in subject ? accountId(subject.account, env) : claimId(subject.claim, env);
    after(() =>
      captureFunnelEvent(event, distinctId, properties, {
        hostname: host,
        key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
        host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      }),
    );
  } catch {
    // Analytics never reaches the reader, and never fails a request.
  }
}
