import { describe, expect, it } from "vitest";

import { planCopy, type SourceLabel } from "./copy";
import type { Job } from "./types";

const JOB: Job = {
  space: "role", kind: "ramp", rampKind: "tapsForMana", restrictedTo: null,
  trigger: "none", recurrence: "repeatable", threshold: null, modal: false,
};
const row = (oracleId: string, inputHash: string): SourceLabel =>
  ({ oracleId, labels: [JOB], model: "m", promptVersion: "1", inputHash });

describe("planCopy", () => {
  it("installs a row whose hash matches the target's own inputs", () => {
    const p = planCopy([row("a", "h1")], [{ oracleId: "a", inputHash: "h1" }], new Set());
    expect(p.install.map((r) => r.oracleId)).toEqual(["a"]);
    expect(p.mismatched).toEqual([]);
  });

  // The rule that matters: the target's hash, never the source's. The two databases can hold
  // different catalog states, and a label describing text the target does not have is worse than
  // no label, because nothing downstream can tell it from a current one.
  it("refuses a row whose hash does not match the TARGET's inputs", () => {
    const p = planCopy([row("a", "h-source")], [{ oracleId: "a", inputHash: "h-target" }], new Set());
    expect(p.install).toEqual([]);
    expect(p.mismatched).toEqual(["a"]);
  });

  // Task 4b as ruled: mismatches are REPORTED. The plan originally said they are "picked up by the
  // next db:build:labels against that target", which runs the model against production — the exact
  // thing pay-once exists to prevent, for labels that already exist on the source.
  it("reports mismatches rather than queueing them for anything", () => {
    const p = planCopy(
      [row("a", "x"), row("b", "y")],
      [{ oracleId: "a", inputHash: "A" }, { oracleId: "b", inputHash: "B" }],
      new Set(),
    );
    expect(p.mismatched.sort()).toEqual(["a", "b"]);
    expect(p.install).toEqual([]);
    // The PROPERTY the name claims, which the two assertions above do not test: the plan has no
    // bucket that would feed a paid rebuild. Asserting the exact key set means reintroducing a
    // `rebuild`/`queue` field fails here, which is the thing Task 4b's edit exists to prevent.
    expect(Object.keys(p).sort())
      .toEqual(["absentFromSource", "install", "mismatched", "notInTargetCatalog"]);
  });

  // Counted, not silent. A source generated against a newer catalog always carries some of these,
  // and the count is what distinguishes that from the target's catalog refresh having stopped.
  it("counts a card the target's catalog does not hold, and does not call it a mismatch", () => {
    const p = planCopy([row("ghost", "h")], [], new Set());
    expect(p.install).toEqual([]);
    expect(p.mismatched).toEqual([]);
    expect(p.notInTargetCatalog).toEqual(["ghost"]);
  });

  it("never deletes: a card the source has not labelled is reported and left alone", () => {
    const p = planCopy([], [{ oracleId: "a", inputHash: "h" }], new Set(["a"]));
    expect(p.install).toEqual([]);
    expect(p.absentFromSource).toEqual(["a"]);
  });

  it("carries the model and prompt version across, so a copied row says what produced it", () => {
    const p = planCopy([row("a", "h")], [{ oracleId: "a", inputHash: "h" }], new Set());
    expect(p.install[0]).toMatchObject({ model: "m", promptVersion: "1" });
  });

  it("plans nothing from an empty source", () => {
    const p = planCopy([], [{ oracleId: "a", inputHash: "h" }], new Set());
    expect(p).toEqual({ install: [], mismatched: [], notInTargetCatalog: [], absentFromSource: [] });
  });
});
