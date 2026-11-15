import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { TOLERANCE_SEC, isReportedEvent, templateOf, verifySvix } from "./resend-webhook";

const KEY = Buffer.from("a-test-signing-key-of-some-length").toString("base64");
const SECRET = `whsec_${KEY}`;
const NOW = 1_800_000_000;
const sign = (id: string, ts: string, body: string, key = KEY) =>
  `v1,${createHmac("sha256", Buffer.from(key, "base64")).update(`${id}.${ts}.${body}`).digest("base64")}`;
const headers = (body: string, ts = String(NOW), key = KEY) => ({ id: "msg_1", timestamp: ts, signature: sign("msg_1", ts, body, key) });

describe("verifySvix", () => {
  const body = '{"type":"email.bounced"}';
  it("accepts the signature Svix would send", () => {
    expect(verifySvix(body, headers(body), SECRET, NOW)).toBe(true);
  });
  it("accepts any one of several signatures (a rotating secret)", () => {
    const h = headers(body);
    expect(verifySvix(body, { ...h, signature: `v1,${Buffer.from("nope").toString("base64")} ${h.signature}` }, SECRET, NOW)).toBe(true);
  });
  it("refuses a changed body, a wrong key, a missing header and a signature with another version", () => {
    expect(verifySvix(`${body} `, headers(body), SECRET, NOW)).toBe(false);
    expect(verifySvix(body, headers(body, String(NOW), Buffer.from("other").toString("base64")), SECRET, NOW)).toBe(false);
    expect(verifySvix(body, { ...headers(body), signature: null }, SECRET, NOW)).toBe(false);
    expect(verifySvix(body, { ...headers(body), signature: headers(body).signature.replace("v1,", "v2,") }, SECRET, NOW)).toBe(false);
  });
  it("refuses a timestamp outside five minutes, either way, and one that is not a number", () => {
    expect(verifySvix(body, headers(body, String(NOW - TOLERANCE_SEC - 1)), SECRET, NOW)).toBe(false);
    expect(verifySvix(body, headers(body, String(NOW + TOLERANCE_SEC + 1)), SECRET, NOW)).toBe(false);
    expect(verifySvix(body, headers(body, String(NOW - TOLERANCE_SEC)), SECRET, NOW)).toBe(true);
    expect(verifySvix(body, headers(body, "soon"), SECRET, NOW)).toBe(false);
  });
});

describe("what is reported", () => {
  it("is a bounce or a complaint, nothing else", () => {
    expect(isReportedEvent("email.bounced")).toBe(true);
    expect(isReportedEvent("email.complained")).toBe(true);
    expect(isReportedEvent("email.delivered")).toBe(false);
    expect(isReportedEvent(undefined)).toBe(false);
  });
  it("reads the template tag as an object or a list, and nothing that is not its shape", () => {
    expect(templateOf({ tags: { template: "invite" } })).toBe("invite");
    expect(templateOf({ tags: [{ name: "template", value: "flyer-code" }] })).toBe("flyer-code");
    expect(templateOf({ tags: { template: "someone@example.com" } })).toBe("unknown");
    expect(templateOf({})).toBe("unknown");
    expect(templateOf(null)).toBe("unknown");
  });
});
