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
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

/** Published under the date the sample was taken, not the date of the re-run. */
export const PUBLISHED = {
  "out/score.json": "docs/superpowers/benchmarks/2026-09-25-card-labels-score.json",
  "out/agreement.json": "docs/superpowers/benchmarks/2026-09-25-card-labels-agreement.json",
  "out/cost.json": "docs/superpowers/benchmarks/2026-09-25-card-labels-cost.json",
  "out/blind-sheet.md": "docs/superpowers/plans/2026-09-25-card-labels-blind-sheet.md",
};

/**
 * @param {string[]} sources - the `out/` paths this script just wrote.
 * @param {boolean} publish - true when the caller passed `--publish`.
 */
export function publishArtifacts(sources, publish) {
  if (!publish) {
    console.log(`(not published — pass --publish to copy into docs/: ${sources.join(", ")})`);
    return;
  }
  for (const src of sources) {
    const dest = PUBLISHED[src];
    if (!dest) throw new Error(`no committed path is declared for ${src}`);
    if (!existsSync(src)) throw new Error(`${src} was not written — refusing to publish a stale copy`);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
    console.log(`published ${src} -> ${dest}`);
  }
}
