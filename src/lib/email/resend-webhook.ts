// The Resend webhook's pure half: the Svix signature check and what an event is worth reporting. SERVER-ONLY.
//
// Resend signs with Svix: HMAC-SHA256 over `${svix-id}.${svix-timestamp}.${raw body}`, keyed by the base64 part of the
// `whsec_` secret, sent as space-separated `v1,<base64>` entries (more than one while a secret rotates). Checked here with
// node's crypto rather than a dependency: the format is fixed and small, and `RESEND_WEBHOOK_SECRET` is the only input.
import { createHmac, timingSafeEqual } from "node:crypto";

/** Svix's own tolerance: a timestamp further than this from now is a replay or a bad clock. */
export const TOLERANCE_SEC = 5 * 60;

export type SvixHeaders = { id: string | null; timestamp: string | null; signature: string | null };

export function verifySvix(body: string, headers: SvixHeaders, secret: string, nowSec: number = Math.floor(Date.now() / 1000)): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return false;
  const sent = Number(timestamp);
  if (!Number.isInteger(sent) || Math.abs(nowSec - sent) > TOLERANCE_SEC) return false;
  // Trimmed: a secret pasted into Vercel with a trailing newline must not silently become another key.
  const trimmed = secret.trim();
  const key = Buffer.from(trimmed.startsWith("whsec_") ? trimmed.slice(6) : trimmed, "base64");
  if (key.length === 0) return false;
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();
  return signature.split(" ").some((entry) => {
    const [version, value] = entry.split(",");
    if (version !== "v1" || !value) return false;
    const got = Buffer.from(value, "base64");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

/** The events worth a Sentry warning: a mail that bounced, or that its reader marked as spam. */
export const REPORTED_EVENTS = ["email.bounced", "email.complained"] as const;
export type ReportedEvent = (typeof REPORTED_EVENTS)[number];
export const isReportedEvent = (type: unknown): type is ReportedEvent => (REPORTED_EVENTS as readonly unknown[]).includes(type);

/**
 * The template tag `sendMail` put on the mail (`code`, `flyer-code`, `invite`, `launch`), or `unknown`. Resend echoes tags as an object
 * (or a list of name/value pairs in older payloads). Only a value of the shape sent is returned, so a tag that somehow carried
 * anything else, an address included, never reaches Sentry.
 */
export function templateOf(data: unknown): string {
  const tags = (data as { tags?: unknown } | null)?.tags;
  let value: unknown;
  if (Array.isArray(tags)) value = tags.find((t) => (t as { name?: unknown })?.name === "template")?.value;
  else if (tags && typeof tags === "object") value = (tags as Record<string, unknown>).template;
  return typeof value === "string" && /^[a-z][a-z-]{0,23}$/.test(value) ? value : "unknown";
}
