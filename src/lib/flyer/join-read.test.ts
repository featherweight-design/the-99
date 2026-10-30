import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ findFlyerCode: vi.fn(), resolveSwitchEnv: vi.fn() }));
vi.mock("../../db", () => ({ db: {} }));
vi.mock("./claim", () => ({ findFlyerCode: m.findFlyerCode }));
vi.mock("../switches/snapshot", () => ({ resolveSwitchEnv: m.resolveSwitchEnv }));
vi.mock("../invites/read", () => ({ loadInviteCount: vi.fn() }));

import { readFlyerJoin } from "./join-read";

describe("readFlyerJoin, a code nobody made", () => {
  beforeEach(() => {
    m.findFlyerCode.mockReset().mockResolvedValue(null);
    m.resolveSwitchEnv.mockReset();
  });

  it("reads E3 (launched) when the app-wide switch is off, so the form that would answer `launched` is not drawn", async () => {
    m.resolveSwitchEnv.mockResolvedValue({ FLYER_TRIAL_ENABLED: "off" });
    expect(await readFlyerJoin("MAX4QK", null)).toEqual({ kind: "launched" });
    expect(m.resolveSwitchEnv).toHaveBeenCalledWith(null);
  });

  it("reads E2 (revoked) while the trial is on", async () => {
    m.resolveSwitchEnv.mockResolvedValue({ FLYER_TRIAL_ENABLED: "true" });
    expect(await readFlyerJoin("MAX4QK", null)).toEqual({ kind: "closed", closed: "revoked" });
  });
});
