import { createECDH } from "node:crypto";
import { describe, expect, it } from "vitest";

import { isAuthSecret, isP256dh, isPushEndpoint, parseDevice } from "./endpoint";

function validPoint(): string {
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  return ecdh.getPublicKey().toString("base64url");
}
const point = validPoint();
const offCurve = Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 7)]).toString("base64url");
const auth = Buffer.alloc(16, 9).toString("base64url");
const good = { endpoint: "https://fcm.googleapis.com/fcm/send/abc123", p256dh: point, auth, userAgent: "Chrome 140 on Android", timeZone: "America/Denver" };

describe("a push endpoint is one of the push services' own hosts", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/abc",
    "https://updates.push.services.mozilla.com/wpush/v2/abc",
    "https://web.push.apple.com/QAbc",
    "https://wns2-par02p.notify.windows.com/w/?token=abc",
  ])("accepts %s", (url) => expect(isPushEndpoint(url)).toBe(true));

  it.each([
    "http://fcm.googleapis.com/fcm/send/abc", // not https
    "https://evil.example.com/fcm/send/abc",
    "https://fcm.googleapis.com.evil.example.com/x", // a lookalike prefix
    "https://evilpush.apple.com.example.com/x",
    "https://push.apple.com/x", // the bare suffix is not a push host
    "https://user:pw@fcm.googleapis.com/x",
    "https://fcm.googleapis.com:8443/x",
    "https://127.0.0.1/x",
    "https://localhost/x",
    "not a url",
    "",
    `https://fcm.googleapis.com/${"a".repeat(2100)}`,
  ])("refuses %s", (url) => expect(isPushEndpoint(url)).toBe(false));

  it("refuses a value that is not a string", () => {
    for (const v of [null, undefined, 3, {}, ["https://fcm.googleapis.com/x"]]) expect(isPushEndpoint(v)).toBe(false);
  });
});

describe("the browser's keys", () => {
  it("wants a 65-byte uncompressed point and a 16-byte secret", () => {
    expect(isP256dh(point)).toBe(true);
    expect(isP256dh(offCurve)).toBe(false); // right length and prefix, not a point on P-256
    expect(isP256dh(Buffer.concat([Buffer.from([4]), Buffer.alloc(64)]).toString("base64url"))).toBe(false);
    expect(isP256dh(Buffer.alloc(65, 1).toString("base64url"))).toBe(false); // no 0x04 prefix
    expect(isP256dh(auth)).toBe(false);
    expect(isAuthSecret(auth)).toBe(true);
    expect(isAuthSecret(point)).toBe(false);
    expect(isAuthSecret("not base64 !")).toBe(false);
  });
});

describe("parseDevice", () => {
  it("keeps a good device as sent", () => {
    expect(parseDevice(good)).toEqual(good);
  });

  it("refuses a bad endpoint or key, and anything that is not an object", () => {
    expect(parseDevice({ ...good, endpoint: "https://evil.example.com/x" })).toBeNull();
    expect(parseDevice({ ...good, p256dh: auth })).toBeNull();
    expect(parseDevice({ ...good, p256dh: offCurve })).toBeNull();
    expect(parseDevice({ ...good, auth: point })).toBeNull();
    for (const v of [null, "x", 3, [good]]) expect(parseDevice(v)).toBeNull();
  });

  it("cleans the label and falls back to UTC for a zone that is not one", () => {
    const d = parseDevice({ ...good, userAgent: `  Safari\u0000\n${"x".repeat(300)}`, timeZone: "Mars/Olympus" });
    expect(d?.userAgent.length).toBeLessThanOrEqual(200);
    expect(d?.userAgent).not.toMatch(/[\u0000-\u001f]/);
    expect(d?.timeZone).toBe("UTC");
    expect(parseDevice({ ...good, userAgent: 5 })?.userAgent).toBe("");
  });
});
