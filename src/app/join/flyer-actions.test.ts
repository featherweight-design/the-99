import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  over: vi.fn(),
  find: vi.fn(),
  save: vi.fn(),
  env: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: () => {} }), headers: async () => ({ get: () => null }) }));
vi.mock("../../lib/flyer/claim", () => ({ findFlyerCode: m.find, startFlyerClaim: vi.fn(), confirmFlyerCode: vi.fn(), handOverFlyer: vi.fn() }));
vi.mock("../../lib/flyer/launch-list", () => ({ saveLaunchEmail: m.save }));
vi.mock("../../lib/rate/anon", () => ({ overAnonymousLimit: m.over }));
vi.mock("../../lib/rate/observe", () => ({ observeHit: vi.fn() }));
vi.mock("../../lib/invites/floor", () => ({ atFloor: (f: () => unknown) => f() }));
vi.mock("../../lib/switches/snapshot", () => ({ resolveSwitchEnv: m.env }));

import { saveLaunchListAction } from "./flyer-actions";

beforeEach(() => {
  Object.values(m).forEach((f) => f.mockReset());
  m.over.mockResolvedValue(false);
  m.save.mockResolvedValue({ ok: true });
  m.env.mockResolvedValue({ FLYER_TRIAL_ENABLED: "true" });
});

describe("saveLaunchListAction", () => {
  it("is throttled per visitor before anything is read, for a known code and an unknown one alike", async () => {
    m.over.mockResolvedValue(true);
    m.find.mockResolvedValue(null);
    expect(await saveLaunchListAction("NOSUCH", "a@x.dev")).toEqual({ ok: false, reason: "throttled" });
    m.find.mockResolvedValue({ createdBy: "u" });
    expect(await saveLaunchListAction("MOX4QK", "a@x.dev")).toEqual({ ok: false, reason: "throttled" });
    expect(m.find).not.toHaveBeenCalled();
    expect(m.save).not.toHaveBeenCalled();
  });

  it("saves for an unknown code (against no code) and for a live one", async () => {
    m.find.mockResolvedValue(null);
    expect(await saveLaunchListAction("NOSUCH", "a@x.dev")).toEqual({ ok: true });
    m.find.mockResolvedValue({ createdBy: "u" });
    expect(await saveLaunchListAction("MOX4QK", "a@x.dev")).toEqual({ ok: true });
    expect(m.save).toHaveBeenCalledTimes(2);
  });

  it("answers launched once the creator's trial is off, and saves nothing", async () => {
    m.find.mockResolvedValue({ createdBy: "u" });
    m.env.mockResolvedValue({ FLYER_TRIAL_ENABLED: "off" });
    expect(await saveLaunchListAction("MOX4QK", "a@x.dev")).toEqual({ ok: false, reason: "launched" });
    expect(m.save).not.toHaveBeenCalled();
  });

  it("answers launched for an unknown code once the app-wide trial is off", async () => {
    m.find.mockResolvedValue(null);
    m.env.mockResolvedValue({ FLYER_TRIAL_ENABLED: "off" });
    expect(await saveLaunchListAction("NOSUCH", "a@x.dev")).toEqual({ ok: false, reason: "launched" });
    expect(m.save).not.toHaveBeenCalled();
  });

  it("refuses a non-string argument", async () => {
    expect(await saveLaunchListAction(1, "a@x.dev")).toEqual({ ok: false, reason: "invalid" });
    expect(m.over).not.toHaveBeenCalled();
  });
});
