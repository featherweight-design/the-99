import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import type { z } from "zod";

import { countTokens, sendBatch, sendRealtime, type Got, type Sent } from "./batch.mjs";
import { acquireRunLock, readLedger, record, refusal, spent } from "./ledger.mjs";
import { costUsd, worstCaseUsd, type Usage } from "./pricing.mjs";
import { parseReply, type Cell } from "./request.mjs";

/**
 * One run of either feature: the budget guard, the send, the app's one retry, and the parse. The
 * feature runners own what they prepare and how they score; this owns every step that spends.
 *
 * In order, and each for a reason:
 *  - the worst case is summed from counted input tokens and checked against the ledger BEFORE
 *    anything is sent, because a batch is billed whether or not its results are read;
 *  - raw results reach disk before anything prices or parses them, so a throw loses nothing paid for;
 *  - every price is looked up by the model the request NAMED, because a reply's `model` is dated
 *    (`claude-haiku-4-5-20251001`);
 *  - a reply that fails the schema, or an upstream failure, gets exactly one more attempt, as
 *    `callModel` gives it. A timeout never does, and a batch has none.
 */
export const ROOT = new URL("../../../docs/superpowers/eval/", import.meta.url);
export const LEDGER = new URL("ledger.jsonl", ROOT).pathname;

/** The model cells. A `+cache` suffix adds the cache markers; `@maxN` overrides the ceiling. */
export function parseCell(spec: string, appModel: string): Cell {
  const cells: Record<string, Omit<Cell, "id">> = {
    sonnet: { model: appModel },
    "sonnet-low": { model: appModel, effort: "low" },
    "sonnet-medium": { model: appModel, effort: "medium" },
    haiku: { model: "claude-haiku-4-5" },
  };
  const m = /^([a-z-]+)(\+cache)?(?:@max(\d+))?$/.exec(spec);
  const base = m && cells[m[1]];
  if (!m || !base) throw new Error(`eval: unknown cell ${spec}; known: ${Object.keys(cells).join(", ")}`);
  return { id: spec, ...base, cache: m[2] ? true : undefined, maxTokens: m[3] ? Number(m[3]) : undefined };
}

export type Answer<T> = { attempts: Got[]; value: T | null; malformed: string | null };

export async function runRequests<T>(opts: {
  feature: string;
  label: string;
  first: Sent[];
  schema: z.ZodType<T>;
  realtime: boolean;
  dryRun: boolean;
  planDone: number;
  /** Written beside the rows: what was asked, and everything the model was shown. */
  meta: Record<string, unknown>;
  prepared: unknown;
  log: (line: string) => void;
}): Promise<{ runId: string; dir: URL; answers: Map<string, Answer<T>> } | null> {
  const { first, schema, realtime, log } = opts;
  const counted = new Map<string, number>();
  let worst = 0;
  let inputSum = 0;
  for (const s of first) {
    const h = createHash("sha256").update(JSON.stringify(s.params)).digest("hex");
    if (!counted.has(h)) counted.set(h, await countTokens(s.params));
    const n = counted.get(h)!;
    inputSum += n;
    worst += worstCaseUsd(s.params.model, n, s.params.max_tokens, { batch: !realtime });
  }
  if (!opts.dryRun) acquireRunLock(LEDGER);
  const ledger = readLedger(LEDGER);
  log(`${first.length} requests, ${inputSum} input tokens; worst case $${worst.toFixed(2)}; spent so far $${spent(ledger).toFixed(2)}`);
  if (opts.dryRun) return null;
  const stop = refusal(ledger, worst, opts.planDone);
  if (stop) {
    log(`NOT SENT: ${stop}`);
    return null;
  }

  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${opts.feature}-${opts.label}`;
  const dir = new URL(`runs/${runId}/`, ROOT);
  mkdirSync(dir, { recursive: true });
  const sha = execSync("git rev-parse --short HEAD").toString().trim();
  writeFileSync(new URL("meta.json", dir), `${JSON.stringify({ runId, sha, ...opts.meta }, null, 2)}\n`);
  writeFileSync(new URL("prepared.json", dir), `${JSON.stringify(opts.prepared)}\n`);

  const modelOf = new Map(first.map((s) => [s.customId, s.params.model]));
  // A batch is recorded at its worst case BEFORE it is submitted and settled at its real cost after
  // (`ledger.mts`), so a crash between paying and settling leaves the worst case counted.
  const send = async (batch: Sent[], pass: string, worstUsd: number): Promise<Got[]> => {
    if (batch.length === 0) return [];
    const pendingId = `${runId}/${pass}`;
    record(LEDGER, { at: new Date().toISOString(), runId: pendingId, source: "pending", usd: worstUsd, requests: batch.length, pending: pendingId });
    let got: Got[];
    let source: string;
    if (realtime) {
      got = await sendRealtime(batch, log);
      source = `realtime:${batch.length}`;
    } else {
      const r = await sendBatch(batch, log);
      got = r.results;
      source = r.batchId;
    }
    appendFileSync(new URL(`raw-${pass}.jsonl`, dir), got.map((g) => JSON.stringify(g)).join("\n") + "\n");
    const usd = got.reduce((n, g) => n + (g.ok ? costUsd(modelOf.get(g.customId.replace(/-r$/, ""))!, g.message.usage as Usage, { batch: !realtime }) : 0), 0);
    const after = record(LEDGER, { at: new Date().toISOString(), runId: `${runId}/${pass}`, source, usd, requests: batch.length, settles: pendingId });
    log(`${pass}: ${batch.length} answers, $${usd.toFixed(4)}; ledger total $${spent(after).toFixed(2)}`);
    return got;
  };

  const attempts = new Map<string, Got[]>();
  // The first pass is held at the whole worst case, a retry included.
  for (const g of await send(first, "a1", worst)) attempts.set(g.customId, [g]);
  const retry = first.filter((s) => {
    const g = attempts.get(s.customId)?.[0];
    // Retried as `callModel` retries: an upstream it classes as transient, or a reply that fails
    // the schema. A timeout or a refused request is final there, so it is final here.
    return !g || (g.ok ? !parseReply(schema, g.message).ok : g.retry);
  });
  // The retry is never refused: the worst case checked above already counted a second attempt for
  // every request, so the cap was cleared for it, and skipping it would record first-attempt
  // failures as final ones the app would have retried.
  const tokensOf = (s: Sent) => counted.get(createHash("sha256").update(JSON.stringify(s.params)).digest("hex"))!;
  const retryWorst = retry.reduce((n, s) => n + worstCaseUsd(s.params.model, tokensOf(s), s.params.max_tokens, { batch: !realtime }) / 2, 0);
  for (const g of await send(retry.map((s) => ({ ...s, customId: `${s.customId}-r` })), "a2", retryWorst)) {
    attempts.get(g.customId.replace(/-r$/, ""))?.push(g);
  }

  const answers = new Map<string, Answer<T>>();
  for (const s of first) {
    const tries = attempts.get(s.customId) ?? [];
    let value: T | null = null;
    let malformed: string | null = "no reply";
    for (const t of tries) {
      if (!t.ok) { malformed = `upstream: ${t.reason}`; continue; }
      const p = parseReply(schema, t.message);
      if (p.ok) { value = p.value; malformed = null; break; }
      malformed = p.reason;
    }
    answers.set(s.customId, { attempts: tries, value, malformed });
  }
  return { runId, dir, answers };
}

/** An answer's cost, both attempts, at batch or real-time prices. */
export function usdOf(model: string, answer: Answer<unknown>, batch: boolean): number {
  return answer.attempts.reduce((n, t) => n + (t.ok ? costUsd(model, t.message.usage as Usage, { batch }) : 0), 0);
}

/** The columns every row carries, whatever the feature. */
export function commonRow(cell: Cell, answer: Answer<unknown>, realtime: boolean, appMaxTokens: number) {
  return {
    cell: cell.id,
    model: cell.model,
    // What was SENT, so a cell id whose meaning moves with the app's own constant is still told apart.
    maxTokens: cell.maxTokens ?? appMaxTokens,
    attempts: answer.attempts.length,
    usage: answer.attempts.flatMap((t) => (t.ok ? [t.message.usage as Usage] : [])),
    usdAsRun: usdOf(cell.model, answer, !realtime),
    usdRealtime: usdOf(cell.model, answer, false),
    // Real-time runs only: milliseconds from request to final token, per attempt.
    latencyMs: answer.attempts.flatMap((t) => (t.ok && t.elapsedMs !== undefined ? [t.elapsedMs] : [])),
    malformed: answer.malformed,
  };
}
