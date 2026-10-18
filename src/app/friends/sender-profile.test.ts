import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ currentUser: vi.fn(), ensureProfile: vi.fn(), profileAgeMs: vi.fn(), spend: vi.fn(), order: [] as string[] }));
vi.mock("@clerk/nextjs/server", () => ({ currentUser: m.currentUser }));
vi.mock("../../lib/social/friends", () => ({ ensureProfile: m.ensureProfile, profileAgeMs: m.profileAgeMs }));
vi.mock("../../lib/invites/spend", async (orig) => ({
  ...(await orig<typeof import("../../lib/invites/spend")>()),
  spendInviteOnSignUp: m.spend,
}));

import { ensureSenderProfile } from "./sender-profile";

const RES = "0b3f2c9e-6a41-4d8e-9c53-1f0a7e2d4b68";

beforeEach(() => {
  m.order.length = 0;
  m.profileAgeMs.mockReset().mockResolvedValue(null);
  m.currentUser.mockReset().mockResolvedValue({ firstName: "Ana", publicMetadata: { inviteReservation: RES } });
  m.ensureProfile.mockReset().mockImplementation(async () => { m.order.push("profile"); });
  m.spend.mockReset().mockImplementation(async () => { m.order.push("spend"); return { spent: true }; });
});

describe("ensureSenderProfile", () => {
  it("runs the invite spend its account names BEFORE writing the profile, so a profile never exists without the spend attempted", async () => {
    await ensureSenderProfile("user_1");
    expect(m.spend).toHaveBeenCalledWith("user_1", RES, "Ana");
    expect(m.ensureProfile).toHaveBeenCalledWith("user_1", "Ana");
    expect(m.order).toEqual(["spend", "profile"]);
  });

  it("a YOUNG profile still asks Clerk and still spends; an OLD one does neither and writes nothing", async () => {
    m.profileAgeMs.mockResolvedValue(5 * 60_000);
    await ensureSenderProfile("user_1");
    expect(m.currentUser).toHaveBeenCalledTimes(1);
    expect(m.spend).toHaveBeenCalledTimes(1);
    m.currentUser.mockClear(); m.spend.mockClear(); m.ensureProfile.mockClear();
    m.profileAgeMs.mockResolvedValue(16 * 60_000);
    await ensureSenderProfile("user_1");
    expect(m.currentUser).not.toHaveBeenCalled();
    expect(m.spend).not.toHaveBeenCalled();
    expect(m.ensureProfile).not.toHaveBeenCalled();
  });

  it("spends nothing for an account with no reservation, and still makes the profile", async () => {
    m.currentUser.mockResolvedValue({ firstName: "Ana", publicMetadata: {} });
    await ensureSenderProfile("user_1");
    expect(m.spend).not.toHaveBeenCalled();
    expect(m.ensureProfile).toHaveBeenCalledWith("user_1", "Ana");
  });

  it("writes no profile when the spend throws, so the next press tries the spend again", async () => {
    m.spend.mockRejectedValue(new Error("x"));
    await expect(ensureSenderProfile("user_1")).rejects.toThrow("x");
    expect(m.ensureProfile).not.toHaveBeenCalled();
  });
});
