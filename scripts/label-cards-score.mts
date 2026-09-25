// Scores Haiku, Sonnet and today's TEXT RULES against the hand-labelled gold set.
//
// Two scores, kept apart on purpose:
//
//   JOB      did it find the right job kinds? This is what the text rules already
//            do, and the control for the whole question.
//   LIMIT    on the jobs it got right, did it get the limits right? This is the
//            deliverable. The false matches were all correct jobs with missing
//            limits.
//
// The text rules are run through the REAL `classifyRoles` and `cardThemes`, never
// a copy — a reimplementation would drift and the drift would read as rule error.
// They emit no limits at all, by construction, so their limit recall is 0 and the
// report says so rather than pretending the comparison is close.
import { readFileSync, writeFileSync } from "node:fs";

import "./lib/env.mjs";

import { neon } from "@neondatabase/serverless";

import { classifyRoles } from "../src/lib/recs/roles";
import { cardThemes } from "../src/lib/recs/themes";
import { GOLD } from "./lib/card-labels-gold.mjs";

type Job = {
  space: string; kind: string; rampKind?: string | null;
  restrictedTo: string | null; trigger: string; recurrence: string;
  threshold: { stat: string; op: string; value: number } | null; modal: boolean;
};

const sql = neon(process.env.DATABASE_URL!);
const goldNames = GOLD.map((r) => r.name);
const cards = await sql`
  select name, mana_cost, type_line, oracle_text, keywords from cards where name = any(${goldNames})`;
const byName = new Map(cards.map((c: any) => [c.name, c]));

// `cardThemes` needs the catalog's own creature subtypes, because the word before
// "you control" is a creature type only sometimes. Read from type lines, as the
// caller in the app does.
const subtypeRows = await sql`
  select distinct trim(word) as word from (
    select unnest(string_to_array(split_part(type_line, '—', 2), ' ')) as word
    from cards where type_line like '%Creature%—%'
  ) w where length(trim(word)) > 2`;
const creatureTypes = new Set(subtypeRows.map((r: any) => r.word));
const isCreatureType = (w: string) => creatureTypes.has(w);

const textRuleJobs = (card: any): Job[] => {
  const roles = classifyRoles({ typeLine: card.type_line, oracleText: card.oracle_text, keywords: card.keywords ?? [] });
  const themes = cardThemes({ typeLine: card.type_line, oracleText: card.oracle_text }, isCreatureType);
  // The rules produce a KIND and nothing else. Every limit is filled with the
  // value the rules implicitly assume, which is "no limit" — that is precisely
  // the defect this lane is measuring, so it is represented honestly rather than
  // left undefined and skipped by the scorer.
  const blank = { restrictedTo: null, trigger: "none", recurrence: "repeatable", threshold: null, modal: false };
  return [
    ...roles.map((kind) => ({ space: "role", kind, ...blank, ...(kind === "ramp" ? { rampKind: null } : {}) })),
    ...themes.map((kind) => ({ space: "theme", kind, ...blank })),
  ] as Job[];
};

const kindKey = (j: Job) => `${j.space}:${j.kind}`;
const LIMITS = ["rampKind", "restrictedTo", "trigger", "recurrence", "threshold", "modal"] as const;
const limitValue = (j: Job, f: string) =>
  f === "threshold"
    ? (j.threshold ? `${j.threshold.stat}${j.threshold.op}${j.threshold.value}` : "none")
    : String((j as any)[f] ?? "none");

// THE DEFAULT for each limit: the value a classifier that knows nothing about
// limits would emit. The text rules emit exactly these, so any accuracy they
// score on a limit comes from the default being right, not from reading the card.
//
// This is why every limit is scored TWICE. `threshold` reads 0.93 for the text
// rules purely because most jobs carry no threshold, and reporting that number
// alone would say the rules are good at thresholds when they cannot express one.
// `informative` is the subset where gold is NOT the default -- the only cases
// where a limit changes a match -- and it is the figure the recommendation rests on.
// A restriction that does not GATE. "creature" and "permanent" are what almost
// every effect applies to, so labelling them a restriction is defensible for
// completeness and useless for the feature: the false matches were about a card
// being dead in the wrong deck, and "target creature" never is. 54% of the
// informative restrictedTo disagreements on the first scored run were
// gold "creature" against a model's "none" -- a disagreement about the SPEC, not
// about the card. Both figures are reported: the gold labels are left as they
// are, and `restrictedTo(gating)` is scored separately on the subset that
// actually decides a match.
const NON_GATING = new Set(["creature", "permanent", "spell", "player", "none"]);

const DEFAULTS: Record<string, string> = {
  rampKind: "none", restrictedTo: "none", trigger: "none",
  recurrence: "repeatable", threshold: "none", modal: "false",
};

type Tally = { tp: number; fp: number; fn: number };
const blankTally = (): Tally => ({ tp: 0, fp: 0, fn: 0 });

/** A model whose batch has not landed is SKIPPED and named, never scored as empty. */
const loadModel = (key: string) => {
  try { return JSON.parse(readFileSync(`out/labels-${key}.json`, "utf8")); }
  catch { console.log(`(${key}: out/labels-${key}.json not present — skipped)`); return null; }
};
const predictions: Record<string, Record<string, Job[] | null>> = Object.fromEntries([
  ["haiku", loadModel("haiku")],
  ["sonnet", loadModel("sonnet")],
  ["textRules", Object.fromEntries(GOLD.map((r) => [r.name, textRuleJobs(byName.get(r.name))]))],
].filter(([, v]) => v != null) as [string, Record<string, Job[] | null>][]);

const report: any = { scoredAt: new Date().toISOString(), goldCards: GOLD.length, models: {} };
const disagreements: any[] = [];

for (const [model, byCard] of Object.entries(predictions)) {
  const jobs = blankTally();
  const perKind: Record<string, Tally> = {};
  const limits: Record<string, { right: number; wrong: number; infRight: number; infWrong: number }> = {};
  for (const f of [...LIMITS, "restrictedTo(gating)"]) limits[f] = { right: 0, wrong: 0, infRight: 0, infWrong: 0 };
  let notReturned = 0;

  for (const row of GOLD) {
    const predicted = byCard[row.name];
    if (predicted == null) { notReturned++; jobs.fn += row.jobs.length; continue; }

    const goldKinds = row.jobs.map(kindKey);
    const predKinds = predicted.map(kindKey);
    const goldPool = [...goldKinds];

    for (const k of predKinds) {
      const at = goldPool.indexOf(k);
      perKind[k] ??= blankTally();
      if (at >= 0) { goldPool.splice(at, 1); jobs.tp++; perKind[k].tp++; }
      else { jobs.fp++; perKind[k].fp++; disagreements.push({ card: row.name, klass: row.klass, model, type: "extra job", job: k }); }
    }
    for (const k of goldPool) {
      jobs.fn++; perKind[k] ??= blankTally(); perKind[k].fn++;
      disagreements.push({ card: row.name, klass: row.klass, model, type: "missed job", job: k });
    }

    // LIMITS, only on jobs whose kind matched — a limit on a job the model never
    // found is not a limit error, it is the same miss counted twice.
    //
    // PAIRED WITHOUT REUSE, and best-first. A card with two jobs of the SAME kind
    // -- Depala's two restricted pumps, Tyrant's Scorn's two removals -- breaks a
    // naive `find`: it returns the same predicted job for both gold jobs, so at
    // least one comparison is guaranteed to mismatch and the model is charged for
    // the scorer's pairing. That defect read as `gold Vehicle -> pred Dwarf` on
    // Depala, which is two correct labels mispaired, not a model error.
    const unused = [...predicted];
    const agreement = (a: Job, b: Job) => LIMITS.filter((f) => limitValue(a, f) === limitValue(b, f)).length;
    const pairs: [Job, Job][] = [];
    for (const g of row.jobs) {
      let best = -1, bestAt = -1;
      for (const [i, q] of unused.entries()) {
        if (kindKey(q) !== kindKey(g)) continue;
        const score = agreement(g as Job, q);
        if (score > best) { best = score; bestAt = i; }
      }
      if (bestAt >= 0) pairs.push([g as Job, unused.splice(bestAt, 1)[0]]);
    }
    for (const [g, p] of pairs) {
      for (const f of LIMITS) {
        if (f === "rampKind" && !(g.kind === "ramp" && g.space === "role")) continue;
        const gv = limitValue(g as Job, f), pv = limitValue(p, f);
        const informative = gv !== DEFAULTS[f];
        if (gv === pv) { limits[f].right++; if (informative) limits[f].infRight++; }
        else {
          limits[f].wrong++;
          if (informative) limits[f].infWrong++;
          disagreements.push({ card: row.name, klass: row.klass, model, type: `limit:${f}`, job: kindKey(g), gold: gv, predicted: pv, informative });
        }
        // The subset that gates: a named creature type, or a card type a deck may
        // simply not play (artifact, land, Vehicle).
        if (f === "restrictedTo" && !NON_GATING.has(gv)) {
          const t = limits["restrictedTo(gating)"];
          if (gv === pv) { t.right++; t.infRight++; } else { t.wrong++; t.infWrong++; }
        }
      }
    }
  }

  const pr = (t: Tally) => ({
    precision: t.tp + t.fp ? +(t.tp / (t.tp + t.fp)).toFixed(3) : null,
    recall: t.tp + t.fn ? +(t.tp / (t.tp + t.fn)).toFixed(3) : null,
  });
  report.models[model] = {
    notReturned,
    jobs: { ...pr(jobs), ...jobs },
    limits: Object.fromEntries(Object.entries(limits).map(([f, v]) => [f, {
      accuracy: v.right + v.wrong ? +(v.right / (v.right + v.wrong)).toFixed(3) : null,
      // The figure that matters: got it right where the answer was NOT the default.
      informativeAccuracy: v.infRight + v.infWrong ? +(v.infRight / (v.infRight + v.infWrong)).toFixed(3) : null,
      ...v,
    }])),
    worstKinds: Object.entries(perKind)
      .map(([k, t]) => ({ kind: k, ...pr(t), ...t }))
      .filter((k) => k.fp + k.fn > 0)
      .sort((a, b) => (b.fp + b.fn) - (a.fp + a.fn)).slice(0, 8),
  };
}

writeFileSync("out/score.json", JSON.stringify(report, null, 1));
writeFileSync("out/disagreements.json", JSON.stringify(disagreements, null, 1));

for (const [m, r] of Object.entries<any>(report.models)) {
  console.log(`\n=== ${m} ===  (${r.notReturned} cards not returned)`);
  console.log(`  JOB    precision ${r.jobs.precision}  recall ${r.jobs.recall}   tp=${r.jobs.tp} fp=${r.jobs.fp} fn=${r.jobs.fn}`);
  for (const [f, v] of Object.entries<any>(r.limits)) {
    const inf = v.informativeAccuracy === null ? "n/a" : String(v.informativeAccuracy);
    console.log(`  ${f.padEnd(13)} accuracy ${String(v.accuracy ?? "-").padEnd(5)} | NON-DEFAULT ${inf.padEnd(5)} (${v.infRight}/${v.infRight + v.infWrong})`);
  }
}
console.log(`\n${disagreements.length} disagreements -> out/disagreements.json`);
