// The flyer-code actions (flyer trial PR 4b): the gate comes first, the switch decides, a new group is made with daily
// credits 3 and retried on a taken name, an existing group is used as it is, and a revoke revalidates only when it changed.
import { beforeEach, describe, expect, it, vi } from "vitest";

const gate = vi.fn(async () => ({ userId: "u_hugh", env: "staging" as const }));
vi.mock("../../../lib/admin/access", () => ({ requireAdmin: () => gate() }));
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (...a: unknown[]) => revalidatePath(...a) }));
let on = true;
vi.mock("../../../lib/switches/request", () => ({ requestSwitchEnv: async () => ({ FLYER_TRIAL_ENABLED: on ? "true" : "off" }) }));
const writeGroup = vi.fn();
vi.mock("../../../lib/admin/group-writes", () => ({ writeGroup: (...a: unknown[]) => writeGroup(...a) }));
const makeFlyerCode = vi.fn();
const revokeFlyerCode = vi.fn();
vi.mock("../../../lib/flyer/admin", () => ({ makeFlyerCode: (...a: unknown[]) => makeFlyerCode(...a), revokeFlyerCode: (...a: unknown[]) => revokeFlyerCode(...a) }));

const writeLaunchDate = vi.fn();
vi.mock("../../../lib/flyer/launch-date", () => ({ setLaunchDate: (...a: unknown[]) => writeLaunchDate(...a) }));

const { makeCode, revokeCode, setLaunchDate } = await import("./flyer-actions");
const G = "11111111-1111-4111-8111-111111111111";
const C = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  on = true;
  gate.mockClear();
  revalidatePath.mockClear();
  writeGroup.mockReset().mockResolvedValue({ ok: true, id: G });
  makeFlyerCode.mockReset().mockResolvedValue({ ok: true, id: "x", code: "MOX4QK" });
  revokeFlyerCode.mockReset().mockResolvedValue({ ok: true, changed: true });
  writeLaunchDate.mockReset().mockResolvedValue({ ok: true, state: "saved", value: "2026-12-01", changed: true });
});

describe("makeCode", () => {
  it("makes a new group named from the store with daily credits 3, then the code in it", async () => {
    expect(await makeCode(" Mox Boston ", null)).toEqual({ ok: true, code: "MOX4QK" });
    expect(gate).toHaveBeenCalledTimes(1);
    expect(writeGroup).toHaveBeenCalledWith("u_hugh", null, { name: "mox-boston", dailyAllowance: 3, members: [] });
    expect(makeFlyerCode).toHaveBeenCalledWith("u_hugh", { store: "Mox Boston", groupId: G });
    expect(revalidatePath).toHaveBeenCalledWith("/admin", "layout");
  });

  it("retries a taken group name with a suffix", async () => {
    writeGroup.mockResolvedValueOnce({ ok: false, error: "name" });
    await makeCode("Mox Boston", null);
    expect(writeGroup.mock.calls.map((c) => (c[2] as { name: string }).name)).toEqual(["mox-boston", "mox-boston-2"]);
  });

  it("uses an existing group as it is, without a group write", async () => {
    await makeCode("Mox Boston", G);
    expect(writeGroup).not.toHaveBeenCalled();
    expect(makeFlyerCode).toHaveBeenCalledWith("u_hugh", { store: "Mox Boston", groupId: G });
  });

  it("refuses an empty store, a bad group id and a switch that is off, writing nothing", async () => {
    expect(await makeCode("  ", null)).toEqual({ ok: false, error: "store" });
    expect(await makeCode("Mox", "nope")).toEqual({ ok: false, error: "group" });
    on = false;
    expect(await makeCode("Mox", null)).toEqual({ ok: false, error: "off" });
    expect(writeGroup).not.toHaveBeenCalled();
    expect(makeFlyerCode).not.toHaveBeenCalled();
  });

  it("reports a failed group write or code write as failed", async () => {
    writeGroup.mockResolvedValueOnce({ ok: false, error: "failed" });
    expect(await makeCode("Mox", null)).toEqual({ ok: false, error: "failed" });
    makeFlyerCode.mockResolvedValueOnce({ ok: false, reason: "failed" });
    expect(await makeCode("Mox", G)).toEqual({ ok: false, error: "failed" });
  });
});

describe("revokeCode", () => {
  it("revokes and revalidates only when it changed", async () => {
    expect(await revokeCode(C)).toEqual({ ok: true, changed: true });
    expect(revalidatePath).toHaveBeenCalledTimes(1);
    revokeFlyerCode.mockResolvedValueOnce({ ok: true, changed: false });
    await revokeCode(C);
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });

  it("reads a malformed id as done without a write, and refuses while the switch is off", async () => {
    expect(await revokeCode("nope")).toEqual({ ok: true, changed: false });
    expect(revokeFlyerCode).not.toHaveBeenCalled();
    on = false;
    expect(await revokeCode(C)).toEqual({ ok: false, error: "off" });
  });
});

describe("setLaunchDate", () => {
  it("calls the gate first, saves under the actor and revalidates when it changed", async () => {
    expect(await setLaunchDate("2026-12-01")).toEqual({ ok: true, state: "saved", value: "2026-12-01" });
    expect(gate).toHaveBeenCalledTimes(1);
    expect(writeLaunchDate).toHaveBeenCalledWith("u_hugh", "2026-12-01");
    expect(revalidatePath).toHaveBeenCalledWith("/admin", "layout");
  });

  it("clears on a blank", async () => {
    writeLaunchDate.mockResolvedValue({ ok: true, state: "cleared", value: null, changed: true });
    expect(await setLaunchDate("")).toEqual({ ok: true, state: "cleared", value: null });
    expect(writeLaunchDate).toHaveBeenCalledWith("u_hugh", "");
  });

  it("does not revalidate a save that changed nothing", async () => {
    writeLaunchDate.mockResolvedValue({ ok: true, state: "saved", value: "2026-12-01", changed: false });
    expect(await setLaunchDate("2026-12-01")).toEqual({ ok: true, state: "saved", value: "2026-12-01" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("passes a refusal (malformed, past) through and writes nothing more", async () => {
    writeLaunchDate.mockResolvedValue({ ok: false, error: "past" });
    expect(await setLaunchDate("2020-01-01")).toEqual({ ok: false, error: "past" });
    writeLaunchDate.mockResolvedValue({ ok: false, error: "invalid" });
    expect(await setLaunchDate("soon")).toEqual({ ok: false, error: "invalid" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("refuses while the trial's switch is off, without reaching the write", async () => {
    on = false;
    expect(await setLaunchDate("2026-12-01")).toEqual({ ok: false, error: "off" });
    expect(writeLaunchDate).not.toHaveBeenCalled();
  });

  it("reports a thrown write as failed", async () => {
    writeLaunchDate.mockRejectedValue(new Error("deadlock"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await setLaunchDate("2026-12-01")).toEqual({ ok: false, error: "failed" });
    spy.mockRestore();
  });
});
