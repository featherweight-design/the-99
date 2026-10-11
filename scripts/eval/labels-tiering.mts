/**
 * Card-labels model tiering (Hugh approved, 2026-10-11, cap $1, no production change).
 *
 * Does claude-haiku-5-5 or claude-sonnet-5-5 reproduce the labels already stored from
 * claude-sonnet-4-5? A stratified sample of staging's FRESH labels is re-asked under the SAME prompt
 * (`buildRequest`, version 8) of each candidate, real time, and compared with the scorer's own pairing.
 *
 *   pnpm tsx scripts/eval/labels-tiering.mts <out.json> [--cap 1] [--per-stratum 30] [--batch 10]
 *
 * STAGING is read-only (`connectStaging`); nothing is written to any database. Every reply is priced
 * as it lands and the run refuses a request whose worst case could cross `--cap`, counting what the
 * out file already holds, so a resumed run cannot overspend.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { sql } from "drizzle-orm";
import { requireEnv } from "../lib/env.mjs";
import { bestPairing } from "../lib/card-labels-pairing.mjs";
import { connectStaging } from "./lib/staging.mjs";
import { costUsd, worstCaseUsd } from "./lib/pricing.mjs";
import { buildRequest, labelIsFresh, renderBody, SYSTEM_TOKENS_BOUND } from "../../src/lib/labels/prompt";
import { readReply } from "../../src/lib/labels/parse";
import { searchesOnlyLands } from "../../src/lib/bracket/tutor-targets";
import type { Job } from "../../src/lib/labels/types";

const args = process.argv.slice(2);
const out = args.find((a) => !a.startsWith("--") && !/^\d/.test(a));
if (!out) throw new Error("usage: labels-tiering.mts <out.json> [--cap N] [--per-stratum N] [--batch N]");
const flag = (name: string, d: number) => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return d;
  const n = Number(args[i + 1]);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`--${name} must be a positive number`);
  return n;
};
const CAP = flag("cap", 1);
const PER = flag("per-stratum", 30);
const BATCH = flag("batch", 12); // production's CARDS_PER_REQUEST (src/lib/labels/plan.ts)
const MODELS = ["claude-haiku-5-5", "claude-sonnet-5-5"] as const;
const REFERENCE = "claude-sonnet-4-5";

type Card = { oracleId: string; name: string; mana_cost: string | null; type_line: string; oracle_text: string | null; layout: string };
type Run = {
  sample: { card: Card; stratum: string[]; stored: Job[] }[];
  models: Record<string, { replies: Record<string, Job[]>; rejected: string[]; usd: number; usage: { input: number; output: number }[]; failed: number }>;
};

const kindKey = (j: Job) => `${j.space}:${j.kind}`;
// FNV-1a, so the sample is the same on every run without a seeded RNG.
const hash = (s: string) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

async function loadSample(): Promise<Run["sample"]> {
  const db = await connectStaging();
  const rows = (await db.execute(sql`
    select cl.oracle_id as "oracleId", cl.labels, cl.model, cl.prompt_version as "promptVersion", cl.input_hash as "inputHash",
           c.name, c.mana_cost, c.type_line, c.oracle_text, c.layout
    from card_labels cl join cards c on c.oracle_id = cl.oracle_id
    where cl.model = ${REFERENCE}
  `)).rows as (Card & { labels: Job[]; model: string; promptVersion: string; inputHash: string })[];
  const fresh = rows.filter((r) => labelIsFresh(r, r));
  console.log(`staging: ${rows.length} rows by ${REFERENCE}, ${fresh.length} fresh`);
  const stored = (r: (typeof fresh)[number]) => (searchesOnlyLands(r.oracle_text) ? r.labels.filter((j) => j.kind !== "tutor") : r.labels);
  const isLand = (r: Card) => /\bLand\b/.test(r.type_line);
  const twoFaced = (r: Card) => ["transform", "modal_dfc", "reversible_card", "double_faced_token"].includes(r.layout);
  const strata: [string, (r: (typeof fresh)[number]) => boolean][] = [
    ...(["ramp", "draw", "removal", "wipes", "protection", "tutor"] as const).map((k): [string, (r: (typeof fresh)[number]) => boolean] =>
      [`nonland ${k}`, (r) => !isLand(r) && stored(r).some((j) => j.kind === k)]),
    ["land with a job", (r) => isLand(r) && stored(r).length > 0],
    ["empty label", (r) => stored(r).length === 0],
    ["two-faced", twoFaced],
    ["anything", () => true],
  ];
  const chosen = new Map<string, { card: Card; stratum: string[]; stored: Job[] }>();
  for (const [name, test] of strata) {
    const pool = fresh.filter(test).sort((a, b) => hash(`${name}${a.oracleId}`) - hash(`${name}${b.oracleId}`));
    let taken = 0;
    for (const r of pool) {
      if (taken >= PER) break;
      const hit = chosen.get(r.oracleId);
      if (hit) { hit.stratum.push(name); taken++; continue; }
      chosen.set(r.oracleId, { card: r, stratum: [name], stored: stored(r) });
      taken++;
    }
    console.log(`  ${name}: pool ${pool.length}`);
  }
  return [...chosen.values()];
}

const run: Run = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : { sample: await loadSample(), models: {} };
const save = () => writeFileSync(out, JSON.stringify(run));
console.log(`sample: ${run.sample.length} cards`);

const { ANTHROPIC_API_KEY } = requireEnv(["ANTHROPIC_API_KEY"]);
// `.env` points the base URL at a local proxy; real time /v1/messages is served, but the key goes straight to the API here.
const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY, baseURL: "https://api.anthropic.com" });
const spent = () => Object.values(run.models).reduce((n, m) => n + m.usd, 0);

for (const model of MODELS) {
  const m = (run.models[model] ??= { replies: {}, rejected: [], usd: 0, usage: [], failed: 0 });
  m.failed = 0; // counted per invocation: a resumed run retries what is missing and must not inherit the last run's tally
  const todo = run.sample.filter((s) => !(s.card.oracleId in m.replies));
  for (let i = 0; i < todo.length; i += BATCH) {
    const group = todo.slice(i, i + BATCH);
    const cards = group.map((g) => g.card);
    // Measured 2026-10-11: both candidates answer 400 "`temperature` is deprecated for this model", so
    // `acceptsTemperature` (prompt.ts) would need a branch for them. The eval drops it here and does not touch prompt.ts.
    const base: Record<string, unknown> = { ...buildRequest(`t-${i}`, model, cards).params };
    delete base.temperature;
    // Thinking off: Haiku 5.5 takes "disabled"; Sonnet 5.5 answers 400 and asks for "between_tools" instead.
    const thinking = model === "claude-sonnet-5-5" ? { type: "between_tools" as const } : { type: "disabled" as const };
    const req = { ...base, thinking, max_tokens: base.max_tokens as number };
    const approxIn = Math.ceil((SYSTEM_TOKENS_BOUND + renderBody(cards).length) / 3);
    const worst = worstCaseUsd(model, approxIn, req.max_tokens, { batch: false });
    if (spent() + worst > CAP) { console.log(`STOP ${model}: worst case $${worst.toFixed(3)} would cross the $${CAP} cap (spent $${spent().toFixed(3)})`); save(); process.exit(0); }
    let message;
    try {
      message = await client.messages.create(req as never, { timeout: 120_000 });
    } catch (e) {
      m.failed += group.length;
      console.log(`${model} batch ${i}: ${e instanceof Error ? e.message.slice(0, 200) : String(e)}`);
      save();
      if (m.failed >= 2 * BATCH) { console.log(`${model}: two failed batches, moving on`); break; }
      continue;
    }
    const usd = costUsd(model, message.usage as never, { batch: false });
    m.usd += usd;
    m.usage.push({ input: message.usage.input_tokens, output: message.usage.output_tokens });
    const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    const read = readReply(text, cards.map((c) => c.name));
    if (read === null) { m.failed += group.length; m.rejected.push(`batch ${i}: unreadable reply (stop ${message.stop_reason})`); }
    else {
      m.rejected.push(...read.rejected);
      for (const g of group) {
        const jobs = read.byName.get(g.card.name);
        if (jobs) m.replies[g.card.oracleId] = searchesOnlyLands(g.card.oracle_text) ? jobs.filter((j) => j.kind !== "tutor") : jobs;
        else m.failed++;
      }
    }
    console.log(`${model} ${Math.min(i + BATCH, todo.length)}/${todo.length}  $${usd.toFixed(4)}  (total $${spent().toFixed(3)})`);
    save();
  }
}

// ---- scoring ----
const LIMITS = ["rampKind", "restrictedTo", "trigger", "recurrence", "threshold", "modal", "affects", "to", "method"] as const;
const lim = (j: Job, f: (typeof LIMITS)[number]) =>
  f === "threshold" ? (j.threshold ? `${j.threshold.stat}${j.threshold.op}${j.threshold.value}` : "none") : String((j as Record<string, unknown>)[f] ?? "none");
const agree = (x: Job, y: Job) => LIMITS.filter((f) => lim(x, f) === lim(y, f)).length;
const pct = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1)}%` : "-");

for (const model of MODELS) {
  const m = run.models[model];
  if (!m) continue;
  const asked = run.sample.filter((s) => s.card.oracleId in m.replies);
  let sameSet = 0, sameAll = 0;
  const per = new Map<string, { stored: number; both: number; extra: number }>();
  const diffs: { name: string; stored: string; model: string }[] = [];
  for (const s of asked) {
    const a = s.stored, b = m.replies[s.card.oracleId];
    const ak = a.map(kindKey), bk = b.map(kindKey);
    const pool = [...bk];
    for (const k of ak) {
      const e = per.get(k) ?? { stored: 0, both: 0, extra: 0 };
      e.stored++;
      const at = pool.indexOf(k);
      if (at >= 0) { pool.splice(at, 1); e.both++; }
      per.set(k, e);
    }
    for (const k of pool) { const e = per.get(k) ?? { stored: 0, both: 0, extra: 0 }; e.extra++; per.set(k, e); }
    const setMatch = ak.length === bk.length && pool.length === 0;
    if (setMatch) sameSet++;
    let all = setMatch;
    const pairs = bestPairing(a, b, agree);
    for (const [x, y] of pairs) for (const f of LIMITS) if (lim(x, f) !== lim(y, f)) all = false;
    if (all) sameAll++;
    else diffs.push({ name: s.card.name, stored: `${ak.join(",") || "(none)"}`, model: `${bk.join(",") || "(none)"}` });
  }
  const tokens = m.usage.reduce((t, u) => ({ input: t.input + u.input, output: t.output + u.output }), { input: 0, output: 0 });
  console.log(`\n== ${model}: ${asked.length} cards compared, ${m.failed} failed, $${m.usd.toFixed(4)} (${tokens.input} in, ${tokens.output} out)`);
  console.log(`  same job set: ${sameSet} (${pct(sameSet, asked.length)})   same jobs and limits: ${sameAll} (${pct(sameAll, asked.length)})`);
  for (const [k, e] of [...per].sort((x, y) => y[1].stored - x[1].stored)) {
    console.log(`  ${k.padEnd(22)} stored ${String(e.stored).padStart(3)}  reproduced ${pct(e.both, e.stored).padStart(6)}  model-only ${e.extra}`);
  }
  // Role and theme jobs counted as a multiset per card, the same pairing as above: recall is the share of
  // stored jobs the model also returned, precision the share of its jobs the stored label also holds.
  let identicalRoles = 0;
  const tally = { role: { tp: 0, fn: 0, fp: 0 }, theme: { tp: 0, fn: 0, fp: 0 } };
  for (const s of asked) {
    const count = (jobs: Job[], space: string) => jobs.filter((j) => j.space === space).reduce((c, j) => c.set(j.kind, (c.get(j.kind) ?? 0) + 1), new Map<string, number>());
    let same = true;
    for (const space of ["role", "theme"] as const) {
      const a = count(s.stored, space), b = count(m.replies[s.card.oracleId], space);
      for (const k of new Set([...a.keys(), ...b.keys()])) {
        const x = a.get(k) ?? 0, y = b.get(k) ?? 0, both = Math.min(x, y);
        tally[space].tp += both; tally[space].fn += x - both; tally[space].fp += y - both;
        if (x !== y && space === "role") same = false;
      }
    }
    if (same) identicalRoles++;
  }
  console.log(`  role jobs identical on the card: ${identicalRoles} (${pct(identicalRoles, asked.length)})`);
  for (const space of ["role", "theme"] as const) {
    const t = tally[space];
    console.log(`  ${space} recall ${pct(t.tp, t.tp + t.fn)}  precision ${pct(t.tp, t.tp + t.fp)}`);
  }
  console.log(`  jobs the parser rejected: ${m.rejected.length}`);
  console.log(`  per 1,000 cards: standard $${((m.usd / Math.max(1, asked.length)) * 1000).toFixed(2)}, batch $${((m.usd / Math.max(1, asked.length)) * 500).toFixed(2)}`);
  writeFileSync(out.replace(/\.json$/, `-${model}-diffs.json`), JSON.stringify(diffs, null, 1));
}
process.exit(0);
