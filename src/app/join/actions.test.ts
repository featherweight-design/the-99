// The newcomer's actions (invites PR 3): the SENDER's switch decides, off reads as an ended invite that names nobody,
// the claim secret travels only in an httpOnly cookie scoped to the token's own path, and the claim answers at the
// floor.
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  senderOfToken: vi.fn(),
  claimInvite: vi.fn(),
  confirmCode: vi.fn(),
  handOver: vi.fn(),
  resolveSwitchEnv: vi.fn(),
  atFloor: vi.fn(),
  observeHit: vi.fn(),
  jar: { get: vi.fn(), set: vi.fn() },
}));
vi.mock("next/headers", () => ({ cookies: async () => m.jar }));
vi.mock("../../lib/invites/claim", () => ({ senderOfToken: m.senderOfToken, claimInvite: m.claimInvite, confirmCode: m.confirmCode, handOver: m.handOver }));
vi.mock("../../lib/switches/snapshot", () => ({ resolveSwitchEnv: m.resolveSwitchEnv }));
vi.mock("../../lib/invites/floor", () => ({ atFloor: m.atFloor }));
vi.mock("../../lib/rate/observe", () => ({ observeHit: m.observeHit }));

import { claimInviteAction, confirmCodeAction, handOverAction } from "./actions";

const TOKEN = "A".repeat(43);
const ON = { SOCIAL_FRIENDS_ENABLED: "true", SOCIAL_INVITES_ENABLED: "true" };
const ENDED = { ok: false, reason: "ended" };

beforeEach(() => {
  vi.resetAllMocks();
  m.senderOfToken.mockResolvedValue("user_sender");
  m.resolveSwitchEnv.mockResolvedValue(ON);
  m.atFloor.mockImplementation((work: () => Promise<unknown>) => work());
  m.jar.get.mockReturnValue(undefined);
  m.claimInvite.mockResolvedValue({ ok: true, claimSecret: "the-secret", mailed: true });
  m.confirmCode.mockResolvedValue({ ok: true });
  m.handOver.mockResolvedValue({ ok: true, url: "https://accounts.x/sign-up?ticket=t" });
});

describe("the sender's switch decides", () => {
  it("reads an off switch, an unknown token and a non-string as an ended invite, touching nothing", async () => {
    m.resolveSwitchEnv.mockResolvedValue({ SOCIAL_FRIENDS_ENABLED: "true" });
    expect(await claimInviteAction(TOKEN, "a@x.dev")).toEqual(ENDED);
    expect(await confirmCodeAction(TOKEN, "123456")).toEqual(ENDED);
    expect(await handOverAction(TOKEN)).toEqual(ENDED);
    expect(m.resolveSwitchEnv).toHaveBeenCalledWith("user_sender");
    m.senderOfToken.mockResolvedValue(null);
    expect(await claimInviteAction(TOKEN, "a@x.dev")).toEqual(ENDED);
    expect(await claimInviteAction(42, "a@x.dev")).toEqual(ENDED);
    expect(m.claimInvite).not.toHaveBeenCalled();
    expect(m.confirmCode).not.toHaveBeenCalled();
    expect(m.handOver).not.toHaveBeenCalled();
  });
});

describe("claimInviteAction", () => {
  it("claims at the floor, sets the secret as an httpOnly cookie on this token's path, and never hands it to the page", async () => {
    const out = await claimInviteAction(TOKEN, "a@x.dev");
    expect(out).toEqual({ ok: true, mailed: true });
    expect(m.atFloor).toHaveBeenCalledTimes(1);
    expect(m.jar.set).toHaveBeenCalledWith("invite_claim", "the-secret", expect.objectContaining({
      httpOnly: true, sameSite: "lax", path: `/join/${TOKEN}`, maxAge: 7 * 24 * 60 * 60,
    }));
    expect(JSON.stringify(out)).not.toContain("the-secret");
  });

  it("presents the cookie it already holds, and counts the hit against the sender", async () => {
    m.jar.get.mockReturnValue({ value: "old-secret" });
    await claimInviteAction(TOKEN, "a@x.dev");
    expect(m.claimInvite).toHaveBeenCalledWith(TOKEN, "a@x.dev", "old-secret");
    expect(m.observeHit).toHaveBeenCalledWith("user_sender", "invite-claim");
  });

  it("sets no cookie for a claim that did not happen, and refuses a non-string address as invalid", async () => {
    m.claimInvite.mockResolvedValue({ ok: false, reason: "unconfigured" });
    expect(await claimInviteAction(TOKEN, "a@x.dev")).toEqual({ ok: false, reason: "unconfigured" });
    expect(m.jar.set).not.toHaveBeenCalled();
    expect(await claimInviteAction(TOKEN, 5)).toEqual({ ok: false, reason: "invalid" });
  });
});

describe("confirmCodeAction and handOverAction", () => {
  it("pass the cookie on, count the code hit against the sender, and hand the ticket URL back", async () => {
    m.jar.get.mockReturnValue({ value: "browser" });
    expect(await confirmCodeAction(TOKEN, "123456")).toEqual({ ok: true });
    expect(m.confirmCode).toHaveBeenCalledWith(TOKEN, "123456", "browser");
    expect(m.observeHit).toHaveBeenCalledWith("user_sender", "invite-code");
    expect(await handOverAction(TOKEN)).toEqual({ ok: true, url: "https://accounts.x/sign-up?ticket=t" });
    expect(m.handOver).toHaveBeenCalledWith(TOKEN, "browser");
  });

  it("reads a code that is not a string as a wrong one", async () => {
    expect(await confirmCodeAction(TOKEN, 123456)).toEqual({ ok: false, reason: "wrong", triesLeft: 0 });
    expect(m.confirmCode).not.toHaveBeenCalled();
  });
});
