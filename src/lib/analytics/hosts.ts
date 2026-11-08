// PostHog's hosts and the production gate, shared by the browser SDK (`posthog.ts`, client-only) and the server's
// session events (`session-events.ts`). Pure: no SDK, no browser global, safe to import anywhere.

export const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

/** The production site's hostnames. Analytics runs on these alone. */
export const PRODUCTION_HOSTNAMES: readonly string[] = ["the-99.dev", "www.the-99.dev"];

export function isProductionHostname(hostname: string): boolean {
  return PRODUCTION_HOSTNAMES.includes(hostname.toLowerCase());
}

/** The ingest host: `NEXT_PUBLIC_POSTHOG_HOST`, or the US cloud when it is unset or empty. */
export function posthogApiHost(raw: string | undefined): string {
  return raw?.trim() || DEFAULT_POSTHOG_HOST;
}
