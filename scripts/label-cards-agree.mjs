// Haiku against Sonnet on the RANDOM 400 — the agreement rate over the
// distribution the full run would actually meet, where there is no gold label.
//
// Agreement is not accuracy and the report must not read it as such: two models
// can agree and both be wrong. It bounds the DISPUTED fraction, which is what
// decides whether the cheaper model is safe to run alone.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

import { publishArtifacts } from "./lib/card-labels-publish.mjs";

const h = JSON.parse(readFileSync("out/labels-haiku.json", "utf8"));
const s = JSON.parse(readFileSync("out/labels-sonnet.json", "utf8"));
const gold = new Set((await import("./lib/card-labels-gold.mjs")).GOLD.map((r) => r.name));

const LIMITS = ["rampKind", "restrictedTo", "trigger", "recurrence", "threshold", "modal"];
const kindKey = (j) => `${j.space}:${j.kind}`;
const lim = (j, f) => f === "threshold"
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
  // Best-first among same-kind candidates, as the scorer does: first-match pairs
  // two correct labels as a disagreement whenever a card carries two jobs of one
  // kind (Depala's two pumps, Tyrant's Scorn's two removals).
  const used = [...b];
  const agree = (x, y) => LIMITS.filter((f) => lim(x, f) === lim(y, f)).length;
  for (const ja of a) {
    let best = -1, at = -1;
    for (const [i, q] of used.entries()) {
      if (kindKey(q) !== kindKey(ja)) continue;
      const sc = agree(ja, q);
      if (sc > best) { best = sc; at = i; }
    }
    if (at < 0) { allLimitsMatch = false; continue; }
    const jb = used.splice(at, 1)[0];
    for (const f of LIMITS) {
      if (f === "rampKind" && !(ja.kind === "ramp" && ja.space === "role")) continue;
      limitCompared[f]++;
      if (lim(ja, f) !== lim(jb, f)) { limitDisagree[f]++; allLimitsMatch = false; }
    }
  }
  if (allLimitsMatch) sameEverything++;
  else disagreeing.push({ name, haiku: ak.join(","), sonnet: bk.join(",") });
}

const pct = (n, d) => d ? `${((100 * n) / d).toFixed(1)}%` : "-";
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
