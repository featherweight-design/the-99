import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("web-push", () => ({ default: { sendNotification: m.send } }));

import type { PushConfig } from "./config";
import type { PushMessage } from "./message";
import { MAX_PAYLOAD_BYTES, TTL_SECONDS, payloadFor, sendWebPush } from "./send";

const config: PushConfig = { publicKey: "pub", privateKey: "priv", subject: "mailto:a@b.co" };
const target = { endpoint: "https://fcm.googleapis.com/x", p256dh: "p", auth: "a" };
const message: PushMessage = {
  title: "Jace is cheaper", body: "Was $8.40, now $5.10.", route: "/", tag: "price-drop", keys: ["item:1"], openCard: "o1", openCombo: false, image: "https://cards.scryfall.io/x.jpg",
};

beforeEach(() => vi.clearAllMocks());

describe("payloadFor", () => {
  it("carries what the worker needs: the words, the landing and what Home opens", () => {
    expect(JSON.parse(payloadFor(message))).toEqual(message);
  });

  it("stays under the Web Push size however long and however wide the words are, trimming the BODY first", () => {
    // Four-byte characters in the title and body, and the longest keys: the first pass is over the limit, so the loop must trim.
    const worst = { ...message, title: "😀".repeat(500), body: "😀".repeat(5000), image: `https://cards.scryfall.io/${"a".repeat(300)}.jpg`, keys: Array.from({ length: 200 }, (_, i) => `item:${"x".repeat(60)}${i}`) };
    const json = payloadFor(worst);
    expect(Buffer.byteLength(json, "utf8")).toBeLessThanOrEqual(MAX_PAYLOAD_BYTES);
    const parsed = JSON.parse(json) as PushMessage;
    expect([...parsed.title].length).toBe(120);
    expect([...parsed.body].length).toBeLessThan(400); // trimmed, not just capped
    expect(parsed.keys.length).toBeLessThanOrEqual(20);
    expect(payloadFor(message)).toBe(JSON.stringify(message)); // an ordinary message is untouched
  });
});

describe("sendWebPush", () => {
  it("signs with the VAPID key and keeps a day, with NO topic: the push service would drop all but one undelivered message per topic", async () => {
    m.send.mockResolvedValue({ statusCode: 201 });
    expect(await sendWebPush(target, "{}", config)).toEqual({ ok: true });
    expect(m.send).toHaveBeenCalledWith(
      { endpoint: target.endpoint, keys: { p256dh: "p", auth: "a" } }, "{}",
      { vapidDetails: { subject: config.subject, publicKey: "pub", privateKey: "priv" }, TTL: TTL_SECONDS, urgency: "normal" },
    );
  });

  it("calls a 404 or 410 GONE, so the caller deletes the device", async () => {
    for (const statusCode of [404, 410]) {
      m.send.mockRejectedValueOnce(Object.assign(new Error("gone"), { statusCode }));
      expect(await sendWebPush(target, "{}", config)).toEqual({ ok: false, gone: true, status: statusCode });
    }
  });

  it("calls any other failure transient, with its status when it has one", async () => {
    m.send.mockRejectedValueOnce(Object.assign(new Error("busy"), { statusCode: 503 }));
    expect(await sendWebPush(target, "{}", config)).toEqual({ ok: false, gone: false, status: 503 });
    m.send.mockRejectedValueOnce(new Error("socket hang up"));
    expect(await sendWebPush(target, "{}", config)).toEqual({ ok: false, gone: false, status: null });
  });
});
