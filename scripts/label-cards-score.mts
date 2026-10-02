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
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

import "./lib/env.mjs";

import { neon } from "@neondatabase/serverless";

import { frontFaceOracle } from "../src/lib/recs/faces";
import { classifyRoles } from "../src/lib/recs/roles";
import { loadCreatureTypes } from "../src/lib/swaps/gather";
import { cardThemes } from "../src/lib/recs/themes";
import { FIELD_BARS, fieldBars, jobBars, restrictionPair, stops, type Bar, type Field } from "./lib/card-labels-bars.mjs";
import { GOLD } from "./lib/card-labels-gold.mjs";
import { bestPairing } from "./lib/card-labels-pairing.mjs";
import { ALL_MODELS, MODELS } from "./lib/card-labels-pricing.mjs";
import { publishArtifacts, publishModels } from "./lib/card-labels-publish.mjs";
import { METHOD_KINDS, TO_KINDS, type Job } from "../src/lib/labels/types.js";

// The SHARED `Job`, not a local one. This file declared its own — a fourth description of
// a job, beside the validator's, the stored type's and the pairing module's — and two of
// those disagreed about whether a limit could be absent. `src/lib/labels` is now the one
// definition, which is what the plan's PR 2 is for.

const die = (why: string): never => { console.error(why); process.exit(1); };

const sql = neon(process.env.DATABASE_URL!);
const goldNames = GOLD.map((r) => r.name);
const cards = await sql`
  select name, mana_cost, type_line, oracle_text, keywords, layout from cards where name = any(${goldNames})`;
type CardRow = { name: string; mana_cost: string | null; type_line: string; oracle_text: string | null; keywords: string[] | null; layout: string };
const byName = new Map((cards as CardRow[]).map((c) => [c.name, c]));

// `cardThemes` needs the catalog's own creature subtypes, and it must be the
// APPLICATION'S list, not a query written here. `readCreatureTypes` in
// `src/lib/swaps/gather.ts` excludes a subtype word that also appears on a
// non-creature land, artifact or enchantment face -- `Forest` is its own example,
// because Dryad Arbor is a `Land Creature — Forest Dryad`. A local query taking
// every token after `Creature —` therefore admits `Forest`, `Equipment`, `Saga` and
// `Vehicle` as creature types, which moves BOTH the baseline's tribal theme and this
// file's tribal denominators. 303 types against the local version's wider set.
const creatureTypes = await loadCreatureTypes();
const isCreatureType = (w: string) => creatureTypes.has(w);

/**
 * TRIBAL: gold restricts to a named CREATURE TYPE -- Wolf, Dinosaur, Pirate. The
 * Bejeweled Warg case exactly, and a strict subset of the gating set, which also
 * holds card types (artifact, land, Vehicle) and game roles (Commander). The two are
 * reported SEPARATELY because they do not agree about which model is better, and a
 * reader shown only one is being steered.
 *
 * Checked against the CATALOG'S creature subtypes, not `/^[A-Z]/`. The capitalised
 * test let `Vehicle` and `Commander` into the tribal column -- 3 of 34 gold values --
 * while the prose beside it called them examples of the gating superset. The
 * published denominators disagreed with the published definition.
 */
const isTribal = (v: string) => creatureTypes.has(v);


/** A gold card missing from the catalog is a broken run, not a blank row. */
const mustGet = (name: string): CardRow => {
  const row = byName.get(name);
  if (!row) throw new Error(`gold card not in the catalog: ${name}`);
  return row;
};

const textRuleJobs = (card: CardRow): Job[] => {
  // EXACTLY as the stand-ins consumer runs them. `src/lib/swaps/stand-ins.ts:47`
  // calls `classifyRoles({ ...card, oracleText: frontFaceOracle(card.oracleText) })`,
  // and `cardThemes` applies `frontFaceOracle` internally. Passing the raw column
  // instead -- which this did -- hands the rules BOTH FACES of a two-faced card, so
  // a land back's "{T}: Add" scores `ramp` for a card whose front is an Aura. That
  // understated the baseline against the very consumer this lane is about: the
  // comparison has to be with the rules as they actually run, not with a worse
  // version of them.
  const roles = classifyRoles({ typeLine: card.type_line, oracleText: frontFaceOracle(card.oracle_text), keywords: card.keywords ?? [] });
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


const LIMITS = ["rampKind", "restrictedTo", "affects", "to", "method", "trigger", "recurrence", "threshold", "modal"] as const;
const limitValue = (j: Job, f: string) =>
  f === "threshold"
    ? (j.threshold ? `${j.threshold.stat}${j.threshold.op}${j.threshold.value}` : "none")
    : String((j as unknown as Record<string, unknown>)[f] ?? "none");

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
  rampKind: "none", restrictedTo: "none", affects: "none", to: "none", method: "none", trigger: "none",
  recurrence: "repeatable", threshold: "none", modal: "false",
};

type Tally = { tp: number; fp: number; fn: number };
const blankTally = (): Tally => ({ tp: 0, fp: 0, fn: 0 });

/**
 * A model whose batch has not landed is SKIPPED and named, never scored as empty.
 *
 * A MISSING file and a CORRUPT one are told apart, because collapsing them reports
 * a truncated labels file as "not present" and prints a two-model report that
 * reads as complete. Absence is a skip; anything else throws.
 */
const loadModel = (key: string) => {
  const path = `out/labels-${key}.json`;
  let raw: string;
  try { raw = readFileSync(path, "utf8"); }
  catch (e) {
    if ((e as { code?: string }).code === "ENOENT") { console.log(`(${key}: ${path} not present — skipped)`); return null; }
    throw e;
  }
  try { return JSON.parse(raw); }
  catch (e) { throw new Error(`${path} is present but unparseable — refusing to score a partial run: ${(e as Error).message}`); }
};
/**
 * The DEFAULT models, plus any named by `LABEL_MODELS` — the runner's own convention, and
 * the reason this is not simply "every labels file on disk".
 *
 * A stray `out/labels-sonnet5.json` from an opt-in run would otherwise be picked up
 * silently by an ordinary scoring run, which then writes a three-model document to the
 * path the canonical two-model artifact publishes from. The publish gate refuses that, so
 * the documented regeneration — run, collect, score, agree — would fail for anyone who
 * had ever sampled an opt-in model, with a refusal about a model they did not ask for.
 *
 * Naming the model is how you get it scored, which is how you got it RUN.
 */
const asked = (process.env.LABEL_MODELS ?? "").split(",").map((m) => m.trim()).filter(Boolean);
const unknownAsked = asked.filter((m) => !(m in ALL_MODELS));
if (unknownAsked.length > 0) {
  throw new Error(`LABEL_MODELS names a model that is not in ALL_MODELS: ${unknownAsked.join(", ")}`);
}
const scoring = asked.length > 0 ? asked : Object.keys(MODELS);

// A model is SKIPPED with a line rather than scored as empty when its file is absent, so
// adding one to an existing comparison does not require re-running the others.
const predictions: Record<string, Record<string, Job[] | null>> = Object.fromEntries([
  ...scoring.map((m) => [m, loadModel(m)] as const),
  ["textRules", Object.fromEntries(GOLD.map((r) => [r.name, textRuleJobs(mustGet(r.name))]))],
].filter(([, v]) => v != null) as [string, Record<string, Job[] | null>][]);

type LimitStat = { accuracy: number | null; informativeAccuracy: number | null; right: number; wrong: number; infRight: number; infWrong: number };
type ModelReport = {
  notReturned: number; spuriousRestrictions: number; jobs: Record<string, number | null>; limits: Record<string, LimitStat>;
  worstKinds: unknown[]; bars: Bar[]; stops: string[];
};
const report: { scoredAt: string; goldCards: number; models: Record<string, ModelReport> } = { scoredAt: new Date().toISOString(), goldCards: GOLD.length, models: {} };
const disagreements: Record<string, unknown>[] = [];

for (const [model, byCard] of Object.entries(predictions)) {
  const jobs = blankTally();
  const perKind: Record<string, Tally> = {};
  const limits: Record<string, { right: number; wrong: number; infRight: number; infWrong: number }> = {};
  for (const f of [...LIMITS, "restrictedTo(gating)", "restrictedTo(tribal)"]) limits[f] = { right: 0, wrong: 0, infRight: 0, infWrong: 0 };
  // SPURIOUS restrictions: the model invented a gating restriction where gold has
  // none. The gating and tribal subsets both key on GOLD's value, so they are
  // recall-like and cannot see this direction at all -- a model over-labelling
  // limits would score perfectly on them. An invented restriction is a false
  // NEGATIVE in the feature (a good stand-in refused), which is the mirror of the
  // bug this lane exists to fix, so it is counted rather than left invisible.
  let spurious = 0;
  let notReturned = 0;
  // The consumer-read fields' (gold, predicted) values on matched jobs, for their own per-value bars.
  const fieldPairs = Object.fromEntries(Object.keys(FIELD_BARS).map((f) => [f, []])) as unknown as Record<Field, [string, string][]>;

  for (const row of GOLD) {
    const predicted = byCard[row.name];
    // A card the model never returned misses EVERY one of its jobs, per job as well as in the aggregate, or a
    // model could skip the cards holding a job and keep that job's recall whole.
    if (predicted == null) {
      notReturned++;
      for (const k of row.jobs.map(kindKey)) { jobs.fn++; perKind[k] ??= blankTally(); perKind[k].fn++; }
      continue;
    }

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
    const agreement = (a: Job, b: Job) => LIMITS.filter((f) => limitValue(a, f) === limitValue(b, f)).length;
    const pairs = bestPairing(row.jobs as Job[], predicted, agreement);
    for (const [g, p] of pairs) {
      for (const f of LIMITS) {
        if (f === "rampKind" && !(g.kind === "ramp" && g.space === "role")) continue;
        // `to` and `method` exist only on their own kinds (the schema's rule), so a job that cannot carry
        // one is no evidence about either.
        if (f === "to" && !TO_KINDS.includes(g.kind)) continue;
        if (f === "method" && !METHOD_KINDS.includes(g.kind)) continue;
        const gv = limitValue(g as Job, f), pv = limitValue(p, f);
        if (f in FIELD_BARS) fieldPairs[f as Field].push(f === "restrictedTo" ? restrictionPair(gv, pv) : [gv, pv]);
        const informative = gv !== DEFAULTS[f];
        if (gv === pv) { limits[f].right++; if (informative) limits[f].infRight++; }
        else {
          limits[f].wrong++;
          if (informative) limits[f].infWrong++;
          disagreements.push({ card: row.name, klass: row.klass, model, type: `limit:${f}`, job: kindKey(g), gold: gv, predicted: pv, informative });
        }
        // The subset that gates: a named creature type, or a card type a deck may
        // simply not play (artifact, land, Vehicle).
        if (f === "restrictedTo") {
          if (!NON_GATING.has(gv)) {
            const t = limits["restrictedTo(gating)"];
            if (gv === pv) { t.right++; t.infRight++; } else { t.wrong++; t.infWrong++; }
            if (isTribal(gv)) {
              const b = limits["restrictedTo(tribal)"];
              if (gv === pv) { b.right++; b.infRight++; } else { b.wrong++; b.infWrong++; }
            }
          } else if (gv === "none" && !NON_GATING.has(pv)) {
            // INVENTED: gold records NO restriction at all and the model named a
            // type. Scoped to `gv === "none"` deliberately. The earlier version
            // fired whenever gold was in NON_GATING, which includes `creature` (49
            // of the gold set's jobs) and `permanent` -- so a model answering
            // `Vehicle` where gold says `creature` was counted as inventing, when
            // that is the documented spec disagreement rather than invention, and
            // the count silently mixed the two.
            spurious++;
            disagreements.push({ card: row.name, klass: row.klass, model, type: "spurious restriction", job: kindKey(g), gold: gv, predicted: pv, informative: true });
          }
        }
      }
    }
  }

  const pr = (t: Tally) => ({
    precision: t.tp + t.fp ? +(t.tp / (t.tp + t.fp)).toFixed(3) : null,
    recall: t.tp + t.fn ? +(t.tp / (t.tp + t.fn)).toFixed(3) : null,
  });
  // The text rules emit no limits and cannot name the new jobs; they are scored for contrast, never gated.
  const bars = [...jobBars(perKind), ...fieldBars(fieldPairs)];
  report.models[model] = {
    bars,
    stops: model === "textRules" ? [] : stops(bars),
    notReturned,
    spuriousRestrictions: spurious,
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

mkdirSync("out", { recursive: true });
// PUBLISHING an incomplete report would commit a comparison that is not one. The skip
// above is for exploratory runs; with `--publish` every model the target describes must be
// present and complete (both for the first sample, Sonnet alone for LABEL_PUBLISH=resample),
// or the committed artifact silently loses a column the report quotes.
if (process.argv.includes("--publish")) {
  for (const m of publishModels()) {
    const rows = predictions[m];
    if (!rows) die(`refusing to publish: out/labels-${m}.json is missing, so the comparison is incomplete`);
    const answered = Object.values(rows).filter((v) => Array.isArray(v)).length;
    if (answered < GOLD.length) die(`refusing to publish: ${m} answered ${answered} of ${GOLD.length} gold cards`);
  }
}

writeFileSync("out/score.json", JSON.stringify(report, null, 1));
writeFileSync("out/disagreements.json", JSON.stringify(disagreements, null, 1));

for (const [m, r] of Object.entries(report.models)) {
  console.log(`\n=== ${m} ===  (${r.notReturned} cards not returned)`);
  console.log(`  JOB    precision ${r.jobs.precision}  recall ${r.jobs.recall}   tp=${r.jobs.tp} fp=${r.jobs.fp} fn=${r.jobs.fn}`);
  console.log(`  spurious gating restrictions invented: ${r.spuriousRestrictions}`);
  for (const [f, v] of Object.entries(r.limits)) {
    const inf = v.informativeAccuracy === null ? "n/a" : String(v.informativeAccuracy);
    console.log(`  ${f.padEnd(13)} accuracy ${String(v.accuracy ?? "-").padEnd(5)} | NON-DEFAULT ${inf.padEnd(5)} (${v.infRight}/${v.infRight + v.infWrong})`);
  }
}
for (const [m, r] of Object.entries(report.models)) {
  if (m === "textRules") continue;
  console.log(r.stops.length === 0
    ? `\n${m}: every job and field bar met.`
    : `\n${m}: STOP, ${r.stops.length} bar(s) not met; the prompt goes back for these before any run:\n  ${r.stops.join("\n  ")}`);
}
console.log(`\n${disagreements.length} disagreements -> out/disagreements.json`);

publishArtifacts(["out/score.json"], process.argv.includes("--publish"));
