// Haiku against Sonnet on the RANDOM 400 — the agreement rate over the
// distribution the full run would actually meet, where there is no gold label.
//
// Agreement is not accuracy and the report must not read it as such: two models
// can agree and both be wrong. It bounds the DISPUTED fraction, which is what
// decides whether the cheaper model is safe to run alone.
import { readFileSync, writeFileSync } from "node:fs";

const h = JSON.parse(readFileSync("out/labels-haiku.json", "utf8"));
const s = JSON.parse(readFileSync("out/labels-sonnet.json", "utf8"));
const gold = new Set((await import("./lib/card-labels-gold.mjs")).GOLD.map((r) => r.name));

const LIMITS = ["rampKind", "restrictedTo", "trigger", "recurrence", "threshold", "modal"];
const kindKey = (j) => `${j.space}:${j.kind}`;
const lim = (j, f) => f === "threshold"
  ? (j.threshold ? `${j.threshold.stat}${j.threshold.op}${j.threshold.value}` : "none")
  : String(j[f] ?? "none");

let cards = 0, sameJobs = 0, sameEverything = 0;
const jobTally = { both: 0, haikuOnly: 0, sonnetOnly: 0 };
const limitDisagree = Object.fromEntries(LIMITS.map((f) => [f, 0]));
const limitCompared = Object.fromEntries(LIMITS.map((f) => [f, 0]));
const worst = [];

for (const name of Object.keys(h)) {
  if (gold.has(name)) continue;          // the random tail only
  const a = h[name], b = s[name];
  if (!Array.isArray(a) || !Array.isArray(b)) continue;
  cards++;
  const ak = a.map(kindKey), bk = b.map(kindKey);
  const inBoth = ak.filter((k) => bk.includes(k));
  jobTally.both += inBoth.length;
  jobTally.haikuOnly += ak.filter((k) => !bk.includes(k)).length;
  jobTally.sonnetOnly += bk.filter((k) => !ak.includes(k)).length;
  const jobsMatch = ak.length === bk.length && ak.every((k) => bk.includes(k));
  if (jobsMatch) sameJobs++;

  let allLimitsMatch = jobsMatch;
  const used = [...b];
  for (const ja of a) {
    const at = used.findIndex((q) => kindKey(q) === kindKey(ja));
    if (at < 0) { allLimitsMatch = false; continue; }
    const jb = used.splice(at, 1)[0];
    for (const f of LIMITS) {
      if (f === "rampKind" && !(ja.kind === "ramp" && ja.space === "role")) continue;
      limitCompared[f]++;
      if (lim(ja, f) !== lim(jb, f)) { limitDisagree[f]++; allLimitsMatch = false; }
    }
  }
  if (allLimitsMatch) sameEverything++;
  else worst.push({ name, haiku: ak.join(","), sonnet: bk.join(",") });
}

const pct = (n, d) => d ? `${((100 * n) / d).toFixed(1)}%` : "-";
console.log(`random cards compared: ${cards}`);
console.log(`  same job SET exactly:        ${sameJobs} (${pct(sameJobs, cards)})`);
console.log(`  same jobs AND all limits:    ${sameEverything} (${pct(sameEverything, cards)})`);
console.log(`  job instances: both ${jobTally.both}, haiku only ${jobTally.haikuOnly}, sonnet only ${jobTally.sonnetOnly}`);
console.log("  limit disagreement, where both found the job:");
for (const f of LIMITS) console.log(`    ${f.padEnd(13)} ${limitDisagree[f]}/${limitCompared[f]} (${pct(limitDisagree[f], limitCompared[f])})`);
writeFileSync("out/agreement.json", JSON.stringify({ cards, sameJobs, sameEverything, jobTally, limitDisagree, limitCompared }, null, 1));
