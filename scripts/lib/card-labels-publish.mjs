// Copies a generated artifact from `out/` to its committed path under `docs/`.
//
// It exists because the report told readers to check its tables against the
// committed artifacts, while the artifacts were `cp`-ed by hand -- so the
// provenance claim was false and the two could drift without anything noticing.
// A script that regenerates `out/score.json` and leaves the committed snapshot
// untouched is exactly the drift the claim was meant to rule out.
//
// Publishing is OPT-IN (`--publish`), because a run against a scratch database or a
// half-collected batch must not silently overwrite the evidence a merged report
// rests on.
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";

import { MODELS } from "./card-labels-pricing.mjs";

/** Published under the date the sample was taken, not the date of the re-run. */
export const PUBLISHED = {
  "out/score.json": "docs/superpowers/benchmarks/2026-09-25-card-labels-score.json",
  "out/agreement.json": "docs/superpowers/benchmarks/2026-09-25-card-labels-agreement.json",
  "out/cost.json": "docs/superpowers/benchmarks/2026-09-25-card-labels-cost.json",
  "out/blind-sheet.md": "docs/superpowers/plans/2026-09-25-card-labels-blind-sheet.md",
};

/**
 * The vocabulary plan's re-sample (Task 5), published beside the plan it measures and never over the first
 * sample's evidence. Sonnet alone, so its own model set. Chosen with `LABEL_PUBLISH=resample`. The per-card
 * labels and the sample's set membership are committed too: the first sample's stayed in an uncommitted
 * `out/`, and the empty-answer question could not be asked of them afterwards.
 */
const RESAMPLE = "docs/superpowers/benchmarks/2026-09-28-card-label-vocabulary-resample";
export const RESAMPLE_PUBLISHED = {
  "out/score.json": `${RESAMPLE}-score.json`,
  "out/cost.json": `${RESAMPLE}-cost.json`,
  "out/gates.json": `${RESAMPLE}-gates.json`,
  "out/sample.json": `${RESAMPLE}-sample.json`,
  "out/labels-sonnet.json": `${RESAMPLE}-labels-sonnet.json`,
};
const RESAMPLE_MODELS = ["sonnet"];

/**
 * Why the labels on disk cannot be published as the submitted run's, or null when they can. The labels file
 * is left untouched while a batch is pending, so after a new submission it can still hold an EARLIER run's
 * answers; the collector stamps its run beside each file (`out/labels-<model>.run.json`), and that stamp must
 * equal the run `out/batches.json` names. Every reader that publishes the re-sample calls this one rule.
 *
 * @param {string[]} models
 * @returns {string | null}
 */
export function labelsRunMismatch(models) {
  const read = (path) => { try { return JSON.parse(readFileSync(path, "utf8")).runId; } catch { return undefined; } };
  const runId = read("out/batches.json");
  if (!runId) return "out/batches.json names no run";
  for (const m of models) {
    const stamp = read(`out/labels-${m}.run.json`);
    if (stamp !== runId) return `out/labels-${m}.json answers run ${stamp ?? "(unstamped)"}, not ${runId}. Collect this run first.`;
  }
  return null;
}

/** The models the committed set this run publishes to describes: the scorer's publish gate requires exactly these. */
export const publishModels = () => target().models;
/** True when this run publishes the re-sample, whose labels must carry the submitted run's stamp. */
export const publishingResample = () => (process.env.LABEL_PUBLISH ?? "first") === "resample";

/** Which committed set this run publishes to, and the models that set describes. */
function target() {
  const name = process.env.LABEL_PUBLISH ?? "first";
  if (name === "first") return { paths: PUBLISHED, models: Object.keys(MODELS) };
  if (name === "resample") return { paths: RESAMPLE_PUBLISHED, models: RESAMPLE_MODELS };
  throw new Error(`LABEL_PUBLISH must be "first" or "resample", got ${JSON.stringify(name)}`);
}

/**
 * Which model keys an artifact's own content covers, for the sources that say.
 *
 * The committed artifacts describe the DEFAULT two-model run, and every figure the report
 * cites comes out of them. An opt-in subset writes to the same `out/` paths, so
 * `LABEL_MODELS=sonnet5` followed by the documented `--publish` collector would replace
 * the canonical cost artifact with a one-model total, and the scorer would add a fourth
 * model to the canonical score artifact. Either silently invalidates the baseline the
 * merged report rests on.
 *
 * The check lives HERE rather than in the four callers because a caller can forget it and
 * this gate cannot be bypassed. `textRules` is not a model — it is the baseline every run
 * scores against — so it is excluded rather than counted as an extra.
 *
 * @param {string} src
 * @returns {string[] | null} the model keys, or null for an artifact that names none.
 */
function modelsCovered(src) {
  if (!src.endsWith(".json")) return null;
  const doc = JSON.parse(readFileSync(src, "utf8"));
  const from = doc.perModel ?? doc.models;
  if (from === undefined || from === null || typeof from !== "object") return null;
  return Object.keys(from).filter((k) => k !== "textRules");
}

/**
 * @param {string[]} sources - the `out/` paths this script just wrote.
 * @param {boolean} publish - true when the caller passed `--publish`.
 */
export function publishArtifacts(sources, publish) {
  if (!publish) {
    console.log(`(not published — pass --publish to copy into docs/: ${sources.join(", ")})`);
    return;
  }
  const { paths, models } = target();
  // EVERY source is checked before ANY is copied: a refusal part-way through would leave the committed set
  // holding some of this run's artifacts beside the previous run's others.
  const plan = sources.map((src) => {
    const dest = paths[src];
    if (!dest) throw new Error(`no committed path is declared for ${src} (LABEL_PUBLISH=${process.env.LABEL_PUBLISH ?? "first"})`);
    if (!existsSync(src)) throw new Error(`${src} was not written — refusing to publish a stale copy`);
    const covered = modelsCovered(src);
    const expected = [...models].sort();
    if (covered !== null && covered.sort().join(",") !== expected.join(",")) {
      throw new Error(
        `${src} covers ${covered.join(", ") || "no models"} but the committed artifact is the ` +
        `default run (${expected.join(", ")}). Refusing to publish: a subset run would replace ` +
        `the baseline every figure in the report is cited against. Publish an opt-in model's ` +
        `figures to their own dated path instead, as the Sonnet 5 sample did.`,
      );
    }
    return [src, dest];
  });
  for (const [src, dest] of plan) {
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
    console.log(`published ${src} -> ${dest}`);
  }
}
