// The sender's invite actions (invites PR 2): the switch is decided for the READER, the email path answers at the
// floor whatever happened, and a failure before the reservation is the only `failed`.
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  requestSwitchEnv: vi.fn(),
  sendEmailInvite: vi.fn(),
  showInviteQr: vi.fn(),
  atFloor: vi.fn(),
  observeHit: vi.fn(),
  headers: vi.fn(),
}));
vi.mock("../../lib/auth", () => ({ requireUserId: m.requireUserId }));
vi.mock("../../lib/switches/request", () => ({ requestSwitchEnv: m.requestSwitchEnv }));
vi.mock("../../lib/invites/send", () => ({ sendEmailInvite: m.sendEmailInvite, showInviteQr: m.showInviteQr }));
vi.mock("../../lib/invites/floor", () => ({ atFloor: m.atFloor }));
vi.mock("../../lib/rate/observe", () => ({ observeHit: m.observeHit }));
vi.mock("next/headers", () => ({ headers: m.headers }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { sendEmailInviteAction, showInviteQrAction } from "./invite-actions";

const ON = { SOCIAL_FRIENDS_ENABLED: "true", SOCIAL_INVITES_ENABLED: "true" };
const SECRET = "ab".repeat(32);

beforeEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
  m.requireUserId.mockResolvedValue("user_a");
  m.requestSwitchEnv.mockResolvedValue(ON);
  m.atFloor.mockImplementation((work: () => Promise<unknown>) => work());
  m.sendEmailInvite.mockResolvedValue({ ok: true });
  m.headers.mockResolvedValue(new Headers({ host: "the-99.dev", "x-forwarded-proto": "https" }));
  vi.stubEnv("INVITE_CODE_SECRET", SECRET);
});

describe("sendEmailInviteAction", () => {
  it("is off for a reader whose invites switch is off, and touches nothing", async () => {
    m.requestSwitchEnv.mockResolvedValue({ SOCIAL_FRIENDS_ENABLED: "true" });
    expect(await sendEmailInviteAction("a@x.dev")).toEqual({ ok: false, reason: "off" });
    expect(m.sendEmailInvite).not.toHaveBeenCalled();
    expect(m.requestSwitchEnv).toHaveBeenCalledWith("user_a");
  });

  it("refuses anything but a string as invalid, before the floor", async () => {
    expect(await sendEmailInviteAction(42)).toEqual({ ok: false, reason: "invalid" });
    expect(m.atFloor).not.toHaveBeenCalled();
  });

  it("sends under the floor and counts the hit", async () => {
    expect(await sendEmailInviteAction("a@x.dev")).toEqual({ ok: true });
    expect(m.atFloor).toHaveBeenCalledTimes(1);
    expect(m.sendEmailInvite).toHaveBeenCalledWith("user_a", "a@x.dev");
    expect(m.observeHit).toHaveBeenCalledWith("user_a", "invite-email");
  });

  it("answers a throw as failed, still under the floor", async () => {
    m.sendEmailInvite.mockRejectedValue(new Error("db down"));
    expect(await sendEmailInviteAction("a@x.dev")).toEqual({ ok: false, reason: "failed" });
    expect(m.atFloor).toHaveBeenCalledTimes(1);
  });

  it("passes the library's own refusal through", async () => {
    m.sendEmailInvite.mockResolvedValue({ ok: false, reason: "out" });
    expect(await sendEmailInviteAction("a@x.dev")).toEqual({ ok: false, reason: "out" });
  });
});

describe("showInviteQrAction", () => {
  const at = new Date("2026-10-16T12:15:00Z");

  it("is off for a reader whose invites switch is off", async () => {
    m.requestSwitchEnv.mockResolvedValue({ SOCIAL_INVITES_ENABLED: "true" });
    expect(await showInviteQrAction()).toEqual({ ok: false, reason: "off" });
    expect(m.showInviteQr).not.toHaveBeenCalled();
  });

  it("addresses the QR at the request's own origin", async () => {
    m.showInviteQr.mockResolvedValue({ ok: true, token: "tok", expiresAt: at });
    expect(await showInviteQrAction()).toEqual({ ok: true, token: "tok", url: "https://the-99.dev/join/tok", expiresAt: at });
    expect(m.showInviteQr).toHaveBeenCalledWith("user_a", SECRET);
  });

  it("holds nothing when the origin cannot be read", async () => {
    m.headers.mockResolvedValue(new Headers());
    expect(await showInviteQrAction()).toEqual({ ok: false, reason: "noOrigin" });
    expect(m.showInviteQr).not.toHaveBeenCalled();
  });

  it("hands the library no secret when the key is missing or malformed", async () => {
    m.showInviteQr.mockResolvedValue({ ok: false, reason: "unconfigured" });
    vi.stubEnv("INVITE_CODE_SECRET", "short");
    expect(await showInviteQrAction()).toEqual({ ok: false, reason: "unconfigured" });
    expect(m.showInviteQr).toHaveBeenCalledWith("user_a", null);
  });
});
