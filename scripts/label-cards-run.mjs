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
import { mkdirSync, writeFileSync } from "node:fs";

import "./lib/env.mjs";

import Anthropic from "@anthropic-ai/sdk";
import { neon } from "@neondatabase/serverless";

import { GOLD } from "./lib/card-labels-gold.mjs";
import { buildRequest, SYSTEM } from "./lib/card-labels-prompt.mjs";

const MODELS = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-5",
};

// Per million tokens, BATCH rate (half of standard). Cache reads are a tenth of
// the input rate; a cache write is 1.25x. Published rates as of 2026-09-25.
//
// `caches` is MEASURED, not assumed. Two identical calls per model, 2026-09-25:
//   sonnet  pass 1 cacheWrite=1215, pass 2 cacheRead=1215  -> caching engages
//   haiku   pass 1 cacheWrite=0,    pass 2 cacheRead=0     -> inert
// The instruction block is ~1,280 tokens, under Haiku's minimum cacheable prompt
// length, so its `cache_control` does nothing. The breakpoint is left in place
// (it is free and starts working if the block grows), but the estimate must not
// claim a discount Haiku does not get -- that would under-estimate, and an
// under-estimate spends money it promised not to.
const PRICING = {
  haiku: { in: 0.50, out: 2.50, cacheWrite: 0.625, cacheRead: 0.05, caches: false },
  sonnet: { in: 1.50, out: 7.50, cacheWrite: 1.875, cacheRead: 0.15, caches: true },
};

const CAP_USD = 5;
const CARDS_PER_BATCH = 12;   // ~12 cards keeps a reply inside max_tokens with room
const RANDOM_N = Number(process.env.RANDOM_N ?? 400);

const dryRun = process.argv.includes("--dry-run");

const sql = neon(process.env.DATABASE_URL);

const chunk = (xs, n) => xs.reduce((a, x, i) => (i % n ? a[a.length - 1].push(x) : a.push([x]), a), []);

/** Rough token estimate. Deliberately GENEROUS: an under-estimate spends money. */
const estTokens = (text) => Math.ceil(text.length / 3.3);

const goldNames = GOLD.map((r) => r.name);
const goldCards = await sql`
  select name, mana_cost, type_line, oracle_text from cards where name = any(${goldNames})`;
if (goldCards.length !== goldNames.length) {
  throw new Error(`gold set: ${goldNames.length} names, ${goldCards.length} resolved — refusing to run a partial set`);
}
// Keep the gold order stable so batch N always holds the same cards.
const byName = new Map(goldCards.map((c) => [c.name, c]));
const gold = goldNames.map((n) => byName.get(n));

// The random set is drawn deterministically so two runs compare like with like,
// and EXCLUDES the gold cards -- a card in both would let a model's gold answer
// inflate the agreement rate.
const random = await sql`
  select name, mana_cost, type_line, oracle_text from cards
  where commander_legal and oracle_text is not null and name <> all(${goldNames})
  order by md5(name || 'label-sample') limit ${RANDOM_N}`;

const all = [...gold, ...random];
const batches = chunk(all, CARDS_PER_BATCH);

// ---- estimate, and refuse rather than truncate ------------------------------
const sysTokens = estTokens(SYSTEM);
let estIn = 0, estCacheRead = 0, estOut = 0;
for (const [i, cards] of batches.entries()) {
  const body = cards.map((c) => `${c.name}\n${c.mana_cost ?? ""} | ${c.type_line}\n${c.oracle_text ?? ""}`).join("\n\n");
  estIn += estTokens(body);
  // First batch writes the cache; the rest read it.
  if (i === 0) estIn += sysTokens; else estCacheRead += sysTokens;
  estOut += cards.length * 160;   // ~160 output tokens per card, measured on a pilot
}

const costOf = (m, { i = 0, cr = 0, o = 0, cw = 0 }) => {
  const p = PRICING[m];
  return (i * p.in + cr * p.cacheRead + o * p.out + cw * p.cacheWrite) / 1e6;
};

let estTotal = 0;
const lines = [];
for (const m of Object.keys(MODELS)) {
  // A model that does not cache pays full input for the instruction block on
  // EVERY batch; there is no cache read to discount.
  const usage = PRICING[m].caches
    ? { i: estIn - sysTokens, cw: sysTokens, cr: estCacheRead, o: estOut }
    : { i: estIn + estCacheRead, o: estOut };
  const c = costOf(m, usage);
  estTotal += c;
  const how = PRICING[m].caches ? `cacheRead≈${estCacheRead}` : `no cache (block under the minimum)`;
  lines.push(`  ${m.padEnd(7)} in≈${usage.i} ${how} out≈${estOut}  $${c.toFixed(3)}`);
}

console.log(`cards: ${all.length} (gold ${gold.length}, random ${random.length}) in ${batches.length} batches of ${CARDS_PER_BATCH}`);
console.log(`system block: ${sysTokens} tokens, cached after the first batch`);
console.log("ESTIMATE (batch rates, both models):");
lines.forEach((l) => console.log(l));
console.log(`  TOTAL   $${estTotal.toFixed(3)}  against a $${CAP_USD} cap`);

if (estTotal > CAP_USD) {
  console.error(`\nREFUSING: the estimate exceeds the $${CAP_USD} cap. Lower RANDOM_N and re-run.`);
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
const client = new Anthropic();   // reads ANTHROPIC_API_KEY; never printed
mkdirSync("out", { recursive: true });

const submitted = {};
for (const [key, model] of Object.entries(MODELS)) {
  const requests = batches.map((cards, i) => buildRequest(`${key}-${i}`, model, cards));
  const batch = await client.messages.batches.create({ requests });
  submitted[key] = batch.id;
  console.log(`${key}: submitted batch ${batch.id} (${requests.length} requests)`);
}
writeFileSync("out/batches.json", JSON.stringify({ submitted, batches: batches.map((b) => b.map((c) => c.name)) }, null, 1));
console.log("\nbatch ids written to out/batches.json — poll with `node scripts/label-cards-collect.mjs`");
