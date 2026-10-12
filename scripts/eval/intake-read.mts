/**
 * The Help me choose read's eval (rework plan PR 2). Runs the read's two steps, live, over the brief's
 * fixtures against STAGING, READ-ONLY, and reports what each press cost and what it chose.
 *
 *   pnpm eval:intake-read [--only askA,askB] [--arms haiku,haiku-medium,sonnet] [--budget 0.50] [--no-warm] [--dry-run]
 *
 * WHY IT DOES NOT CALL `runTheRead`. The runner reserves a credit and writes the read's row; staging
 * is measured, never written (AGENTS.md). So this calls the same pieces the runner calls, in its
 * order: `loadTheReadInputs`, `shortlistPrefix` and `shortlistRequest`, `validShortlist`,
 * `loadJudgeCandidates`, `judgeRequest`, `validJudgement`. A change to the runner's order is a change
 * here too.
 *
 * ARMS. Step 1 on claude-haiku-5-5 at low and at medium (what ships, `READ_SHORTLIST_EFFORT`) and on
 * claude-sonnet-5-5 at low, over the same asks; step 2 is always the shipped judgement. `haiku` and
 * `sonnet` run by default, `haiku-medium` when named with `--arms`; the Sonnet arm runs the
 * unfiltered asks only, where the whole list is read and the models differ most.
 *
 * COLD AND WARM. Each arm's first unfiltered press writes the list's cache; an immediate repeat of
 * that step 1 reads it. Both are reported, because which one a real press pays depends on how
 * recently anyone pressed.
 *
 * SPEND. Every call reserves its worst case on the ledger BEFORE it is sent and settles to its
 * measured cost after; the run stops before a call that could cross the $5 cap
 * (`ledger-help-me-choose.jsonl`).
 *
 * NO GOLD LIST EXISTS for what fits a tone, so recall is not scored against one. What is recorded:
 * each arm's shortlist and picks, with their reasons, for the READINESS assertions and for the arms'
 * agreement, which the metrics write-up computes from these answers.
 *
 * `noDecks` hides Hugh's decks from the read; it is not an account with no decks (his pool and his
 * ownership figures are unchanged).
 */
import "../lib/env.mjs";
import { writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { LEDGER_LIMITS } from "../../src/lib/eval/ledger-limits";
import { acquireRunLock, readLedger, record, spent } from "./lib/ledger.mjs";

const LEDGER = "docs/superpowers/eval/ledger-help-me-choose.jsonl";
const CAP_USD = LEDGER_LIMITS["ledger-help-me-choose.jsonl"].hardCapUsd;
const HUGH = "user_3GkZrrTwOJBdqUpq6GambP0BC8w";

const { values: args } = parseArgs({ options: {
  only: { type: "string" }, arms: { type: "string" }, "dry-run": { type: "boolean", default: false },
  // A cap on this run alone, under the ledger's: the run stops before a call that could cross it.
  budget: { type: "string" },
  // Skip the immediate warm repeat of step 1, which measures cost and chooses nothing.
  "no-warm": { type: "boolean", default: false },
} });

const { connectStaging } = await import("./lib/staging.mjs");
await connectStaging();
const { callModel } = await import("../../src/lib/model/client");
const { costMicroUsd, worstCaseMicroUsd } = await import("../../src/lib/model/prices");
const lim = await import("../../src/lib/intake/limits");
const run = await import("../../src/lib/intake/the-read-run");
const read = await import("../../src/lib/intake/the-read");
type Filters = import("../../src/lib/intake/the-read").ReadFilters;

const none: Filters = { colors: [], match: "contains", themes: [], budgetDollars: null, bracket: null };
type Fixture = { id: string; words: string; filters: Filters; noDecks?: boolean; theme?: string; unfiltered: boolean };
const FIXTURES: Fixture[] = [
  { id: "askA", words: "a horrors deck that's scary and a little nasty", filters: none, theme: "horrors", unfiltered: true },
  { id: "askB", words: "a Landfall deck unlike other decks I own", filters: none, theme: "landfall", unfiltered: true },
  { id: "askA-black", words: "a horrors deck that's scary and a little nasty", filters: { ...none, colors: ["B"], match: "exactly" }, theme: "horrors", unfiltered: false },
  // The app has no colorless filter (an empty selection admits every identity), so nothing fits is
  // asked where the words want what the pool all but lacks: Dinosaurs in mono-blue, where staging's
  // index holds one commander a Dinosaur theme or type backs out of 308. Expect one pick at most.
  { id: "nothing", words: "a Dinosaurs stampede deck full of huge dinos", filters: { ...none, colors: ["U"], match: "exactly" }, unfiltered: false },
  { id: "noDecks", words: "a Landfall deck unlike other decks I own", filters: none, noDecks: true, theme: "landfall", unfiltered: true },
  { id: "card", words: "a deck built around Doubling Season", filters: none, unfiltered: true },
];
const ARMS: { id: string; model: string; effort: "low" | "medium" | "high" }[] = [
  { id: "haiku", model: lim.READ_SHORTLIST_MODEL, effort: "low" },
  { id: "haiku-medium", model: lim.READ_SHORTLIST_MODEL, effort: "medium" },
  { id: "sonnet", model: lim.READ_JUDGE_MODEL, effort: "low" },
];

const only = args.only?.split(",");
const arms = ARMS.filter((a) => (args.arms ? args.arms.split(",").includes(a.id) : a.id !== "haiku-medium"));
if (!args["dry-run"]) acquireRunLock(LEDGER);
const budget = args.budget === undefined ? null : Number(args.budget);
// A budget that is not a plain positive number would make every cap check compare against NaN.
if (budget !== null && !(Number.isFinite(budget) && budget > 0)) throw new Error(`--budget must be a positive number of dollars, got ${args.budget}`);
const runCap = budget === null ? CAP_USD : Math.min(CAP_USD, spent(readLedger(LEDGER)) + budget);

type Step = { model: string; ms: number; usd: number; usage: unknown; ok: boolean; stop?: string | null };
const out: Record<string, unknown>[] = [];

/** One call, reserved on the ledger at its worst case first, settled to its measured cost after. */
async function call<T>(label: string, model: string, req: Parameters<typeof callModel<T>>[0], inputCeiling: number, cacheWrite: boolean) {
  const worst = worstCaseMicroUsd(model, inputCeiling, req.maxTokens, { cacheWrite }) / 1e6;
  if (spent(readLedger(LEDGER)) + worst > runCap) throw new Error(`STOP before ${label}: worst case $${worst.toFixed(3)} would cross the $${runCap.toFixed(2)} cap (spent $${spent(readLedger(LEDGER)).toFixed(3)})`);
  const id = `${Date.now()}-${label}`;
  record(LEDGER, { at: new Date().toISOString(), runId: id, source: "pending", usd: worst, requests: 1, pending: id, note: label });
  let stop: string | null = null;
  const t = Date.now();
  const o = await callModel({ ...req, onResponse: (m) => { stop = m.stopReason; } });
  const ms = Date.now() - t;
  const usd = o.usage ? costMicroUsd(model, o.usage) / 1e6 : 0;
  record(LEDGER, { at: new Date().toISOString(), runId: `intake-read-${label}`, source: "realtime:1", usd, requests: 1, settles: id, note: label });
  const step: Step = { model, ms, usd, usage: o.usage ?? null, ok: o.ok, stop };
  return { o, step };
}

for (const arm of arms) {
  let warmDone = false;
  for (const f of FIXTURES) {
    if (only && !only.includes(f.id)) continue;
    if (arm.id === "sonnet" && !f.unfiltered) continue;
    const inputs = await run.loadTheReadInputs(HUGH, f.words, f.filters);
    if (f.noDecks) inputs.decks = [];
    const system = run.shortlistPrefix(inputs);
    const user = read.shortlistRequest({ words: f.words, filters: f.filters, cards: inputs.cards });
    const base = { fixture: f.id, arm: arm.id, pool: inputs.pool.size, narrowed: inputs.narrowed, cards: inputs.cards.map((c) => c.name) };
    if (args["dry-run"]) { console.log(JSON.stringify({ ...base, systemChars: system.length })); continue; }
    // As the runner does: an empty pool finds nothing with no call at all.
    if (inputs.pool.size === 0) { out.push({ ...base, picks: [], steps: {} }); console.log(`${arm.id} ${f.id}: empty pool, no call`); continue; }
    const shortReq = {
      model: arm.model, system, user, cacheSystem: !inputs.narrowed, maxTokens: lim.READ_SHORTLIST_MAX_TOKENS, effort: arm.effort,
      schema: read.shortlistSchema, deadlineMs: lim.READ_SHORTLIST_DEADLINE_MS * 2,
    };
    const s1 = await call(`${arm.id}-${f.id}-shortlist`, arm.model, shortReq, 175_000, true);
    const steps: Record<string, Step> = { shortlist: s1.step };
    // Warm: the same step 1 again at once, which reads the cache the first wrote.
    if (f.unfiltered && !warmDone && !args["no-warm"]) {
      steps.shortlistWarm = (await call(`${arm.id}-${f.id}-shortlist-warm`, arm.model, shortReq, 175_000, true)).step;
      warmDone = true;
    }
    if (!s1.o.ok) { out.push({ ...base, steps, error: s1.o.errorClass }); console.log(`${arm.id} ${f.id}: shortlist failed (${s1.o.errorClass})`); continue; }
    const shortlist = read.validShortlist(s1.o.value, inputs.pool);
    const dropped = s1.o.value.keys.length - shortlist.length;
    let result = { picks: [] as { oracleId: string; reason: unknown[] }[] };
    let refused = 0;
    if (shortlist.length > 0) {
      const candidates = await run.loadJudgeCandidates(HUGH, shortlist, inputs.list);
      const judgeUser = read.judgeRequest({ words: f.words, filters: f.filters, decks: inputs.decks, cards: inputs.cards, candidates });
      const s2 = await call(`${arm.id}-${f.id}-judge`, lim.READ_JUDGE_MODEL, {
        model: lim.READ_JUDGE_MODEL, system: read.JUDGE_SYSTEM, user: judgeUser, stream: true, maxTokens: lim.READ_JUDGE_MAX_TOKENS,
        effort: lim.READ_JUDGE_EFFORT, schema: read.judgeSchema, deadlineMs: lim.READ_TOTAL_DEADLINE_MS,
      }, 30_000, false);
      steps.judge = s2.step;
      if (s2.o.ok) {
        const nameOf = new Map(candidates.map((c) => [c.key, c.name]));
        result = read.validJudgement({ reply: s2.o.value, shortlist, idOf: inputs.list.idOf, decks: inputs.decks, nameOf });
        refused = s2.o.value.picks.length - result.picks.length;
        steps.judgeRaw = s2.o.value as never;
      }
    }
    const names = new Map([...inputs.list.text.split("\n")].map((l) => { const [k, n] = l.split("|"); return [inputs.list.idOf.get(Number(k)), n]; }));
    const deckIds = new Set(inputs.decks.map((d) => d.commanderOracleId));
    const record1 = {
      ...base, shortlist: shortlist.map((k) => names.get(inputs.list.idOf.get(k))), droppedOutsidePool: dropped, refusedReasons: refused,
      picks: result.picks.map((p) => ({ name: names.get(p.oracleId), reason: p.reason })),
      decksNamed: result.picks.flatMap((p) => p.reason.flatMap((r) => ("deck" in (r as object) ? [names.get((r as { deck: string }).deck) ?? (r as { deck: string }).deck] : []))),
      decksNamedValid: result.picks.every((p) => p.reason.every((r) => !("deck" in (r as object)) || deckIds.has((r as { deck: string }).deck))),
      steps,
      pressUsd: Object.entries(steps).filter(([k]) => k !== "shortlistWarm" && k !== "judgeRaw").reduce((n, [, s]) => n + (s as Step).usd, 0),
    };
    out.push(record1);
    console.log(`${arm.id} ${f.id}: pool ${inputs.pool.size}, shortlist ${shortlist.length} (${dropped} dropped), picks ${result.picks.length} (${refused} refused), press $${record1.pressUsd.toFixed(4)}`);
  }
}
if (!args["dry-run"]) {
  const file = `docs/superpowers/eval/answers/intake-read-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`;
  writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`wrote ${file}; ledger spent $${spent(readLedger(LEDGER)).toFixed(3)} of $${CAP_USD}`);
}
process.exit(0);
