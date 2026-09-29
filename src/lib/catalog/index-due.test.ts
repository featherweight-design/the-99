import { describe, expect, it } from "vitest";
import { indexDue, type ReleasedSet } from "./index-due";

const at = (iso: string) => new Date(`${iso}T12:00:00Z`);
const set = (code: string, releasedAt: string, setType = "expansion", digital = false): ReleasedSet =>
  ({ code, setType, releasedAt, digital });

// Reality Fracture and its commander decks, and Star Trek: the two dates the plan names.
const FRA = [set("fra", "2026-10-02"), set("frc", "2026-10-02", "commander")];
const TRK = [set("trk", "2026-11-13"), set("trc", "2026-11-13", "commander")];
const SETS = [...FRA, ...TRK];

// An ok build on the 3rd of October, so the monthly rule is quiet through October.
const OCT_MONTHLY = at("2026-10-03");

describe("indexDue", () => {
  it("is not due the day before a release comes due", () => {
    expect(indexDue(at("2026-10-15"), SETS, [OCT_MONTHLY]).due).toBe(false);
  });

  it("comes due 14 days after Reality Fracture releases", () => {
    const r = indexDue(at("2026-10-16"), SETS, [OCT_MONTHLY]);
    expect(r.due).toBe(true);
    expect(r.reasons).toEqual([
      "release: fra (released 2026-10-02) due 2026-10-16",
      "release: frc (released 2026-10-02) due 2026-10-16",
    ]);
  });

  it("is satisfied by an ok build started on the due date", () => {
    expect(indexDue(at("2026-10-17"), SETS, [OCT_MONTHLY, new Date("2026-10-16T09:30:00Z")]).due).toBe(false);
  });

  it("is not satisfied by a build that started before the due date", () => {
    expect(indexDue(at("2026-10-17"), SETS, [new Date("2026-10-15T23:59:59Z")]).due).toBe(true);
  });

  it("brings Star Trek due on 2026-11-27, not the monthly run on 2026-12-03", () => {
    const builds = [OCT_MONTHLY, at("2026-10-16"), at("2026-11-03")];
    expect(indexDue(at("2026-11-26"), SETS, builds).due).toBe(false);
    expect(indexDue(at("2026-11-27"), SETS, builds).reasons).toEqual([
      "release: trk (released 2026-11-13) due 2026-11-27",
      "release: trc (released 2026-11-13) due 2026-11-27",
    ]);
  });

  it("runs monthly from the 3rd, even after a release build the month before", () => {
    const builds = [OCT_MONTHLY, at("2026-10-16")];
    expect(indexDue(at("2026-11-02"), FRA, builds).due).toBe(false);
    expect(indexDue(at("2026-11-03"), FRA, builds).reasons).toEqual(["monthly: no ok index build since 2026-11-01"]);
  });

  // An undated set is left out too, by the guard in `indexDue`; not asserted here, because a null
  // date would also read as never due without it.
  it("leaves out reprint boxes and digital sets", () => {
    const quiet = [
      set("mbc", "2026-10-02", "draft_innovation"),
      set("yfra", "2026-10-02", "expansion", true),
    ];
    expect(indexDue(at("2026-10-20"), quiet, [OCT_MONTHLY]).due).toBe(false);
  });

  // The October catch-up dispatches on or after the 1st, before the monthly rule opens on the
  // 3rd. That build has to count as October's, or the chained run on the 3rd builds again.
  it("counts a catch-up built on the 1st as that month's monthly build", () => {
    expect(indexDue(at("2026-10-03"), SETS, [at("2026-10-01")]).due).toBe(false);
  });

  // No baseline, no build: on a ledger with no ok index build, an old release that WOULD read due
  // does not, and neither does the monthly rule. The first build is a dispatched catch-up.
  it("is not due on a ledger with no ok build, and says why", () => {
    const r = indexDue(at("2026-10-05"), [set("old", "2026-08-01")], []);
    expect(r.due).toBe(false);
    expect(r.reasons).toEqual(["no baseline: no ok index build on record; the first build is a dispatched catch-up"]);
  });

  it("applies the release rule once a baseline exists", () => {
    const r = indexDue(at("2026-10-01"), [set("old", "2026-08-01")], [at("2026-08-10")]);
    expect(r.due).toBe(true);
    expect(r.reasons).toEqual(["release: old (released 2026-08-01) due 2026-08-15"]);
  });
});
