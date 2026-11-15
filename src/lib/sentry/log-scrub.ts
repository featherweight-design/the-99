// What a Sentry log may carry. Pure: `logEvent` (the one way the app writes a log) and `beforeSendLog` (every log the SDK
// would send, its own included) both run it, and every runtime and the tests load it.
//
// A log is one of a CLOSED set of event names (`LOG_EVENTS`); anything else is dropped whole, so a raw `Sentry.logger`
// call, a console capture (kept off) or an SDK log never leaves. Its attributes are allowlisted by TYPE:
//   - a boolean, or a finite number;
//   - a string of at most 64 characters shaped like an enum (letters, digits, `_ . : -`, no spaces), which is not an email,
//     not a Clerk, Stripe or uuid id, and not a long token;
// and by KEY: snake_case, never one naming a person (`user`, `email`, `name`, `id`, `clerk`, `ip`, `address`), except
// `user_tag`, the keyed hash (`user-tag.ts`). Anything else is stripped, never sent.

export const LOG_EVENTS = [
  "card_scan.answered",
  "collection.upload_done",
  "deck.built",
  "payment.webhook",
  "cron.run",
  "mail.cap_hit",
  "resend.webhook",
] as const;

export type LogEventName = (typeof LOG_EVENTS)[number];
export type LogValue = string | number | boolean;
export type LogAttrs = Record<string, LogValue>;

const EVENT_SET: ReadonlySet<string> = new Set(LOG_EVENTS);

const KEY_SHAPE = /^[a-z][a-z0-9_]{0,39}$/;
const PERSON_KEY = /(^|_)(user|users|email|mail_to|name|names|id|ids|clerk|ip|address)(_|$)/;
const VALUE_SHAPE = /^[A-Za-z0-9_.:-]{1,64}$/;
const ID_VALUE = /^(user|sess|org|client|cus|evt|pi|cs|sub|price|prod)_|[0-9a-f]{8}-[0-9a-f]{4}|[A-Za-z0-9]{20,}/i;
const HMAC_TAG = /^[0-9a-f]{16}$/;

/** The SDK's own attributes a log keeps: where it came from, never who. */
const SDK_KEPT = new Set(["sentry.release", "sentry.environment", "sentry.sdk.name", "sentry.sdk.version", "sentry.trace.parent_span_id", "sentry.origin"]);

/** Whether one attribute may be sent as given. */
export function attributeAllowed(key: string, value: unknown): boolean {
  if (key === "user_tag") return typeof value === "string" && HMAC_TAG.test(value);
  if (!KEY_SHAPE.test(key) || PERSON_KEY.test(key)) return false;
  if (typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "string") return false;
  return VALUE_SHAPE.test(value) && !value.includes("@") && !ID_VALUE.test(value);
}

/** The attributes that may leave, and the keys that were stripped. */
export function cleanAttributes(attrs: Record<string, unknown>): { kept: LogAttrs; stripped: string[] } {
  const kept: LogAttrs = {};
  const stripped: string[] = [];
  for (const [key, value] of Object.entries(attrs)) {
    if (attributeAllowed(key, value)) kept[key] = value as LogValue;
    else stripped.push(key);
  }
  return { kept, stripped };
}

export function isLogEvent(name: unknown): name is LogEventName {
  return typeof name === "string" && EVENT_SET.has(name);
}

type LogLike = { message: unknown; attributes?: Record<string, unknown> };

/** `beforeSendLog`: a log that is not one of `LOG_EVENTS` is dropped; the rest keep only allowed attributes. */
export function scrubLog<T extends LogLike>(log: T): T | null {
  // A parameterized message (`logger.fmt`) is a String object, not a string: never one of ours.
  if (!isLogEvent(log.message)) return null;
  const attributes: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(log.attributes ?? {})) {
    if (SDK_KEPT.has(key) ? typeof value === "string" || typeof value === "number" : attributeAllowed(key, value)) attributes[key] = value;
  }
  return { ...log, attributes };
}
