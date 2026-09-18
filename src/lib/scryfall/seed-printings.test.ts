// The verdict a catalog refresh exits on.
//
// Pure half of #704: the ingest itself needs a database and a 77MB bulk file, but whether a
// finished run counts as a failure is a decision about four numbers, and it is the decision
// that was missing — the incident on 2026-09-16 ran green while blanking every set in the
// database.
import { describe, expect, it } from "vitest";
import { unsizedRunFailure } from "./seed-printings";

const run = (over: Partial<Parameters<typeof unsizedRunFailure>[0]> = {}) => ({
  upserted: 102_769, skippedOrphan: 0, baseSetSizes: 740, ...over,
});

describe("unsizedRunFailure", () => {
  it("passes a run that sized sets", () => {
    expect(unsizedRunFailure(run())).toBeNull();
  });

  // The incident: 148 orphans, 102,621 printings upserted, not one set sized. The old exit
  // code for this was 0.
  it("fails a run that ingested printings and sized nothing", () => {
    const failure = unsizedRunFailure(run({ skippedOrphan: 148, baseSetSizes: 0 }));
    expect(failure).toContain("148");
    // Names the remedy, because the sharp tool that causes this is the one a reader reaches
    // for and `job=all` is the way back.
    expect(failure).toContain("job=all");
  });

  // Orphans alone are not the failure — `job=printings` against a catalog that is merely
  // behind skips a handful and still sizes every set from the rest.
  it("passes a run that skipped orphans and still sized sets", () => {
    expect(unsizedRunFailure(run({ skippedOrphan: 148 }))).toBeNull();
  });

  // A different shape with the same symptom, and it must not be reported as the orphan case:
  // nothing orphaned, nothing classified. Reading the orphan explanation there sends the
  // next person to re-run `job=all`, which will do exactly as little.
  it("distinguishes an unclassified bulk from an incomplete one", () => {
    const failure = unsizedRunFailure(run({ baseSetSizes: 0 }));
    expect(failure).toContain("unclassified");
    expect(failure).not.toContain("job=all");
  });

  // A run with nothing to ingest sizes nothing and is not a failure — it is a no-op, and
  // the only way to reach it is a bulk with no printing this catalog accepts.
  it("passes a run that ingested nothing at all", () => {
    expect(unsizedRunFailure(run({ upserted: 0, baseSetSizes: 0 }))).toBeNull();
  });
});
