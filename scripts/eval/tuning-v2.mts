/**
 * `pnpm eval:tuning-v2 [--dry-run | --spend | --score]` — M1, the instrument for Suggested changes v2's real engine (plan
 * 2026-10-27, PR 2 and M1). It drives `runV2` ITSELF (`src/lib/tuning/v2/engine.ts`), not a copy: the prompt, the two
 * calls, the parallel cut call (H2), the refills, per-line validation (H1) and the charge are the app's.
 *
 * PLAN: N in {3, 10, 20} x three decks x three reps = 27 runs, rep-major so a stop at the cap costs the last reps.
 * The decks and their requests are the count-mechanism eval's (`count-mechanism.mts`'s REQUESTS): Mutant Menace (the gut
 * case), Goblins (a focus) and Avatar Aang (an intent). No bracket choice: `aim` is null, so no `bracketAfter` is read.
 *
 * MODES. `--dry-run` is the DEFAULT: it prints the plan and its worst case from the fixture deck's prompt size, and
 * touches no database and calls nothing. `--spend` is the only mode that calls the model, on the count-mechanism scratch
 * branch (`COUNT_EVAL_DB_URL`, `COUNT_EVAL_BRANCH`, `scratch.mts`) and its seeded decks (`count-mechanism-seed.mts`),
 * which it only reads. `--score` re-scores the stored replies (Q9, spec §6.2) and calls nothing.
 *
 * SPEND: a HARD $4 cap on its own ledger (`ledger-tuning-v2.jsonl`), enforced here: every call reserves its worst case on
 * the ledger BEFORE it is sent (both attempts, the whole input ceiling, the reply at its ceiling) and settles to its meter
 * after; a call whose worst case would cross the cap is not sent, that run is not written, and the eval stops. Parallel
 * calls each reserve before either is sent, so two in flight cannot pass the check against the same total.
 *
 * STORED: every call's raw reply, its stage, timing and cost, and each run's list arrival times, appended to
 * `docs/superpowers/eval/tuning-v2/rows.jsonl` as each run ends; a re-run skips every run already written. The reply is
 * read through `client.ts`'s `callModel` (streamed, final message only), so it reaches the engine as one delta: per-line
 * arrival is measured once PR 3 adapts the client to stream text deltas (`V2CallModel`).
 */
import "../lib/env.mjs";

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { LEDGER_LIMITS } from "../../src/lib/eval/ledger-limits";
import { worstCaseMicroUsd } from "../../src/lib/model/prices";
import { buildPromptV2 } from "../../src/lib/tuning/prompt";
import { presentationFailures } from "../../src/lib/tuning/presentation";
import { playerTextBody } from "../../src/lib/model/player-text";
import { noteDate } from "../../src/lib/tuning/note-date";
import { askFor, replyCeilingFor } from "../../src/lib/tuning/v2/count";
import type { V2CallModel, V2Report, V2Side, V2Stage } from "../../src/lib/tuning/v2/engine";
import { TUNING_MODEL } from "../../src/lib/tuning/limits";
import { REQUESTS } from "./count-mechanism.mjs";
import { EVAL_USER_ID } from "./count-mechanism-seed.mjs";
import { acquireRunLock, readLedger, record, spent } from "./lib/ledger.mjs";

const LEDGER = "docs/superpowers/eval/ledger-tuning-v2.jsonl";
const CAP_USD = LEDGER_LIMITS["ledger-tuning-v2.jsonl"].hardCapUsd;
const OUT = "docs/superpowers/eval/tuning-v2";
const ROWS = `${OUT}/rows.jsonl`;
/** P2's run budget for the deck page's 600s, less a margin for the writes. */
const BUDGET_MS = 590_000;

export const DECKS = ["HD Tune - Mutant Menace", "HD - Goblins", "HD - Avatar Aang"] as const;
export const COUNTS = [3, 10, 20] as const;
export const REPS = 3;
export const PLAN = Array.from({ length: REPS }, (_, r) => COUNTS.flatMap((n) => DECKS.map((deck) => ({ deck, n, rep: r + 1 })))).flat();
const keyOf = (r: { deck: string; n: number; rep: number }) => `${r.deck}|${r.n}|${r.rep}`;

/** A conservative input ceiling with no API call: ~3 characters a token, plus a margin (`count-mechanism.mts`'s). */
// Priced as a cache write (\`cacheWrite\`, 1.25x input), the worst case: a call that reads nothing from the cache writes it.
const inputCeiling = (m: { system: string; cachedUser?: string; user: string }) => Math.ceil((m.system.length + (m.cachedUser?.length ?? 0) + m.user.length) / 3) + 1_500;
// A call that sends a cached prefix may write it, so it is reserved at the write rate; the why call sends none.
const worstUsd = (m: { system: string; cachedUser?: string; user: string }, maxTokens: number) => worstCaseMicroUsd(TUNING_MODEL, inputCeiling(m), maxTokens, { cacheWrite: m.cachedUser !== undefined }) / 1e6;

type StoredCall = { stage: V2Stage; ok: boolean; errorClass?: string; ms: number; usd: number; raw: unknown };
type Row = {
  deck: string; n: number; rep: number; request: string; ms: number;
  listIn: Record<V2Side, number | null>; firstLine: Record<V2Side, number | null>;
  kept: { add: number; cut: number }; target: { add: number; cut: number };
  drops: { add: string[]; cut: string[] };
  callCount: number; refilled: { add: boolean; cut: boolean }; cutsFailed: V2Report["cutsFailed"]; budgetReached: boolean;
  charge: V2Report["charge"]; usd: number; calls: StoredCall[];
  /** What the validator let a line quote on this run (notes with their dates, the intent, the request), built as
   *  `validate.ts` builds it, so `--score` masks a quotation exactly as the app does. */
  quotables: { text: string; date: string | null }[];
};

const log = (line: string) => console.log(`[eval:tuning-v2] ${line}`);

if (import.meta.url === `file://${process.argv[1]}`) {
  const { values: args } = parseArgs({ options: { "dry-run": { type: "boolean", default: false }, spend: { type: "boolean", default: false }, score: { type: "boolean", default: false } } });
  if (args.score) score();
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
  const { connectScratch } = await import("./lib/scratch.mjs");
  const { openTuning } = await import("./lib/tuning-app.mjs");
  const { TUNING_VARIANTS } = await import("./variants/tuning.mjs");
  const app = await openTuning({ connect: () => connectScratch("eval:tuning-v2"), userId: EVAL_USER_ID });
  const { callModel } = await import("../../src/lib/model/client");
  const { costMicroUsd } = await import("../../src/lib/model/prices");
  const { TUNING_EFFORT } = await import("../../src/lib/tuning/limits");
  const { runV2 } = await import("../../src/lib/tuning/v2/engine");
  const { nameResolver } = await import("../../src/lib/tuning/resolve-names");
  const { parseStrategyKey } = await import("../../src/lib/strategy/focus");
  const { cards } = await import("../../src/db/schema");
  const { db } = await import("../../src/db/index");
  const { sql } = await import("drizzle-orm");

  const deckRows = (await db.execute(sql`select id, name, strategy_focus from decks where user_id = ${EVAL_USER_ID}`)).rows as { id: string; name: string; strategy_focus: string | null }[];
  const idOf = new Map(deckRows.map((d) => [d.name, d.id]));
  for (const d of DECKS) if (!idOf.has(d)) throw new Error(`eval: the scratch branch holds no deck named ${d}; run the seed`);
  const focusOf = new Map(deckRows.flatMap((d) => { const k = parseStrategyKey(d.strategy_focus); return k ? [[d.id, k] as const] : []; }));
  const prepared = await app.prepare(DECKS.map((d) => idOf.get(d)!), TUNING_VARIANTS.base, null, focusOf);
  const packOf = new Map(prepared.map((p) => [p.deckId, p.pack]));
  // Every card, once: no limits are set on these decks, so each candidate passes the hard filters as `score` does.
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
      const worst = worstUsd(req, req.maxTokens);
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
          record(LEDGER, { at: new Date().toISOString(), runId: `tuning-v2-${label}`, source: "realtime:1", usd, requests: 1, settles: id, note: `${label} ${req.stage}` });
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
      deck: p.deck, n: p.n, rep: p.rep, request: REQUESTS[p.deck], ms: Date.now() - start, listIn, firstLine,
      kept: { add: report.additions.kept.length, cut: report.cuts.kept.length },
      target: { add: report.additions.target, cut: report.cuts.target },
      drops: { add: report.additions.drops.map((d) => d.rule), cut: report.cuts.drops.map((d) => d.rule) },
      callCount: report.callCount, refilled: { add: report.additions.refilled, cut: report.cuts.refilled },
      cutsFailed: report.cutsFailed, budgetReached: report.budgetReached, charge: report.charge,
      usd: stored.reduce((s, c) => s + c.usd, 0), calls: stored,
      quotables: [
        ...pack.play.games.flatMap((g) => (g.note === null ? [] : [{ text: playerTextBody(g.note), date: noteDate(g.playedAt, pack.year) }])),
        ...(pack.intent === null ? [] : [{ text: playerTextBody(pack.intent), date: null }]),
        ...(REQUESTS[p.deck] ? [{ text: playerTextBody(REQUESTS[p.deck]), date: null }] : []),
      ],
    };
    appendFileSync(ROWS, `${JSON.stringify(row)}\n`);
    log(`${label}: ${row.kept.add}/${p.n} in, ${row.kept.cut}/${row.target.cut} out, ${row.callCount} calls, ${(row.ms / 1000).toFixed(0)}s, $${row.usd.toFixed(3)}, ${report.charge.outcome}; ledger $${spent(readLedger(LEDGER)).toFixed(2)}`);
  }
  log(`done; ledger $${spent(readLedger(LEDGER)).toFixed(2)} of $${CAP_USD}`);
  // A cap stop exits 2, so a wrapper can tell a stopped run from a finished one.
  return stopped !== null;
}


/**
 * Q9 (spec §6.2): every stored cut line re-scored under BOTH `noResultClaim` variants, from the same replies. Counts the
 * lines each variant drops for it, and lists every cut line that passes the narrowed rule while still using a game-result
 * word, for a human to read. Every text the app checks is checked here (the rationale, the short form, EVERY citation,
 * games included), against the run's own quotables, so a quoted note is masked exactly as `validate.ts` masks it.
 */
function score() {
  // Local: the CLI calls `score()` before a module-level declaration further down would be initialized.
  /** A game-result word a reader should look at by hand when it passes: "win", "lose", "beat" in any form. */
  const GAME_WORD = /\b(?:win|wins|winning|won|lose|loses|losing|lost|beat|beats)\b/i;
  if (!existsSync(ROWS)) return log(`no rows at ${ROWS}; nothing to score`);
  const rows = readFileSync(ROWS, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Row);
  type Line = { card: string; rationale: string; rationaleShort: string; evidence: { kind: string; value: string }[] };
  const cutLines = rows.flatMap((r) => r.calls.filter((c) => c.stage.startsWith("cuts") && c.raw).flatMap((c) => ((c.raw as { lines?: Line[]; cuts?: Line[] }).lines ?? (c.raw as { cuts?: Line[] }).cuts ?? []).map((line) => ({ r, line }))));
  const claims = ({ r, line }: { r: Row; line: Line }, allowStronger: boolean) =>
    [line.rationale, line.rationaleShort, ...line.evidence.map((e) => e.value)]
      .some((t) => presentationFailures(t, r.quotables ?? [], { allowStronger }).broken.includes("noResultClaim"));
  const strict = cutLines.filter((c) => claims(c, false));
  const narrowed = cutLines.filter((c) => claims(c, true));
  log(`${rows.length} runs, ${cutLines.length} stored cut lines`);
  log(`noResultClaim drops: ${strict.length} under today's rule, ${narrowed.length} narrowed on cuts (allowStronger)`);
  const passing = cutLines.filter((c) => !claims(c, true) && GAME_WORD.test(`${c.line.rationale} ${c.line.rationaleShort}`));
  log(`${passing.length} cut lines pass the narrowed rule with a game-result word; read each:`);
  for (const { r, line } of passing) log(`- ${r.deck} N=${r.n} r${r.rep}: ${line.card}: ${line.rationale}`);
}
