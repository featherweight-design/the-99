import { beforeEach, describe, expect, it, vi } from "vitest";

const selectRows = vi.fn();
const claimRows = vi.fn();
const releases: unknown[] = [];
vi.mock("../../../db", () => ({
  db: {
    select: () => ({ from: () => ({ where: () => selectRows() }) }),
    update: () => ({
      set: (v: { overviewAt: Date | null }) => ({
        where: () => (v.overviewAt === null ? (releases.push(v), Promise.resolve()) : { returning: () => claimRows() }),
      }),
    }),
  },
}));
const write = vi.fn();
vi.mock("../../synopsis/generate", () => ({ defaultDeps: () => ({}), writeUpgradedOverviewFor: (...a: unknown[]) => write(...a) }));
const compute = vi.fn();
vi.mock("../../profile/stored", () => ({ computeAndStoreProfile: (...a: unknown[]) => compute(...a), requestProfileDeps: () => ({}) }));

import { writeOverviewForUpgradedDeck } from "./overview";

const on = { PRECON_UPGRADE_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;

describe("writeOverviewForUpgradedDeck", () => {
  beforeEach(() => {
    selectRows.mockReset().mockResolvedValue([{ run: "run-1" }]);
    claimRows.mockReset().mockResolvedValue([{ id: "run-1" }]);
    write.mockReset().mockResolvedValue({ kind: "written", outcome: "survived", synopsis: null });
    compute.mockReset().mockResolvedValue(null);
    releases.length = 0;
  });

  it("writes nothing with the switch off, or for a deck no run made", async () => {
    expect(await writeOverviewForUpgradedDeck("d", "u", {} as NodeJS.ProcessEnv)).toEqual({ done: false, reason: "off" });
    selectRows.mockResolvedValue([{ run: null }]);
    expect(await writeOverviewForUpgradedDeck("d", "u", on)).toEqual({ done: false, reason: "not_upgraded" });
    expect(write).not.toHaveBeenCalled();
  });

  it("makes no call when the run's Overview was already claimed", async () => {
    claimRows.mockResolvedValue([]);
    expect(await writeOverviewForUpgradedDeck("d", "u", on)).toEqual({ done: false, reason: "already_claimed" });
    expect(write).not.toHaveBeenCalled();
  });

  it("writes the Overview at 0 units after the reading, and keeps the claim when a call was made", async () => {
    const r = await writeOverviewForUpgradedDeck("d", "u", on);
    expect(r.done).toBe(true);
    expect(compute).toHaveBeenCalledWith("d", "u", {}, { firstReading: true });
    expect(write).toHaveBeenCalledOnce();
    expect(releases).toHaveLength(0);
  });

  it("keeps the claim on a call that failed, so a failing model is never retried for free", async () => {
    write.mockResolvedValue({ kind: "written", outcome: "upstream_busy", synopsis: null });
    await writeOverviewForUpgradedDeck("d", "u", on);
    expect(releases).toHaveLength(0);
  });

  it.each(["no_reading", "illegal", "paused", "ownerShare"] as const)("gives the claim back when the write reserved nothing (%s)", async (kind) => {
    write.mockResolvedValue({ kind });
    await writeOverviewForUpgradedDeck("d", "u", on);
    expect(releases).toHaveLength(1);
  });

  it("keeps the claim when the write throws, since its call may have been made", async () => {
    write.mockRejectedValue(new Error("boom"));
    await expect(writeOverviewForUpgradedDeck("d", "u", on)).rejects.toThrow("boom");
    expect(releases).toHaveLength(0);
  });

  it("gives the claim back when the reading throws before the write begins", async () => {
    compute.mockRejectedValue(new Error("boom"));
    await expect(writeOverviewForUpgradedDeck("d", "u", on)).rejects.toThrow("boom");
    expect(write).not.toHaveBeenCalled();
    expect(releases).toHaveLength(1);
  });
});
