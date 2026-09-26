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
import { costOf, MODELS, PRICING } from "./lib/card-labels-pricing.mjs";
import { buildRequest, MAX_TOKENS_PER_BATCH, renderBody, SYSTEM } from "./lib/card-labels-prompt.mjs";

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
  // The REAL body, via `renderBody`, not an approximation of it. The earlier
  // version omitted the "Label these N cards." preamble and the `---` separators
  // and rendered a null mana cost as "" where the request sends "(no cost)", so it
  // estimated BELOW what is sent -- the one direction this file says is unsafe.
  estIn += estTokens(renderBody(cards));
  // NOT "first batch writes, the rest read". Measured on this sample: Sonnet wrote
  // the cache 37 times and read it 6 over 43 requests, because batch requests run in
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
for (const m of Object.keys(MODELS)) {
  // A model that does not cache pays full input for the instruction block on
  // EVERY batch; there is no cache read to discount.
  const usage = PRICING[m].caches
    ? { i: estIn - sysTokens, cw: sysTokens, cr: estCacheRead, o: estOut }
    : { i: estIn + estCacheRead, o: estOut };
  const c = costOf(m, usage);
  const w = costOf(m, { ...usage, o: estOutWorst });
  estTotal += c;
  worstTotal += w;
  const how = PRICING[m].caches ? `cacheRead≈${estCacheRead}` : `no cache (block under the minimum)`;
  lines.push(`  ${m.padEnd(7)} in≈${usage.i} ${how} out≈${estOut}  $${c.toFixed(3)}  (worst case $${w.toFixed(3)})`);
}

// A cumulative ledger, because the cap is stated as a TOTAL. Without it a second
// invocation after a failed collect passes its own estimate and spends the cap
// again.
const LEDGER = "out/spend.json";
let spentBefore = 0;
try { spentBefore = JSON.parse(readFileSync(LEDGER, "utf8")).totalUsd ?? 0; } catch { /* first run */ }

console.log(`cards: ${all.length} (gold ${gold.length}, random ${random.length}) in ${batches.length} batches of ${CARDS_PER_BATCH}`);
console.log(`system block: ${sysTokens} estimated tokens (1,215 as billed); caching ${PRICING.sonnet.caches ? "engages for sonnet only" : "engages for neither model"}, and measured a net loss — see the note above PRICING`);
console.log("ESTIMATE (batch rates, both models):");
lines.forEach((l) => console.log(l));
console.log(`  TOTAL   $${estTotal.toFixed(3)} expected, $${worstTotal.toFixed(3)} worst case`);
console.log(`  already spent by earlier runs: $${spentBefore.toFixed(4)}  (cap $${CAP_USD} total)`);

// Bind on the WORST CASE plus what previous runs already spent. Binding on the
// expected figure is what let a 3.4x gap sit between the cap and what the
// requests permit.
if (worstTotal + spentBefore > CAP_USD) {
  console.error(`\nREFUSING: worst case $${worstTotal.toFixed(2)} + $${spentBefore.toFixed(2)} already spent exceeds the $${CAP_USD} cap.`);
  console.error(`Lower RANDOM_N, or lower max_tokens in card-labels-prompt.mjs, and re-run.`);
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
const perModelWorst = Object.fromEntries(Object.keys(MODELS).map((m) => [m,
  costOf(m, PRICING[m].caches
    ? { i: estIn - sysTokens, cw: sysTokens, cr: estCacheRead, o: estOutWorst }
    : { i: estIn + estCacheRead, o: estOutWorst })]));

const submitted = {};
let charged = spentBefore;
for (const [key, model] of Object.entries(MODELS)) {
  const requests = batches.map((cards, i) => buildRequest(`${key}-${i}`, model, cards));
  const batch = await client.messages.batches.create({ requests });
  submitted[key] = batch.id;
  charged += perModelWorst[key];
  writeFileSync(LEDGER, JSON.stringify({ totalUsd: charged, submitted, reconciled: false }, null, 1));
  console.log(`${key}: submitted batch ${batch.id} (${requests.length} requests), ledger now $${charged.toFixed(4)}`);
}
writeFileSync("out/batches.json", JSON.stringify({ submitted, batches: batches.map((b) => b.map((c) => c.name)) }, null, 1));
console.log("\nbatch ids written to out/batches.json — poll with `node scripts/label-cards-collect.mjs`");
