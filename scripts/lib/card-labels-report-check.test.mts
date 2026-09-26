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
const AGREE = "docs/superpowers/benchmarks/2026-09-25-card-labels-agreement.json";

/** The shapes these artifacts actually have, so the checks read them without casts. */
type ModelScore = {
  jobs: { precision: number; recall: number; tp: number; fp: number; fn: number };
  limits: Record<string, { accuracy: number | null; informativeAccuracy: number | null }>;
  spuriousRestrictions: number;
};
type Score = { models: Record<string, ModelScore> };
type Cost = { totalUsd: number; projections: Record<string, { fullRunUsd: number }> };
type Agree = {
  cards: number; sameJobs: number; sameEverything: number;
  jobTally: { both: number; haikuOnly: number; sonnetOnly: number };
  limitDisagree: Record<string, number>; limitCompared: Record<string, number>;
};

const report = readFileSync(REPORT, "utf8");
/** Emphasis removed, so a matcher compares figures rather than markdown. */
const plain = report.replace(/\*\*/g, "");
const score = JSON.parse(readFileSync(SCORE, "utf8")) as Score;
const cost = JSON.parse(readFileSync(COST, "utf8")) as Cost;
const agree = JSON.parse(readFileSync(AGREE, "utf8")) as Agree;

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

  // THE PROSE, not just the tables. The checks above read table ROWS, so a stale
  // figure in a sentence — which is where three of this branch's drift findings
  // actually lived — passes all of them.
  //
  // An earlier version of this test was worse than useless: it read the values out of
  // the score artifact and then asserted them against the score artifact, so it was a
  // tautology that passed over the very stale prose it was written to catch. Caught in
  // review, which is the right outcome and an uncomfortable one for a test whose whole
  // job is to stop things reaching review.
  // THE AGREEMENT SECTION was not covered at all, so its rows could drift while this
  // file stayed green -- and this branch's history says that is not hypothetical: the
  // agreement figures were quoted from a pre-fix run for two drafts, which is the
  // single defect this verifier exists to prevent.
  it("states the agreement counts the artifact records", () => {
    const pct = (n: number) => `${((100 * n) / agree.cards).toFixed(1)}%`;
    expect(plain, "same job set").toContain(`${pct(agree.sameJobs)} (${agree.sameJobs}/${agree.cards})`);
    expect(plain, "same jobs and limits").toContain(`${pct(agree.sameEverything)} (${agree.sameEverything}/${agree.cards})`);
    expect(plain, "job instances").toContain(
      `${agree.jobTally.both} both, ${agree.jobTally.haikuOnly} Haiku only, ${agree.jobTally.sonnetOnly} Sonnet only`,
    );
  });

  it("states the restrictedTo disagreement rate the artifact records", () => {
    const n = agree.limitDisagree.restrictedTo, d = agree.limitCompared.restrictedTo;
    expect(plain).toContain(`${((100 * n) / d).toFixed(1)}% (${n}/${d})`);
  });

  // THE INTEGER COUNTS. The check above scans `0.NNN` only, and that gap shipped two
  // wrong figures: the prose said Haiku invented 6 spurious restrictions and Sonnet 2
  // where the artifact recorded 7 and 5, in two separate sentences, and the accuracy
  // scan could not see either by construction. Named counts are checked by name
  // rather than by shape, because a bare integer in prose is usually a card count or
  // a round number and flagging every one would be noise.
  it("states the spurious-restriction counts the artifact records, in prose too", () => {
    const prose = report.split("\n").filter((l) => !l.trimStart().startsWith("|")).join("\n");
    const haiku = score.models.haiku.spuriousRestrictions;
    const sonnet = score.models.sonnet.spuriousRestrictions;
    // Every sentence that talks about inventing restrictions must use the real pair.
    for (const line of prose.split("\n")) {
      if (!/invent/i.test(line)) continue;
      const ints = [...line.matchAll(/(?<![\d.])\d{1,3}(?![\d.%])/g)].map((m) => Number(m[0]));
      const wrong = ints.filter((n) => n !== haiku && n !== sonnet);
      expect(wrong, `"${line.trim()}" quotes ${wrong.join(", ")}; the artifact says ${haiku} and ${sonnet}`).toEqual([]);
    }
  });

  // PERCENTAGE-SHAPED prose figures. The scan below reads `0.NNN`, and the answer
  // paragraph states the same accuracies as `NN.N%` -- so every figure in the report's
  // most-read section was uncovered. PROVED uncovered: reinstating the two pre-fix
  // percentages (`95.7% against 91.7%`, `against 78.8%`) left all tests passing.
  //
  // This is the fourth shape stale figures have escaped in on this report: `0.NNN`,
  // bare integers, `N.N points`, and now `NN.N%`. The honest statement is that the
  // guard covers the shapes it has been taught, which is what the report's own
  // provenance note says.
  // THE DEFAULT-INCLUSIVE accuracies, quoted as whole percentages. These are the ones
  // the report uses to make its central point -- that a labeller emitting no limits
  // scores well on the default-inclusive figure -- so they are the integers most worth
  // pinning. Found live drift on its first run: the report said 93% of thresholds
  // where the artifact records 0.939.
  it("states the default-inclusive text-rule accuracies the artifact records", () => {
    const t = score.models.textRules.limits;
    for (const [limit, v] of [["thresholds", t.threshold], ["modality", t.modal]] as const) {
      expect(v.accuracy, `${limit} has no default-inclusive accuracy`).not.toBeNull();
      const want = Math.round(100 * (v.accuracy ?? 0));
      expect(plain, `${limit} default-inclusive accuracy`).toContain(`${want}% of ${limit}`);
    }
  });

  // ONE-DECIMAL percentages only, and the name says so. Integer percentages elsewhere
  // in the report are either DERIVED (a 16% relative job gain, from 171 against 147)
  // or HYPOTHETICAL (a second labeller disagreeing with 10% of the set) -- neither is
  // an artifact value, and teaching this check to tell them apart from a quoted
  // accuracy is the shape-chasing this guard has already done four times. The
  // artifact-backed integers are pinned by the test above instead.
  it("quotes no one-decimal percentage the artifacts do not contain", () => {
    const known = new Set<string>();
    for (const r of Object.values(score.models)) {
      for (const v of [r.jobs.precision, r.jobs.recall]) known.add((100 * v).toFixed(1));
      for (const l of Object.values(r.limits)) {
        if (l.informativeAccuracy !== null) known.add((100 * l.informativeAccuracy).toFixed(1));
      }
    }
    // Agreement rates are percentages too, and are quoted in that section.
    for (const [f, n] of Object.entries(agree.limitDisagree)) {
      const d = agree.limitCompared[f];
      if (d) known.add(((100 * n) / d).toFixed(1));
    }
    for (const n of [agree.sameJobs, agree.sameEverything]) known.add(((100 * n) / agree.cards).toFixed(1));

    // Table rows are covered cell-by-cell above. BLOCKQUOTES are skipped because that
    // is where this report keeps its correction history, and a superseded figure is
    // quoted there ON PURPOSE -- "that draft rested on 87.5% against 90.9%" is the
    // record of a mistake, not a claim about the current run. The cost is that a stale
    // figure hidden inside a blockquote would pass; the alternative is a list of
    // exempt numbers, which rots the moment the figures move.
    const prose = report.split("\n")
      .filter((l) => !l.trimStart().startsWith("|") && !l.trimStart().startsWith(">"))
      .join("\n");
    const seen = new Set<string>();
    for (const m of prose.matchAll(/(?<![\d.])(\d{1,2}\.\d)%/g)) seen.add(m[1]);
    const unknown = [...seen].filter((v) => !known.has(v));
    expect(unknown, `percentages in prose that no artifact records: ${unknown.join(", ")}`).toEqual([]);
  });

  it("quotes no accuracy-shaped figure the artifacts do not contain", () => {
    const known = new Set<string>();
    for (const r of Object.values(score.models)) {
      known.add(String(r.jobs.precision));
      known.add(String(r.jobs.recall));
      for (const v of Object.values(r.limits)) {
        if (v.informativeAccuracy !== null) known.add(String(v.informativeAccuracy));
      }
    }
    // `0.NNN` is the shape every accuracy in this report takes. Table rows are
    // excluded because the checks above already compare them cell by cell, and a
    // ratio written as a fraction or a percentage is not this shape.
    const prose = report.split("\n").filter((l) => !l.trimStart().startsWith("|"));
    const seen = new Set<string>();
    for (const line of prose) {
      for (const m of line.matchAll(/(?<![\d.])0\.\d{3}(?![\d])/g)) seen.add(m[0]);
    }
    const unknown = [...seen].filter((v) => !known.has(v) && !known.has(String(Number(v))));
    expect(unknown, `figures in prose that no artifact records: ${unknown.join(", ")}`).toEqual([]);
  });
});
