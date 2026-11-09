import { describe, expect, it } from "vitest";
import { INDEX_FINAL_PHASE, INDEX_SWEEP_PHASE, phaseReport } from "./phase";
import { indexDue, LEGACY_UNMARKED_BEFORE, sweepStarts, type ReleasedSet } from "./index-due";

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

// Only the EDHREC sweep resets the clock. The staples step fetches nothing, so a staples step run alone
// on the 2nd of November must not stand in for November's monthly build.
describe("sweepStarts", () => {
  const ledgerRow = (iso: string, report: string | null) => ({ startedAt: at(iso), report });

  it("counts the index step and a legacy unmarked row, and drops the staples steps", () => {
    const rows = [
      ledgerRow("2026-10-03", phaseReport(INDEX_SWEEP_PHASE, "3300 commanders, 1700 pairs")),
      ledgerRow("2026-10-04", phaseReport(INDEX_FINAL_PHASE)),
      ledgerRow("2026-09-01", null),
      ledgerRow("2026-11-02", phaseReport(INDEX_FINAL_PHASE, "closed by hand: timed out")),
    ];
    expect(sweepStarts(rows)).toEqual([at("2026-10-03"), at("2026-09-01")]);
  });

  // A row `db:catalog-build` bracketed or closed by hand with no phase is not a sweep once the index
  // steps stamp their own: it cannot reset the clock.
  it("does not count an unmarked row from after the cutoff", () => {
    expect(at("2026-09-29").getTime()).toBeLessThan(LEGACY_UNMARKED_BEFORE.getTime());
    expect(sweepStarts([ledgerRow("2026-09-29", null), ledgerRow("2026-11-02", null), ledgerRow("2026-11-03", "timed out")]))
      .toEqual([at("2026-09-29")]);
  });

  it("leaves the monthly build due after a staples step run alone that month", () => {
    const rows = [
      ledgerRow("2026-10-03", phaseReport(INDEX_SWEEP_PHASE)),
      ledgerRow("2026-11-02", phaseReport(INDEX_FINAL_PHASE)),
    ];
    expect(indexDue(at("2026-11-03"), [], sweepStarts(rows)).reasons).toEqual(["monthly: no ok index build since 2026-11-01"]);
  });

  // A STAPLES-ONLY LEDGER has no sweep at all: the gate answers "no baseline", as it does for an
  // empty ledger, and the first build stays a dispatched catch-up.
  it("reads a staples-only ledger as no baseline", () => {
    const r = indexDue(at("2026-11-03"), [], sweepStarts([ledgerRow("2026-11-02", phaseReport(INDEX_FINAL_PHASE))]));
    expect(r.due).toBe(false);
    expect(r.reasons[0]).toMatch(/^no baseline/);
  });
});
