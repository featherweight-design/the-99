import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ warn: vi.fn(), logWarn: vi.fn() }));
vi.mock("../../../lib/sentry/capture", () => ({ captureServerWarning: m.warn }));
vi.mock("@sentry/nextjs", () => ({ logger: { warn: m.logWarn } }));

import { POST } from "./route";

const KEY = Buffer.from("route-test-signing-key").toString("base64");
const call = (body: string, opts: { sign?: boolean; ts?: number } = {}) => {
  const ts = String(opts.ts ?? Math.floor(Date.now() / 1000));
  const sig = opts.sign === false ? "v1,AAAA" : `v1,${createHmac("sha256", Buffer.from(KEY, "base64")).update(`msg_1.${ts}.${body}`).digest("base64")}`;
  return POST(new NextRequest("https://the-99.dev/api/resend-webhook", {
    method: "POST",
    body,
    headers: { "svix-id": "msg_1", "svix-timestamp": ts, "svix-signature": sig },
  }));
};
const bounce = JSON.stringify({ type: "email.bounced", data: { to: ["someone@example.com"], subject: "Your code", tags: { template: "code" } } });

beforeEach(() => {
  process.env.RESEND_WEBHOOK_SECRET = `whsec_${KEY}`;
  vi.clearAllMocks();
});
afterEach(() => {
  delete process.env.RESEND_WEBHOOK_SECRET;
});

describe("POST /api/resend-webhook", () => {
  it("answers 503 and does nothing until the secret is set", async () => {
    delete process.env.RESEND_WEBHOOK_SECRET;
    expect((await call(bounce)).status).toBe(503);
    expect(m.warn).not.toHaveBeenCalled();
  });
  it("answers 401 to a bad signature or a stale timestamp, and reports nothing", async () => {
    expect((await call(bounce, { sign: false })).status).toBe(401);
    expect((await call(bounce, { ts: 1 })).status).toBe(401);
    expect(m.warn).not.toHaveBeenCalled();
    expect(m.logWarn).not.toHaveBeenCalled();
  });
  it("reports a bounce with its event and template only, never the address or subject", async () => {
    expect((await call(bounce)).status).toBe(200);
    expect(m.warn).toHaveBeenCalledWith("resend-webhook", "Resend email.bounced", { event: "email.bounced", template: "code" });
    expect(m.logWarn).toHaveBeenCalledWith("resend.webhook", { event: "email.bounced", template: "code" });
    expect(JSON.stringify([m.warn.mock.calls, m.logWarn.mock.calls])).not.toMatch(/someone@|Your code/);
  });
  it("reports a complaint, and ignores any other event or an unreadable body with 200", async () => {
    await call(JSON.stringify({ type: "email.complained", data: {} }));
    expect(m.warn).toHaveBeenCalledWith("resend-webhook", "Resend email.complained", { event: "email.complained", template: "unknown" });
    m.warn.mockClear();
    expect((await call(JSON.stringify({ type: "email.delivered", data: {} }))).status).toBe(200);
    expect((await call("not json")).status).toBe(200);
    expect(m.warn).not.toHaveBeenCalled();
  });
});
