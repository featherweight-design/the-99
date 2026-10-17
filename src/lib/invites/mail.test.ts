import { describe, expect, it, vi } from "vitest";
import { mailConfig, RESEND_URL, sendMail } from "./mail";

const SECRET = "ab".repeat(32);
const FULL = { RESEND_API_KEY: "re_test_123", INVITE_EMAIL_FROM: "The 99 <invites@mail.the-99.dev>", INVITE_CODE_SECRET: SECRET };
const MAIL = { to: "new@x.dev", subject: "Your code", text: "123456", html: "<p>123456</p>" };

describe("mailConfig", () => {
  it("is configured only with the key, a sender address and the code secret", () => {
    expect(mailConfig(FULL)).toEqual({ apiKey: "re_test_123", from: "The 99 <invites@mail.the-99.dev>" });
    expect(mailConfig({ ...FULL, INVITE_EMAIL_FROM: "invites@mail.the-99.dev" })).not.toBeNull();
  });

  it("is null, failing closed, when any part is missing or malformed", () => {
    expect(mailConfig({})).toBeNull();
    expect(mailConfig({ ...FULL, RESEND_API_KEY: undefined })).toBeNull();
    expect(mailConfig({ ...FULL, RESEND_API_KEY: "sk_live_x" })).toBeNull();
    expect(mailConfig({ ...FULL, RESEND_API_KEY: "  " })).toBeNull();
    expect(mailConfig({ ...FULL, INVITE_EMAIL_FROM: undefined })).toBeNull();
    expect(mailConfig({ ...FULL, INVITE_EMAIL_FROM: "The 99" })).toBeNull();
    expect(mailConfig({ ...FULL, INVITE_CODE_SECRET: undefined })).toBeNull();
    expect(mailConfig({ ...FULL, INVITE_CODE_SECRET: "short" })).toBeNull();
  });
});

describe("sendMail", () => {
  it("unconfigured, fetches nothing and says so", async () => {
    const fetchImpl = vi.fn();
    expect(await sendMail(null, MAIL, fetchImpl as unknown as typeof fetch)).toEqual({ ok: false, reason: "unconfigured" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("posts one message to Resend with the key as a bearer token", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
    expect(await sendMail(mailConfig(FULL), MAIL, fetchImpl as unknown as typeof fetch)).toEqual({ ok: true });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(RESEND_URL);
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_test_123");
    expect(JSON.parse(init.body as string)).toEqual({
      from: FULL.INVITE_EMAIL_FROM, to: ["new@x.dev"], subject: "Your code", text: "123456", html: "<p>123456</p>",
    });
  });

  it("answers a refusal or a network failure as failed, logging no address", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await sendMail(mailConfig(FULL), MAIL, (async () => new Response("no", { status: 422 })) as typeof fetch))
      .toEqual({ ok: false, reason: "failed" });
    expect(await sendMail(mailConfig(FULL), MAIL, (async () => { throw new Error("down"); }) as typeof fetch))
      .toEqual({ ok: false, reason: "failed" });
    for (const [line] of warn.mock.calls) expect(String(line)).not.toContain("new@x.dev");
    warn.mockRestore();
  });
});
