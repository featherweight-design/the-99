// The server half of the sign-out evidence (docs/agents/ops.md, Product analytics): Clerk's `session.ended`,
// `session.removed` and `session.revoked` webhooks, sent to PostHog as `auth_<type>` on the same person the browser
// events land on (the Clerk id, as `identifyReader` gives PostHog). Evidence only: nothing here changes a session.
// SERVER-ONLY.
//
// What leaves: the event type, the session's status, its age, how long it sat idle before it ended, how long before
// Clerk's own abandon and expiry times it ended, and whether Clerk saw a mobile device. Never an IP, a user agent,
// a city, a session or client id, a name or an email; PostHog's GeoIP is turned off for it, and it never makes or
// updates a person profile (`$process_person_profile: false`), so a session event that arrives after `user.deleted`
// cannot bring a purged account's profile back.
import { isProductionHostname, posthogApiHost } from "./hosts";

export const SESSION_EVENTS = ["session.ended", "session.removed", "session.revoked"] as const;
export type SessionEventType = (typeof SESSION_EVENTS)[number];

/** A capture that has not answered in this long is dropped: the webhook's answer never waits on analytics. */
export const CAPTURE_TIMEOUT_MS = 3000;

export function isSessionEvent(type: string): type is SessionEventType {
  return (SESSION_EVENTS as readonly string[]).includes(type);
}

type SessionData = {
  user_id?: unknown; status?: unknown; created_at?: unknown; updated_at?: unknown;
  last_active_at?: unknown; expire_at?: unknown; abandon_at?: unknown; latest_activity?: { is_mobile?: unknown } | null;
};

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const hours = (from: number | null, to: number | null) =>
  from === null || to === null ? null : Math.round(((to - from) / 3_600_000) * 10) / 10;

/** The event, or null without a user to put it on. Times are Clerk's own (ms); `updated_at` is when it ended. */
export function sessionEvent(type: SessionEventType, data: SessionData) {
  if (typeof data.user_id !== "string" || data.user_id.length === 0) return null;
  const ended = num(data.updated_at);
  return {
    event: `auth_${type.replace(".", "_")}`,
    distinctId: data.user_id,
    properties: {
      session_status: typeof data.status === "string" ? data.status : null,
      session_age_hours: hours(num(data.created_at), ended),
      idle_hours: hours(num(data.last_active_at), ended),
      hours_before_abandon: hours(ended, num(data.abandon_at)),
      hours_before_expire: hours(ended, num(data.expire_at)),
      is_mobile: typeof data.latest_activity?.is_mobile === "boolean" ? data.latest_activity.is_mobile : null,
    },
  };
}

/** The capture endpoint, or null when the host is not an absolute http(s) URL (a browser-only `/ingest` proxy). */
export function captureUrl(host: string | undefined): string | null {
  try {
    const url = new URL(`${posthogApiHost(host).replace(/\/+$/, "")}/i/v0/e/`);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Sends one session event to PostHog's capture API by plain `fetch` (no SDK, like Resend). Dormant like the browser
 * SDK: without a key, or when the webhook did not arrive on a production hostname (logged, so a gate that never
 * passes is visible). Never throws.
 */
export async function captureSessionEvent(
  type: SessionEventType,
  data: SessionData,
  context: { hostname: string; key?: string; host?: string },
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const key = context.key?.trim();
  const e = sessionEvent(type, data);
  if (!key || !e) return false;
  if (!isProductionHostname(context.hostname)) {
    console.info(`[clerk-webhook] session evidence dormant host=${context.hostname}`);
    return false;
  }
  const url = captureUrl(context.host);
  if (!url) {
    console.warn("[clerk-webhook] session evidence not captured: host is not absolute");
    return false;
  }
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event: e.event,
        distinct_id: e.distinctId,
        properties: { ...e.properties, $geoip_disable: true, $process_person_profile: false },
      }),
      signal: AbortSignal.timeout(CAPTURE_TIMEOUT_MS),
    });
    if (!res.ok) console.warn(`[clerk-webhook] session evidence not captured status=${res.status}`);
    return res.ok;
  } catch {
    console.warn("[clerk-webhook] session evidence not captured status=none");
    return false;
  }
}
