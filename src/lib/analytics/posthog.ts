/**
 * Product analytics: usage basics in PostHog. Pageviews (client-side navigations included), pageleaves and clicks
 * (autocapture), keyed to the Clerk user once signed in. Another reader's name is a `ThirdPartyName`, drawn on an
 * element marked `ph-no-capture` (src/lib/person-name/), which drops the click. No session replay, and never what a reader types: posthog-js does not record input values.
 *
 * DORMANT unless BOTH gates pass: `NEXT_PUBLIC_POSTHOG_KEY` is set, and the page is served from the production
 * hostname. Local, preview and staging builds have no key; the hostname gate is the second line, because staging
 * is its own Vercel project and could be handed the production key by mistake. posthog-js is loaded with a
 * dynamic `import()`, so a dormant build never downloads it, and nothing here throws into the UI.
 *
 * Client-only, and nothing here may reach a model prompt (the Clerk id never does; see `prompt-identity`).
 */
import type { CaptureResult, PostHog, PostHogConfig, Properties } from "posthog-js";

import { redactLinkTokens, scrubUrl } from "../sentry/scrub";

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

/**
 * The origins the browser reaches PostHog on, for the CSP's `script-src` and `connect-src`: the ingest host,
 * plus its `-assets` twin on PostHog's cloud, where the SDK loads its remote config. Empty when there is no key,
 * so a dormant build's policy names nothing; https only.
 */
export function posthogCspHosts(key: string | undefined, host: string | undefined): string[] {
  if (!key?.trim()) return [];
  let url: URL;
  try {
    url = new URL(posthogApiHost(host));
  } catch {
    return [];
  }
  if (url.protocol !== "https:" || !/^[a-z0-9.-]+$/i.test(url.hostname)) return [];
  const region = /^(us|eu)\.i\.posthog\.com$/i.exec(url.hostname)?.[1];
  return region ? [url.origin, `https://${region.toLowerCase()}-assets.i.posthog.com`] : [url.origin];
}

/**
 * One string of an outgoing event. A friend or join link token is a capability, and the URL properties (current,
 * initial, referrer) and an autocaptured link's href all carry the path it travels in, so every string loses it,
 * as Sentry's do (`lib/sentry/scrub.ts`). A string that IS a URL (absolute, or a path starting with `/`) is also
 * cut at its first `?` or `#`: the query and hash carry what a reader typed into a search and one-time auth
 * parameters, neither of which usage analytics needs.
 */
export function redactAnalyticsString(value: string): string {
  return /^(?:https?:\/\/|\/)/i.test(value) ? scrubUrl(value) : redactLinkTokens(value);
}

/**
 * `$elements_chain` is one serialized string, `tag:key="value"key="value";...`, in which posthog-js escapes a `"`
 * inside a value as `\"`. Each quoted value is redacted on its own, so a value never runs into the next attribute.
 */
export function redactElementsChain(chain: string): string {
  return chain.replace(/"((?:\\"|[^"])*)"/g, (_match, inner: string) => `"${redactAnalyticsString(inner)}"`);
}

function redactValue(value: unknown): unknown {
  if (typeof value === "string") return redactAnalyticsString(value);
  if (Array.isArray(value)) return value.map(redactValue);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redactValue(v)]));
  }
  return value;
}

function redactProperties(properties: Properties): Properties {
  return Object.fromEntries(
    Object.entries(properties).map(([k, v]) => [k, k === "$elements_chain" && typeof v === "string" ? redactElementsChain(v) : redactValue(v)]),
  );
}

/** posthog-js `before_send`: every event's properties and person properties, redacted. */
export function redactCapture(event: CaptureResult | null): CaptureResult | null {
  if (event === null) return null;
  return {
    ...event,
    properties: redactProperties(event.properties),
    ...(event.$set ? { $set: redactProperties(event.$set) } : {}),
    ...(event.$set_once ? { $set_once: redactProperties(event.$set_once) } : {}),
  };
}

/** The init options. */
export function posthogOptions(apiHost: string): Partial<PostHogConfig> {
  return {
    api_host: apiHost,
    // Clicks and the elements clicked. A click event carries the element's text and attributes, so another reader's
    // name is drawn only by PersonName, PersonText and personAttrs, which mark it `ph-no-capture`; `check:third-party-names`
    // holds that (docs/agents/social.md).
    autocapture: true,
    mask_all_text: false,
    mask_all_element_attributes: false,
    // A pageview on load and on every App Router navigation, which moves the URL through the History API.
    capture_pageview: "history_change",
    // Pageleave stays on (explicit, not left to the SDK default).
    capture_pageleave: true,
    disable_session_recording: true,
    respect_dnt: true,
    // A person profile only for a signed-in reader.
    person_profiles: "identified_only",
    // Link tokens and URL queries never leave the browser.
    before_send: redactCapture,
    // No /flags request: the app uses no PostHog flags, surveys or remote config, and that request carries the
    // landing URL (a link token included) as person properties, outside `before_send`.
    advanced_disable_flags: true,
  };
}

/** Super-properties on every event: `release`, the build's short commit SHA. Left off when there is none. */
export function releaseProperties(commitSha: string | undefined): Record<string, string> {
  const sha = commitSha?.trim();
  return sha ? { release: sha.slice(0, 7) } : {};
}

export type AnalyticsConfig = {
  key: string | undefined;
  host: string | undefined;
  commitSha: string | undefined;
  /** The page's hostname, `window.location.hostname`. */
  hostname: string;
};

let client: Promise<PostHog | null> | null = null;
/** Registered at init and again after every reset, which clears super-properties along with the identity. */
let release: Record<string, string> = {};

/** Starts PostHog once, when both gates pass. Resolves to null when dormant or when anything fails. */
export function startAnalytics(config: AnalyticsConfig): Promise<PostHog | null> {
  if (client) return client;
  const key = config.key?.trim();
  if (!key || !isProductionHostname(config.hostname)) return Promise.resolve(null);
  client = import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(key, posthogOptions(posthogApiHost(config.host)));
      release = releaseProperties(config.commitSha);
      posthog.register(release);
      return posthog;
    })
    .catch(() => null);
  return client;
}

function withClient(run: (posthog: PostHog) => void): void {
  void client?.then((posthog) => {
    if (!posthog) return;
    try {
      run(posthog);
    } catch {
      // An analytics call never reaches the reader.
    }
  });
}

/** Ties later events to the Clerk user by account id alone. No name, no email: the id is all PostHog gets. */
export function identifyReader(userId: string): void {
  withClient((posthog) => posthog.identify(userId));
}

/**
 * Drops the identity on sign-out, so a shared device does not hand the next reader's events to the last one.
 * Only an identified browser is reset: resetting an anonymous one would mint a new id on every signed-out load
 * and count each load as a new visitor.
 */
export function resetReader(): void {
  withClient((posthog) => {
    if (posthog.get_property("$user_state") !== "identified") return;
    posthog.reset();
    posthog.register(release);
  });
}
