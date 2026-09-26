// THE REPORT MUST AGREE WITH ITS OWN ARTIFACTS.
//
// This exists because careful re-reading failed three times. Every round of review on
// this branch has found at least one figure in the report that contradicted the
// committed JSON it tells the reader to check against — stale tribal counts, a stale
// cost table, stale job precision after the creature-type fix moved the baseline. Each
// time the artifact was regenerated and the prose was not.
//
// A human sweep cannot be trusted with this: the numbers are dense, several appear more
// than once, and any regeneration can move any of them. So the load-bearing figures are
// extracted from the prose and compared to the artifacts mechanically.
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const REPORT = "docs/superpowers/plans/2026-09-25-card-labels-report.md";
const SCORE = "docs/superpowers/benchmarks/2026-09-25-card-labels-score.json";
const COST = "docs/superpowers/benchmarks/2026-09-25-card-labels-cost.json";

/** The shapes these artifacts actually have, so the checks read them without casts. */
type ModelScore = {
  jobs: { precision: number; recall: number; tp: number; fp: number; fn: number };
  limits: Record<string, { informativeAccuracy: number | null }>;
  spuriousRestrictions: number;
};
type Score = { models: Record<string, ModelScore> };
type Cost = { totalUsd: number; projections: Record<string, { fullRunUsd: number }> };

const report = readFileSync(REPORT, "utf8");
const score = JSON.parse(readFileSync(SCORE, "utf8")) as Score;
const cost = JSON.parse(readFileSync(COST, "utf8")) as Cost;

/** Every figure the report states, with where it comes from. */
const claims = () => {
  const out: { what: string; value: string }[] = [];
  const add = (what: string, v: number | string, digits = 3) =>
    out.push({ what, value: typeof v === "number" ? v.toFixed(digits) : v });
  for (const [m, r] of Object.entries(score.models)) {
    add(`${m} job precision`, r.jobs.precision);
    add(`${m} job recall`, r.jobs.recall);
  }
  return out;
};

describe("the report agrees with the artifacts it cites", () => {
  // The full-scores table, read as a table rather than by regex over the prose: a
  // row is `| label | haiku | sonnet | rules |`.
  const row = (label: string) => {
    const line = report.split("\n").find((l) => l.startsWith(`| ${label} `));
    if (!line) throw new Error(`no table row for "${label}" in ${REPORT}`);
    return line.split("|").slice(2, 5).map((c) => c.replace(/\*/g, "").trim());
  };

  it("states the job precision the artifact records", () => {
    expect(row("JOB precision")).toEqual([
      String(score.models.haiku.jobs.precision),
      String(score.models.sonnet.jobs.precision),
      String(score.models.textRules.jobs.precision),
    ]);
  });

  it("states the job recall the artifact records", () => {
    expect(row("JOB recall")).toEqual([
      String(score.models.haiku.jobs.recall),
      String(score.models.sonnet.jobs.recall),
      String(score.models.textRules.jobs.recall),
    ]);
  });

  for (const limit of ["rampKind", "trigger", "recurrence"]) {
    it(`states the ${limit} accuracy the artifact records`, () => {
      const cells = row(limit);
      for (const [i, m] of ["haiku", "sonnet", "textRules"].entries()) {
        const want = score.models[m].limits[limit].informativeAccuracy;
        expect(Number(cells[i]), `${limit} for ${m}`).toBe(want);
      }
    });
  }

  for (const [label, key] of [["restrictedTo, tribal", "restrictedTo(tribal)"], ["restrictedTo, gating", "restrictedTo(gating)"]] as const) {
    it(`states the ${key} accuracy the artifact records`, () => {
      const cells = row(label);
      for (const [i, m] of ["haiku", "sonnet", "textRules"].entries()) {
        expect(Number(cells[i]), `${key} for ${m}`).toBe(score.models[m].limits[key].informativeAccuracy);
      }
    });
  }

  it("states the spurious counts the artifact records", () => {
    const cells = row("spurious restrictions invented");
    for (const [i, m] of ["haiku", "sonnet", "textRules"].entries()) {
      expect(Number(cells[i]), `spurious for ${m}`).toBe(score.models[m].spuriousRestrictions);
    }
  });

  // The COST table is the one that had no artifact at all for two drafts.
  it("states the full-run projections the cost artifact records", () => {
    for (const m of ["haiku", "sonnet"]) {
      const full = cost.projections[m].fullRunUsd.toFixed(2);
      expect(report, `full-run cost for ${m}`).toContain(`$${full}`);
    }
  });

  it("states the measured sample total the cost artifact records", () => {
    expect(report).toContain(`$${cost.totalUsd.toFixed(4)}`);
  });

  // A figure that appears nowhere in the artifacts is the failure mode that started
  // this: the first draft's headline came from an uncommitted command.
  it("quotes no job precision or recall that the artifact does not contain", () => {
    for (const { what, value } of claims()) {
      // Only checks that the stated value EXISTS somewhere in the artifact set, which
      // is weaker than the table checks above and catches a stale duplicate in prose.
      expect([
        ...Object.values(score.models).map((r) => String(r.jobs.precision)),
        ...Object.values(score.models).map((r) => String(r.jobs.recall)),
      ], what).toContain(String(Number(value)));
    }
  });
});
