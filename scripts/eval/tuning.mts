/**
 * `pnpm eval:tuning` — runs deck tuning's REAL prompt and REAL accept contract over Hugh's staging
 * decks, per model cell and prompt variant, and writes one row per answer.
 *
 *   pnpm eval:tuning --cells sonnet,sonnet-low,haiku --set heldOut --trials 3 [--variant trim]
 *                    [--overlay] [--realtime] [--dry-run] [--plan-done 0.2] [--label sweep]
 *
 * Plan: docs/superpowers/plans/2026-09-23-eval-harness.md. Every piece of the app it touches is
 * imported, never restated: `tuningInputs`, `loadDeckProfileFromHead`, `readOwnedOracleIds`,
 * `buildPlayGroup`, `buildEvidencePack`, `buildPrompt`, `tuningResponseSchema`, `nameResolver`
 * and `validateSuggestions`. The request is built by `buildParams`, which `request.test.mts` pins
 * to what `callModel` sends.
 *
 * Staging is read-only (`connectStaging`), results go to `docs/superpowers/eval/runs/<run>/`, and
 * no batch is sent whose worst case could cross the ledger's cap.
 *
 * Every `src/` import is DYNAMIC and comes after `connectStaging`: `src/db` reads DATABASE_URL
 * when it is first imported, and a static import would bind it to `.env`'s local-dev first. If
 * one ever does, the branch check refuses to start, so the failure is loud.
 */
import "../lib/env.mjs";

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { parseArgs } from "node:util";

import { sendBatch, sendRealtime, countTokens, type Got, type Sent } from "./lib/batch.mjs";
import { readLedger, record, refusal, spent } from "./lib/ledger.mjs";
import { costUsd, worstCaseUsd, type Usage } from "./lib/pricing.mjs";
import { buildParams, parseReply, type Cell } from "./lib/request.mjs";
import { openTuning, type OverlayDeck } from "./lib/tuning-app.mjs";
import { TUNING_VARIANTS } from "./variants/tuning.mjs";

const ROOT = new URL("../../docs/superpowers/eval/", import.meta.url);
const LEDGER = new URL("ledger.jsonl", ROOT).pathname;

const { values: args } = parseArgs({
  options: {
    cells: { type: "string", default: "sonnet,haiku" },
    set: { type: "string", default: "heldOut" },
    decks: { type: "string" },
    trials: { type: "string", default: "1" },
    variant: { type: "string", default: "base" },
    overlay: { type: "boolean", default: false },
    realtime: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    "plan-done": { type: "string", default: "0" },
    label: { type: "string", default: "run" },
  },
});

const log = (line: string) => console.log(`[eval:tuning] ${line}`);

const app = await openTuning();
const { split, nameOf } = app;
const tuningResponseSchema = app.schema;
const TUNING_MAX_TOKENS = app.maxTokens;
const PROMPT_VERSION = app.promptVersion;
type TuningResponse = import("../../src/lib/tuning/response-schema").TuningResponse;

/** The model cells. A `+cache` suffix adds the cache markers; `@maxN` overrides the ceiling. */
const CELLS: Record<string, Omit<Cell, "id">> = {
  sonnet: { model: app.model },
  "sonnet-low": { model: app.model, effort: "low" },
  haiku: { model: "claude-haiku-4-5" },
};

function parseCell(spec: string): Cell {
  const m = /^([a-z-]+)(\+cache)?(?:@max(\d+))?$/.exec(spec);
  const base = m && CELLS[m[1]];
  if (!m || !base) throw new Error(`eval: unknown cell ${spec}; known: ${Object.keys(CELLS).join(", ")}`);
  return { id: spec, ...base, cache: m[2] ? true : undefined, maxTokens: m[3] ? Number(m[3]) : undefined };
}

// ---- The rated set, prepared by the app's own path ------------------------------------------

const setIds = args.decks
  ? args.decks.split(",")
  : args.overlay ? (args.set === "dev" ? split.dev : split.overlay) : args.set === "dev" ? split.dev : args.set === "all" ? [...split.dev, ...split.heldOut] : split.heldOut;
const cells = args.cells!.split(",").map(parseCell);
const variant = TUNING_VARIANTS[args.variant!];
if (!variant) throw new Error(`eval: unknown variant ${args.variant}; known: ${Object.keys(TUNING_VARIANTS).join(", ")}`);
const trials = Number(args.trials);
const overlay = args.overlay
  ? (JSON.parse(readFileSync(new URL("fixtures/evidence-overlay.json", import.meta.url), "utf8")) as { decks: OverlayDeck[] }).decks
  : null;

const prepared = await app.prepare(setIds, variant, overlay);
type Prepared = (typeof prepared)[number];
log(`prepared ${prepared.length} decks (${args.overlay ? "overlay" : args.set}), variant ${variant.id}, prompt v${PROMPT_VERSION}`);

// ---- Requests, and the budget guard --------------------------------------------------------

type Key = { cell: Cell; deck: Prepared; trial: number };
const keys = new Map<string, Key>();
const first: Sent[] = [];
for (const cell of cells) {
  for (const [d, deck] of prepared.entries()) {
    for (let trial = 0; trial < trials; trial++) {
      const customId = `${cell.id.replace(/[^a-zA-Z0-9-]/g, "_")}-d${d}-t${trial}`;
      keys.set(customId, { cell, deck, trial });
      first.push({ customId, params: buildParams({ model: cell.model, system: deck.system, user: deck.user, maxTokens: TUNING_MAX_TOKENS, schema: tuningResponseSchema }, cell) });
    }
  }
}

const counted = new Map<string, number>();
async function inputTokens(s: Sent): Promise<number> {
  const h = createHash("sha256").update(JSON.stringify(s.params)).digest("hex");
  if (!counted.has(h)) counted.set(h, await countTokens(s.params));
  return counted.get(h)!;
}
let worst = 0;
let inputSum = 0;
for (const s of first) {
  const n = await inputTokens(s);
  inputSum += n;
  worst += worstCaseUsd(s.params.model, n, s.params.max_tokens, { batch: !args.realtime });
}
const ledger = readLedger(LEDGER);
log(`${first.length} requests, ${inputSum} input tokens; worst case $${worst.toFixed(2)}; spent so far $${spent(ledger).toFixed(2)}`);
if (args["dry-run"]) process.exit(0);
const stop = refusal(ledger, worst, Number(args["plan-done"]));
if (stop) {
  log(`NOT SENT: ${stop}`);
  process.exit(2);
}

// ---- Sending, with the app's one retry -----------------------------------------------------

const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-tuning-${args.label}`;
const dir = new URL(`runs/${runId}/`, ROOT);
mkdirSync(dir, { recursive: true });
const sha = execSync("git rev-parse --short HEAD").toString().trim();
writeFileSync(new URL("meta.json", dir), `${JSON.stringify({ runId, sha, args, split, promptVersion: PROMPT_VERSION, variant: { id: variant.id, reason: variant.reason }, decks: prepared.map((p) => ({ deckId: p.deckId, name: nameOf.get(p.deckId) })) }, null, 2)}\n`);

/** The model a request NAMED. The reply's `model` is a dated id (`claude-haiku-4-5-20251001`),
 *  so every price is looked up by what was asked for, which is also what the cell reports. */
const modelOf = new Map<string, string>();

// Every pack exactly as the model was shown it, so a run can be re-scored without re-reading a
// staging deck that may have changed since.
writeFileSync(new URL("prepared.json", dir), `${JSON.stringify(prepared)}\n`);

async function send(batch: Sent[], pass: string): Promise<Got[]> {
  if (batch.length === 0) return [];
  for (const s of batch) modelOf.set(s.customId, s.params.model);
  let got: Got[];
  let source: string;
  if (args.realtime) {
    got = await sendRealtime(batch, log);
    source = `realtime:${batch.length}`;
  } else {
    const r = await sendBatch(batch, log);
    got = r.results;
    source = r.batchId;
  }
  // Raw results reach disk BEFORE anything prices or parses them: a throw after this point loses
  // no answer that was paid for.
  appendFileSync(new URL(`raw-${pass}.jsonl`, dir), got.map((g) => JSON.stringify(g)).join("\n") + "\n");
  const usd = got.reduce((n, g) => n + (g.ok ? costUsd(modelOf.get(g.customId)!, g.message.usage as Usage, { batch: !args.realtime }) : 0), 0);
  const after = record(LEDGER, { at: new Date().toISOString(), runId: `${runId}/${pass}`, source, usd, requests: batch.length });
  log(`${pass}: ${batch.length} answers, $${usd.toFixed(4)}; ledger total $${spent(after).toFixed(2)}`);
  return got;
}

const attempts = new Map<string, Got[]>();
for (const g of await send(first, "a1")) attempts.set(g.customId, [g]);
// `callModel` retries once on a malformed reply or an upstream failure, never on a timeout.
const retry = first.filter((s) => {
  const g = attempts.get(s.customId)?.[0];
  return !g || !g.ok || !parseReply(tuningResponseSchema, g.message).ok;
});
if (retry.length > 0) {
  const stop2 = refusal(readLedger(LEDGER), 0, Number(args["plan-done"]));
  if (stop2) log(`retry pass NOT SENT: ${stop2}`);
  else for (const g of await send(retry.map((s) => ({ ...s, customId: `${s.customId}-r` })), "a2")) {
    attempts.get(g.customId.replace(/-r$/, ""))?.push(g);
  }
}

// ---- Scoring against the real accept contract -------------------------------------------

const answers: { key: Key; customId: string; attempts: Got[]; value: TuningResponse | null; malformed: string | null }[] = [];
for (const [customId, key] of keys) {
  const tries = attempts.get(customId) ?? [];
  let value: TuningResponse | null = null;
  let malformed: string | null = "no reply";
  for (const t of tries) {
    if (!t.ok) { malformed = `upstream: ${t.reason}`; continue; }
    const p = parseReply(tuningResponseSchema, t.message);
    if (p.ok) { value = p.value; malformed = null; break; }
    malformed = p.reason;
  }
  answers.push({ key, customId, attempts: tries, value, malformed });
}

const parsed = answers.filter((a) => a.value !== null);
const scores = new Map(parsed.map((a, i) => [a.customId, i]));
const scored_ = await app.score(parsed.map((a) => ({ pack: a.key.deck.pack, value: a.value! })));

const out = new URL("rows.jsonl", dir);
for (const a of answers) {
  const { cell, deck, trial } = a.key;
  const usage = a.attempts.flatMap((t) => (t.ok ? [t.message.usage as Usage] : []));
  const usdAsRun = a.attempts.reduce((n, t) => n + (t.ok ? costUsd(cell.model, t.message.usage as Usage, { batch: !args.realtime }) : 0), 0);
  const usdRealtime = a.attempts.reduce((n, t) => n + (t.ok ? costUsd(cell.model, t.message.usage as Usage, { batch: false }) : 0), 0);
  let scored: Record<string, unknown> = { outcome: a.malformed?.startsWith("upstream") ? "upstream_busy" : "malformed", malformed: a.malformed };
  if (a.value) scored = scored_[scores.get(a.customId)!];
  appendFileSync(out, `${JSON.stringify({
    runId, feature: "tuning", cell: cell.id, model: cell.model, variant: variant.id,
    set: args.overlay ? (args.set === "dev" ? "dev-overlay" : "overlay") : args.decks ? "custom" : args.set, deckId: deck.deckId, trial,
    attempts: a.attempts.length, usage, usdAsRun, usdRealtime, ...scored,
    // Real-time runs only: seconds from request to final token, per attempt.
    latencyMs: a.attempts.flatMap((t) => (t.ok && t.elapsedMs !== undefined ? [t.elapsedMs] : [])),
    reply: a.value,
  })}\n`);
}
log(`wrote ${answers.length} rows to ${out.pathname}`);
process.exit(0);
