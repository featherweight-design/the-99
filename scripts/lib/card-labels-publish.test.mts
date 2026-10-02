import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { chdir, cwd } from "node:process";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { publishArtifacts } from "./card-labels-publish.mjs";

/**
 * The gate that stops an opt-in subset run replacing the baseline.
 *
 * This is the failure review found: `LABEL_MODELS=sonnet5` writes the same `out/` paths the
 * default run does, so the documented `--publish` collector would have overwritten
 * `2026-09-25-card-labels-cost.json` with a one-model $0.6017 total — and every figure the
 * report cites against that artifact would have been checked against a file describing a
 * different run. Nothing would have errored.
 *
 * Run in a temporary directory, because the subject copies files into `docs/` and a test
 * that overwrote the real artifacts to prove they are protected would be its own bug.
 */
describe("publishing refuses an artifact that is not the default run", () => {
  let dir: string, before: string;
  beforeEach(() => {
    before = cwd();
    dir = mkdtempSync(`${tmpdir()}/label-publish-`);
    chdir(dir);
    mkdirSync("out", { recursive: true });
  });
  afterEach(() => { chdir(before); rmSync(dir, { recursive: true, force: true }); });

  const write = (models: Record<string, unknown>, key = "perModel") =>
    writeFileSync("out/cost.json", JSON.stringify({ [key]: models }));

  it("publishes the default two-model run", () => {
    write({ haiku: {}, sonnet: {} });
    expect(() => publishArtifacts(["out/cost.json"], true)).not.toThrow();
  });

  it("refuses a subset run, naming what it covers", () => {
    write({ sonnet5: {} });
    expect(() => publishArtifacts(["out/cost.json"], true)).toThrow(/covers sonnet5/);
  });

  it("refuses a SUPERSET too — a third model added to the canonical artifact", () => {
    write({ haiku: {}, sonnet: {}, sonnet5: {} });
    expect(() => publishArtifacts(["out/cost.json"], true)).toThrow(/Refusing to publish/);
  });

  // The scorer's artifact keys on `models` and carries `textRules`, which is the baseline
  // rather than a model. Counted as an extra, every ordinary publish would refuse.
  it("does not count textRules as a model", () => {
    writeFileSync("out/score.json", JSON.stringify({ models: { haiku: {}, sonnet: {}, textRules: {} } }));
    expect(() => publishArtifacts(["out/score.json"], true)).not.toThrow();
  });

  // An artifact naming no models is unaffected: the blind sheet is markdown and the
  // agreement file is haiku-vs-sonnet by construction.
  it("passes an artifact that names no models", () => {
    writeFileSync("out/agreement.json", JSON.stringify({ cards: 400, sameJobs: 200 }));
    expect(() => publishArtifacts(["out/agreement.json"], true)).not.toThrow();
  });

  describe("the re-sample (LABEL_PUBLISH=resample)", () => {
    beforeEach(() => { process.env.LABEL_PUBLISH = "resample"; });
    afterEach(() => { delete process.env.LABEL_PUBLISH; });

    it("publishes Sonnet alone to its own dated paths, never over the first sample", () => {
      write({ sonnet: {} });
      writeFileSync("out/labels-sonnet.json", JSON.stringify({ "Sol Ring": [] }));
      publishArtifacts(["out/cost.json", "out/labels-sonnet.json"], true);
      expect(existsSync("docs/superpowers/benchmarks/2026-09-28-card-label-vocabulary-resample-cost.json")).toBe(true);
      expect(existsSync("docs/superpowers/benchmarks/2026-09-25-card-labels-cost.json")).toBe(false);
    });

    it("refuses the default two-model run, which is not what the re-sample ran", () => {
      write({ haiku: {}, sonnet: {} });
      expect(() => publishArtifacts(["out/cost.json"], true)).toThrow(/covers haiku, sonnet/);
    });
  });

  it("refuses an artifact the first sample never published, and an unknown target", () => {
    writeFileSync("out/gates.json", "{}");
    expect(() => publishArtifacts(["out/gates.json"], true)).toThrow(/no committed path is declared/);
    process.env.LABEL_PUBLISH = "second";
    try { expect(() => publishArtifacts(["out/gates.json"], true)).toThrow(/must be "first" or "resample"/); }
    finally { delete process.env.LABEL_PUBLISH; }
  });

  it("still writes nothing without --publish", () => {
    write({ sonnet5: {} });
    expect(() => publishArtifacts(["out/cost.json"], false)).not.toThrow();
  });
});
