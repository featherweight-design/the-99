// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { READ_JUDGE_EFFORT, READ_JUDGE_MODEL, READ_SHORTLIST_EFFORT, READ_SHORTLIST_MODEL } from "../intake/limits";
import { FITS_READ_EFFORT, FITS_READ_MODEL } from "../swaps/fits-read-limits";
import { SYNOPSIS_EFFORT, SYNOPSIS_EFFORT_V7, SYNOPSIS_MODEL, SYNOPSIS_MODEL_V7 } from "../synopsis/model";
import { TUNING_EFFORT, TUNING_MODEL } from "../tuning/limits";
import { adminCopy } from "../copy/admin";
import type { FeatureRow } from "./costs-detail-rule";
import { JOB_VARIABLES, MODEL_ROWS, rowSpend, SCRIPT_MODEL_FILES, type ModelRowKey } from "./models";

// The repository root, read through process.cwd() (vitest runs from it), as the tree guards do.
const ROOT = process.cwd();
const row = (key: ModelRowKey) => MODEL_ROWS.find((r) => r.key === key)!;

describe("the Models registry", () => {
  it("takes every app feature's model and effort from the constant the call reads", () => {
    const expected: [ModelRowKey, string, string][] = [
      ["overview8", SYNOPSIS_MODEL, SYNOPSIS_EFFORT],
      ["overview7", SYNOPSIS_MODEL_V7, SYNOPSIS_EFFORT_V7],
      ["tuning", TUNING_MODEL, TUNING_EFFORT],
      ["cuts", TUNING_MODEL, TUNING_EFFORT],
      ["shortlist", READ_SHORTLIST_MODEL, READ_SHORTLIST_EFFORT],
      ["judgement", READ_JUDGE_MODEL, READ_JUDGE_EFFORT],
      ["fitsRead", FITS_READ_MODEL, FITS_READ_EFFORT],
    ];
    for (const [key, model, effort] of expected) expect([key, row(key).model, row(key).effort]).toEqual([key, model, effort]);
  });

  it("names every row once, with a name in the copy and a file that exists", () => {
    const keys = MODEL_ROWS.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const r of MODEL_ROWS) {
      expect(adminCopy.models.rows[r.key]).toBeTruthy();
      const file = r.at.split(" · ")[0];
      expect(() => readFileSync(join(ROOT, file), "utf8"), file).not.toThrow();
    }
  });

  // Drift guard: `src/` never imports `scripts/`, so the two jobs' models are written out and checked here.
  it("states each script job's model as the script itself names it", () => {
    for (const [key, file] of Object.entries(SCRIPT_MODEL_FILES) as [ModelRowKey, string][]) {
      const source = readFileSync(join(ROOT, file), "utf8");
      expect(source, `${file} no longer names ${row(key).model}`).toContain(`"${row(key).model}"`);
      expect(row(key).at.startsWith(file)).toBe(true);
    }
    expect(Object.keys(SCRIPT_MODEL_FILES).sort()).toEqual(["labels", "prose"]);
  });

  it("names, for every job switch, a workflow that reads it", () => {
    for (const v of JOB_VARIABLES) {
      expect(readFileSync(join(ROOT, v.readAt), "utf8"), `${v.readAt} does not read vars.${v.name}`).toContain(`vars.${v.name}`);
    }
  });
});

const f = (over: Partial<FeatureRow>): FeatureRow => ({
  feature: "tuning", origin: "player", step: "suggest", model: TUNING_MODEL, effort: "medium", runs: 1, micro: 0, meanMicro: 0, p90Micro: null, ...over,
});

describe("rowSpend", () => {
  const detail = {
    series: { player: 0, rewrites: 0, labels: 120_950_000, evals: 0 },
    labelsIncomplete: true,
    features: [
      f({ feature: "tuning", micro: 500_000 }),
      f({ feature: "tuning", step: "suggest_retry", micro: 49_000 }),
      f({ feature: "synopsis", model: SYNOPSIS_MODEL, step: "write", micro: 163_000 }),
      f({ feature: "synopsis", model: SYNOPSIS_MODEL, step: "write", origin: "system", micro: 7_000 }),
      f({ feature: "synopsis", model: SYNOPSIS_MODEL_V7, step: null, micro: 410_000 }),
      f({ feature: "intake", model: READ_SHORTLIST_MODEL, step: "shortlist", micro: 3_000 }),
      f({ feature: "intake", model: READ_JUDGE_MODEL, step: "judgement", micro: 10_000 }),
      f({ feature: "prose", origin: "system", step: null, micro: 2_000_000 }),
    ],
  };
  it("sums a feature's rows, split by model and step where the registry says, at its own origin", () => {
    expect(rowSpend(row("tuning"), detail)).toEqual({ micro: 549_000, partial: false });
    expect(rowSpend(row("overview8"), detail).micro).toBe(163_000);
    expect(rowSpend(row("overview7"), detail).micro).toBe(410_000);
    expect(rowSpend(row("shortlist"), detail).micro).toBe(3_000);
    expect(rowSpend(row("judgement"), detail).micro).toBe(10_000);
    expect(rowSpend(row("prose"), detail).micro).toBe(2_000_000);
    expect(rowSpend(row("cuts"), detail).micro).toBe(0);
  });
  it("reads card labels from the Costs labels series, partial while a run collects", () => {
    expect(rowSpend(row("labels"), detail)).toEqual({ micro: 120_950_000, partial: true });
  });
});
