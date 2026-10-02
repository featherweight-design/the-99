// Runs BOTH models over the gold set and a random comparison set, through the
// BATCH API, and writes the raw replies to files. Scoring is a separate script,
// so a scoring bug never costs another run.
//
// SPEND. d9's cap for this sample is $5 TOTAL across both models. The cap is
// enforced twice: an estimate BEFORE anything is sent (which refuses rather than
// truncating), and the measured cost printed after. `--dry-run` prints the
// estimate and sends nothing. Batch pricing is half of standard, which is most of
// why this fits.
//
// Writes NO database rows. Reads the catalog, writes files under out/.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

import "./lib/env.mjs";

import Anthropic from "@anthropic-ai/sdk";
import { neon } from "@neondatabase/serverless";

import { GOLD } from "./lib/card-labels-gold.mjs";
import { STRATA, STRATUM_SIZE } from "./lib/card-labels-strata.mjs";
import { clearIntent, ledgerTotal, readLedger, unreconciled, writeIntent, writeReservation } from "./lib/card-labels-ledger.mjs";
import { ALL_MODELS, costOf, MODELS, PRICING } from "./lib/card-labels-pricing.mjs";
import { buildRequest, MAX_TOKENS_PER_BATCH, renderBody, SENDS_CACHE_BREAKPOINT, SYSTEM } from "../src/lib/labels/prompt.js";

// $5 was d9's cap for the first sample. A later run states its own, approved before it is dispatched
// (d9's spend rule): `LABEL_CAP_USD`, still bound on the worst case plus what the ledger already holds.
const CAP_USD = Number(process.env.LABEL_CAP_USD ?? 5);
// A cap that is not a positive number refuses rather than reads as no cap: every comparison against NaN
// is false, so a mistyped LABEL_CAP_USD would otherwise pass the spend check below whatever the estimate.
if (!Number.isFinite(CAP_USD) || CAP_USD <= 0) {
  console.error(`REFUSING: LABEL_CAP_USD must be a positive number of dollars, got ${JSON.stringify(process.env.LABEL_CAP_USD)}.`);
  process.exit(2);
}
const CARDS_PER_BATCH = 12;   // ~12 cards keeps a reply inside max_tokens with room
const RANDOM_N = Number(process.env.RANDOM_N ?? 500);

const dryRun = process.argv.includes("--dry-run");

// `LABEL_MODELS` runs a SUBSET, so a single model can be added to an existing
// comparison without paying for the others again. Names are the keys of MODELS.
const only = (process.env.LABEL_MODELS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const chosen = only.length
  ? Object.fromEntries(Object.entries(ALL_MODELS).filter(([k]) => only.includes(k)))
  : MODELS;
if (only.length && Object.keys(chosen).length !== only.length) {
  throw new Error(`LABEL_MODELS names a model that is not in ALL_MODELS: ${only.join(",")}`);
}

const sql = neon(process.env.DATABASE_URL!);

const chunk = <T,>(xs: T[], n: number): T[][] =>
  xs.reduce<T[][]>((a, x, i) => (i % n ? a[a.length - 1].push(x) : a.push([x]), a), []);

/** Rough token estimate. Deliberately GENEROUS: an under-estimate spends money. */
const estTokens = (text: string) => Math.ceil(text.length / 3.3);

const goldNames = GOLD.map((r) => r.name);
type CatalogCard = { name: string; mana_cost: string | null; type_line: string; oracle_text: string | null; layout: string };

const goldCards = (await sql`
  select name, mana_cost, type_line, oracle_text, layout from cards where name = any(${goldNames})`) as CatalogCard[];
if (goldCards.length !== goldNames.length) {
  throw new Error(`gold set: ${goldNames.length} names, ${goldCards.length} resolved — refusing to run a partial set`);
}
// Keep the gold order stable so batch N always holds the same cards.
const byName = new Map(goldCards.map((c) => [c.name, c]));
const gold = goldNames.map((n) => {
  const row = byName.get(n);
  if (!row) throw new Error(`gold card not in the catalog: ${n}`);
  return row;
});

// The random set is drawn deterministically so two runs compare like with like,
// and EXCLUDES the gold cards -- a card in both would let a model's gold answer
// inflate the agreement rate.
const random = (await sql`
  select name, mana_cost, type_line, oracle_text, layout from cards
  where commander_legal and oracle_text is not null and name <> all(${goldNames})
  order by md5(name || 'label-sample') limit ${RANDOM_N}`) as CatalogCard[];

// THE STRATA (the vocabulary plan's Task 5): about STRATUM_SIZE regex-chosen cards per new job, so a job
// that appears on one card in two hundred is put in front of the model often enough to READ. They carry no
// gold answers, so the bars score the gold set alone; the strata feed the free gates (label-cards-gates)
// and the committed per-card labels a reader audits. Matched on the FIRST face's text (split_part), so a
// split card's second half chooses nothing; the model is still sent the whole card. Drawn after the random set and
// disjoint from it and from gold, so each card belongs to exactly one set and the random set's empty rate
// stays an honest reading of the catalog.
const taken = new Set([...goldNames, ...random.map((c) => c.name)]);
const strata: Record<string, CatalogCard[]> = {};
for (const [job, pattern] of Object.entries(STRATA)) {
  const rows = (await sql`
    select name, mana_cost, type_line, oracle_text, layout from cards
    where commander_legal and oracle_text is not null and name <> all(${[...taken]})
      and split_part(oracle_text, E'\n//\n', 1) ~* ${pattern}
    order by md5(name || ${`label-strata-${job}`}) limit ${STRATUM_SIZE}`) as CatalogCard[];
  for (const r of rows) taken.add(r.name);
  strata[job] = rows;
}
const stratified = Object.values(strata).flat();

const all = [...gold, ...random, ...stratified];
// Which set each card came from, for the free gates (the empty rate reads the random set alone): never pooled.
// Written only beside a SUBMISSION and stamped with its run id (below), never by a dry run or a refused one:
// a membership file from another draw would put the wrong random set under the labels the gates read.
const membership = {
  gold: gold.map((c) => c.name), random: random.map((c) => c.name),
  strata: Object.fromEntries(Object.entries(strata).map(([k, v]) => [k, v.map((c) => c.name)])),
};
const batches = chunk(all, CARDS_PER_BATCH);

// ---- estimate, and refuse rather than truncate ------------------------------
const sysTokens = estTokens(SYSTEM);
let estIn = 0, estCacheRead = 0, estOut = 0;
for (const [i, cards] of batches.entries()) {
  // The REAL body, via `renderBody`, not an approximation of it. The earlier
  // version omitted the "Label these N cards." preamble and the `---` separators
  // and rendered a null mana cost as "" where the request sends "(no cost)", so it
  // estimated BELOW what is sent -- the one direction this file says is unsafe.
  estIn += estTokens(renderBody(cards));
  // NOT "first batch writes, the rest read". Measured: the committed cost artifact
  // records 53,277 cache-write tokens and ZERO reads for Sonnet on the current run,
  // and an earlier run saw 37 writes against 6 reads -- because batch requests run in
  // parallel and almost none finds a warm cache. Booking 1 write and 42 reads
  // under-estimates the instruction portion ~8x, in the one direction this file says
  // must never happen.
  //
  // Modelled as ~1 read in 7 and everything else FULL PRICE, which is the measured
  // 6-in-43 rounded against the estimator rather than for it. The write itself is
  // booked at full input rather than at the 1.25x write rate, so the figure is a
  // floor on the instruction portion, not a ceiling -- stated because the report
  // quotes the measured $0.0854 and this estimate lands under it.
  if (i % 7 === 0) estCacheRead += sysTokens; else estIn += sysTokens;
  estOut += cards.length * 160;   // ~160 output tokens per card, measured on a pilot
}

// The WORST CASE the request actually permits, which is what a cap has to bind on.
// `MAX_TOKENS_PER_BATCH` is IMPORTED from the module that sets it, never copied:
// 8000 per batch of 12 is 667 tokens a card against the 160 measured, so an estimate
// built on the average leaves 4x of headroom the cap never sees. A cap that cannot
// be exceeded by the run it approves is not a cap -- and a cap reading a stale copy
// of the ceiling is the same failure with an extra step.
const estOutWorst = batches.length * MAX_TOKENS_PER_BATCH;

let estTotal = 0, worstTotal = 0;
const lines = [];
for (const m of Object.keys(chosen) as (keyof typeof MODELS)[]) {
  // A model that does not cache pays full input for the instruction block on
  // EVERY batch; there is no cache read to discount.
  // `estIn` ALREADY holds one system block for every non-read batch, so subtracting
  // another here dropped a full-price block from the Sonnet estimate. The write is
  // booked ON TOP, at the write rate, rather than carved out of the inputs.
  const caching = SENDS_CACHE_BREAKPOINT && PRICING[m].caches;
  const usage = caching
    ? { i: estIn, cw: sysTokens, cr: estCacheRead, o: estOut }
    : { i: estIn + estCacheRead, o: estOut };
  const c = costOf(m, usage);
  const w = costOf(m, { ...usage, o: estOutWorst });
  estTotal += c;
  worstTotal += w;
  const how = caching
    ? `cacheRead≈${estCacheRead}`
    : SENDS_CACHE_BREAKPOINT ? `no cache (block under the minimum)` : `no cache (no breakpoint sent)`;
  lines.push(`  ${m.padEnd(7)} in≈${usage.i} ${how} out≈${estOut}  $${c.toFixed(3)}  (worst case $${w.toFixed(3)})`);
}

// A cumulative ledger, because the cap is stated as a TOTAL. Without it a second
// invocation after a failed collect passes its own estimate and spends the cap
// again.
const ledger = readLedger();
const spentBefore = ledgerTotal(ledger);

console.log(`cards: ${all.length} (gold ${gold.length}, random ${random.length}, strata ${stratified.length}) in ${batches.length} batches of ${CARDS_PER_BATCH}`);
console.log(`  strata: ${Object.entries(strata).map(([k, v]) => `${k} ${v.length}`).join(", ")}`);
console.log(`system block: ${sysTokens} estimated tokens; caching ${SENDS_CACHE_BREAKPOINT ? (PRICING.sonnet.caches ? "engages for sonnet only" : "engages for neither model") : "not requested"}, measured a net loss — see the note atop src/lib/labels/prompt.ts`);
console.log("ESTIMATE (batch rates, both models):");
lines.forEach((l) => console.log(l));
console.log(`  TOTAL   $${estTotal.toFixed(3)} expected, $${worstTotal.toFixed(3)} worst case`);
console.log(`  already spent by earlier runs: $${spentBefore.toFixed(4)}  (cap $${CAP_USD} total)`);

// Bind on the WORST CASE plus what previous runs already spent. Binding on the
// expected figure is what let a 3.4x gap sit between the cap and what the
// requests permit.
// An UNRECONCILED run is one whose batches were submitted and never collected. A
// second run started on top of it cannot know whether that money was spent, and the
// two runs' reservations could not be told apart afterwards -- the flat ledger
// overwrote `submitted` wholesale, so whichever collector ran second would treat the
// other's reservation as prior spend or credit it twice.
const pending = unreconciled(ledger);
if (pending.length > 0 && !process.argv.includes("--force")) {
  console.error(`\nREFUSING: ${pending.length} earlier run(s) submitted batches that were never collected:`);
  for (const [key, r] of pending) console.error(`  ${key}  reserved $${(r.reservedUsd ?? 0).toFixed(4)}`);
  console.error("Run `pnpm tsx scripts/label-cards-collect.mts` to reconcile them, or pass --force if you know they are dead.");
  process.exit(1);
}

if (worstTotal + spentBefore > CAP_USD) {
  console.error(`\nREFUSING: worst case $${worstTotal.toFixed(2)} + $${spentBefore.toFixed(2)} already spent exceeds the $${CAP_USD} cap.`);
  console.error(`Lower RANDOM_N, or lower LABEL_MAX_TOKENS, and re-run.`);
  process.exit(1);
}
if (dryRun) {
  console.log("\n--dry-run: nothing sent.");
  process.exit(0);
}

// ---- send --------------------------------------------------------------------
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set (it comes from the repo .env via scripts/lib/env.mjs).");
  process.exit(1);
}
// BATCHES GO DIRECT TO ANTHROPIC, deliberately. `ANTHROPIC_BASE_URL` in this
// repo's .env points at a local proxy (127.0.0.1:8787) that forwards
// /v1/messages but has no /v1/messages/batches route -- it answers
// `cave_route_not_found`. The batch endpoint is what carries the 50% discount
// this sample's budget assumes, so the batch client names the real API host and
// nothing else changes. The key still comes from the .env convention and is
// never printed.
const client = new Anthropic({ baseURL: "https://api.anthropic.com" });
mkdirSync("out", { recursive: true });

// CHARGED PER MODEL, as each submission lands. Writing the ledger after both
// submissions leaves the hole it exists to close: a process that dies between
// haiku's `create` and sonnet's has spent Haiku's money and recorded nothing, so
// the next invocation reads $0 and authorises the whole run again.
const perModelWorst = Object.fromEntries((Object.keys(chosen) as (keyof typeof MODELS)[]).map((m) => [m,
  costOf(m, SENDS_CACHE_BREAKPOINT && PRICING[m].caches
    ? { i: estIn, cw: sysTokens, cr: estCacheRead, o: estOutWorst }
    : { i: estIn + estCacheRead, o: estOutWorst })]));

// One id for this run, chosen before anything is submitted, so every ledger write
// lands on the same entry however far the loop gets.
const runId = `run-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const submitted: Record<string, string> = {};
// The WHOLE run's worst case is reserved up front. A death mid-loop then leaves the
// cap over-charged rather than under-charged, and there is no second key to orphan.
writeReservation(runId, worstTotal);
console.log(`reserved $${worstTotal.toFixed(4)} for ${runId}`);
for (const [key, model] of Object.entries(chosen) as [keyof typeof MODELS, string][]) {
  const requests = batches.map((cards, i) => buildRequest(`${key}-${i}`, model, cards));
  // The intent goes down BEFORE the call. A process exit between `create` returning
  // and the id reaching disk would otherwise lose a batch the provider still bills:
  // the next run would see no id, submit again, and pay twice. With the intent
  // recorded, the next run refuses and says to look for the orphan with
  // `client.messages.batches.list()`.
  const intentKey = writeIntent(key, perModelWorst[key]);
  const batch = await client.messages.batches.create({ requests });
  submitted[key] = batch.id;
  // Fills the id onto the run's EXISTING entry. The whole run's worst case was
  // reserved before the loop, so there is nothing to add here and no second key.
  writeReservation(runId, worstTotal, { ...submitted });
  clearIntent(intentKey);
  // `batches.json` is written HERE, not after the loop. The collector reads it to
  // know which ids exist, so a process dying between the first and second model used
  // to strand a submitted batch: the ledger held its id, the collector never saw it,
  // and the next run submitted that model again.
  writeFileSync("out/batches.json", JSON.stringify({ runId, submitted, batches: batches.map((b) => b.map((c) => c.name)) }, null, 1));
  writeFileSync("out/sample.json", JSON.stringify({ runId, ...membership }, null, 1));
  console.log(`${key}: submitted batch ${batch.id} (${requests.length} requests)`);
}
console.log("\nbatch ids written to out/batches.json — poll with `pnpm tsx scripts/label-cards-collect.mts`");
