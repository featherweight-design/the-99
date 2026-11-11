import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  over: vi.fn(),
  ceiling: vi.fn(),
  find: vi.fn(),
  save: vi.fn(),
  env: vi.fn(),
  observe: vi.fn(),
  start: vi.fn(),
  confirm: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: () => {} }), headers: async () => ({ get: () => null }) }));
vi.mock("../../lib/flyer/claim", () => ({ findFlyerCode: m.find, startFlyerClaim: m.start, confirmFlyerCode: m.confirm, handOverFlyer: vi.fn() }));
vi.mock("../../lib/flyer/launch-list", () => ({ saveLaunchEmail: m.save }));
vi.mock("../../lib/rate/anon", () => ({ overAnonymousLimit: m.over, overAnonymousCeiling: m.ceiling }));
vi.mock("../../lib/rate/observe", () => ({ observeHit: m.observe }));
vi.mock("../../lib/invites/floor", () => ({ atFloor: (f: () => unknown) => f() }));
vi.mock("../../lib/flags/snapshot", () => ({ resolveFlags: m.env }));

import { confirmFlyerCodeAction, saveLaunchListAction, startFlyerClaimAction } from "./flyer-actions";

beforeEach(() => {
  Object.values(m).forEach((f) => f.mockReset());
  m.over.mockResolvedValue(false);
  m.ceiling.mockResolvedValue(false);
  m.save.mockResolvedValue({ ok: true });
  m.env.mockResolvedValue({ FLYER_TRIAL_ENABLED: "true" });
});

describe("saveLaunchListAction", () => {
  it("is throttled by the ceiling across every visitor, counted only after the visitor's own cap passes", async () => {
    m.over.mockResolvedValue(true);
    expect(await saveLaunchListAction("MAX4QK", "a@x.dev")).toEqual({ ok: false, reason: "throttled" });
    expect(m.ceiling).not.toHaveBeenCalled();
    m.over.mockResolvedValue(false);
    m.ceiling.mockImplementation(async (bucket: string) => bucket === "launch-list-all-day");
    expect(await saveLaunchListAction("MAX4QK", "a@x.dev")).toEqual({ ok: false, reason: "throttled" });
    expect(m.ceiling.mock.calls.map((c: unknown[]) => c[0])).toEqual(["launch-list-all", "launch-list-all-day"]);
    expect(m.save).not.toHaveBeenCalled();
  });

  it("does not count a malformed address or an ended trial against the ceiling", async () => {
    m.find.mockResolvedValue({ createdBy: "u" });
    expect(await saveLaunchListAction("MAX4QK", "not-an-email")).toEqual({ ok: false, reason: "invalid" });
    m.env.mockResolvedValue({ FLYER_TRIAL_ENABLED: "off" });
    expect(await saveLaunchListAction("MAX4QK", "a@x.dev")).toEqual({ ok: false, reason: "launched" });
    expect(m.ceiling).not.toHaveBeenCalled();
    expect(m.save).not.toHaveBeenCalled();
  });

  it("is throttled per visitor before anything is read, for a known code and an unknown one alike", async () => {
    m.over.mockResolvedValue(true);
    m.find.mockResolvedValue(null);
    expect(await saveLaunchListAction("NOSUCH", "a@x.dev")).toEqual({ ok: false, reason: "throttled" });
    m.find.mockResolvedValue({ createdBy: "u" });
    expect(await saveLaunchListAction("MAX4QK", "a@x.dev")).toEqual({ ok: false, reason: "throttled" });
    expect(m.find).not.toHaveBeenCalled();
    expect(m.save).not.toHaveBeenCalled();
  });

  it("saves for an unknown code (against no code) and for a live one", async () => {
    m.find.mockResolvedValue(null);
    expect(await saveLaunchListAction("NOSUCH", "a@x.dev")).toEqual({ ok: true });
    m.find.mockResolvedValue({ createdBy: "u" });
    expect(await saveLaunchListAction("MAX4QK", "a@x.dev")).toEqual({ ok: true });
    expect(m.save).toHaveBeenCalledTimes(2);
  });

  it("answers launched once the creator's trial is off, and saves nothing", async () => {
    m.find.mockResolvedValue({ createdBy: "u" });
    m.env.mockResolvedValue({ FLYER_TRIAL_ENABLED: "off" });
    expect(await saveLaunchListAction("MAX4QK", "a@x.dev")).toEqual({ ok: false, reason: "launched" });
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

// Request counting has no switch (RATE_LIMIT_ENABLED retired with counting on): each step counts under the code's creator.
describe("the newcomer's steps count their hits", () => {
  it("observes Send code under the creator in flyer-claim", async () => {
    m.find.mockResolvedValue({ createdBy: "user_creator" });
    m.start.mockResolvedValue({ ok: false, reason: "invalid" });
    await startFlyerClaimAction("MAX4QK", "a@x.dev");
    expect(m.observe).toHaveBeenCalledWith("user_creator", "flyer-claim");
  });

  it("observes a typed code under the creator in flyer-code", async () => {
    m.find.mockResolvedValue({ createdBy: "user_creator" });
    m.confirm.mockResolvedValue({ ok: false, reason: "wrong", triesLeft: 4 });
    await confirmFlyerCodeAction("MAX4QK", "123456");
    expect(m.observe).toHaveBeenCalledWith("user_creator", "flyer-code");
  });
});
