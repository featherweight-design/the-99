/**
 * `pnpm eval:tuning-v2-refund [--dry-run | --spend | --report]` — the refund and margin re-measure of Suggested changes v2
 * after #2527 (orchestrator queue 2026-11-02; Hugh pre-approved the spend, HARD $5). It repeats the 2026-10-30 small-N
 * study (`boards/sc-v2-cost-by-size-2026-10-30.md`, phase 3): HD - Elves, HD - Avatar Aang and HD - Gishath at N = 3, 5 and 8,
 * two runs each, 18 runs, driving `runV2` ITSELF as `tuning-v2.mts` does (the prompt, the calls, the refills, per-line
 * validation and the charge are the app's).
 *
 * STAGING, READ-ONLY. The decks are read through `openTuning` over `connectStaging`, whose pool sets
 * `default_transaction_read_only = on` and refuses to start unless the database is staging. `runV2` is pure: it writes
 * no run row and charges no credit, it only says whether the run would be `spent` or `refunded`.
 *
 * MODES. `--dry-run` is the DEFAULT: it prints the plan and its worst case from the fixture deck's prompt size and
 * touches no database and calls nothing. `--spend` is the only mode that calls the model. `--report` summarises the stored
 * rows: refund rate, spend and cost per credit kept, by N, and calls nothing.
 *
 * SPEND: a HARD $5 cap on its own ledger (`ledger-tuning-v2-refund.jsonl`), enforced here exactly as `tuning-v2.mts`
 * enforces its own: every call reserves its worst case BEFORE it is sent and settles to its meter after; a call whose worst
 * case would cross the cap is not sent, that run is not written, and the eval stops (exit 2).
 *
 * STORED: every run's calls, cost and charge, appended to `docs/superpowers/eval/tuning-v2-refund/rows.jsonl` as each run
 * ends; a re-run skips every run already written.
 */
import "../lib/env.mjs";

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { LEDGER_LIMITS } from "../../src/lib/eval/ledger-limits";
import { worstCaseMicroUsd } from "../../src/lib/model/prices";
import { buildPromptV2 } from "../../src/lib/tuning/prompt";
import { askFor, replyCeilingFor } from "../../src/lib/tuning/v2/count";
import type { V2CallModel, V2Report, V2Side, V2Stage } from "../../src/lib/tuning/v2/engine";
import { TUNING_MODEL } from "../../src/lib/tuning/limits";
import { REQUESTS as CM_REQUESTS } from "./count-mechanism.mjs";
import { acquireRunLock, readLedger, record, spent } from "./lib/ledger.mjs";

// Resolved from the repo root, not the cwd: a run from another directory would otherwise start an empty ledger and a fresh $5.
const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const LEDGER = join(ROOT, "docs/superpowers/eval/ledger-tuning-v2-refund.jsonl");
const CAP_USD = LEDGER_LIMITS["ledger-tuning-v2-refund.jsonl"].hardCapUsd;
const OUT = join(ROOT, "docs/superpowers/eval/tuning-v2-refund");
const ROWS = `${OUT}/rows.jsonl`;
/** P2's run budget for the deck page's 600s, less a margin for the writes. */
const BUDGET_MS = 590_000;

export const DECKS = ["HD - Elves", "HD - Avatar Aang", "HD - Gishath"] as const;
export const COUNTS = [3, 5, 8] as const;
export const REPS = 2;
/** The count-mechanism eval's requests for Aang and Gishath; Elves had none there, so it gets one of the same kind. */
const REQUESTS: Record<string, string> = {
  "HD - Elves": "More elves that make mana or draw cards, fewer that just sit on the board.",
  "HD - Avatar Aang": CM_REQUESTS["HD - Avatar Aang"],
  "HD - Gishath": CM_REQUESTS["HD - Gishath"],
};
export const PLAN = Array.from({ length: REPS }, (_, r) => COUNTS.flatMap((n) => DECKS.map((deck) => ({ deck, n, rep: r + 1 })))).flat();
const keyOf = (r: { deck: string; n: number; rep: number }) => `${r.deck}|${r.n}|${r.rep}`;

/** A conservative input ceiling with no API call: ~3 characters a token, plus a margin (`count-mechanism.mts`'s). */
// Priced as a cache write (`cacheWrite`, 1.25x input), the worst case: a call that reads nothing from the cache writes it.
const inputCeiling = (m: { system: string; cachedUser?: string; user: string }) => Math.ceil((m.system.length + (m.cachedUser?.length ?? 0) + m.user.length) / 3) + 4_500;
// A call that sends a cached prefix may write it, so it is reserved at the write rate; the why call sends none.
const worstUsd = (m: { system: string; cachedUser?: string; user: string }, maxTokens: number, model: string = TUNING_MODEL) => worstCaseMicroUsd(model, inputCeiling(m), maxTokens, { cacheWrite: m.cachedUser !== undefined }) / 1e6;

type StoredCall = { stage: V2Stage; ok: boolean; errorClass?: string; ms: number; usd: number; raw: unknown };
type Row = {
  account: string; deck: string; n: number; rep: number; request: string; ms: number;
  listIn: Record<V2Side, number | null>; firstLine: Record<V2Side, number | null>;
  kept: { add: number; cut: number }; target: { add: number; cut: number };
  drops: { add: string[]; cut: string[] };
  callCount: number; refilled: { add: boolean; cut: boolean }; cutsFailed: V2Report["cutsFailed"]; budgetReached: boolean;
  charge: V2Report["charge"]; usd: number; calls: StoredCall[];
};

const log = (line: string) => console.log(`[eval:tuning-v2-refund] ${line}`);

if (import.meta.url === `file://${process.argv[1]}`) {
  const { values: args } = parseArgs({ options: { "dry-run": { type: "boolean", default: false }, spend: { type: "boolean", default: false }, report: { type: "boolean", default: false } } });
  if (args.report) report();
  else if (args.spend && !args["dry-run"]) process.exit((await spendRun()) ? 2 : 0);
  else dryRun();
  process.exit(0);
}

/** The plan and its worst case, sized on the fixture deck (82 cards) with each deck's request. Nothing read or called. */
function dryRun() {
  const fixture = JSON.parse(readFileSync("scripts/fixtures/tuning-pack.json", "utf8"));
  const pack = { limits: { capCents: null, sets: [], ownedOnly: false }, ...fixture };
  const done = existsSync(ROWS) ? new Set(readFileSync(ROWS, "utf8").split("\n").filter(Boolean).map((l) => keyOf(JSON.parse(l)))) : new Set<string>();
  let total = 0;
  const perN = new Map<number, number>();
  for (const p of PLAN) {
    if (done.has(keyOf(p))) continue;
    const ask = askFor(p.n);
    const withRequest = { ...pack, notes: REQUESTS[p.deck] };
    const names = Array.from({ length: ask }, (_, i) => `Fixture Card Name ${i}`);
    // The four calls a run can make, each at its own ask (a refill at most the ask).
    const calls = [
      buildPromptV2(withRequest, { list: "additions", n: p.n, ask, aim: null }),
      buildPromptV2(withRequest, { list: "cuts", n: p.n, ask, aim: null, comingIn: names }),
      buildPromptV2(withRequest, { list: "additions", n: p.n, ask: p.n, aim: null, refill: { kept: names.slice(1), rejected: [{ card: "x", reason: "it is outside the commander's colors" }] } }),
      buildPromptV2(withRequest, { list: "cuts", n: p.n, ask: p.n, aim: null, comingIn: names, refill: { kept: names.slice(1), rejected: [{ card: "x", reason: "it is the commander" }] } }),
    ];
    const worst = calls.reduce((s, m) => s + worstUsd(m, replyCeilingFor(ask)), 0);
    perN.set(p.n, Math.max(perN.get(p.n) ?? 0, worst));
    total += worst;
  }
  log(`${PLAN.length} runs planned (N ${COUNTS.join(", ")} x ${DECKS.length} decks x ${REPS} reps), ${PLAN.length - done.size} not yet written`);
  for (const [n, w] of perN) log(`N=${n}: worst case $${w.toFixed(3)} a run (four calls, two attempts each, at the reply ceiling ${replyCeilingFor(askFor(n))})`);
  log(`plan worst case $${total.toFixed(2)}; the HARD cap is $${CAP_USD}, checked before EVERY call against its own worst case; spent so far $${spent(readLedger(LEDGER)).toFixed(2)}`);
  log("the prototype measured $0.04 to $0.10 a run (spec §9), so the plan is expected to settle well under the cap; a stop leaves the last reps unwritten");
  log("dry run: no database was read and nothing was called. Spend with --spend.");
}

async function spendRun() {
  const { openTuning } = await import("./lib/tuning-app.mjs");
  const { TUNING_VARIANTS } = await import("./variants/tuning.mjs");
  const app = await openTuning();
  const { callModel } = await import("../../src/lib/model/client");
  const { costMicroUsd } = await import("../../src/lib/model/prices");
  const { TUNING_EFFORT } = await import("../../src/lib/tuning/limits");
  const { runV2 } = await import("../../src/lib/tuning/v2/engine");
  const { nameResolver } = await import("../../src/lib/tuning/resolve-names");
  const { parseStrategyKey } = await import("../../src/lib/strategy/focus");
  const { cards } = await import("../../src/db/schema");
  const { db } = await import("../../src/db/index");
  const { sql } = await import("drizzle-orm");

  const idOf = new Map([...app.nameOf].map(([id, name]) => [name, id]));
  for (const d of DECKS) if (!idOf.has(d)) throw new Error(`eval: staging holds no deck named ${d} on the tuning account`);
  const focusRows = (await db.execute(sql`select id, strategy_focus from decks where user_id = ${app.userId}`)).rows as { id: string; strategy_focus: string | null }[];
  const focusOf = new Map(focusRows.flatMap((d) => { const k = parseStrategyKey(d.strategy_focus); return k ? [[d.id, k] as const] : []; }));
  const prepared = await app.prepare(DECKS.map((d) => idOf.get(d)!), TUNING_VARIANTS.base, null, focusOf);
  const packOf = new Map(prepared.map((p) => [p.deckId, p.pack]));
  // `prepare` builds every pack with NO limits (as the 10-30 study did, so the two stay comparable), whatever the deck stores.
  // Say what each deck stores, so the refund rate is read as "unrestricted": a restriction refund cannot fire here.
  const { tuningInputs } = await import("../../src/lib/decks/tuning-read");
  for (const d of DECKS) {
    const inputs = await tuningInputs(idOf.get(d)!, app.userId, app.flags);
    log(`${d}: stored limits ${JSON.stringify(inputs?.limits ?? null)} (not applied here), locked ${JSON.stringify(inputs?.locked ?? null)}`);
  }
  // Every card, once, as `tuning-v2.mts` reads the catalog: the engine's own validation applies each deck's limits.
  const catalog = (await db.select({ oracleId: cards.oracleId, name: cards.name, colorIdentity: cards.colorIdentity, commanderLegal: cards.commanderLegal }).from(cards))
    .map((r) => ({ ...r, priceCents: null, printedInSelectedSets: true, owned: false }));

  // Function scope: read after the loop for the exit status. (Inside the loop, the read after it resolved to the DOM lib's
  // global `stop`, so typecheck passed while Node threw a ReferenceError.)
  let stopped: string | null = null;
  acquireRunLock(LEDGER);
  mkdirSync(OUT, { recursive: true });
  const done = new Set(existsSync(ROWS) ? readFileSync(ROWS, "utf8").split("\n").filter(Boolean).map((l) => keyOf(JSON.parse(l))) : []);

  for (const p of PLAN) {
    if (done.has(keyOf(p))) continue;
    const pack = packOf.get(idOf.get(p.deck)!)!;
    const label = `${p.deck.replace(/\W+/g, "-")}-${p.n}-r${p.rep}`;
    const stored: StoredCall[] = [];
    let stop: string | null = null;
    // The engine's transport, over the app's one client; the ledger reserves before and settles after each call.
    const realCall: V2CallModel = (req) => {
      const worst = worstUsd(req, req.maxTokens, req.model ?? TUNING_MODEL);
      const now = spent(readLedger(LEDGER));
      if (stop !== null || now + worst > CAP_USD) {
        stop ??= `STOP before ${label} ${req.stage}: worst case $${worst.toFixed(3)} would cross the $${CAP_USD} cap (spent $${now.toFixed(3)})`;
        return { deltas: (async function* () {})(), outcome: Promise.resolve({ ok: false as const, errorClass: "upstream_rejected" as const }) };
      }
      const id = `${Date.now()}-${label}-${req.stage}`;
      record(LEDGER, { at: new Date().toISOString(), runId: id, source: "pending", usd: worst, requests: 1, pending: id, note: `${label} ${req.stage}` });
      const t = Date.now();
      let failedAttempts = 0;
      // Each call's own model and effort, with run.ts's defaults: the why stage runs at low effort in production.
      const model = req.model ?? TUNING_MODEL;
      const settled = callModel({ model, system: req.system, cachedUser: req.cachedUser, user: req.user, maxTokens: req.maxTokens, schema: req.schema, deadlineMs: req.deadlineMs, effort: req.effort ?? TUNING_EFFORT, stream: true },
        { log: (line) => { if (/^\[model\] (malformed|upstream)/.test(line)) failedAttempts++; console.error(line); } })
        .then((o) => {
          // A call with a failed attempt settles at its worst case: its meter may not cover every attempt (`count-mechanism.mts`).
          const usd = o.ok && failedAttempts === 0 ? (o.usage ? costMicroUsd(model, o.usage) / 1e6 : 0) : worst;
          record(LEDGER, { at: new Date().toISOString(), runId: `tuning-v2-refund-${label}`, source: "realtime:1", usd, requests: 1, settles: id, note: `${label} ${req.stage}` });
          stored.push({ stage: req.stage, ok: o.ok, ...(o.ok ? {} : { errorClass: o.errorClass }), ms: Date.now() - t, usd, raw: o.ok ? o.value : null });
          return o;
        });
      return {
        deltas: (async function* () { const o = await settled; if (o.ok) yield JSON.stringify(o.value); })(),
        outcome: settled.then((o) => (o.ok ? { ok: true as const, usage: o.usage } : { ok: false as const, errorClass: o.errorClass, usage: o.usage })),
      };
    };

    const start = Date.now();
    const listIn: Row["listIn"] = { add: null, cut: null };
    const firstLine: Row["firstLine"] = { add: null, cut: null };
    const report = await runV2({
      callModel: realCall, pack, n: p.n, request: REQUESTS[p.deck], aim: null,
      resolveName: nameResolver(catalog, new Set(pack.cards.map((c) => c.oracleId))),
      budgetMs: BUDGET_MS,
      onLine: (side) => { firstLine[side] ??= Date.now() - start; },
      onListIn: (side) => { listIn[side] = Date.now() - start; },
    });
    if (stop) {
      stopped = stop;
      log(stop);
      break;
    }
    const row: Row = {
      account: app.userId.slice(-6), deck: p.deck, n: p.n, rep: p.rep, request: REQUESTS[p.deck], ms: Date.now() - start, listIn, firstLine,
      kept: { add: report.additions.kept.length, cut: report.cuts.kept.length },
      target: { add: report.additions.target, cut: report.cuts.target },
      drops: { add: report.additions.drops.map((d) => d.rule), cut: report.cuts.drops.map((d) => d.rule) },
      callCount: report.callCount, refilled: { add: report.additions.refilled, cut: report.cuts.refilled },
      cutsFailed: report.cutsFailed, budgetReached: report.budgetReached, charge: report.charge,
      usd: stored.reduce((s, c) => s + c.usd, 0), calls: stored,
    };
    appendFileSync(ROWS, `${JSON.stringify(row)}\n`);
    log(`${label}: ${row.kept.add}/${p.n} in, ${row.kept.cut}/${row.target.cut} out, ${row.callCount} calls, ${(row.ms / 1000).toFixed(0)}s, $${row.usd.toFixed(3)}, ${report.charge.outcome}; ledger $${spent(readLedger(LEDGER)).toFixed(2)}`);
  }
  log(`done; ledger $${spent(readLedger(LEDGER)).toFixed(2)} of $${CAP_USD}. Summarise with --report.`);
  // A cap stop exits 2, so a wrapper can tell a stopped run from a finished one.
  return stopped !== null;
}


/** Refund rate, spend and cost per credit kept, by N and in all, from the stored rows. Calls nothing. */
function report() {
  if (!existsSync(ROWS)) return log(`no rows at ${ROWS}; nothing to report`);
  const rows = readFileSync(ROWS, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Row);
  const line = (label: string, rs: Row[]) => {
    if (rs.length === 0) return log(`${label}: no runs stored`);
    const refunded = rs.filter((r) => r.charge.outcome === "refunded");
    const kept = rs.length - refunded.length;
    const usd = rs.reduce((s, r) => s + r.usd, 0);
    const why = [...new Set(refunded.map((r) => (r.charge as { why: string }).why))].join("/") || "none";
    log(`${label}: ${rs.length} runs, ${refunded.length} refunded (${((100 * refunded.length) / rs.length).toFixed(0)}%, ${why}), spend $${usd.toFixed(3)}, $${(usd / rs.length).toFixed(3)} a run, ${kept === 0 ? "no credit kept" : `$${(usd / kept).toFixed(3)} per credit kept`}`);
  };
  for (const n of COUNTS) line(`N=${n}`, rows.filter((r) => r.n === n));
  for (const d of DECKS) line(d, rows.filter((r) => r.deck === d));
  line("all", rows);
  // Rows hold only finished runs; a run stopped at the cap spent into the ledger without a row, so the true total is the ledger's.
  log(`TOTAL SPEND from the ledger: $${spent(readLedger(LEDGER)).toFixed(3)} of the $${CAP_USD} cap (rows alone: $${rows.reduce((t, r) => t + r.usd, 0).toFixed(3)})`);
  log("a credit sells for $0.125 in a pack ($5 for 40) and about $0.083 on the plan ($5 for 60); a refunded run still costs its model spend");
}
