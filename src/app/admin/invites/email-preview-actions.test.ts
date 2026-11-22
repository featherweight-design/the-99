import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdmin = vi.fn();
const currentUser = vi.fn();
const mailConfig = vi.fn();
const sendMail = vi.fn();
const enforceHit = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({ currentUser: () => currentUser() }));
vi.mock("../../../lib/admin/access", () => ({ requireAdmin: () => requireAdmin() }));
vi.mock("../../../lib/account/sign-in", () => ({ primaryEmail: (u: { email: string }) => u.email }));
vi.mock("../../../lib/invites/mail", () => ({
  mailConfig: () => mailConfig(),
  mailEnv: () => ({}),
  sendMail: (...a: unknown[]) => sendMail(...a),
}));
vi.mock("../../../lib/rate/observe", () => ({ enforceHit: (...a: unknown[]) => enforceHit(...a) }));

import { sendEmailPreviews } from "./email-preview-actions";

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue({ userId: "user_admin", env: "staging" });
  currentUser.mockResolvedValue({ email: "admin@example.com" });
  mailConfig.mockReturnValue({ apiKey: "re_x", from: "a@b.co", origin: "https://the99.example" });
  enforceHit.mockResolvedValue(null);
  sendMail.mockResolvedValue({ ok: true });
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("sendEmailPreviews", () => {
  it("checks the admin first and sends nothing when that throws", async () => {
    requireAdmin.mockRejectedValue(new Error("NEXT_NOT_FOUND"));
    await expect(sendEmailPreviews()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(sendMail).not.toHaveBeenCalled();
    expect(enforceHit).not.toHaveBeenCalled();
  });

  it("sends the three templates to the admin's own address, subjects prefixed", async () => {
    const r = await sendEmailPreviews();
    expect(r).toEqual({ ok: true, sent: ["invite", "code", "launch"], total: 3, stoppedBy: null });
    const mails = sendMail.mock.calls.map((c) => c[1] as { to: string; subject: string });
    expect(mails.every((m) => m.to === "admin@example.com" && m.subject.startsWith("[Preview] "))).toBe(true);
    expect(enforceHit).toHaveBeenCalledWith("user_admin", "admin-mail-preview");
  });

  it("refuses inside the cooldown before any send", async () => {
    enforceHit.mockResolvedValue(240);
    expect(await sendEmailPreviews()).toEqual({ ok: false, reason: "cooldown", waitSec: 240 });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("refuses when mail is unconfigured or the account has no address, spending no cooldown", async () => {
    mailConfig.mockReturnValue(null);
    expect(await sendEmailPreviews()).toEqual({ ok: false, reason: "unconfigured" });
    mailConfig.mockReturnValue({ apiKey: "re_x", from: "a@b.co", origin: "https://the99.example" });
    currentUser.mockResolvedValue({ email: "" });
    expect(await sendEmailPreviews()).toEqual({ ok: false, reason: "no-address" });
    expect(enforceHit).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("stops at the cap and at the recipient wall", async () => {
    sendMail.mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: false, reason: "capped" });
    expect(await sendEmailPreviews()).toEqual({ ok: true, sent: ["invite"], total: 3, stoppedBy: "capped" });
    expect(sendMail).toHaveBeenCalledTimes(2);
    sendMail.mockClear();
    sendMail.mockResolvedValue({ ok: false, reason: "limited", waitSec: 60 });
    expect(await sendEmailPreviews()).toEqual({ ok: true, sent: [], total: 3, stoppedBy: "limited" });
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it("carries on past one failed template", async () => {
    sendMail.mockResolvedValueOnce({ ok: false, reason: "failed" }).mockResolvedValue({ ok: true });
    expect(await sendEmailPreviews()).toEqual({ ok: true, sent: ["code", "launch"], total: 3, stoppedBy: "failed" });
    expect(sendMail).toHaveBeenCalledTimes(3);
  });
});
