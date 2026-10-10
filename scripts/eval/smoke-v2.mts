import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { connectStaging } from "./lib/staging.mjs";

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
const needles = argv.filter((a, i) => !a.startsWith("--") && argv[i - 1] !== "--cap");
const log = process.env.SMOKE_LOG;
if (!log) throw new Error("smoke: set SMOKE_LOG to the campaign spend log");
const CAMPAIGN_CAP = 15;

const spent = () => (existsSync(log) ? readFileSync(log, "utf8").split("\n").filter(Boolean).reduce((n, l) => n + JSON.parse(l).usd, 0) : 0);

const db = await connectStaging();
const { sql } = await import("drizzle-orm");
const { loadProfileHead, loadDeckProfileFromHead } = await import("../../src/lib/profile/load");
const { factsFor, catalogFor } = await import("../../src/lib/synopsis/generate");
const { buildSynopsisPrompt } = await import("../../src/lib/synopsis/prompt");
const { callModel } = await import("../../src/lib/model/client");
const { synopsisResponseSchema } = await import("../../src/lib/synopsis/response-schema");
const { validateSynopsis } = await import("../../src/lib/synopsis/validate");
const { SYNOPSIS_MAX_TOKENS } = await import("../../src/lib/synopsis/limits");
const { SYNOPSIS_MODEL, SYNOPSIS_EFFORT } = await import("../../src/lib/synopsis/model");
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
  const out = await callModel({ model: SYNOPSIS_MODEL, system: prompt.system, user: prompt.user, maxTokens: SYNOPSIS_MAX_TOKENS, effort: SYNOPSIS_EFFORT, schema: synopsisResponseSchema, deadlineMs: 110_000 });
  const usage = out.usage;
  const usd = usage ? costUsd(SYNOPSIS_MODEL, { input_tokens: usage.inputTokens, output_tokens: usage.outputTokens, cache_read_input_tokens: usage.cacheReadTokens, cache_creation_input_tokens: usage.cacheWriteTokens }, { batch: false }) : 0;
  runSpend += usd;
  appendFileSync(log, JSON.stringify({ at: new Date().toISOString(), what: `smoke-v2 ${v1 ? "v1" : "v2"} ${d.name}`, usd, usage }) + "\n");
  console.log(`\n== ${d.name} ${v1 ? "(v1)" : "(v2)"}  ok=${out.ok} $${usd.toFixed(4)} (run ${runSpend.toFixed(4)}, campaign ${spent().toFixed(4)})`);
  if (!out.ok) { console.log(out.errorClass); continue; }
  const checked = validateSynopsis(out.value, facts, await catalogFor(out.value, facts));
  console.log(checked.verdicts.map((v) => `${v.section}:${v.status}${"reason" in v ? `(${(v as { reason: string }).reason})` : ""}`).join(" "));
  console.log("OVERVIEW:", out.value.overview);
  console.log("STRATEGY:", out.value.primer.strategy.join(" | "));
}
process.exit(0);
