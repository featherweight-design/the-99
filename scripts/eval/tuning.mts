/**
 * `pnpm eval:tuning` — runs deck tuning's REAL prompt and REAL accept contract over Hugh's staging
 * decks, per model cell and prompt variant, and writes one row per answer.
 *
 *   pnpm eval:tuning --cells sonnet,sonnet-low,haiku --set heldOut --trials 3 [--variant trim]
 *                    [--overlay] [--realtime] [--dry-run] [--plan-done 0.2] [--label sweep]
 *
 * Plan: docs/superpowers/plans/2026-09-23-eval-harness.md. Every piece of the app it touches is
 * imported, never restated (`lib/tuning-app.mts`), and the request is built by `buildParams`, which
 * `request.test.mts` pins to what `callModel` sends. Staging is read-only, results go to
 * `docs/superpowers/eval/runs/<run>/`, and `runRequests` sends nothing whose worst case could
 * cross the ledger's cap.
 */
import "../lib/env.mjs";

import { appendFileSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { buildParams } from "./lib/request.mjs";
import { commonRow, parseCell, runRequests } from "./lib/run.mjs";
import { openTuning, type OverlayDeck } from "./lib/tuning-app.mjs";
import { TUNING_VARIANTS } from "./variants/tuning.mjs";

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

const setIds = args.decks
  ? args.decks.split(",")
  : args.overlay ? (args.set === "dev" ? split.dev : split.overlay) : args.set === "dev" ? split.dev : args.set === "all" ? [...split.dev, ...split.heldOut] : split.heldOut;
const cells = args.cells!.split(",").map((c) => parseCell(c, app.model));
const variant = TUNING_VARIANTS[args.variant!];
if (!variant) throw new Error(`eval: unknown variant ${args.variant}; known: ${Object.keys(TUNING_VARIANTS).join(", ")}`);
const trials = Number(args.trials);
const overlay = args.overlay
  ? (JSON.parse(readFileSync(new URL("fixtures/evidence-overlay.json", import.meta.url), "utf8")) as { decks: OverlayDeck[] }).decks
  : null;

// The overlay is laid over decks in order, one fixture entry each, so a set longer than the fixture
// (only reachable through `--decks`) would reach past its end.
if (overlay && setIds.length > overlay.length) {
  throw new Error(`eval: --overlay covers ${overlay.length} decks; ${setIds.length} were named`);
}
const prepared = await app.prepare(setIds, variant, overlay);
log(`prepared ${prepared.length} decks (${args.overlay ? "overlay" : args.set}), variant ${variant.id}, prompt v${app.promptVersion}`);

const keys = new Map<string, { cell: (typeof cells)[number]; deck: (typeof prepared)[number]; trial: number }>();
const first = cells.flatMap((cell) => prepared.flatMap((deck, d) => Array.from({ length: trials }, (_, trial) => {
  const customId = `${cell.id.replace(/[^a-zA-Z0-9-]/g, "_")}-d${d}-t${trial}`;
  keys.set(customId, { cell, deck, trial });
  return { customId, params: buildParams({ model: cell.model, system: deck.system, user: deck.user, maxTokens: app.maxTokens, schema: app.schema }, cell) };
})));

const run = await runRequests({
  feature: "tuning",
  label: args.label!,
  first,
  schema: app.schema,
  realtime: args.realtime!,
  dryRun: args["dry-run"]!,
  planDone: Number(args["plan-done"]),
  meta: { args, split, promptVersion: app.promptVersion, variant: { id: variant.id, reason: variant.reason }, decks: prepared.map((p) => ({ deckId: p.deckId, name: nameOf.get(p.deckId) })) },
  prepared,
  log,
});
if (!run) process.exit(args["dry-run"] ? 0 : 2);

// ---- Scoring against the real accept contract -------------------------------------------

const parsed = [...run.answers].filter(([, a]) => a.value !== null);
const scores = await app.score(parsed.map(([id, a]) => ({ pack: keys.get(id)!.deck.pack, value: a.value! })));
const scoreOf = new Map(parsed.map(([id], i) => [id, scores[i]]));

const out = new URL("rows.jsonl", run.dir);
for (const [customId, answer] of run.answers) {
  const { cell, deck, trial } = keys.get(customId)!;
  const scored = scoreOf.get(customId) ?? { outcome: answer.malformed?.startsWith("upstream") ? "upstream_busy" : "malformed" };
  appendFileSync(out, `${JSON.stringify({
    runId: run.runId, feature: "tuning", variant: variant.id,
    set: args.overlay ? (args.set === "dev" ? "dev-overlay" : "overlay") : args.decks ? "custom" : args.set,
    deckId: deck.deckId, trial, ...commonRow(cell, answer, args.realtime!, app.maxTokens), ...scored, reply: answer.value,
  })}\n`);
}
log(`wrote ${run.answers.size} rows to ${out.pathname}`);
process.exit(0);
