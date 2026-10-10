/**
 * `pnpm eval:tuning-lists` — the ONE paid eval for Tuning sub-project 8 (Suggested changes' two
 * lists) and labels-everywhere PR 8 (the deck profile's roles counted by label): the same decks
 * and the same contract (prompt v8), once with LABEL_ROLE_COUNTS_ENABLED off and once on, one
 * sample per deck, through the Batch API, so a change in answers is attributable to the basis.
 *
 *   pnpm eval:tuning-lists [--dry-run] [--label lists]
 *
 * Hard cap $3 on ITS OWN ledger (`ledger-tuning-lists.jsonl`, Hugh 2026-10-10): the guard sums each
 * request's worst case (reply at max_tokens, two attempts) before anything is sent. Staging is
 * read-only. `src/` is imported, never restated (`lib/tuning-app.mts`); the two arms differ ONLY in
 * the env switch read when each pack is prepared.
 */
import "../lib/env.mjs";

import { appendFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { buildParams } from "./lib/request.mjs";
import { commonRow, parseCell, ROOT, runRequests } from "./lib/run.mjs";
import { openTuning } from "./lib/tuning-app.mjs";
import { TUNING_VARIANTS } from "./variants/tuning.mjs";

const { values: args } = parseArgs({
  options: { "dry-run": { type: "boolean", default: false }, label: { type: "string", default: "lists" } },
});
const log = (line: string) => console.log(`[eval:tuning-lists] ${line}`);

/** Twelve of Hugh's staging decks: the four the labels PR 8 measured moving most (Wizards, Yuriko,
 *  Gishath, Eldrazi), Omnath and Aang (ramp), Counter Intelligence (a counterspell deck), and five more. */
const NAMES = ["HD - Wizards", "HD - Yuriko", "HD - Gishath", "HD - Omnath", "HD - Eldrazi", "HD Tune - Counter Intelligence",
  "HD - Avatar Aang", "HD - Elves", "HD - Goblins", "HD - Gods", "HD - Kratos", "HD - Zombies"];
const LEDGER = new URL("ledger-tuning-lists.jsonl", ROOT).pathname;
const LIMITS = { hardCapUsd: 3, askAtUsd: 2.5 };

const app = await openTuning();
const ids = NAMES.map((n) => {
  const hit = [...app.nameOf].find(([, name]) => name === n);
  if (!hit) throw new Error(`eval: no staging deck named ${n}`);
  return hit[0];
});
const cell = parseCell("sonnet-medium", app.model);
const variant = TUNING_VARIANTS.base;

const arms = ["off", "on"] as const;
const prepared: Record<(typeof arms)[number], Awaited<ReturnType<typeof app.prepare>>> = { off: [], on: [] };
for (const arm of arms) {
  process.env.LABEL_ROLE_COUNTS_ENABLED = arm === "on" ? "true" : "false";
  prepared[arm] = await app.prepare(ids, variant, null);
}
delete process.env.LABEL_ROLE_COUNTS_ENABLED;

const keys = new Map<string, { arm: (typeof arms)[number]; deck: (typeof prepared.off)[number] }>();
const first = arms.flatMap((arm) => prepared[arm].map((deck, d) => {
  const customId = `${arm}-d${d}`;
  keys.set(customId, { arm, deck });
  return { customId, params: buildParams({ model: cell.model, system: deck.system, user: deck.user, maxTokens: app.maxTokens, schema: app.schema }, cell) };
}));

const run = await runRequests({
  feature: "tuning-lists",
  label: args.label!,
  first,
  schema: app.schema,
  realtime: false,
  dryRun: args["dry-run"]!,
  planDone: 0,
  meta: { arms, promptVersion: app.promptVersion, cell: cell.id, decks: NAMES.map((n, i) => ({ name: n, deckId: ids[i] })) },
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
  const { arm, deck } = keys.get(customId)!;
  const scored = scoreOf.get(customId) ?? { outcome: "malformed" };
  appendFileSync(out, `${JSON.stringify({
    runId: run.runId, arm, deck: app.nameOf.get(deck.deckId), deckId: deck.deckId,
    ...commonRow(cell, answer, false, app.maxTokens), ...scored, reply: answer.value,
  })}\n`);
}
writeFileSync(new URL("done", run.dir), "ok\n");
log(`wrote ${run.answers.size} rows to ${out.pathname}`);
process.exit(0);
