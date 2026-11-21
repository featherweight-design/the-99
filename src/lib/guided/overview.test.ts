import { beforeEach, describe, expect, it, vi } from "vitest";

const claimRows = vi.fn();
const releases: unknown[] = [];
vi.mock("../../db", () => ({
  db: {
    update: () => ({
      set: (v: { overviewAt: Date | null }) => ({
        where: () => (v.overviewAt === null ? (releases.push(v), Promise.resolve()) : { returning: () => claimRows() }),
      }),
    }),
  },
}));
const write = vi.fn();
vi.mock("../synopsis/generate", () => ({ defaultDeps: () => ({}), writeUpgradedOverviewFor: (...a: unknown[]) => write(...a) }));
const compute = vi.fn();
vi.mock("../profile/stored", () => ({ computeAndStoreProfile: (...a: unknown[]) => compute(...a), requestProfileDeps: () => ({}) }));

import { overviewAfterGuidedRun, writeGuidedOverview } from "./overview";

const on = {} as NodeJS.ProcessEnv;

describe("writeGuidedOverview", () => {
  beforeEach(() => {
    claimRows.mockReset().mockResolvedValue([{ id: "run-1" }]);
    write.mockReset().mockResolvedValue({ kind: "written", outcome: "survived", synopsis: null });
    compute.mockReset().mockResolvedValue(null);
    releases.length = 0;
  });

  it("makes no call when the run's Overview was already claimed (one per run, however often it is reached)", async () => {
    claimRows.mockResolvedValue([]);
    expect(await writeGuidedOverview("run-1", "d", "u", on)).toEqual({ done: false, reason: "already_claimed" });
    expect(write).not.toHaveBeenCalled();
  });

  it("writes after the reading and keeps the claim when a call was made", async () => {
    expect((await writeGuidedOverview("run-1", "d", "u", on)).done).toBe(true);
    expect(compute).toHaveBeenCalledWith("d", "u", {}, { firstReading: true });
    expect(releases).toHaveLength(0);
  });

  it("keeps the claim on a failed call, so a failing model is never retried for free", async () => {
    write.mockResolvedValue({ kind: "written", outcome: "upstream_busy", synopsis: null });
    await writeGuidedOverview("run-1", "d", "u", on);
    expect(releases).toHaveLength(0);
  });

  it.each(["no_reading", "illegal", "paused", "ownerShare", "allowance"] as const)("gives the claim back when the write reserved nothing (%s)", async (kind) => {
    write.mockResolvedValue({ kind });
    await writeGuidedOverview("run-1", "d", "u", on);
    expect(releases).toHaveLength(1);
  });

  it("gives the claim back when the reading throws before the write, and keeps it when the write throws", async () => {
    compute.mockRejectedValueOnce(new Error("boom"));
    await expect(writeGuidedOverview("run-1", "d", "u", on)).rejects.toThrow("boom");
    expect(releases).toHaveLength(1);
    write.mockRejectedValueOnce(new Error("boom"));
    await expect(writeGuidedOverview("run-1", "d", "u", on)).rejects.toThrow("boom");
    expect(releases).toHaveLength(1);
  });

  it("the after() body never throws", async () => {
    compute.mockRejectedValue(new Error("boom"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(overviewAfterGuidedRun("run-1", "d", "u", on)).resolves.toBeUndefined();
    warn.mockRestore();
  });
});
