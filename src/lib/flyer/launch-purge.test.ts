import { beforeEach, describe, expect, it, vi } from "vitest";

const execute = vi.hoisted(() => vi.fn());
vi.mock("../../db", () => ({ db: { execute } }));
const { LAUNCH_LIST_RETENTION_DAYS, launchPurgeDue, purgeLaunchList, readLaunchDate } = await import("./launch-purge");

const DAY = 24 * 60 * 60 * 1000;

describe("readLaunchDate", () => {
  it("reads a date as UTC midnight and a full instant as itself", () => {
    expect(readLaunchDate("2026-12-01")?.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(readLaunchDate("2026-12-01T09:30:00Z")?.toISOString()).toBe("2026-12-01T09:30:00.000Z");
  });
  it("reads unset, empty and unreadable values as null, never as a date", () => {
    for (const v of [undefined, "", "  ", "soon", "12/01/2026", "2026-13-45", "2026-02-30", "2026-04-31T00:00:00Z", "2026-12", "0"]) expect(readLaunchDate(v), String(v)).toBeNull();
  });
});

describe("launchPurgeDue", () => {
  const launch = new Date("2026-12-01T00:00:00Z");
  it("is never due without a launch date, however late it is", () => {
    expect(launchPurgeDue(null, new Date("2099-01-01T00:00:00Z"))).toBe(false);
  });
  it("is due exactly at launch plus 30 days and not a moment before", () => {
    const at = launch.getTime() + LAUNCH_LIST_RETENTION_DAYS * DAY;
    expect(launchPurgeDue(launch, new Date(at - 1))).toBe(false);
    expect(launchPurgeDue(launch, new Date(at))).toBe(true);
  });
});

describe("purgeLaunchList", () => {
  beforeEach(() => execute.mockReset().mockResolvedValue({ rows: [{ n: 7 }] }));

  it("deletes nothing and never reaches the database when the launch date is null", async () => {
    for (const launchRaw of [undefined, "", "garbage"]) {
      expect(await purgeLaunchList({ now: new Date("2099-01-01T00:00:00Z"), launchRaw })).toEqual({ due: false, deleted: 0 });
    }
    expect(execute).not.toHaveBeenCalled();
  });

  it("deletes nothing before the 30 days are up", async () => {
    expect(await purgeLaunchList({ now: new Date("2026-12-30T00:00:00Z"), launchRaw: "2026-12-01" })).toEqual({ due: false, deleted: 0 });
    expect(execute).not.toHaveBeenCalled();
  });

  it("deletes from launch_list alone, in one bounded statement, and reports the count", async () => {
    expect(await purgeLaunchList({ now: new Date("2026-12-31T00:00:00Z"), launchRaw: "2026-12-01" })).toEqual({ due: true, deleted: 7 });
    expect(execute).toHaveBeenCalledTimes(1);
    const text = JSON.stringify(execute.mock.calls[0][0]);
    expect(text).toContain("delete from launch_list");
    expect(text).toContain("limit");
    expect(text).not.toMatch(/flyer_codes|flyer_claims/);
  });

  it("reads the admin's saved date FIRST and the env value only when none is saved", async () => {
    const saved = process.env.FLYER_LAUNCH_DATE;
    try {
      const now = new Date("2026-12-31T00:00:00Z");
      // Saved 2026-12-01 is due at 12-31; the env value (far future) is ignored.
      process.env.FLYER_LAUNCH_DATE = "2099-01-01";
      expect((await purgeLaunchList({ now, readStored: async () => "2026-12-01" })).due).toBe(true);
      // Nothing saved: the env value stands.
      expect((await purgeLaunchList({ now, readStored: async () => null })).due).toBe(false);
      process.env.FLYER_LAUNCH_DATE = "2026-12-01";
      expect((await purgeLaunchList({ now, readStored: async () => null })).due).toBe(true);
      // A saved date later than the env one wins too: not due.
      expect((await purgeLaunchList({ now, readStored: async () => "2099-01-01" })).due).toBe(false);
      // The admin cleared it (an empty saved value): no purge, and the env value that is still set does not come back.
      expect((await purgeLaunchList({ now, readStored: async () => "" })).due).toBe(false);
      // Neither set: no purge.
      delete process.env.FLYER_LAUNCH_DATE;
      expect((await purgeLaunchList({ now, readStored: async () => null })).due).toBe(false);
    } finally {
      if (saved === undefined) delete process.env.FLYER_LAUNCH_DATE;
      else process.env.FLYER_LAUNCH_DATE = saved;
    }
  });

  it("reads FLYER_LAUNCH_DATE when no value is handed in, and an unset variable means no purge", async () => {
    const saved = process.env.FLYER_LAUNCH_DATE;
    try {
      delete process.env.FLYER_LAUNCH_DATE;
      expect((await purgeLaunchList({ now: new Date("2099-01-01T00:00:00Z"), readStored: async () => null })).due).toBe(false);
      process.env.FLYER_LAUNCH_DATE = "2026-01-01";
      expect((await purgeLaunchList({ now: new Date("2026-06-01T00:00:00Z"), readStored: async () => null })).due).toBe(true);
    } finally {
      if (saved === undefined) delete process.env.FLYER_LAUNCH_DATE;
      else process.env.FLYER_LAUNCH_DATE = saved;
    }
  });
});
