/**
 * `pnpm eval:synopsis` — runs the deck overview's REAL prompt and REAL accept contract over Hugh's
 * staging decks, per model cell and prompt variant, and writes one row per answer.
 *
 *   pnpm eval:synopsis --cells sonnet,sonnet-low,haiku --set heldOut --trials 3 [--variant trim]
 *                      [--realtime] [--dry-run] [--plan-done 0.2] [--label sweep]
 *
 * Plan: docs/superpowers/plans/2026-09-23-eval-harness.md. The app's own readers and contract
 * come in through `lib/synopsis-app.mts`, the request through `buildParams` (pinned to what
 * `callModel` sends), and every step that spends through `runRequests`.
 *
 * A run is scored as its FIRST WRITE: the four sections checked once. The player's own section
 * retry is a second press that spends a second unit, so it is not folded into this answer.
 */
import "../lib/env.mjs";

import { appendFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { buildParams } from "./lib/request.mjs";
import { commonRow, parseCell, runRequests } from "./lib/run.mjs";
import { openSynopsis } from "./lib/synopsis-app.mjs";
import { SYNOPSIS_VARIANTS } from "./variants/synopsis.mjs";

const { values: args } = parseArgs({
  options: {
    cells: { type: "string", default: "sonnet,haiku" },
    set: { type: "string", default: "heldOut" },
    decks: { type: "string" },
    trials: { type: "string", default: "1" },
    variant: { type: "string", default: "base" },
    realtime: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    "plan-done": { type: "string", default: "0" },
    label: { type: "string", default: "run" },
    /** `<runId>:<batchId>`: attach to a first pass an earlier process submitted and died waiting on. */
    resume: { type: "string" },
  },
});

const log = (line: string) => console.log(`[eval:synopsis] ${line}`);

const app = await openSynopsis();
const { split, nameOf } = app;

const setIds = args.decks
  ? args.decks.split(",")
  : args.set === "dev" ? split.dev : args.set === "all" ? [...split.dev, ...split.heldOut] : split.heldOut;
const cells = args.cells!.split(",").map((c) => parseCell(c, app.model));
const variant = SYNOPSIS_VARIANTS[args.variant!];
if (!variant) throw new Error(`eval: unknown variant ${args.variant}; known: ${Object.keys(SYNOPSIS_VARIANTS).join(", ")}`);
const trials = Number(args.trials);

const prepared = await app.prepare(setIds, variant);
log(`prepared ${prepared.length} decks (${args.set}), variant ${variant.id}, contract v${app.contractVersion}`);

const keys = new Map<string, { cell: (typeof cells)[number]; deck: (typeof prepared)[number]; trial: number }>();
const first = cells.flatMap((cell) => prepared.flatMap((deck, d) => Array.from({ length: trials }, (_, trial) => {
  const customId = `${cell.id.replace(/[^a-zA-Z0-9-]/g, "_")}-d${d}-t${trial}`;
  keys.set(customId, { cell, deck, trial });
  return { customId, params: buildParams({ model: cell.model, system: deck.system, user: deck.user, maxTokens: app.maxTokens, schema: app.schema }, cell) };
})));

const run = await runRequests({
  feature: "synopsis",
  label: args.label!,
  first,
  schema: app.schema,
  realtime: args.realtime!,
  dryRun: args["dry-run"]!,
  planDone: Number(args["plan-done"]),
  meta: { args, split, contractVersion: app.contractVersion, variant: { id: variant.id, reason: variant.reason }, decks: prepared.map((p) => ({ deckId: p.deckId, name: nameOf.get(p.deckId) })) },
  prepared,
  log,
  resume: args.resume ? { runId: args.resume.split(":")[0], batchId: args.resume.split(":")[1] } : undefined,
});
if (!run) process.exit(args["dry-run"] ? 0 : 2);

const out = new URL("rows.jsonl", run.dir);
for (const [customId, answer] of run.answers) {
  const { cell, deck, trial } = keys.get(customId)!;
  const scored = answer.value
    ? await app.score(deck.facts, answer.value)
    : { outcome: answer.malformed?.startsWith("upstream") ? "upstream_busy" : "malformed" };
  appendFileSync(out, `${JSON.stringify({
    runId: run.runId, feature: "synopsis", variant: variant.id,
    set: args.decks ? "custom" : args.set, deckId: deck.deckId, trial,
    ...commonRow(cell, answer, args.realtime!, app.maxTokens), ...scored, reply: answer.value,
  })}\n`);
}
log(`wrote ${run.answers.size} rows to ${out.pathname}`);
process.exit(0);
