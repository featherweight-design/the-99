import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { connectStaging } from "./lib/staging.mjs";
import { acquireRunLock } from "./lib/ledger.mjs";

/**
 * The priced smoke for the v2 Overview facts (plan 2026-10-10-overview-accuracy.md, E1s):
 * REAL-TIME calls, one per named staging deck, through the app's own `callModel`, prompt and
 * validator. Every call is priced as it lands (`scripts/eval/lib/pricing.mts`) and appended to a
 * spend log; the run refuses to start a call that could cross `--cap` (default 0.5 USD for the
 * smoke) given what the log already holds against the campaign's 15 USD.
 *
 *   SMOKE_LOG=/path/spend.jsonl pnpm tsx scripts/eval/smoke-v2.mts [--v1] [--cap 0.5] Baral Kilo
 *
 * `--v1` sends the contract-7 prompt (facts off) for the same decks, as the comparison.
 */
const argv = process.argv.slice(2);
const v1 = argv.includes("--v1");
const capIx = argv.indexOf("--cap");
const cap = capIx >= 0 ? Number(argv[capIx + 1]) : 0.5;
if (!Number.isFinite(cap) || cap < 0) throw new Error(`smoke: --cap must be a finite, non-negative number (got ${argv[capIx + 1]})`);
const needles = argv.filter((a, i) => !a.startsWith("--") && argv[i - 1] !== "--cap");
const log = process.env.SMOKE_LOG;
if (!log) throw new Error("smoke: set SMOKE_LOG to the campaign spend log");
const CAMPAIGN_CAP = 15;

// Settled spend plus every pending worst case that no settle line names (a crashed run keeps its charge).
const spent = () => {
  if (!existsSync(log)) return 0;
  const lines = readFileSync(log, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as { usd: number; pending?: boolean; id?: string; settles?: string });
  const settled = new Set(lines.flatMap((l) => (l.settles ? [l.settles] : [])));
  return lines.reduce((n, l) => n + (l.pending && l.id && settled.has(l.id) ? 0 : l.usd), 0);
};

// One smoke at a time against this log: two would each read the same spend and pass the cap check.
acquireRunLock(log);
const db = await connectStaging();
const { sql } = await import("drizzle-orm");
const { loadProfileHead, loadDeckProfileFromHead } = await import("../../src/lib/profile/load");
const { factsFor, catalogFor, synopsisCallSettings } = await import("../../src/lib/synopsis/generate");
const { buildSynopsisPrompt } = await import("../../src/lib/synopsis/prompt");
const { callModel } = await import("../../src/lib/model/client");
const { synopsisResponseSchema } = await import("../../src/lib/synopsis/response-schema");
const { validateSynopsis } = await import("../../src/lib/synopsis/validate");
// Both arms here are contract 7: the facts-on prompt still parses with the contract-7 wire and
// validator, so it runs on contract 7's own model, effort and ceiling. The v2 contracts' prompt
// (contract 8) is measured by `eval:corpus run --prompt v8`.
const { model: SYNOPSIS_MODEL, effort: SYNOPSIS_EFFORT, maxTokens: SYNOPSIS_MAX_TOKENS, stream } = synopsisCallSettings(false);
const { costUsd, worstCaseUsd } = await import("./lib/pricing.mjs");

const rows = (await db.execute(sql`select id, user_id, name from decks order by name`)).rows as { id: string; user_id: string; name: string }[];
let runSpend = 0;
for (const needle of needles) {
  const d = rows.find((r) => r.name.toLowerCase().includes(needle.toLowerCase()));
  if (!d) { console.log(`no deck matches ${needle}`); continue; }
  const head = await loadProfileHead(d.id, d.user_id);
  if (!head) continue;
  const facts = await factsFor(await loadDeckProfileFromHead(head), !v1);
  const prompt = buildSynopsisPrompt(facts, undefined, { v2: !v1 });
  const approxIn = Math.ceil((prompt.system.length + prompt.user.length) / 3.5);
  const worst = worstCaseUsd(SYNOPSIS_MODEL, approxIn, SYNOPSIS_MAX_TOKENS, { batch: false });
  if (spent() + worst > CAMPAIGN_CAP || runSpend + worst > cap) { console.log(`STOP before ${d.name}: worst case ${worst.toFixed(3)} would cross a cap (spent ${spent().toFixed(3)}, run ${runSpend.toFixed(3)}/${cap})`); break; }
  const runId = `${Date.now()}-${d.id}`;
  // Reserve the worst case BEFORE the call, as the eval ledger does: a crash after the API has
  // billed but before the settle still leaves a charge in the log. The settle line below replaces it.
  appendFileSync(log, JSON.stringify({ at: new Date().toISOString(), what: `smoke-v2 pending ${d.name}`, usd: worst, pending: true, id: runId }) + "\n");
  const out = await callModel({ model: SYNOPSIS_MODEL, system: prompt.system, user: prompt.user, maxTokens: SYNOPSIS_MAX_TOKENS, effort: SYNOPSIS_EFFORT, stream, schema: synopsisResponseSchema, deadlineMs: 110_000 });
  const usage = out.usage;
  const usd = usage ? costUsd(SYNOPSIS_MODEL, { input_tokens: usage.inputTokens, output_tokens: usage.outputTokens, cache_read_input_tokens: usage.cacheReadTokens, cache_creation_input_tokens: usage.cacheWriteTokens }, { batch: false }) : 0;
  runSpend += usd;
  appendFileSync(log, JSON.stringify({ at: new Date().toISOString(), what: `smoke-v2 ${v1 ? "v1" : "v2"} ${d.name}`, usd, usage, settles: runId }) + "\n");
  console.log(`\n== ${d.name} ${v1 ? "(v1)" : "(v2)"}  ok=${out.ok} $${usd.toFixed(4)} (run ${runSpend.toFixed(4)}, campaign ${spent().toFixed(4)})`);
  if (!out.ok) { console.log(out.errorClass); continue; }
  const checked = validateSynopsis(out.value, facts, await catalogFor(out.value, facts));
  console.log(checked.verdicts.map((v) => `${v.section}:${v.status}${"reason" in v ? `(${(v as { reason: string }).reason})` : ""}`).join(" "));
  console.log("OVERVIEW:", out.value.overview);
  console.log("STRATEGY:", out.value.primer.strategy.join(" | "));
}
process.exit(0);
