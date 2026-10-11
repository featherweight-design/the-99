import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { loadCorpus, renderMetrics, scoreCase, toReply, type Reply } from "./lib/corpus.mjs";
import { armStats, fromChecked, gateChecks, renderGate, type GateRow } from "./lib/gate.mjs";
import { acquireRunLock, OVERVIEW_ACCURACY_LIMITS, readLedger, record, refusal, spent } from "./lib/ledger.mjs";

/**
 * The Overview accuracy corpus, two commands (plan 2026-10-10-overview-accuracy.md, 5 and 11).
 *
 *   pnpm eval:corpus score --answers <file.jsonl> --label <name> [--out <md>]    $0, no database
 *   pnpm eval:corpus run --prompt v1|v2|v8 --out <file.jsonl> [--only id,id] [--cap 0.6] [--plan-done 0..1] [--pin] [--no-repair]
 *       [--model <id>] [--effort low|medium|high] [--max-tokens N] [--deadline-ms N] [--stream]
 *     The arm flags override production's model, effort, ceiling and deadline for this run only (an
 *     arm comparison); omitted, a run is production's. Each answer row records the arm, every
 *     response's stop reason, the tokens and the latency.
 *   pnpm eval:corpus gate --a <f1,f2> --b <f1,f2> --label-a v7 --label-b v8 [--out <md>]    $0, no database
 *
 * `--plan-done` is the share of the line's run plan already complete (default 0): from $11 of spend the
 * ledger stops and asks while it is under 0.5, so the default is the conservative one.
 *
 * `run` makes REAL-TIME paid calls, one per corpus deck, through the app's own `callModel`, prompt
 * and schema, on STAGING (read-only; a corpus deck whose source is production is skipped, and
 * nothing here can reach production). `--prompt v1` is what ships now (facts off), `v2` the combo
 * and deck-stats facts, `v8` those facts with contract 8 (the checklist prompt and schema). Each call is guarded by the campaign ledger BEFORE it is sent, at its
 * worst case, recorded pending and settled at its metered cost (`ledger-overview-accuracy.jsonl`,
 * $15 hard cap, ask at $11): a crash after the API billed still leaves a charge.
 *
 * A reply that refuses a section gets the app's ONE repair (`repairPrompt`, `applyRepair`: the same
 * functions the write calls), guarded and ledgered like the first call; the row stores the content a
 * reader would see (`rendered`) and `score` and `gate` read that, so the harness scores what renders. `--no-repair`
 * measures the first write alone. `gate` compares two arms (one or more sample files each) after repair.
 *
 * `--pin` writes a deck's list fingerprint into its corpus file when none is pinned. A pinned case
 * whose live fingerprint differs is skipped loudly rather than scored against a different list.
 */
const [command, ...rest] = process.argv.slice(2);
const { values: args } = parseArgs({
  args: rest,
  options: { answers: { type: "string" }, label: { type: "string" }, out: { type: "string" }, prompt: { type: "string" }, only: { type: "string" }, cap: { type: "string" }, "plan-done": { type: "string" }, pin: { type: "boolean", default: false }, "no-repair": { type: "boolean", default: false }, model: { type: "string" }, effort: { type: "string" }, "max-tokens": { type: "string" }, "deadline-ms": { type: "string" }, stream: { type: "boolean", default: false }, a: { type: "string" }, b: { type: "string" }, "label-a": { type: "string" }, "label-b": { type: "string" } },
});

const EVAL = new URL("../../docs/superpowers/eval/", import.meta.url);
const CORPUS_URL = new URL("corpus/", EVAL);
const CORPUS = fileURLToPath(CORPUS_URL);
const LEDGER = fileURLToPath(new URL("ledger-overview-accuracy.jsonl", EVAL));

type AnswerRow = GateRow & { listFingerprint?: string; reply: unknown };
const readAnswers = (path: string): AnswerRow[] => readFileSync(path, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as AnswerRow);

if (command === "score") {
  if (!args.answers || !args.label) throw new Error("usage: eval:corpus score --answers <file.jsonl> --label <name> [--out <md>]");
  const cases = loadCorpus(CORPUS);
  const rows = readAnswers(args.answers);
  // What renders, when the row records it; the raw reply otherwise (the first baselines, before the repair path).
  // A row whose call failed has nothing to score, and is reported as skipped. The plans never
  // render, so they are read off the raw reply whichever side the rest comes from.
  const answered = rows.filter((a) => a.rendered || a.reply);
  const answers = new Map<string, Reply>(answered.map((a) => {
    const r = a.rendered ? fromChecked(a.rendered) : toReply(a.reply);
    const plans = a.reply ? toReply(a.reply).plans : undefined;
    return [a.id, plans ? { ...r, plans } : r];
  }));
  // A row that records the list it was written for must match the case's pin; older rows record none.
  for (const a of rows) {
    const pinned = cases.find((c) => c.id === a.id)?.deck.listFingerprint;
    if (a.listFingerprint && pinned && a.listFingerprint !== pinned) throw new Error(`eval:corpus score: ${a.id} was answered for list ${a.listFingerprint.slice(0, 8)}, the corpus pins ${pinned.slice(0, 8)}`);
  }
  // A case with no pinned list fingerprint cannot be shown to describe the list the answer was written for.
  const scorable = (c: (typeof cases)[number]) => answers.has(c.id) && c.deck.listFingerprint !== null;
  const scores = cases.filter(scorable).map((c) => scoreCase(c, answers.get(c.id)!));
  const failedCall = new Map(rows.filter((a) => a.failed && !a.rendered && !a.reply).map((a) => [a.id, a.failed!]));
  const skipped = cases.filter((c) => !scorable(c)).map((c) => (c.deck.listFingerprint === null ? `${c.id} (list not pinned)` : failedCall.has(c.id) ? `${c.id} (the call failed: ${failedCall.get(c.id)})` : c.id));
  const text = renderMetrics(args.label, scores, skipped);
  if (args.out) writeFileSync(args.out, text);
  console.log(text);
  process.exit(0);
}

if (command === "gate") {
  if (!args.a || !args.b) throw new Error("usage: eval:corpus gate --a <f1,f2> --b <f1,f2> [--label-a v7] [--label-b v8] [--out <md>]");
  const cases = loadCorpus(CORPUS);
  const load = (list: string) => list.split(",").map((f) => readAnswers(f));
  // Compared on the answers both arms hold: a sample the budget cut short in one arm would otherwise score different decks.
  const ra0 = load(args.a);
  const rb0 = load(args.b);
  const ra = ra0;
  const rb = rb0;
  // The same pin check `score` makes, on every row of both arms: an answer written for another list is not the list the gold describes.
  for (const r of [...ra0, ...rb0].flat()) {
    const pinned = cases.find((c) => c.id === r.id)?.deck.listFingerprint;
    if (r.listFingerprint && pinned && r.listFingerprint !== pinned) throw new Error(`eval:corpus gate: ${r.id} was answered for list ${r.listFingerprint.slice(0, 8)}, the corpus pins ${pinned.slice(0, 8)}`);
  }
  const n = Math.min(ra.length, rb.length);
  const both = (x: AnswerRow[], y: AnswerRow[]) => x.filter((r) => y.some((q) => q.id === r.id));
  const sa = Array.from({ length: n }, (_, i) => both(ra[i]!, rb[i]!));
  const sb = Array.from({ length: n }, (_, i) => both(rb[i]!, ra[i]!));
  const dropped = [...ra, ...rb].reduce((t, r) => t + r.length, 0) - [...sa, ...sb].reduce((t, r) => t + r.length, 0);
  if (dropped > 0) console.log(`gate: ${dropped} answer(s) have no counterpart in the other arm and are left out`);
  const a = armStats(args["label-a"] ?? "contract 7", sa, cases);
  const b = armStats(args["label-b"] ?? "contract 8", sb, cases);
  const text = renderGate([a, b], gateChecks(a, b), Math.min(sa.length, sb.length));
  if (args.out) writeFileSync(args.out, text);
  console.log(text);
  process.exit(0);
}

if (command === "run") {
  if (args.prompt !== "v1" && args.prompt !== "v2" && args.prompt !== "v8") throw new Error("usage: eval:corpus run --prompt v1|v2|v8 --out <file.jsonl> [--only id,id] [--cap N] [--pin]");
  if (!args.out) throw new Error("eval:corpus run: --out is required");
  const cap = args.cap === undefined ? 0.6 : Number(args.cap);
  if (!Number.isFinite(cap) || cap < 0) throw new Error(`eval:corpus run: --cap must be a finite, non-negative number (got ${args.cap})`);
  const planDone = args["plan-done"] === undefined ? 0 : Number(args["plan-done"]);
  if (!Number.isFinite(planDone) || planDone < 0 || planDone > 1) throw new Error(`eval:corpus run: --plan-done must be between 0 and 1 (got ${args["plan-done"]})`);
  // v1: what shipped (facts off, contract 7). v2: facts on, contract 7. v8: facts on and contract 8, the method behind OVERVIEW_V2_ENABLED.
  const v8 = args.prompt === "v8";
  // The repair prompt follows the production switch (facts and contract 8 together), so `v2` (facts on, contract 7) has no repair that matches its write.
  if (args.prompt === "v2" && !args["no-repair"]) throw new Error("eval:corpus run: --prompt v2 has no matching repair prompt; pass --no-repair, or use v1 or v8");
  const v2 = args.prompt !== "v1";
  const only = args.only ? new Set(args.only.split(",")) : null;

  acquireRunLock(LEDGER);
  const { connectStaging } = await import("./lib/staging.mjs");
  await connectStaging();
  const { loadProfileHead, loadDeckProfileFromHead } = await import("../../src/lib/profile/load");
  const { listFingerprint } = await import("../../src/lib/profile/fingerprint");
  const { factsFor, checkReply, refusedSections, repairPrompt, applyRepair, synopsisCallSettings } = await import("../../src/lib/synopsis/generate");
  const { buildSynopsisPrompt } = await import("../../src/lib/synopsis/prompt");
  const { callModel } = await import("../../src/lib/model/client");
  const { synopsisResponseSchema, synopsisResponseSchemaV8Wire } = await import("../../src/lib/synopsis/response-schema");
  type SynopsisReply = import("../../src/lib/synopsis/response-schema").SynopsisReply;
  const { SYNOPSIS_DEADLINE_MS, SYNOPSIS_REPAIR_MIN_MS } = await import("../../src/lib/synopsis/limits");
  const { costUsd, worstCaseUsd } = await import("./lib/pricing.mjs");
  const { db } = await import("../../src/db/index");
  const { sql } = await import("drizzle-orm");

  // The arm. Omitted flags are production's own settings for the contract the prompt runs under
  // (v1 and v2 are contract 7, v8 the v2 contracts), so a run with none is production's.
  const prod = synopsisCallSettings(v8);
  const model = args.model ?? prod.model;
  if (args.effort !== undefined && !["low", "medium", "high"].includes(args.effort)) throw new Error(`eval:corpus run: --effort must be low, medium or high (got ${args.effort})`);
  const effort = (args.effort ?? prod.effort) as "low" | "medium" | "high";
  const positive = (flag: string, v: string | undefined, fallback: number) => {
    if (v === undefined) return fallback;
    const n = Number(v);
    if (!Number.isInteger(n) || n <= 0) throw new Error(`eval:corpus run: --${flag} must be a positive integer (got ${v})`);
    return n;
  };
  const deadlineMs = positive("deadline-ms", args["deadline-ms"], SYNOPSIS_DEADLINE_MS);
  const arm = { model, effort, maxTokens: positive("max-tokens", args["max-tokens"], prod.maxTokens), deadlineMs, stream: args.stream || prod.stream };
  console.log(`arm: ${JSON.stringify(arm)}`);

  let runSpend = 0;
  const existing = existsSync(args.out) ? readAnswers(args.out) : [];
  const mixed = existing.filter((a) => a.prompt !== args.prompt);
  if (mixed.length > 0) throw new Error(`eval:corpus run: ${args.out} holds rows from another prompt (${[...new Set(mixed.map((a) => a.prompt ?? "unlabelled"))].join(", ")}); refusing to resume into it`);
  // The arm is part of a run's identity too: resuming a file written under another model, effort,
  // ceiling, deadline or streaming setting would append a mixed arm and void the comparison. A row
  // recorded before the arm was, says nothing about its arm, and is refused for the same reason.
  const armKey = JSON.stringify(arm);
  const otherArm = existing.filter((a) => JSON.stringify((a as { arm?: unknown }).arm) !== armKey);
  if (otherArm.length > 0) throw new Error(`eval:corpus run: ${args.out} holds ${otherArm.length} row(s) from another arm, or recorded before arms were (this run is ${armKey}); refusing to resume into it`);
  const done = new Set(existing.map((a) => a.id));
  for (const c of loadCorpus(CORPUS)) {
    if (only && !only.has(c.id)) continue;
    if (done.has(c.id)) { console.log(`${c.id}: already in ${args.out}, kept`); continue; }
    if (c.deck.source !== "staging" || !c.deck.deckId) { console.log(`${c.id}: skipped (deck is on ${c.deck.source}; this harness reads staging only)`); continue; }
    const owner = (await db.execute(sql`select user_id from decks where id = ${c.deck.deckId}`)).rows[0] as { user_id: string } | undefined;
    if (!owner) { console.log(`${c.id}: skipped (deck ${c.deck.deckId} not found on staging)`); continue; }
    const head = await loadProfileHead(c.deck.deckId, owner.user_id);
    if (!head) { console.log(`${c.id}: skipped (no profile head)`); continue; }
    const live = listFingerprint(head);
    if (c.deck.listFingerprint && c.deck.listFingerprint !== live) { console.log(`${c.id}: SKIPPED, the list changed since the gold was written (pinned ${c.deck.listFingerprint.slice(0, 8)}, live ${live.slice(0, 8)})`); continue; }
    if (!c.deck.listFingerprint && args.pin) {
      const file = join(CORPUS, `${c.id}.json`);
      const doc = JSON.parse(readFileSync(file, "utf8")) as { deck: { listFingerprint: string | null } };
      doc.deck.listFingerprint = live;
      writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`);
      console.log(`${c.id}: pinned ${live.slice(0, 8)}`);
    }
    const facts = await factsFor(await loadDeckProfileFromHead(head), v2);
    const prompt = buildSynopsisPrompt(facts, undefined, { v2, contract8: v8 });
    const maxTokens = arm.maxTokens;
    const stops: { what: string; stopReason: string | null; outputTokens: number }[] = [];
    // One guarded, ledgered call. `worstCaseUsd` already counts the one malformed-reply retry.
    // Characters are only an estimate of input tokens, and rules text with symbols runs denser than
    // prose (a first v8 run reserved $0.133 and settled at $0.144 after a retry), so the estimate
    // divides by 3, not 3.5. Pending BEFORE the call, settled after: a crash between paying and
    // settling keeps the worst case counted. Returns null when the ledger or the run cap says stop.
    const ask = async (p: { system: string; user: string }, what: string, deadlineMs: number, reserve = 1) => {
      const approxIn = Math.ceil((p.system.length + p.user.length) / 3);
      const worst = worstCaseUsd(model, approxIn, maxTokens, { batch: false });
      // The first call reserves its repair too: a ledger that allows the write and then refuses the repair would leave a paid answer with nowhere to go.
      const stop = refusal(readLedger(LEDGER), worst * reserve, planDone, OVERVIEW_ACCURACY_LIMITS) ?? (runSpend + worst * reserve > cap ? `this run's cap of $${cap} would be crossed` : null);
      if (stop) { console.log(`STOP before ${c.id} ${what}: ${stop}`); return null; }
      const pendingId = `${Date.now()}-${c.id}-${what}`;
      record(LEDGER, { at: new Date().toISOString(), runId: pendingId, source: "pending", usd: worst, requests: 1, pending: pendingId, note: `corpus ${args.prompt} ${c.id} ${what}` });
      const call = {
        model, system: p.system, user: p.user, maxTokens, effort, deadlineMs, stream: arm.stream,
        onResponse: (m: { stopReason: string | null; outputTokens: number }) => { stops.push({ what, ...m }); },
      };
      const out: Awaited<ReturnType<typeof callModel<SynopsisReply>>> = v8
        ? await callModel({ ...call, schema: synopsisResponseSchemaV8Wire })
        : await callModel({ ...call, schema: synopsisResponseSchema });
      const u = out.usage;
      const usd = u ? costUsd(model, { input_tokens: u.inputTokens, output_tokens: u.outputTokens, cache_read_input_tokens: u.cacheReadTokens, cache_creation_input_tokens: u.cacheWriteTokens }, { batch: false }) : 0;
      runSpend += usd;
      record(LEDGER, { at: new Date().toISOString(), runId: `corpus-${args.prompt}-${c.id}-${what}`, source: "realtime:1", usd, requests: 1, settles: pendingId, note: `corpus ${args.prompt} ${c.id} ${what}` });
      console.log(`${c.id} ${what}: ok=${out.ok} $${usd.toFixed(4)} (run $${runSpend.toFixed(4)}, campaign $${spent(readLedger(LEDGER)).toFixed(4)})`);
      return { out, usd, usage: u };
    };
    const startedAt = Date.now();
    const first = await ask(prompt, "write", deadlineMs, args["no-repair"] ? 1 : 2);
    const latencyMs = Date.now() - startedAt;
    if (!first) break;
    if (!first.out.ok) {
      console.log(`  ${first.out.errorClass}`);
      // A failed answer is a result of the arm, not a gap: recorded so the arm's failure rate shows.
      appendFileSync(args.out, `${JSON.stringify({ id: c.id, prompt: args.prompt, arm, failed: first.out.errorClass, stops, latencyMs, usd: first.usd, usage: first.usage })}\n`);
      continue;
    }
    const checked = await checkReply(first.out.value, facts, v8);
    const show = (v: typeof checked.verdicts) => v.map((x) => `${x.section}:${x.status}${x.status === "refused" ? `(${x.reason} ${x.failed}/${x.total})` : ""}`).join(" ");
    console.log(`  ${show(checked.verdicts)}`);
    // THE PRODUCTION REPAIR: the same prompt and merge the write uses, so the row is what a reader is shown.
    let rendered = checked;
    let repairUsd: number | undefined;
    let repairReply: unknown;
    let repairUsage: unknown;
    const failing = refusedSections(checked);
    // Production sends the repair only with what is left of the write's ONE budget, and not at all under SYNOPSIS_REPAIR_MIN_MS.
    const remaining = deadlineMs - (Date.now() - startedAt);
    if (failing.length > 0 && !args["no-repair"] && remaining < SYNOPSIS_REPAIR_MIN_MS) console.log(`  repair skipped: ${remaining}ms of the write's budget left`);
    if (failing.length > 0 && !args["no-repair"] && remaining >= SYNOPSIS_REPAIR_MIN_MS) {
      const repair = await ask(repairPrompt(facts, checked, failing, v8, first.out.value), "repair", remaining);
      if (!repair) break;
      repairUsd = repair.usd;
      repairUsage = repair.usage;
      if (repair.out.ok) repairReply = repair.out.value;
      rendered = await applyRepair(checked, repair.out, failing, facts, v8);
      console.log(`  repaired: ${show(rendered.verdicts)}`);
    }
    appendFileSync(args.out, `${JSON.stringify({ id: c.id, prompt: args.prompt, arm, stops, latencyMs, totalLatencyMs: Date.now() - startedAt, usage: first.usage, repairUsage, listFingerprint: live, usd: first.usd, repairUsd, repairReply, firstVerdicts: checked.verdicts, rendered, reply: first.out.value })}\n`);
  }
  process.exit(0);
}

throw new Error("usage: eval:corpus score|run (see the header of scripts/eval/corpus.mts)");
