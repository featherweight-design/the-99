/**
 * `pnpm eval:repair --from <runId> --cell sonnet-low --variant budgets-plus [--dry-run]`
 *
 * A WHAT-IF for Hugh (orchestrator, 2026-09-24): after a first write, ONE follow-up call per answer
 * that had a section refused, asking for those sections again with the reasons they failed.
 *
 * The follow-up is the app's own section retry, not a new prompt: `buildSynopsisPrompt(facts,
 * { keep, refused })` writes it, the run's own variant is applied on top exactly as it was to the
 * first write, and one line is appended naming each refused section's reason. The merge is the
 * app's `mergeRetry`, which keeps every passing section byte for byte. Both calls are charged to
 * the answer, so "per accepted answer" includes the repair.
 */
import "../lib/env.mjs";

import { appendFileSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { buildParams } from "./lib/request.mjs";
import { commonRow, parseCell, ROOT, runRequests } from "./lib/run.mjs";
import { openSynopsis } from "./lib/synopsis-app.mjs";
import { applySynopsisVariant, SYNOPSIS_VARIANTS } from "./variants/synopsis.mjs";

const { values: args } = parseArgs({
  options: {
    from: { type: "string" },
    cell: { type: "string" },
    variant: { type: "string", default: "base" },
    "dry-run": { type: "boolean", default: false },
    "plan-done": { type: "string", default: "0.9" },
  },
});
if (!args.from || !args.cell) throw new Error("eval:repair needs --from <runId> and --cell");
const log = (line: string) => console.log(`[eval:repair] ${line}`);

const app = await openSynopsis();
const { buildSynopsisPrompt } = await import("../../src/lib/synopsis/prompt");
const { mergeRetry } = await import("../../src/lib/synopsis/generate");
type Facts = import("../../src/lib/synopsis/facts").SynopsisFacts;
type Reply = import("../../src/lib/synopsis/response-schema").SynopsisResponse;
type SectionId = import("../../src/lib/synopsis/types").SectionId;

const dir = new URL(`runs/${args.from}/`, ROOT);
const factsOf = new Map((JSON.parse(readFileSync(new URL("prepared.json", dir), "utf8")) as { deckId: string; facts: Facts }[]).map((p) => [p.deckId, p.facts]));
const variant = SYNOPSIS_VARIANTS[args.variant!];
const cell = parseCell(args.cell, app.model);
type Row = { deckId: string; trial: number; cell: string; variant: string; reply: Reply | null; usdRealtime: number; set: string };
const rows = readFileSync(new URL("rows.jsonl", dir), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Row)
  .filter((r) => r.cell === args.cell && r.variant === args.variant);
log(`${rows.length} answers from ${args.from} (${args.cell}, ${args.variant})`);

// What each answer showed, and which sections a repair would ask for.
const firsts = await Promise.all(rows.map(async (r) => {
  if (!r.reply) return { row: r, checked: null, refused: [] as SectionId[] };
  const facts = factsOf.get(r.deckId)!;
  const checked = app.validate(r.reply, facts, await app.catalog(r.reply, facts));
  return { row: r, checked, refused: checked.verdicts.filter((v) => v.status === "refused").map((v) => v.section) };
}));
const toRepair = firsts.filter((f) => f.checked && f.refused.length > 0);

const keys = new Map<string, (typeof firsts)[number]>();
const first = toRepair.map((f, i) => {
  const facts = factsOf.get(f.row.deckId)!;
  const reasons = f.checked!.verdicts.flatMap((v) => (v.status === "refused" ? [`${v.section}: ${v.reason}${v.failed ? ` (${v.failed} of ${v.total} cards failed checking)` : ""}`] : []));
  const { messages } = applySynopsisVariant(variant, facts, (fx) => buildSynopsisPrompt(fx, { keep: f.checked!, refused: f.refused }));
  const user = `${messages.user}\nThose sections failed checking for these reasons; fix exactly these: ${reasons.join("; ")}.`;
  const customId = `repair-d${String(i).padStart(3, "0")}`;
  keys.set(customId, f);
  return { customId, params: buildParams({ model: cell.model, system: messages.system, user, maxTokens: app.maxTokens, schema: app.schema }, cell) };
});
log(`${toRepair.length} of ${rows.length} answers had a refused section and get one repair call`);

const run = await runRequests({
  feature: "synopsis",
  label: `repair-${args.cell}-${args.variant}`,
  first,
  schema: app.schema,
  realtime: false,
  dryRun: args["dry-run"]!,
  planDone: Number(args["plan-done"]),
  meta: { args, from: args.from, variant: { id: variant.id, reason: variant.reason } },
  prepared: toRepair.map((f) => ({ deckId: f.row.deckId, trial: f.row.trial, refused: f.refused })),
  log,
});
if (!run) process.exit(args["dry-run"] ? 0 : 2);

const out = new URL("rows.jsonl", run.dir);
let passedBefore = 0;
let passedAfter = 0;
let usd = 0;
const repaired = new Map<string, { answer: Parameters<typeof commonRow>[1]; customId: string }>();
for (const [customId, answer] of run.answers) repaired.set(`${keys.get(customId)!.row.deckId}|${keys.get(customId)!.row.trial}`, { answer, customId });
for (const f of firsts) {
  const before = !!f.checked && f.refused.length === 0;
  const rep = repaired.get(`${f.row.deckId}|${f.row.trial}`);
  let after = before;
  let mergedVerdicts = f.checked?.verdicts ?? [];
  let repairRow: Record<string, unknown> = {};
  if (rep) {
    repairRow = commonRow(cell, rep.answer, false, app.maxTokens);
    if (rep.answer.value) {
      const facts = factsOf.get(f.row.deckId)!;
      const value = rep.answer.value as Reply;
      const fresh = app.validate(value, facts, await app.catalog(value, facts));
      const merged = mergeRetry(f.checked!, fresh, f.refused).content;
      mergedVerdicts = merged.verdicts;
      after = merged.verdicts.every((v) => v.status === "ok");
    }
  }
  passedBefore += before ? 1 : 0;
  passedAfter += after ? 1 : 0;
  usd += f.row.usdRealtime + ((repairRow.usdRealtime as number | undefined) ?? 0);
  appendFileSync(out, `${JSON.stringify({
    runId: run.runId, feature: "synopsis-repair", from: args.from, cell: args.cell, variant: args.variant, set: f.row.set,
    deckId: f.row.deckId, trial: f.row.trial, firstUsdRealtime: f.row.usdRealtime, repair: repairRow,
    passedBefore: before, passedAfter: after, verdictsAfter: mergedVerdicts,
  })}\n`);
}
log(`all four sections: ${passedBefore} of ${firsts.length} before repair, ${passedAfter} after; $${(usd / Math.max(1, passedAfter)).toFixed(4)} per accepted answer at real-time prices, repair included`);
process.exit(0);
