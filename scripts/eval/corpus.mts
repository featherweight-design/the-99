import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { loadCorpus, renderMetrics, scoreCase, type Reply } from "./lib/corpus.mjs";
import { acquireRunLock, OVERVIEW_ACCURACY_LIMITS, readLedger, record, refusal, spent } from "./lib/ledger.mjs";

/**
 * The Overview accuracy corpus, two commands (plan 2026-10-10-overview-accuracy.md, 5 and 11).
 *
 *   pnpm eval:corpus score --answers <file.jsonl> --label <name> [--out <md>]    $0, no database
 *   pnpm eval:corpus run --prompt v1|v2 --out <file.jsonl> [--only id,id] [--cap 0.6] [--plan-done 0..1] [--pin]
 *
 * `--plan-done` is the share of the line's run plan already complete (default 0): from $11 of spend the
 * ledger stops and asks while it is under 0.5, so the default is the conservative one.
 *
 * `run` makes REAL-TIME paid calls, one per corpus deck, through the app's own `callModel`, prompt
 * and schema, on STAGING (read-only; a corpus deck whose source is production is skipped, and
 * nothing here can reach production). `--prompt v1` is what ships now (facts off), `v2` the combo
 * and deck-stats facts. Each call is guarded by the campaign ledger BEFORE it is sent, at its
 * worst case, recorded pending and settled at its metered cost (`ledger-overview-accuracy.jsonl`,
 * $15 hard cap, ask at $11): a crash after the API billed still leaves a charge.
 *
 * `--pin` writes a deck's list fingerprint into its corpus file when none is pinned. A pinned case
 * whose live fingerprint differs is skipped loudly rather than scored against a different list.
 */
const [command, ...rest] = process.argv.slice(2);
const { values: args } = parseArgs({
  args: rest,
  options: { answers: { type: "string" }, label: { type: "string" }, out: { type: "string" }, prompt: { type: "string" }, only: { type: "string" }, cap: { type: "string" }, "plan-done": { type: "string" }, pin: { type: "boolean", default: false } },
});

const EVAL = new URL("../../docs/superpowers/eval/", import.meta.url);
const CORPUS_URL = new URL("corpus/", EVAL);
const CORPUS = fileURLToPath(CORPUS_URL);
const LEDGER = fileURLToPath(new URL("ledger-overview-accuracy.jsonl", EVAL));

type AnswerRow = { id: string; prompt?: string; listFingerprint?: string; reply: Reply };
const readAnswers = (path: string): AnswerRow[] => readFileSync(path, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as AnswerRow);

if (command === "score") {
  if (!args.answers || !args.label) throw new Error("usage: eval:corpus score --answers <file.jsonl> --label <name> [--out <md>]");
  const cases = loadCorpus(CORPUS);
  const rows = readAnswers(args.answers);
  const answers = new Map(rows.map((a) => [a.id, a.reply]));
  // A row that records the list it was written for must match the case's pin; older rows record none.
  for (const a of rows) {
    const pinned = cases.find((c) => c.id === a.id)?.deck.listFingerprint;
    if (a.listFingerprint && pinned && a.listFingerprint !== pinned) throw new Error(`eval:corpus score: ${a.id} was answered for list ${a.listFingerprint.slice(0, 8)}, the corpus pins ${pinned.slice(0, 8)}`);
  }
  // A case with no pinned list fingerprint cannot be shown to describe the list the answer was written for.
  const scorable = (c: (typeof cases)[number]) => answers.has(c.id) && c.deck.listFingerprint !== null;
  const scores = cases.filter(scorable).map((c) => scoreCase(c, answers.get(c.id)!));
  const skipped = cases.filter((c) => !scorable(c)).map((c) => (c.deck.listFingerprint === null ? `${c.id} (list not pinned)` : c.id));
  const text = renderMetrics(args.label, scores, skipped);
  if (args.out) writeFileSync(args.out, text);
  console.log(text);
  process.exit(0);
}

if (command === "run") {
  if (args.prompt !== "v1" && args.prompt !== "v2") throw new Error("usage: eval:corpus run --prompt v1|v2 --out <file.jsonl> [--only id,id] [--cap N] [--pin]");
  if (!args.out) throw new Error("eval:corpus run: --out is required");
  const cap = args.cap === undefined ? 0.6 : Number(args.cap);
  if (!Number.isFinite(cap) || cap < 0) throw new Error(`eval:corpus run: --cap must be a finite, non-negative number (got ${args.cap})`);
  const planDone = args["plan-done"] === undefined ? 0 : Number(args["plan-done"]);
  if (!Number.isFinite(planDone) || planDone < 0 || planDone > 1) throw new Error(`eval:corpus run: --plan-done must be between 0 and 1 (got ${args["plan-done"]})`);
  const v2 = args.prompt === "v2";
  const only = args.only ? new Set(args.only.split(",")) : null;

  acquireRunLock(LEDGER);
  const { connectStaging } = await import("./lib/staging.mjs");
  await connectStaging();
  const { loadProfileHead, loadDeckProfileFromHead } = await import("../../src/lib/profile/load");
  const { listFingerprint } = await import("../../src/lib/profile/fingerprint");
  const { factsFor, catalogFor } = await import("../../src/lib/synopsis/generate");
  const { buildSynopsisPrompt } = await import("../../src/lib/synopsis/prompt");
  const { callModel } = await import("../../src/lib/model/client");
  const { synopsisResponseSchema } = await import("../../src/lib/synopsis/response-schema");
  const { validateSynopsis } = await import("../../src/lib/synopsis/validate");
  const { SYNOPSIS_MAX_TOKENS } = await import("../../src/lib/synopsis/limits");
  const { SYNOPSIS_MODEL, SYNOPSIS_EFFORT } = await import("../../src/lib/synopsis/model");
  const { costUsd, worstCaseUsd } = await import("./lib/pricing.mjs");
  const { db } = await import("../../src/db/index");
  const { sql } = await import("drizzle-orm");

  let runSpend = 0;
  const existing = existsSync(args.out) ? readAnswers(args.out) : [];
  const mixed = existing.filter((a) => a.prompt !== args.prompt);
  if (mixed.length > 0) throw new Error(`eval:corpus run: ${args.out} holds rows from another prompt (${[...new Set(mixed.map((a) => a.prompt ?? "unlabelled"))].join(", ")}); refusing to resume into it`);
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
    const prompt = buildSynopsisPrompt(facts, undefined, { v2 });
    const approxIn = Math.ceil((prompt.system.length + prompt.user.length) / 3.5);
    const worst = worstCaseUsd(SYNOPSIS_MODEL, approxIn, SYNOPSIS_MAX_TOKENS, { batch: false });
    const ledger = readLedger(LEDGER);
    const stop = refusal(ledger, worst, planDone, OVERVIEW_ACCURACY_LIMITS) ?? (runSpend + worst > cap ? `this run's cap of $${cap} would be crossed` : null);
    if (stop) { console.log(`STOP before ${c.id}: ${stop}`); break; }
    const pendingId = `${Date.now()}-${c.id}`;
    // Pending BEFORE the call, settled after: a crash between paying and settling keeps the worst case counted.
    record(LEDGER, { at: new Date().toISOString(), runId: pendingId, source: "pending", usd: worst, requests: 1, pending: pendingId, note: `corpus ${args.prompt} ${c.id}` });
    const out = await callModel({ model: SYNOPSIS_MODEL, system: prompt.system, user: prompt.user, maxTokens: SYNOPSIS_MAX_TOKENS, effort: SYNOPSIS_EFFORT, schema: synopsisResponseSchema, deadlineMs: 110_000 });
    const u = out.usage;
    const usd = u ? costUsd(SYNOPSIS_MODEL, { input_tokens: u.inputTokens, output_tokens: u.outputTokens, cache_read_input_tokens: u.cacheReadTokens, cache_creation_input_tokens: u.cacheWriteTokens }, { batch: false }) : 0;
    runSpend += usd;
    record(LEDGER, { at: new Date().toISOString(), runId: `corpus-${args.prompt}-${c.id}`, source: "realtime:1", usd, requests: 1, settles: pendingId, note: `corpus ${args.prompt} ${c.id}` });
    console.log(`${c.id}: ok=${out.ok} $${usd.toFixed(4)} (run $${runSpend.toFixed(4)}, campaign $${spent(readLedger(LEDGER)).toFixed(4)})`);
    if (!out.ok) { console.log(`  ${out.errorClass}`); continue; }
    const checked = validateSynopsis(out.value, facts, await catalogFor(out.value, facts));
    console.log(`  ${checked.verdicts.map((v) => `${v.section}:${v.status}`).join(" ")}`);
    appendFileSync(args.out, `${JSON.stringify({ id: c.id, prompt: args.prompt, listFingerprint: live, usd, reply: out.value })}\n`);
  }
  process.exit(0);
}

throw new Error("usage: eval:corpus score|run (see the header of scripts/eval/corpus.mts)");
