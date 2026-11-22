// One-off: pass-2 verifier tuned on judged sample 2 (orchestrator order 2026-11-21). NOT part of any PR.
//   tsx scripts/judged-verify-test.ts                      dry run
//   tsx scripts/judged-verify-test.ts --spend --model=<id> submit one batch, or collect it once ended (never resubmits)
//   tsx scripts/judged-verify-test.ts --score              pass1 vs pass1+pass2 per theme vs the saved blind grades
// Pass-1 pairs = the 5.5 j2 rows in judged_labels on the scratch branch named in MODEL_TEST_DB_FILE. No DB writes.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

import { requireBranch } from "./lib/require-branch.mjs";

import { JUDGED_SYSTEM, JUDGED_THEMES, type JudgedTheme } from "../src/lib/labels/judged";
import { renderCard } from "../src/lib/labels/prompt";

neonConfig.webSocketConstructor = ws;
const DIR = process.env.MODEL_TEST_DIR!;
const DB_FILE = process.env.MODEL_TEST_DB_FILE!;
const CAP_USD = Number(process.env.VERIFY_CAP_USD ?? 0.15);
const args = process.argv.slice(2);
const SPEND = args.includes("--spend");
const SCORE = args.includes("--score");
const model = args.find((a) => a.startsWith("--model="))?.slice(8);

const MODELS: Record<string, { in: number; out: number; maxTokens: number; params: Record<string, unknown> }> = {
  "claude-sonnet-5-5": { in: 1, out: 5, maxTokens: 600, params: { thinking: { type: "between_tools" } } },
  "claude-opus-5-5": { in: 2, out: 10, maxTokens: 1500, params: { output_config: { effort: "low" } } },
};

// The theme definitions are j2's own text, so the verifier judges against exactly what pass 1 was told.
const defs = JUDGED_SYSTEM.slice(JUDGED_SYSTEM.indexOf("THEMES (use"), JUDGED_SYSTEM.indexOf("A card may serve"));
export const VERIFY_SYSTEM = `You check ONE claim about a Magic: the Gathering card in a Commander deck: that the card serves ONE named strategy theme.
A first pass was loose on purpose and is often wrong. You are the strict second look. Answer "yes" only when the card clearly
meets the definition below and you could name the deck that plays it BECAUSE of that theme. Any close call is "no".

${defs}
Apply the definitions above exactly, including their IN and OUT examples and split rules.

Reply with ONE JSON object and nothing else: {"verdict": "yes" or "no", "reason": "<one short line>"}`;

type Card = { n: number; oracleId: string; name: string; mana_cost: string | null; type_line: string; oracle_text: string | null; layout: string };
type Pair = { n: number; theme: JudgedTheme; card: Card };
const SAMPLE = process.env.SAMPLE ?? "2";
const key: { n: number; name: string }[] = JSON.parse(readFileSync(join(DIR, `sample${SAMPLE}-key.json`), "utf8"));
const grades = new Set(readFileSync(join(DIR, `judged-grades${SAMPLE}.txt`), "utf8").split("\n").map((l) => l.trim()).filter(Boolean));
const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? readFileSync(DB_FILE, "utf8").trim(), max: 2 });

async function loadPairs(): Promise<Pair[]> {
  const rows = (await pool.query(
    `select c.oracle_id as "oracleId", c.name, c.mana_cost, c.type_line, c.oracle_text, c.layout, j.themes
       from cards c join judged_labels j on j.oracle_id = c.oracle_id and j.prompt_version = 'j4'
      where c.name = any($1::text[]) and jsonb_array_length(j.themes) > 0`, [key.map((k) => k.name)])).rows;
  const pairs: Pair[] = [];
  for (const r of rows) {
    const n = key.find((k) => k.name === r.name)!.n;
    for (const t of r.themes as JudgedTheme[]) pairs.push({ n, theme: t, card: { n, ...r } });
  }
  return pairs.sort((a, b) => a.n - b.n || a.theme.localeCompare(b.theme));
}

const requestsFor = (m: string, pairs: Pair[]) => pairs.map((p) => ({
  custom_id: `vf-${p.n}-${p.theme}`,
  params: {
    model: m, max_tokens: MODELS[m].maxTokens, ...MODELS[m].params,
    system: [{ type: "text" as const, text: VERIFY_SYSTEM }],
    messages: [{ role: "user" as const, content: `Claimed theme: ${p.theme}\n\n${renderCard(p.card)}` }],
  },
}));
const worstCase = (m: string, reqs: ReturnType<typeof requestsFor>) => reqs.reduce((s, r) =>
  s + (Math.ceil((VERIFY_SYSTEM.length + (r.params.messages[0].content as string).length) / 3) * MODELS[m].in + r.params.max_tokens * MODELS[m].out) / 1e6, 0);

const LEDGER = join(DIR, `verify-test-ledger${SAMPLE === "2" ? "" : SAMPLE}.json`);
type Ledger = Record<string, { batchId: string; worstUsd: number; actualUsd?: number; collected?: boolean }>;
const readLedger = (): Ledger => (existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, "utf8")) : {});
const booked = (l: Ledger) => Object.values(l).reduce((s, e) => s + (e.actualUsd ?? e.worstUsd), 0);

async function main() {
  await requireBranch(process.env.DATABASE_URL, "judged-verify-test");
  const pairs = await loadPairs();
  console.log(`pass-1 pairs ${pairs.length}`);
  if (SCORE) return score(pairs);
  const models = model ? [model] : Object.keys(MODELS);
  for (const m of models) if (!MODELS[m]) throw new Error(`unknown model ${m}`);
  const ledger = readLedger();
  if (!SPEND) {
    let total = 0;
    for (const m of models) {
      const reqs = requestsFor(m, pairs); const w = worstCase(m, reqs); total += w;
      console.log(`${m}: ${reqs.length} requests, worst $${w.toFixed(3)}\n  shape ${JSON.stringify({ ...reqs[0], params: { ...reqs[0].params, system: "<VERIFY_SYSTEM>" } })}`);
    }
    console.log(`TOTAL worst $${total.toFixed(3)} vs cap $${CAP_USD}`);
    return;
  }
  if (models.length !== 1) throw new Error("--spend takes one --model=");
  const client = new Anthropic({ baseURL: "https://api.anthropic.com" });
  const prior = ledger[model!];
  if (prior) {
    if (prior.collected) { console.log("already collected"); return; }
    const b = await client.messages.batches.retrieve(prior.batchId);
    console.log(`batch ${prior.batchId}: ${b.processing_status}`);
    if (b.processing_status !== "ended") return;
    const out: { custom_id: string; type: string; text?: string }[] = [];
    let usd = 0;
    for await (const r of await client.messages.batches.results(prior.batchId)) {
      if (r.result.type !== "succeeded") { out.push({ custom_id: r.custom_id, type: r.result.type }); continue; }
      const msg = r.result.message;
      usd += (msg.usage.input_tokens * MODELS[model!].in + msg.usage.output_tokens * MODELS[model!].out) / 1e6;
      out.push({ custom_id: r.custom_id, type: "succeeded", text: msg.content.filter((c) => c.type === "text").map((c) => (c as { text: string }).text).join("") });
    }
    writeFileSync(join(DIR, `verify-test${SAMPLE === "2" ? "" : SAMPLE}-${model}.json`), JSON.stringify(out, null, 1));
    ledger[model!] = { ...prior, actualUsd: usd, collected: true };
    writeFileSync(LEDGER, JSON.stringify(ledger, null, 1));
    console.log(`collected ${out.length}, actual $${usd.toFixed(4)}`);
    return;
  }
  const reqs = requestsFor(model!, pairs); const w = worstCase(model!, reqs);
  if (booked(ledger) + w > CAP_USD) throw new Error(`cap: worst $${w.toFixed(3)} + booked $${booked(ledger).toFixed(3)} > $${CAP_USD}`);
  ledger[model!] = { batchId: "pending", worstUsd: w };
  writeFileSync(LEDGER, JSON.stringify(ledger, null, 1));
  const batch = await client.messages.batches.create({ requests: reqs as never });
  ledger[model!] = { batchId: batch.id, worstUsd: w };
  writeFileSync(LEDGER, JSON.stringify(ledger, null, 1));
  console.log(`submitted ${reqs.length} for ${model} as ${batch.id}, worst $${w.toFixed(3)}`);
}

function table(label: string, kept: Pair[]) {
  const line = JUDGED_THEMES.map((t) => {
    const mine = kept.filter((p) => p.theme === t);
    const tp = mine.filter((p) => grades.has(`${p.n} ${t}`)).length;
    const truth = [...grades].filter((g) => g.endsWith(` ${t}`)).length;
    return `${t} P${mine.length ? Math.round((100 * tp) / mine.length) : 0}/R${Math.round((100 * tp) / truth)} (tp${tp} fp${mine.length - tp} fn${truth - tp})`;
  });
  console.log(`${label}: ${line.join(" | ")}`);
}

function score(pairs: Pair[]) {
  table("pass1 only", pairs);
  for (const m of Object.keys(MODELS)) {
    const f = join(DIR, `verify-test${SAMPLE === "2" ? "" : SAMPLE}-${m}.json`);
    if (!existsSync(f)) continue;
    const res: { custom_id: string; text?: string }[] = JSON.parse(readFileSync(f, "utf8"));
    const yes = new Set<string>(); const bad: string[] = [];
    for (const r of res) {
      const s = r.text ?? ""; const a = s.indexOf("{"); const z = s.lastIndexOf("}");
      try { if (JSON.parse(s.slice(a, z + 1)).verdict === "yes") yes.add(r.custom_id); } catch { bad.push(r.custom_id); }
    }
    console.log(`  ${m}: ${yes.size} yes of ${res.length}, ${bad.length} unparsed`);
    // A truncated or malformed reply is an error, never a "no": scoring it as no silently drops true positives.
    if (bad.length) throw new Error(`${m}: unparsed verifier replies (likely truncated at max_tokens): ${bad.join(", ")}`);
    table(`pass1+pass2 ${m}`, pairs.filter((p) => yes.has(`vf-${p.n}-${p.theme}`)));
    for (const r of res) {
      if (!yes.has(r.custom_id)) continue;
      const [n, t] = r.custom_id.slice(3).split("-");
      if (!grades.has(`${n} ${t}`)) console.log(`    kept FP ${n} ${t}: ${r.text?.replace(/\s+/g, " ").slice(0, 160)}`);
    }
  }
}
main().then(() => pool.end(), (e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
