// Haiku against Sonnet on the RANDOM 400 — the agreement rate over the
// distribution the full run would actually meet, where there is no gold label.
//
// Agreement is not accuracy and the report must not read it as such: two models
// can agree and both be wrong. It bounds the DISPUTED fraction, which is what
// decides whether the cheaper model is safe to run alone.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

import { bestPairing } from "./lib/card-labels-pairing.mjs";
import { publishArtifacts } from "./lib/card-labels-publish.mjs";
import type { Job } from "../src/lib/labels/types.js";

const h = JSON.parse(readFileSync("out/labels-haiku.json", "utf8"));
const s = JSON.parse(readFileSync("out/labels-sonnet.json", "utf8"));
const gold = new Set((await import("./lib/card-labels-gold.mjs")).GOLD.map((r) => r.name));

const LIMITS = ["rampKind", "restrictedTo", "trigger", "recurrence", "threshold", "modal"] as const;
type Limit = (typeof LIMITS)[number];
const kindKey = (j: Job) => `${j.space}:${j.kind}`;
const agree = (x: Job, y: Job) => LIMITS.filter((f) => lim(x, f) === lim(y, f)).length;

const lim = (j: Job, f: Limit) => f === "threshold"
  ? (j.threshold ? `${j.threshold.stat}${j.threshold.op}${j.threshold.value}` : "none")
  : String(j[f] ?? "none");

let cards = 0, sameJobs = 0, sameEverything = 0, skipped = 0;
const jobTally = { both: 0, haikuOnly: 0, sonnetOnly: 0 };
const limitDisagree = Object.fromEntries(LIMITS.map((f) => [f, 0]));
const limitCompared = Object.fromEntries(LIMITS.map((f) => [f, 0]));
/** Written out, not collected and dropped: the per-card list the name promises. */
const disagreeing = [];

for (const name of Object.keys(h)) {
  if (gold.has(name)) continue;          // the random tail only
  const a = h[name], b = s[name];
  // A card one model returned and the other did not cannot be compared. COUNTED,
  // because silently skipping moves every percentage's denominator with nothing
  // saying so -- invisible on this run, where both models returned all 508.
  if (!Array.isArray(a) || !Array.isArray(b)) { skipped++; continue; }
  cards++;
  // MULTISET, not set. `ak.filter(k => bk.includes(k))` counts a card's two jobs
  // of the same kind as two agreements against one, so `both` over-counts and
  // `haikuOnly` under-counts -- the committed run read both=430 against 423
  // pairable instances. `label-cards-score.mts` pairs without reuse; the same
  // rule has to hold here or the agreement rate is an upper bound presented as a
  // measurement.
  const ak = a.map(kindKey), bk = b.map(kindKey);
  const poolB = [...bk];
  let paired = 0;
  for (const k of ak) {
    const at = poolB.indexOf(k);
    if (at >= 0) { poolB.splice(at, 1); paired++; }
  }
  jobTally.both += paired;
  jobTally.haikuOnly += ak.length - paired;
  jobTally.sonnetOnly += poolB.length;
  const jobsMatch = ak.length === bk.length && poolB.length === 0;
  if (jobsMatch) sameJobs++;

  let allLimitsMatch = jobsMatch;
  // THE SCORER'S pairing, imported rather than re-walked. A first-best walk here
  // assigns a prediction to the wrong gold instance when a card carries two jobs of
  // one kind, so the committed agreement artifact would disagree with the scoring
  // rule the report states. Fixing the scorer and leaving this greedy is the same
  // unswept class three times over in this branch.
  const pairedA = new Set();
  for (const [ja, jb] of bestPairing(a, b, agree)) {
    pairedA.add(ja);
    for (const f of LIMITS) {
      if (f === "rampKind" && !(ja.kind === "ramp" && ja.space === "role")) continue;
      limitCompared[f]++;
      if (lim(ja, f) !== lim(jb, f)) { limitDisagree[f]++; allLimitsMatch = false; }
    }
  }
  // A gold-side job with no counterpart is a difference too.
  if (pairedA.size !== a.length) allLimitsMatch = false;
  if (allLimitsMatch) sameEverything++;
  else disagreeing.push({ name, haiku: ak.join(","), sonnet: bk.join(",") });
}

const pct = (n: number, d: number) => d ? `${((100 * n) / d).toFixed(1)}%` : "-";
console.log(`random cards compared: ${cards}${skipped ? ` (${skipped} skipped: returned by one model only)` : ""}`);
console.log(`  same job SET exactly:        ${sameJobs} (${pct(sameJobs, cards)})`);
console.log(`  same jobs AND all limits:    ${sameEverything} (${pct(sameEverything, cards)})`);
console.log(`  job instances: both ${jobTally.both}, haiku only ${jobTally.haikuOnly}, sonnet only ${jobTally.sonnetOnly}`);
console.log("  limit disagreement, where both found the job:");
for (const f of LIMITS) console.log(`    ${f.padEnd(13)} ${limitDisagree[f]}/${limitCompared[f]} (${pct(limitDisagree[f], limitCompared[f])})`);
mkdirSync("out", { recursive: true });
writeFileSync("out/agreement.json", JSON.stringify({ cards, skipped, sameJobs, sameEverything, jobTally, limitDisagree, limitCompared }, null, 1));
writeFileSync("out/agreement-disagreeing-cards.json", JSON.stringify(disagreeing, null, 1));
console.log(`  ${disagreeing.length} cards differ -> out/agreement-disagreeing-cards.json`);

publishArtifacts(["out/agreement.json"], process.argv.includes("--publish"));
