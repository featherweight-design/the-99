// The newcomer funnel, server-side (queue item 3, Hugh approved): five events that say where a stranger gets to, with no one
// in them. SERVER-ONLY (it reads the hash key, which never reaches the browser).
//
//   code_requested       { outcome: sent | refused | failed, kind: flyer | invite }   a code email asked for (`startFlyerClaimAction`, `claimInviteAction`)
//   code_redeemed        { outcome: ok | wrong | expired | unconfigured | throttled, kind }   the typed code checked (`confirm*Action`); a dead link (`ended`) sends nothing: it is not rate-limited, so it must not be a way to make analytics events
//   account_created      { }                                                          Clerk's `user.created` webhook
//   first_collection_action { source: import | add }                                  the account's first collection write, once
//   $pageview on /join/<token>                                                        the poster landing: PostHog's own pageview, token redacted
//
// The landing is NOT a custom event: the browser SDK already sends `$pageview` for `/join/<token>` with the token replaced
// (`redactLinkTokens`), so a dedicated `poster_landing_viewed` would count the same view twice. Filter the funnel's first step on
// `$pathname` starting `/join/`.
//
// Identity: no Clerk id, no email, no address, no IP. A signed-in account is its keyed hash (`u_<16 hex>`, an HMAC under the same key as Sentry's
// `user` tag but a different derivation, so the two do not match); a newcomer with no account is the keyed hash of their claim secret (`a_<16 hex>`), so one newcomer's request and
// redeem share an id, or a fresh random id when no claim exists yet (a refused or throttled step): count those steps' EVENTS, not their unique ids. The two namespaces never join (an account is made by a
// different party, Clerk), by design: this is a funnel of counts, not of people. Each event is personless
// (`$process_person_profile: false`) with GeoIP off, so it makes no profile and carries no place.
import { createHmac, randomBytes } from "node:crypto";
import { captureUrl } from "./session-events";
import { isProductionHostname } from "./hosts";

export const FUNNEL_EVENTS = ["code_requested", "code_redeemed", "account_created", "first_collection_action"] as const;
/** The closed set `code_redeemed` may carry: a typed code that checked out, or was wrong, expired or could not be checked. Anything else (a dead link) sends nothing. */
export function redeemOutcome(result: { ok: true } | { ok: false; reason: string }): "ok" | "wrong" | "expired" | "unconfigured" | null {
  if (result.ok) return "ok";
  return result.reason === "wrong" || result.reason === "expired" || result.reason === "unconfigured" ? result.reason : null;
}

export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];

/** A capture that has not answered in this long is dropped: no request waits on analytics. */
export const FUNNEL_TIMEOUT_MS = 3000;
const MIN_KEY = 32;

/** The key the ids are hashed under: Sentry's user-tag key, else the anonymous-read salt; null when neither is long enough (the event is then not sent). */
function hashKey(env: { SENTRY_USER_HASH_KEY?: string; ANON_KEY_SALT?: string }): string | null {
  for (const k of [env.SENTRY_USER_HASH_KEY, env.ANON_KEY_SALT]) if (k && k.length >= MIN_KEY) return k;
  return null;
}

/** `u_<hash>` for an account. */
export function accountId(userId: string, env: Parameters<typeof hashKey>[0]): string | null {
  const key = hashKey(env);
  return key ? `u_${createHmac("sha256", key).update(`user:${userId}`).digest("hex").slice(0, 16)}` : null;
}

/** `a_<hash>` for a newcomer's claim secret, or a random id when there is none yet. Never the secret itself. */
export function claimId(secret: string | null | undefined, env: Parameters<typeof hashKey>[0]): string | null {
  const key = hashKey(env);
  if (!key) return null;
  return `a_${secret ? createHmac("sha256", key).update(`claim:${secret}`).digest("hex").slice(0, 16) : randomBytes(8).toString("hex")}`;
}

export type FunnelContext = { hostname: string; key?: string; host?: string };

/** Sends one funnel event by plain `fetch`, like the session evidence. Dormant without the key or off the production hostnames. Never throws. */
export async function captureFunnelEvent(
  event: FunnelEvent,
  distinctId: string | null,
  properties: Record<string, string | number | boolean>,
  context: FunnelContext,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const key = context.key?.trim();
  if (!key || !distinctId || !isProductionHostname(context.hostname)) return false;
  const url = captureUrl(context.host);
  if (!url) return false;
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event,
        distinct_id: distinctId,
        properties: { ...properties, $geoip_disable: true, $process_person_profile: false },
      }),
      signal: AbortSignal.timeout(FUNNEL_TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}
