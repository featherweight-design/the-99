/**
 * Card labels: Sonnet 4.5 (the production label model, Hugh's 2026-09-26 pick) against Sonnet 5.5, on a
 * stratified slice of the hand-labelled GOLD set, scored exactly as the 2026-09-26 pick was scored
 * (`scripts/label-cards-score.mts`: job precision/recall, per-limit accuracy and NON-DEFAULT accuracy,
 * `restrictedTo(gating)`, `restrictedTo(tribal)`, spurious restrictions, the job and field bars).
 *
 *   pnpm tsx scripts/eval/labels-55-compare.mts [out.json] [--per-family 12] [--cap 3]          # DRY RUN (default): no API call
 *   pnpm tsx scripts/eval/labels-55-compare.mts [out.json] [--per-family 12] [--cap 3] --run    # pays, Batch API
 *
 * DRY RUN is the default: it reads staging, prints the sample, the per-family counts and each model's
 * estimated and worst-case cost, and makes NO model call (not even token counting).
 *
 * SPEND. `--cap` defaults to $3 and may only be LOWERED (a value above 3 refuses). The run binds on the
 * WORST CASE (every input character a token, billed as a cache write, every reply at `max_tokens`, twice
 * over: `worstCaseUsd`), summed with what the out file already records as spent, checked before EACH
 * model's batch is submitted. Actual cost is priced from each reply's usage as it lands and saved.
 *
 * READS ONLY. The one database is STAGING through `connectStaging` (read-only session, branch id
 * asserted). Nothing is written to any table; the only writes are the out file and its diffs file.
 *
 * Sonnet 5.5 request quirks, measured by `labels-tiering.mts` on 2026-10-11 and copied from it: it
 * answers 400 to `temperature`, and to `thinking: disabled` (it asks for `between_tools`), so both are
 * adjusted for that model alone. The prompt itself (`buildRequest`, SYSTEM, the body) is unchanged.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { sql } from "drizzle-orm";
import "../lib/env.mjs";
import { connectStaging } from "./lib/staging.mjs";
import { sendBatch } from "./lib/batch.mjs";
import { costUsd, RATES as EVAL_RATES, worstCaseUsd } from "./lib/pricing.mjs";
import { RATES as APP_RATES } from "../../src/lib/model/prices";
import { GOLD } from "../lib/card-labels-gold.mjs";
import { bestPairing } from "../lib/card-labels-pairing.mjs";
import { FIELD_BARS, fieldBars, gates, jobBars, restrictionPair, stops, type Bar, type Field } from "../lib/card-labels-bars.mjs";
import { buildRequest, LABEL_PROMPT_VERSION, renderBody, SYSTEM, SYSTEM_TOKENS_BOUND, type CardForPrompt } from "../../src/lib/labels/prompt";
import { readReply } from "../../src/lib/labels/parse";
import { METHOD_KINDS, TO_KINDS, type Job } from "../../src/lib/labels/types";

const HARD_CAP_USD = 3;
const MODELS = ["claude-sonnet-4-5", "claude-sonnet-5-5"] as const;
const CARDS_PER_REQUEST = 12; // production's CARDS_PER_REQUEST and label-cards-run's CARDS_PER_BATCH

const args = process.argv.slice(2);
const flag = (name: string, d: number) => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return d;
  const n = Number(args[i + 1]);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`--${name} must be a positive number`);
  return n;
};
const valued = new Set(["--per-family", "--cap"].flatMap((f) => { const i = args.indexOf(f); return i >= 0 ? [i + 1] : []; }));
const out = args.find((a, i) => !a.startsWith("--") && !valued.has(i))
  ?? "/private/tmp/claude-501/-Users-huey-Projects-the-99/52600739-c5df-46f9-ac53-a65d643d1e31/scratchpad/labels-55/results.json";
const PER = flag("per-family", 12);
const CAP = flag("cap", HARD_CAP_USD);
if (CAP > HARD_CAP_USD) throw new Error(`--cap may only lower the $${HARD_CAP_USD} hard cap, got ${CAP}`);
const PAY = args.includes("--run");

// The eval's rate table must agree with the app's for both models, or the cap binds on the wrong price.
for (const m of MODELS) {
  const a = EVAL_RATES[m], b = APP_RATES[m];
  if (!a || !b || a.input !== b.input || a.output !== b.output) throw new Error(`pricing: ${m} differs between scripts/eval/lib/pricing.mts and src/lib/model/prices.ts`);
}

type Card = CardForPrompt & { name: string; layout: string };
type GoldRow = (typeof GOLD)[number];
type ModelRun = { replies: Record<string, Job[]>; rejected: string[]; failed: number; usd: number; usage: { input: number; output: number; cacheWrite: number; cacheRead: number }[]; batchId?: string };
type Run = {
  config: { promptVersion: string; systemSha: string; cardsPerRequest: number; sample: string[] };
  families: Record<string, string[]>;
  models: Record<string, ModelRun>;
  scores?: unknown;
};

// ---- read staging (read-only) ----
const db = await connectStaging();
// The application's creature-type list, exactly as label-cards-score.mts reads it. Imported AFTER
// connectStaging, because `src/db` reads DATABASE_URL at module scope.
const { loadCreatureTypes } = await import("../../src/lib/swaps/gather");
const creatureTypes = await loadCreatureTypes();
const isTribal = (v: string) => creatureTypes.has(v);

const goldNames = GOLD.map((r) => r.name);
const catalog = (await db.execute(sql`
  select name, mana_cost, type_line, oracle_text, layout from cards where name in (select jsonb_array_elements_text(${JSON.stringify(goldNames)}::jsonb))
`)).rows as Card[];
const byName = new Map(catalog.map((c) => [c.name, c]));
const missing = goldNames.filter((n) => !byName.has(n));
if (missing.length) throw new Error(`gold cards not in staging's catalog: ${missing.join(", ")}`);

// ---- families: what the 2026-09-26 scorer reports on, read off the GOLD answer ----
const any = (r: GoldRow, p: (j: Job) => boolean) => (r.jobs as Job[]).some(p);
const FAMILIES: [string, (r: GoldRow) => boolean][] = [
  ["restriction (tribal)", (r) => any(r, (j) => j.restrictedTo != null && gates(String(j.restrictedTo)) && isTribal(String(j.restrictedTo)))],
  ["restriction (gating, not tribal)", (r) => any(r, (j) => j.restrictedTo != null && gates(String(j.restrictedTo)) && !isTribal(String(j.restrictedTo)))],
  ["rampKind", (r) => any(r, (j) => j.space === "role" && j.kind === "ramp" && j.rampKind != null)],
  ["trigger", (r) => any(r, (j) => (j.trigger ?? "none") !== "none")],
  ["recurrence", (r) => any(r, (j) => (j.recurrence ?? "repeatable") !== "repeatable")],
  ["threshold", (r) => any(r, (j) => j.threshold != null)],
  ["modal", (r) => any(r, (j) => j.modal === true)],
  // `affects: self` is nearly every job's answer, so the family is the informative reach: opponents, each, or a `to`/`method`.
  ["affects / to / method", (r) => any(r, (j) => ["opponents", "each"].includes(String(j.affects)) || (j as { to?: unknown }).to != null || (j as { method?: unknown }).method != null)],
  ["two-faced", (r) => ["transform", "modal_dfc", "reversible_card", "adventure", "split"].includes(byName.get(r.name)!.layout)],
  ["negatives and easy", (r) => r.klass === "easy" || r.klass.endsWith("Neg") || r.jobs.length === 0],
];
// FNV-1a, so the sample is the same on every run without a seeded RNG (as labels-tiering.mts).
const hash = (s: string) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

function drawSample(): { sample: string[]; families: Record<string, string[]> } {
  const chosen = new Set<string>();
  for (const [name, test] of FAMILIES) {
    const pool = GOLD.filter(test).sort((a, b) => hash(`${name}${a.name}`) - hash(`${name}${b.name}`));
    // A card already drawn for an earlier family counts toward this one too.
    let have = pool.filter((r) => chosen.has(r.name)).length;
    for (const r of pool) { if (have >= PER) break; if (!chosen.has(r.name)) { chosen.add(r.name); have++; } }
  }
  const sample = GOLD.map((r) => r.name).filter((n) => chosen.has(n)); // gold order: request N always holds the same cards
  const families = Object.fromEntries(FAMILIES.map(([name, test]) => [name, GOLD.filter((r) => chosen.has(r.name) && test(r)).map((r) => r.name)]));
  return { sample, families };
}

const drawn = drawSample();
const config = { promptVersion: LABEL_PROMPT_VERSION, systemSha: createHash("sha256").update(SYSTEM).digest("hex"), cardsPerRequest: CARDS_PER_REQUEST, sample: drawn.sample };
const run: Run = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : { config, families: drawn.families, models: {} };
if (JSON.stringify(run.config) !== JSON.stringify(config)) {
  throw new Error(`${out} was asked under a different prompt or sample; refusing to mix them. Use a new out file.`);
}
mkdirSync(dirname(out), { recursive: true });
const save = () => writeFileSync(out, JSON.stringify(run, null, 1));

const goldByName = new Map(GOLD.map((r) => [r.name, r]));
console.log(`sample: ${run.config.sample.length} gold cards of ${GOLD.length}`);
for (const [name, cards] of Object.entries(run.families)) console.log(`  ${name.padEnd(34)} ${String(cards.length).padStart(3)}  (pool ${GOLD.filter(FAMILIES.find(([n]) => n === name)![1]).length})`);
const klasses = new Map<string, number>();
for (const n of run.config.sample) { const k = goldByName.get(n)!.klass; klasses.set(k, (klasses.get(k) ?? 0) + 1); }
console.log(`  gold classes: ${[...klasses].map(([k, v]) => `${k} ${v}`).join(", ")}`);

// ---- requests ----
const groups: Card[][] = [];
for (let i = 0; i < run.config.sample.length; i += CARDS_PER_REQUEST) groups.push(run.config.sample.slice(i, i + CARDS_PER_REQUEST).map((n) => byName.get(n)!));
const requestFor = (model: string, i: number) => {
  const params: Record<string, unknown> = { ...buildRequest(`g-${i}`, model, groups[i]).params };
  if (model === "claude-sonnet-5-5") { delete params.temperature; params.thinking = { type: "between_tools" }; }
  return params;
};

// ---- estimate, and the cap ----
const estimate = (model: string) => {
  let expected = 0, worst = 0;
  for (let i = 0; i < groups.length; i++) {
    const p = requestFor(model, i);
    const chars = SYSTEM_TOKENS_BOUND + renderBody(groups[i]).length;
    // Expected: label-cards-run's generous 3.3 chars a token, ~160 output tokens a card (its measured pilot).
    expected += costUsd(model, { input_tokens: Math.ceil(chars / 3.3), output_tokens: groups[i].length * 160 }, { batch: true });
    // Worst: one token per character (no tokenizer emits more), billed as a cache write, the reply at max_tokens, twice.
    worst += worstCaseUsd(model, chars, p.max_tokens as number, { batch: true });
  }
  return { expected, worst };
};
const spent = () => Object.values(run.models).reduce((n, m) => n + m.usd, 0);
let worstAll = 0;
console.log(`\n${groups.length} requests of up to ${CARDS_PER_REQUEST} cards per model, Batch API rates:`);
for (const m of MODELS) {
  const e = estimate(m);
  const done = run.models[m] && Object.keys(run.models[m].replies).length > 0;
  if (!done) worstAll += e.worst;
  console.log(`  ${m.padEnd(18)} expected $${e.expected.toFixed(3)} ($${(e.expected / run.config.sample.length * 1000).toFixed(2)} per 1,000 cards)  worst case $${e.worst.toFixed(3)}${done ? "  (already run)" : ""}`);
}
console.log(`  already spent: $${spent().toFixed(4)}   worst case still to send: $${worstAll.toFixed(3)}   cap $${CAP}`);

// For projecting a full relabel: how many cards staging labels, by model, and how many are Commander-legal.
const counts = (await db.execute(sql`
  select (select count(*) from card_labels)::int as labelled,
         (select count(*) from card_labels where model = 'claude-sonnet-4-5')::int as by45,
         (select count(*) from cards where commander_legal)::int as legal
`)).rows[0] as { labelled: number; by45: number; legal: number };
console.log(`  staging: ${counts.labelled} card_labels rows (${counts.by45} by claude-sonnet-4-5), ${counts.legal} Commander-legal cards`);

if (spent() + worstAll > CAP) {
  console.log(`\nREFUSING: worst case $${worstAll.toFixed(3)} + $${spent().toFixed(3)} spent exceeds the $${CAP} cap. Lower --per-family.`);
  process.exit(1);
}
if (!PAY) {
  console.log("\nDRY RUN: no model call made. Pass --run to submit.");
  process.exit(0);
}

// ---- send, one batch per model, the cap checked before each ----
for (const model of MODELS) {
  const m = (run.models[model] ??= { replies: {}, rejected: [], failed: 0, usd: 0, usage: [] });
  if (Object.keys(m.replies).length > 0) { console.log(`${model}: already in ${out}, skipped`); continue; }
  const { worst } = estimate(model);
  if (spent() + worst > CAP) { console.log(`STOP ${model}: worst case $${worst.toFixed(3)} + $${spent().toFixed(3)} spent would cross the $${CAP} cap`); save(); process.exit(1); }
  const sent = groups.map((_, i) => ({ customId: `g-${i}`, params: requestFor(model, i) as never }));
  const { batchId, results } = await sendBatch(sent, (line) => console.log(line));
  m.batchId = batchId;
  for (const r of results) {
    const g = groups[Number(r.customId.slice(2))];
    if (!r.ok) { m.failed += g.length; m.rejected.push(`${r.customId}: ${r.reason}`); continue; }
    const u = r.message.usage;
    m.usd += costUsd(model, u as never, { batch: true });
    m.usage.push({ input: u.input_tokens, output: u.output_tokens, cacheWrite: u.cache_creation_input_tokens ?? 0, cacheRead: u.cache_read_input_tokens ?? 0 });
    const read = readReply(r.message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join(""), g.map((c) => c.name));
    if (read === null) { m.failed += g.length; m.rejected.push(`${r.customId}: unreadable reply (stop ${r.message.stop_reason})`); continue; }
    m.rejected.push(...read.rejected);
    for (const c of g) { const jobs = read.byName.get(c.name); if (jobs) m.replies[c.name] = jobs; else m.failed++; }
  }
  console.log(`${model}: ${Object.keys(m.replies).length} replied, ${m.failed} failed, $${m.usd.toFixed(4)} (total $${spent().toFixed(4)})`);
  save();
}

// ---- scoring: label-cards-score.mts's, unchanged, over a subset of gold rows ----
const kindKey = (j: Job) => `${j.space}:${j.kind}`;
const LIMITS = ["rampKind", "restrictedTo", "affects", "to", "method", "trigger", "recurrence", "threshold", "modal"] as const;
const limitValue = (j: Job, f: string) =>
  f === "threshold" ? (j.threshold ? `${j.threshold.stat}${j.threshold.op}${j.threshold.value}` : "none") : String((j as unknown as Record<string, unknown>)[f] ?? "none");
const DEFAULTS: Record<string, string> = {
  rampKind: "none", restrictedTo: "none", affects: "none", to: "none", method: "none", trigger: "none",
  recurrence: "repeatable", threshold: "none", modal: "false",
};
type Tally = { tp: number; fp: number; fn: number };
const blankTally = (): Tally => ({ tp: 0, fp: 0, fn: 0 });

function score(rows: GoldRow[], byCard: Record<string, Job[]>) {
  const jobs = blankTally();
  const perKind: Record<string, Tally> = {};
  const limits: Record<string, { right: number; wrong: number; infRight: number; infWrong: number }> = {};
  for (const f of [...LIMITS, "restrictedTo(gating)", "restrictedTo(tribal)"]) limits[f] = { right: 0, wrong: 0, infRight: 0, infWrong: 0 };
  let spurious = 0, notReturned = 0;
  const fieldPairs = Object.fromEntries(Object.keys(FIELD_BARS).map((f) => [f, []])) as unknown as Record<Field, [string, string][]>;
  const disagreements: Record<string, unknown>[] = [];
  for (const row of rows) {
    const predicted = byCard[row.name];
    if (predicted == null) {
      notReturned++;
      for (const k of row.jobs.map(kindKey)) { jobs.fn++; perKind[k] ??= blankTally(); perKind[k].fn++; }
      continue;
    }
    const goldPool = row.jobs.map(kindKey);
    for (const k of predicted.map(kindKey)) {
      const at = goldPool.indexOf(k);
      perKind[k] ??= blankTally();
      if (at >= 0) { goldPool.splice(at, 1); jobs.tp++; perKind[k].tp++; }
      else { jobs.fp++; perKind[k].fp++; disagreements.push({ card: row.name, klass: row.klass, type: "extra job", job: k }); }
    }
    for (const k of goldPool) { jobs.fn++; perKind[k] ??= blankTally(); perKind[k].fn++; disagreements.push({ card: row.name, klass: row.klass, type: "missed job", job: k }); }
    const agreement = (a: Job, b: Job) => LIMITS.filter((f) => limitValue(a, f) === limitValue(b, f)).length;
    for (const [g, p] of bestPairing(row.jobs as Job[], predicted, agreement)) {
      for (const f of LIMITS) {
        if (f === "rampKind" && !(g.kind === "ramp" && g.space === "role")) continue;
        if (f === "to" && !TO_KINDS.includes(g.kind)) continue;
        if (f === "method" && !METHOD_KINDS.includes(g.kind)) continue;
        const gv = limitValue(g, f), pv = limitValue(p, f);
        if (f in FIELD_BARS) fieldPairs[f as Field].push(f === "restrictedTo" ? restrictionPair(gv, pv) : [gv, pv]);
        const informative = gv !== DEFAULTS[f];
        if (gv === pv) { limits[f].right++; if (informative) limits[f].infRight++; }
        else {
          limits[f].wrong++; if (informative) limits[f].infWrong++;
          disagreements.push({ card: row.name, klass: row.klass, type: `limit:${f}`, job: kindKey(g), gold: gv, predicted: pv, informative });
        }
        if (f === "restrictedTo") {
          if (gates(gv)) {
            const t = limits["restrictedTo(gating)"];
            if (gv === pv) { t.right++; t.infRight++; } else { t.wrong++; t.infWrong++; }
            if (isTribal(gv)) { const b = limits["restrictedTo(tribal)"]; if (gv === pv) { b.right++; b.infRight++; } else { b.wrong++; b.infWrong++; } }
          } else if (gv === "none" && gates(pv)) {
            spurious++;
            disagreements.push({ card: row.name, klass: row.klass, type: "spurious restriction", job: kindKey(g), gold: gv, predicted: pv, informative: true });
          }
        }
      }
    }
  }
  const pr = (t: Tally) => ({
    precision: t.tp + t.fp ? +(t.tp / (t.tp + t.fp)).toFixed(3) : null,
    recall: t.tp + t.fn ? +(t.tp / (t.tp + t.fn)).toFixed(3) : null,
  });
  const bars: Bar[] = [...jobBars(perKind), ...fieldBars(fieldPairs)];
  return {
    cards: rows.length, notReturned, spuriousRestrictions: spurious,
    jobs: { ...pr(jobs), ...jobs },
    limits: Object.fromEntries(Object.entries(limits).map(([f, v]) => [f, {
      accuracy: v.right + v.wrong ? +(v.right / (v.right + v.wrong)).toFixed(3) : null,
      informativeAccuracy: v.infRight + v.infWrong ? +(v.infRight / (v.infRight + v.infWrong)).toFixed(3) : null,
      ...v,
    }])),
    stops: stops(bars),
    disagreements,
  };
}

const sampleRows = run.config.sample.map((n) => goldByName.get(n)!);
const scores: Record<string, unknown> = {};
for (const model of MODELS) {
  const m = run.models[model];
  if (!m) continue;
  const { disagreements, ...all } = score(sampleRows, m.replies);
  const tokens = m.usage.reduce((t, u) => ({ input: t.input + u.input, output: t.output + u.output, cacheWrite: t.cacheWrite + u.cacheWrite, cacheRead: t.cacheRead + u.cacheRead }), { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 });
  const answered = Object.keys(m.replies).length;
  const perFamily = Object.fromEntries(Object.entries(run.families).map(([name, names]) => {
    const { disagreements: _d, ...s } = score(names.map((n) => goldByName.get(n)!), m.replies);
    return [name, s];
  }));
  scores[model] = {
    usd: +m.usd.toFixed(5), usdPerCard: answered ? +(m.usd / answered).toFixed(6) : null, tokens,
    tokensPerCard: answered ? { input: Math.round(tokens.input / answered), output: Math.round(tokens.output / answered) } : null,
    projectedRelabelUsd: answered ? { stagingLabelled: +((m.usd / answered) * counts.labelled).toFixed(2), commanderLegal: +((m.usd / answered) * counts.legal).toFixed(2) } : null,
    failed: m.failed, rejectedJobs: m.rejected.length, overall: all, perFamily,
  };
  writeFileSync(out.replace(/\.json$/, `-${model}-disagreements.json`), JSON.stringify(disagreements, null, 1));
  const L = all.limits as Record<string, { informativeAccuracy: number | null; infRight: number; infWrong: number }>;
  console.log(`\n== ${model}: ${answered}/${sampleRows.length} answered, $${m.usd.toFixed(4)} ($${(m.usd / Math.max(1, answered)).toFixed(5)}/card; ${tokens.input} in, ${tokens.output} out)`);
  console.log(`  JOB precision ${all.jobs.precision} recall ${all.jobs.recall}   spurious restrictions ${all.spuriousRestrictions}`);
  for (const [f, v] of Object.entries(L)) console.log(`  ${f.padEnd(22)} NON-DEFAULT ${String(v.informativeAccuracy ?? "n/a").padEnd(5)} (${v.infRight}/${v.infRight + v.infWrong})`);
  for (const [name, s] of Object.entries(perFamily)) {
    const g = (s.limits as typeof L)["restrictedTo(gating)"];
    console.log(`  [${name}] ${s.cards} cards  job P ${s.jobs.precision} R ${s.jobs.recall}  gating ${g.informativeAccuracy ?? "n/a"}  spurious ${s.spuriousRestrictions}`);
  }
}
run.scores = { scoredAt: new Date().toISOString(), staging: counts, models: scores };
save();
console.log(`\nwritten: ${out}`);
process.exit(0);
