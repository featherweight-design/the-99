// The newcomer's actions (invites PR 3): a token that is nobody's reads as an ended invite that names nobody,
// the claim secret travels only in an httpOnly cookie scoped to the token's own path, and the claim answers at the
// floor.
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  senderOfToken: vi.fn(),
  claimInvite: vi.fn(),
  confirmCode: vi.fn(),
  handOver: vi.fn(),
  atFloor: vi.fn(),
  refusal: vi.fn(),
  headers: { get: () => null },
  jar: { get: vi.fn(), set: vi.fn() },
}));
vi.mock("next/headers", () => ({ cookies: async () => m.jar, headers: async () => m.headers }));
vi.mock("../../lib/invites/claim", () => ({ senderOfToken: m.senderOfToken, claimInvite: m.claimInvite, confirmCode: m.confirmCode, handOver: m.handOver }));
vi.mock("../../lib/invites/floor", () => ({ atFloor: m.atFloor }));
// `newcomerRefusal` lets a step through (null) unless a test says otherwise.
vi.mock("../../lib/rate/anon", () => ({ newcomerRefusal: async (...a: unknown[]) => (await m.refusal(...a)) ?? null }));

import { claimInviteAction, confirmCodeAction, handOverAction } from "./actions";

const TOKEN = "A".repeat(43);
const ENDED = { ok: false, reason: "ended" };

beforeEach(() => {
  vi.resetAllMocks();
  m.senderOfToken.mockResolvedValue("user_sender");
  m.atFloor.mockImplementation((work: () => Promise<unknown>) => work());
  m.jar.get.mockReturnValue(undefined);
  m.claimInvite.mockResolvedValue({ ok: true, claimSecret: "the-secret", mailed: true });
  m.confirmCode.mockResolvedValue({ ok: true });
  m.handOver.mockResolvedValue({ ok: true, url: "https://accounts.x/sign-up?ticket=t" });
  // Off Vercel unless a test says otherwise: no canonical origin.
  vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
});

describe("a token with no sender", () => {
  it("reads an unknown token and a non-string as an ended invite, touching nothing", async () => {
    m.senderOfToken.mockResolvedValue(null);
    expect(await claimInviteAction(TOKEN, "a@x.dev")).toEqual(ENDED);
    expect(await confirmCodeAction(TOKEN, "123456")).toEqual(ENDED);
    expect(await handOverAction(TOKEN)).toEqual(ENDED);
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

  it("presents the cookie it already holds, and counts the hit per visitor and token, with the sender as backstop", async () => {
    m.jar.get.mockReturnValue({ value: "old-secret" });
    await claimInviteAction(TOKEN, "a@x.dev");
    expect(m.claimInvite).toHaveBeenCalledWith(TOKEN, "a@x.dev", "old-secret");
    expect(m.refusal).toHaveBeenCalledWith(m.headers, "invite-claim", "invite-claim-all", "user_sender", TOKEN);
  });

  it("sets no cookie for a claim that did not happen, and refuses a non-string address as invalid", async () => {
    m.claimInvite.mockResolvedValue({ ok: false, reason: "unconfigured" });
    expect(await claimInviteAction(TOKEN, "a@x.dev")).toEqual({ ok: false, reason: "unconfigured" });
    expect(m.jar.set).not.toHaveBeenCalled();
    expect(await claimInviteAction(TOKEN, 5)).toEqual({ ok: false, reason: "invalid" });
  });
});

describe("the newcomer's rate rules", () => {
  it("answers a refused Send code as the cooldown for the window's remaining time, claiming nothing", async () => {
    m.refusal.mockResolvedValue(1200);
    expect(await claimInviteAction(TOKEN, "a@x.dev")).toEqual({ ok: false, reason: "wait", waitMs: 1_200_000 });
    expect(m.claimInvite).not.toHaveBeenCalled();
    expect(m.jar.set).not.toHaveBeenCalled();
  });

  it("answers a refused typed code as throttled, checking nothing", async () => {
    m.refusal.mockResolvedValue(1200);
    expect(await confirmCodeAction(TOKEN, "123456")).toEqual({ ok: false, reason: "throttled" });
    expect(m.confirmCode).not.toHaveBeenCalled();
  });
});

describe("confirmCodeAction and handOverAction", () => {
  it("pass the cookie on, count the code hit against the sender, and hand the ticket URL back", async () => {
    m.jar.get.mockReturnValue({ value: "browser" });
    expect(await confirmCodeAction(TOKEN, "123456")).toEqual({ ok: true });
    expect(m.confirmCode).toHaveBeenCalledWith(TOKEN, "123456", "browser");
    expect(m.refusal).toHaveBeenCalledWith(m.headers, "invite-code", "invite-code-all", "user_sender", TOKEN);
    expect(await handOverAction(TOKEN)).toEqual({ ok: true, url: "https://accounts.x/sign-up?ticket=t" });
    expect(m.handOver).toHaveBeenCalledWith(TOKEN, "browser", { redirectUrl: null });
  });

  it("hands over with the deployment's own /sign-up as the invitation's landing", async () => {
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "the99.app");
    try {
      m.jar.get.mockReturnValue({ value: "browser" });
      await handOverAction(TOKEN);
      expect(m.handOver).toHaveBeenCalledWith(TOKEN, "browser", { redirectUrl: "https://the99.app/sign-up" });
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("reads a code that is not a string as a wrong one", async () => {
    expect(await confirmCodeAction(TOKEN, 123456)).toEqual({ ok: false, reason: "wrong", triesLeft: 0 });
    expect(m.confirmCode).not.toHaveBeenCalled();
  });
});
