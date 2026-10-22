/**
 * What a browser hands the server when it subscribes, checked before it is stored (plan `2026-10-22-push.md`, PR 2).
 * Pure. The endpoint is a URL the SERVER will later POST to, so it is held to the push services' own hosts: a reader
 * (or anyone with a session) cannot make the sender call an arbitrary address. A browser's endpoint is always one of
 * these, over https.
 */
import { validTimeZone } from "./hold";

/** Exact hosts and host suffixes of the push services the supported browsers use: Chrome and Edge, Firefox, Safari, Windows. */
const HOSTS = ["fcm.googleapis.com"] as const;
const SUFFIXES = [".push.services.mozilla.com", ".push.apple.com", ".notify.windows.com"] as const;

export const MAX_ENDPOINT = 2048;
export const MAX_USER_AGENT = 200;

export function isPushEndpoint(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_ENDPOINT) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username !== "" || url.password !== "" || url.port !== "") return false;
  const host = url.hostname.toLowerCase();
  return (HOSTS as readonly string[]).includes(host) || SUFFIXES.some((s) => host.endsWith(s) && host.length > s.length);
}

const B64URL = /^[A-Za-z0-9_-]+$/;
const decoded = (v: unknown): Buffer | null => (typeof v === "string" && B64URL.test(v) ? Buffer.from(v, "base64url") : null);

/** The browser's public key: an uncompressed P-256 point. */
export const isP256dh = (v: unknown): v is string => {
  const b = decoded(v);
  return b !== null && b.length === 65 && b[0] === 0x04;
};

/** The browser's auth secret: 16 random bytes. */
export const isAuthSecret = (v: unknown): v is string => decoded(v)?.length === 16;

export type DeviceInput = { endpoint: string; p256dh: string; auth: string; userAgent: string; timeZone: string };

/**
 * A device row from a client's untrusted payload, or null when the endpoint or either key is not what a browser sends.
 * The user agent is a label for the reader's own list: control characters go and it is capped. A zone that is not an
 * IANA name is stored as UTC rather than refusing the device.
 */
export function parseDevice(raw: unknown): DeviceInput | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (!isPushEndpoint(r.endpoint) || !isP256dh(r.p256dh) || !isAuthSecret(r.auth)) return null;
  const userAgent = (typeof r.userAgent === "string" ? r.userAgent : "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, MAX_USER_AGENT);
  const timeZone = typeof r.timeZone === "string" && validTimeZone(r.timeZone) ? r.timeZone : "UTC";
  return { endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth, userAgent, timeZone };
}
