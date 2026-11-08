import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  over: vi.fn(),
  ceiling: vi.fn(),
  save: vi.fn(),
}));
vi.mock("next/headers", () => ({ headers: async () => ({ get: () => null }) }));
vi.mock("../lib/flyer/launch-list", () => ({ saveLaunchEmailNoCode: m.save }));
vi.mock("../lib/rate/anon", () => ({ overAnonymousLimit: m.over, overAnonymousCeiling: m.ceiling }));

import { saveLandingLaunchEmailAction } from "./landing-actions";

beforeEach(() => {
  Object.values(m).forEach((f) => f.mockReset());
  m.over.mockResolvedValue(false);
  m.ceiling.mockResolvedValue(false);
  m.save.mockResolvedValue({ ok: true });
});

describe("saveLandingLaunchEmailAction", () => {
  it("refuses a non-string argument before counting or saving", async () => {
    expect(await saveLandingLaunchEmailAction(1)).toEqual({ ok: false, reason: "invalid" });
    expect(await saveLandingLaunchEmailAction(undefined)).toEqual({ ok: false, reason: "invalid" });
    expect(m.over).not.toHaveBeenCalled();
    expect(m.save).not.toHaveBeenCalled();
  });

  it("is throttled per visitor on the enforced launch-list bucket, and saves nothing", async () => {
    m.over.mockResolvedValue(true);
    expect(await saveLandingLaunchEmailAction("a@x.dev")).toEqual({ ok: false, reason: "throttled" });
    expect(m.over).toHaveBeenCalledWith(expect.anything(), "launch-list");
    expect(m.save).not.toHaveBeenCalled();
  });

  it("is throttled by the ceiling only after the visitor's own cap passed and the address is well formed", async () => {
    m.ceiling.mockResolvedValue(true);
    expect(await saveLandingLaunchEmailAction("a@x.dev")).toEqual({ ok: false, reason: "throttled" });
    expect(m.save).not.toHaveBeenCalled();
    m.ceiling.mockClear();
    expect(await saveLandingLaunchEmailAction("not an address")).toEqual({ ok: false, reason: "invalid" });
    expect(m.ceiling).not.toHaveBeenCalled();
    m.over.mockResolvedValue(true);
    await saveLandingLaunchEmailAction("a@x.dev");
    expect(m.ceiling).not.toHaveBeenCalled();
  });

  it("answers an address already listed exactly as a new one (no reveal)", async () => {
    m.save.mockResolvedValue({ ok: true });
    const first = await saveLandingLaunchEmailAction("a@x.dev");
    const again = await saveLandingLaunchEmailAction("A@X.dev");
    expect(again).toEqual(first);
  });

  it("saves the address with no flyer code", async () => {
    expect(await saveLandingLaunchEmailAction("a@x.dev")).toEqual({ ok: true });
    expect(m.save).toHaveBeenCalledWith("a@x.dev");
  });

});
