/**
 * `pnpm eval:tuning-model-arms` — Suggested changes on three models, the same twelve decks, the same
 * contract (prompt v8) and the same effort, one sample per deck, REAL-TIME (latency is a column).
 * Model tiering, 2026-10-12: the app's `claude-sonnet-5` against `claude-sonnet-5-5` and
 * `claude-haiku-5-5`, so a model is the only thing that differs.
 *
 *   pnpm eval:tuning-model-arms --arm sonnet-medium|sonnet55-medium|haiku55-medium [--dry-run]
 *
 * Hard cap $2 for the whole arm set, on ITS OWN ledger (`ledger-model-tiering-tuning.jsonl`): the
 * guard sums each request's worst case before anything is sent, so one arm per invocation, all
 * three on the one ledger. Staging is read-only. `src/` is imported, never restated.
 */
import "../lib/env.mjs";

import { appendFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { LEDGER_LIMITS } from "../../src/lib/eval/ledger-limits";
import { buildParams } from "./lib/request.mjs";
import { commonRow, parseCell, ROOT, runRequests } from "./lib/run.mjs";
import { openTuning } from "./lib/tuning-app.mjs";
import { TUNING_VARIANTS } from "./variants/tuning.mjs";

const { values: args } = parseArgs({
  options: { "dry-run": { type: "boolean", default: false }, arm: { type: "string" }, part: { type: "string" }, label: { type: "string" } },
});
const ARMS = ["sonnet-medium", "sonnet55-medium", "haiku55-medium"] as const;
if (!args.arm || !(ARMS as readonly string[]).includes(args.arm)) throw new Error(`--arm must be one of ${ARMS.join(", ")}`);
const log = (line: string) => console.log(`[eval:tuning-model-arms] ${line}`);

/** Twelve of Hugh's staging decks: the four the labels PR 8 measured moving most (Wizards, Yuriko,
 *  Gishath, Eldrazi), Brago (replacing Omnath, no longer on staging) and Aang, Counter Intelligence (a counterspell deck), and five more. */
const NAMES = ["HD - Wizards", "HD - Yuriko", "HD - Gishath", "HD - Brago", "HD - Eldrazi", "HD Tune - Counter Intelligence",
  "HD - Avatar Aang", "HD - Elves", "HD - Goblins", "HD - Gods", "HD - Kratos", "HD - Zombies"];
const LEDGER = new URL("ledger-model-tiering-tuning.jsonl", ROOT).pathname;
const LIMITS = LEDGER_LIMITS["ledger-model-tiering-tuning.jsonl"];

const app = await openTuning();
// The guard sums each request's WORST case (reply at max_tokens, two attempts), which for twelve
// answers on a Sonnet is over the whole $2 though a real answer costs about $0.035. So an arm can be
// sent in two halves; the second half's worst case then sits on the first half's real spend.
const part = args.part === undefined ? null : Number(args.part);
if (part !== null && part !== 1 && part !== 2) throw new Error("--part must be 1 or 2");
const picked = part === null ? NAMES : NAMES.filter((_, i) => i % 2 === part - 1);
const ids = picked.map((n) => {
  const hit = [...app.nameOf].find(([, name]) => name === n);
  if (!hit) throw new Error(`eval: no staging deck named ${n}`);
  return hit[0];
});
const cell = parseCell(args.arm, app.model);
const variant = TUNING_VARIANTS.base;

const prepared = await app.prepare(ids, variant, null);
const keys = new Map<string, { deck: (typeof prepared)[number] }>();
const first = prepared.map((deck, d) => {
  const customId = `${cell.id}-${part ?? 0}-d${d}`;
  keys.set(customId, { deck });
  return { customId, params: buildParams({ model: cell.model, system: deck.system, user: deck.user, maxTokens: app.maxTokens, schema: app.schema }, cell) };
});

const run = await runRequests({
  feature: "tuning-model-arms",
  label: args.label ?? `${cell.id}${part ? `-p${part}` : ""}`,
  first,
  schema: app.schema,
  realtime: true,
  dryRun: args["dry-run"]!,
  planDone: 0,
  meta: { arm: cell.id, promptVersion: app.promptVersion, cell: cell.id, decks: picked.map((n, i) => ({ name: n, deckId: ids[i] })) },
  prepared,
  log,
  ledger: { path: LEDGER, limits: LIMITS },
});
if (!run) process.exit(args["dry-run"] ? 0 : 2);

const parsed = [...run.answers].filter(([, a]) => a.value !== null);
const scores = await app.score(parsed.map(([id, a]) => ({ pack: keys.get(id)!.deck.pack, value: a.value! })));
const scoreOf = new Map(parsed.map(([id], i) => [id, scores[i]]));
const out = new URL("rows.jsonl", run.dir);
for (const [customId, answer] of run.answers) {
  const { deck } = keys.get(customId)!;
  const scored = scoreOf.get(customId) ?? { outcome: "malformed" };
  appendFileSync(out, `${JSON.stringify({
    runId: run.runId, arm: cell.id, deck: app.nameOf.get(deck.deckId), deckId: deck.deckId,
    ...commonRow(cell, answer, false, app.maxTokens), ...scored, reply: answer.value,
  })}\n`);
}
writeFileSync(new URL("done", run.dir), "ok\n");
log(`wrote ${run.answers.size} rows to ${out.pathname}`);
process.exit(0);
