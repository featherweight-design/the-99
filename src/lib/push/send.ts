/**
 * One Web Push request (plan `2026-10-22-push.md`). `web-push` encrypts the payload to the device's keys and signs the
 * request with the VAPID key; this file is the one place that calls it, so the rest of push is tested against a fake
 * `PushSender`. A device the push service no longer knows (404 or 410) comes back `gone`: the caller deletes its row.
 * Nothing here logs an endpoint, a key or a payload.
 */
import webpush from "web-push";

import type { PushConfig } from "./config";
import type { PushMessage } from "./message";

export type SendTarget = { endpoint: string; p256dh: string; auth: string };
export type SendResult = { ok: true } | { ok: false; gone: boolean; status: number | null };
export type PushSender = (target: SendTarget, payload: string, config: PushConfig) => Promise<SendResult>;

/** A message that waits a day is no longer news: the push service drops it after this. */
export const TTL_SECONDS = 24 * 60 * 60;
/** Web Push carries 4096 bytes after encryption; the JSON stays well under it. */
export const MAX_PAYLOAD_BYTES = 3000;

/** The first `n` characters, never splitting a surrogate pair. */
const clip = (text: string, n: number): string => Array.from(text).slice(0, n).join("");

/** The service worker's payload: what a notification shows, where a tap lands and what Home opens. */
export function payloadFor(message: PushMessage): string {
  const body = (n: number) => JSON.stringify({
    title: clip(message.title, 120),
    body: clip(message.body, n),
    route: message.route,
    tag: message.tag,
    keys: message.keys.slice(0, 20),
    openCard: message.openCard,
    openCombo: message.openCombo,
    image: message.image,
  });
  for (let n = 400; n >= 0; n -= 50) {
    const json = body(n);
    if (Buffer.byteLength(json, "utf8") <= MAX_PAYLOAD_BYTES) return json;
  }
  return body(0);
}

/** How long one send may wait for the push service before it counts as a transient failure. */
export const SEND_TIMEOUT_MS = 10_000;

export const sendWebPush: PushSender = async (target, payload, config) => {
  try {
    await webpush.sendNotification({ endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } }, payload, {
      vapidDetails: { subject: config.subject, publicKey: config.publicKey, privateKey: config.privateKey },
      TTL: TTL_SECONDS,
      urgency: "normal",
      // A push service that takes the connection and never answers must not stall the run: every later device and reader
      // waits on this await. A timeout rejects into the transient path below and the row retries next run.
      timeout: SEND_TIMEOUT_MS,
      // No `topic`: the push service would keep ONE undelivered message per topic and drop the rest, and the flush has
      // already recorded each as sent. The device's own `tag` replaces a notification with its successor when it shows them.
    });
    return { ok: true };
  } catch (error) {
    const status = typeof (error as { statusCode?: unknown })?.statusCode === "number" ? (error as { statusCode: number }).statusCode : null;
    return { ok: false, gone: status === 404 || status === 410, status };
  }
};
