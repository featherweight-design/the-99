// The re-sample's free gates (the vocabulary plan's Task 5), read off labels already collected: agreement
// with `card_bracket_flags`, counterspells, tappers and hand attack kept out of `removal`, tutors kept out
// of `draw`, and the random set's empty rate against the first backfill's 12.2%. No model call.
//
// Reads `out/sample.json` (written by label-cards-run) and `out/labels-<model>.json` (by label-cards-collect),
// and the catalog the sample was drawn from, so DATABASE_URL names that catalog. Writes NO database rows.
//
//   LABEL_PUBLISH=resample pnpm tsx scripts/label-cards-gates.mts [--publish]
//
// With --publish it commits the gates, the sample's set membership and the per-card labels beside the
// vocabulary plan, which the first sample never did.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

import "./lib/env.mjs";

import { neon } from "@neondatabase/serverless";

import { emptyRate, flagAgreement, removalLeaks, tutorsInDraw, type Flags, type Labels } from "./lib/card-labels-gates.mjs";
import { labelsRunMismatch, publishArtifacts } from "./lib/card-labels-publish.mjs";

const model = process.env.LABEL_MODELS?.split(",")[0]?.trim() || "sonnet";
const labels: Labels = JSON.parse(readFileSync(`out/labels-${model}.json`, "utf8"));
const sample: { runId?: string; random: string[] } = JSON.parse(readFileSync("out/sample.json", "utf8"));
// The labels belong to the run `out/batches.json` names (the collector reads it), and the membership must
// be that same run's, or the empty rate reads some other draw's random set.
const { runId } = JSON.parse(readFileSync("out/batches.json", "utf8")) as { runId?: string };
if (!runId || sample.runId !== runId) {
  console.error(`REFUSING: out/sample.json is from run ${sample.runId ?? "(none)"}, out/batches.json from ${runId ?? "(none)"}.`);
  process.exit(2);
}
// The labels file is left as it was while a batch is still pending, so it can be an EARLIER run's.
const stale = labelsRunMismatch([model]);
if (stale) { console.error(`REFUSING: ${stale}`); process.exit(2); }

const sql = neon(process.env.DATABASE_URL!);
const names = Object.keys(labels).filter((n) => Array.isArray(labels[n]));
const rows = (await sql`
  select c.name, c.oracle_text, coalesce(f.tutor, false) tutor,
         coalesce(f.mass_land_denial, false) mld, coalesce(f.extra_turn, false) extra_turn
  from cards c left join card_bracket_flags f on f.oracle_id = c.oracle_id
  where c.name = any(${names})`) as { name: string; oracle_text: string | null; tutor: boolean; mld: boolean; extra_turn: boolean }[];

const flags: Record<string, Flags> = {};
const text: Record<string, string> = {};
for (const r of rows) {
  flags[r.name] = { tutor: r.tutor, massLandDenial: r.mld, extraTurn: r.extra_turn };
  text[r.name] = r.oracle_text ?? "";
}

const report = {
  model,
  cards: names.length,
  flags: flagAgreement(labels, flags),
  removalLeaks: removalLeaks(labels, text),
  tutorsInDraw: tutorsInDraw(labels),
  emptyRate: emptyRate(labels, sample.random),
};
mkdirSync("out", { recursive: true });
writeFileSync("out/gates.json", JSON.stringify(report, null, 1));

const list = (xs: string[]) => (xs.length ? `${xs.length}: ${xs.slice(0, 12).join("; ")}${xs.length > 12 ? "; …" : ""}` : "0");
console.log(`=== free gates, ${model}, ${names.length} cards ===`);
for (const [k, v] of Object.entries(report.flags)) {
  console.log(`  ${k.padEnd(20)} both ${v.both}  flag only ${list(v.flagOnly)}`);
  console.log(`  ${"".padEnd(20)} label only ${list(v.labelOnly)}`);
}
console.log(`  removal beside counterspell ${list(report.removalLeaks.counterspell)}`);
console.log(`  removal beside discard      ${list(report.removalLeaks.discard)}`);
console.log(`  tapper labelled removal     ${list(report.removalLeaks.tapper)}`);
console.log(`  tutor and draw              ${list(report.tutorsInDraw)}`);
const e = report.emptyRate;
console.log(`  empty rate (random)         ${e.empty}/${e.returned} = ${e.rate === null ? "-" : (e.rate * 100).toFixed(1)}% against ${(e.baseline * 100).toFixed(1)}% (${e.deltaPoints ?? "-"} points)`);

publishArtifacts(["out/gates.json", "out/sample.json", `out/labels-${model}.json`], process.argv.includes("--publish"));
