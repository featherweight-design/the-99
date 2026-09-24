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
 *
 * It reports all four contracts from the one run: shipped, (A) drop the line under Design's
 * minimums, (B) this repair, and A+B. A+B is DERIVED rather than sent: a section passes when the
 * drop-line rule passes it on the first answer, or it was repaired and passes on the repair. That
 * is an approximation in one direction worth naming — B's repair asks for every section the
 * SHIPPED rule refused, a superset of what A+B would ask for — and A+B charges a repair only to
 * answers the drop-line rule still fails.
 *
 * `--fresh-facts` rebuilds every deck's facts with the CURRENT `factsFor` first, so the first
 * answers are judged, and the repair is asked for and judged, under the contract as it now ships
 * (a facts fix landing after the first write, measured on the path production would take).
 * `--rescore <repairRunId>` sends nothing: it re-reads that run's stored repair replies and scores
 * everything again.
 */
import "../lib/env.mjs";

import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { DESIGN_MINIMUMS, dropLineRule, type SectionPass } from "./lib/line-rule.mjs";
import type { Got } from "./lib/batch.mjs";
import { buildParams, parseReply } from "./lib/request.mjs";
import { commonRow, parseCell, ROOT, runRequests, type Answer } from "./lib/run.mjs";
import { openSynopsis } from "./lib/synopsis-app.mjs";
import { applySynopsisVariant, SYNOPSIS_VARIANTS } from "./variants/synopsis.mjs";

const { values: args } = parseArgs({
  options: {
    from: { type: "string" },
    cell: { type: "string" },
    variant: { type: "string", default: "base" },
    "dry-run": { type: "boolean", default: false },
    "plan-done": { type: "string", default: "0.9" },
    rescore: { type: "string" },
    "fresh-facts": { type: "boolean", default: false },
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
let factsOf = new Map((JSON.parse(readFileSync(new URL("prepared.json", dir), "utf8")) as { deckId: string; facts: Facts }[]).map((p) => [p.deckId, p.facts]));
const variant = SYNOPSIS_VARIANTS[args.variant!];
if (args["fresh-facts"]) {
  const fresh = await app.freshFacts(factsOf, variant);
  log(`facts rebuilt with the current factsFor; fields that moved: ${[...fresh.moved].map(([k, n]) => `${k} on ${n} decks`).join(", ") || "none"}`);
  factsOf = fresh.facts;
}
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

/**
 * A stored repair run's replies, parsed as the run parsed them: first attempt, then the retry.
 * Keyed through that run's OWN prepared list, since custom ids are positions in the list of
 * answers repaired then, and fresh facts can change which answers would be repaired now.
 */
function storedAnswers(runId: string) {
  const runDir = new URL(`runs/${runId}/`, ROOT);
  const attempts = new Map<string, Got[]>();
  for (const pass of ["a1", "a2"]) {
    const f = new URL(`raw-${pass}.jsonl`, runDir);
    if (!existsSync(f)) continue;
    for (const g of readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Got)) {
      const id = g.customId.replace(/-r$/, "");
      attempts.set(id, [...(attempts.get(id) ?? []), g]);
    }
  }
  const sent = JSON.parse(readFileSync(new URL("prepared.json", runDir), "utf8")) as { deckId: string; trial: number; refused: SectionId[] }[];
  const answers = new Map<string, Answer<Reply>>();
  const byAnswer = new Map<string, { answer: Answer<Reply>; refused: SectionId[] }>();
  sent.forEach((p, i) => {
    const customId = `repair-d${String(i).padStart(3, "0")}`;
    const tries = attempts.get(customId) ?? [];
    let value: Reply | null = null;
    let malformed: string | null = "no reply";
    for (const t of tries) {
      if (!t.ok) { malformed = `upstream: ${t.reason}`; continue; }
      const p = parseReply(app.schema, t.message);
      if (p.ok) { value = p.value; malformed = null; break; }
      malformed = p.reason;
    }
    answers.set(customId, { attempts: tries, value, malformed });
    byAnswer.set(`${p.deckId}|${p.trial}`, { answer: { attempts: tries, value, malformed }, refused: p.refused });
  });
  return { runId, dir: runDir, answers, byAnswer };
}

const stored = args.rescore ? storedAnswers(args.rescore) : null;
const run = stored ?? await runRequests({
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

// A re-score writes nothing: the run's own rows stay what was measured when it was sent.
const out = args.rescore ? null : new URL("rows.jsonl", run.dir);
const tally = { shipped: [0, 0], a: [0, 0], b: [0, 0], ab: [0, 0] } as Record<string, [number, number]>;
const add = (k: string, passed: boolean, usdOfAnswer: number) => { tally[k][0] += passed ? 1 : 0; tally[k][1] += usdOfAnswer; };
const allPass = (p: SectionPass) => Object.values(p).every(Boolean);
// Each repaired answer, with the sections its repair was asked for.
const repaired = new Map<string, { answer: Answer<unknown>; refused: SectionId[] }>();
if (stored) for (const [k, v] of stored.byAnswer) repaired.set(k, v);
else for (const [customId, answer] of run.answers) {
  const f = keys.get(customId)!;
  repaired.set(`${f.row.deckId}|${f.row.trial}`, { answer, refused: f.refused });
}
for (const f of firsts) {
  const before = !!f.checked && f.refused.length === 0;
  const rep = repaired.get(`${f.row.deckId}|${f.row.trial}`);
  let after = before;
  let mergedVerdicts = f.checked?.verdicts ?? [];
  let repairRow: Record<string, unknown> = {};
  const facts = factsOf.get(f.row.deckId)!;
  const firstDrop = f.row.reply ? dropLineRule(f.row.reply, facts, await app.catalog(f.row.reply, facts), DESIGN_MINIMUMS) : null;
  let repairDrop: SectionPass | null = null;
  if (rep) {
    repairRow = commonRow(cell, rep.answer, false, app.maxTokens);
    // Only a section refused now AND repaired then takes the repair's version: under fresh facts a
    // section the repair rewrote may pass on the first answer, and that one is kept.
    const retaken = rep.refused.filter((s) => f.refused.includes(s));
    if (rep.answer.value) {
      const value = rep.answer.value as Reply;
      const catalog = await app.catalog(value, facts);
      const fresh = app.validate(value, facts, catalog);
      repairDrop = dropLineRule(value, facts, catalog, DESIGN_MINIMUMS);
      const merged = mergeRetry(f.checked!, fresh, retaken).content;
      mergedVerdicts = merged.verdicts;
      after = merged.verdicts.every((v) => v.status === "ok");
    }
  }
  const firstUsd = f.row.usdRealtime;
  const repairUsd = (repairRow.usdRealtime as number | undefined) ?? 0;
  const aPass = !!firstDrop && allPass(firstDrop);
  const abPass = aPass || (!!firstDrop && (Object.keys(firstDrop) as SectionId[]).every((s) => firstDrop[s] || (!!rep?.refused.includes(s) && !!repairDrop?.[s])));
  add("shipped", before, firstUsd);
  add("a", aPass, firstUsd);
  add("b", after, firstUsd + repairUsd);
  add("ab", abPass, firstUsd + (aPass ? 0 : repairUsd));
  if (out) appendFileSync(out, `${JSON.stringify({
    runId: run.runId, feature: "synopsis-repair", from: args.from, cell: args.cell, variant: args.variant, set: f.row.set,
    deckId: f.row.deckId, trial: f.row.trial, firstUsdRealtime: f.row.usdRealtime, repair: repairRow,
    passedBefore: before, passedAfter: after, verdictsAfter: mergedVerdicts, dropLineFirst: firstDrop, dropLineRepair: repairDrop, passedA: aPass, passedAB: abPass,
  })}\n`);
}
for (const [k, name] of [["shipped", "shipped"], ["a", "(A) drop the line"], ["b", "(B) repair"], ["ab", "(A+B)"]] as const) {
  const [n, u] = tally[k];
  log(`${name}: all four sections on ${n} of ${firsts.length} (${Math.round((100 * n) / firsts.length)}%); $${(u / Math.max(1, n)).toFixed(4)} per accepted answer at real-time prices`);
}
process.exit(0);
