/**
 * `pnpm eval:tuning-blind-judge` — a BLIND, model-judged comparison of Suggested changes lists:
 * for each of the twelve decks, the list Sonnet 5 wrote and the list Sonnet 5.5 wrote, shown to a
 * judge (Opus 5.5, a third model) as "List 1" and "List 2" in an order fixed by a hash of the deck
 * name, with the deck's own evidence pack. The judge scores each list 1 to 5 and names a winner.
 * It is a MODEL's judgement, not Hugh's, and says so wherever its figures are quoted.
 *
 *   pnpm eval:tuning-blind-judge [--part 1|2] [--only a,b] [--dry-run] [--a <run-dir-glob-token>] [--b <token>]
 *
 * Reads the rows `tuning-model-arms` wrote (gitignored run dirs), sends twelve real-time requests on
 * the `ledger-model-switch` ledger (cap $1.50), and writes `judgements.jsonl` beside its run.
 */
import "../lib/env.mjs";

import { createHash } from "node:crypto";
import { appendFileSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { z } from "zod";

import { PLAYER_TEXT_SYSTEM_RULE } from "../../src/lib/model/player-text";
import { LEDGER_LIMITS } from "../../src/lib/eval/ledger-limits";
import { buildParams } from "./lib/request.mjs";
import { ROOT, runRequests } from "./lib/run.mjs";
import { openTuning } from "./lib/tuning-app.mjs";
import { TUNING_VARIANTS } from "./variants/tuning.mjs";

const { values: args } = parseArgs({
  options: { part: { type: "string" }, only: { type: "string" }, "dry-run": { type: "boolean", default: false }, a: { type: "string", default: "sonnet-medium" }, b: { type: "string", default: "sonnet55-medium" } },
});
const log = (line: string) => console.log(`[eval:tuning-blind-judge] ${line}`);
const JUDGE = "claude-opus-5-5";
const LEDGER = new URL("ledger-model-switch.jsonl", ROOT).pathname;
const LIMITS = LEDGER_LIMITS["ledger-model-switch.jsonl"];

type Row = { deck: string; deckId: string; outcome: string; reply: { additions: Line[]; cuts: Line[] } | null; keptSuggestions: unknown[] };
type Line = { card: string; rationale: string; evidence: { kind: string; value: string }[] };

/** The first sample of an arm: the `-p1` and `-p2` run dirs whose label is the bare arm name. */
function rowsOf(arm: string): Map<string, Row> {
  const runs = new URL("runs/", ROOT);
  const out = new Map<string, Row>();
  for (const d of readdirSync(runs).filter((n) => new RegExp(`-tuning-model-arms-${arm}-p[12]$`).test(n))) {
    for (const l of readFileSync(new URL(`${d}/rows.jsonl`, runs), "utf8").split("\n").filter(Boolean)) {
      const r = JSON.parse(l) as Row;
      out.set(r.deck, r);
    }
  }
  return out;
}

const verdict = z.object({
  list1: z.object({ score: z.number().int().min(1).max(5), problems: z.array(z.string().max(200)).max(6) }),
  list2: z.object({ score: z.number().int().min(1).max(5), problems: z.array(z.string().max(200)).max(6) }),
  winner: z.enum(["list1", "list2", "tie"]),
  why: z.string().max(400),
});

const SYSTEM = [
  "You are an experienced Magic: The Gathering Commander deckbuilder reviewing two candidate lists of suggested changes to the same deck.",
  // The pack carries the player's own words inside `playerText` tags; the rule says they are data.
  PLAYER_TEXT_SYSTEM_RULE,
  "Each list adds some cards and cuts some cards. You are shown the deck's evidence pack (what the deck is, its roles against targets, its games) and then the two lists, labelled only List 1 and List 2.",
  "Score each list from 1 to 5 on how good it is for THIS deck: right cards for the plan, cuts that are really the weakest or most redundant, rationales that are specific and true to the evidence pack, and no claim the pack contradicts. A list with nothing in it scores 1.",
  "Name every problem you find as a short phrase (a suggested card already in the deck, an illegal or off-color card, a rationale contradicted by the pack, a generic rationale). Then name the better list, or tie. Judge the content only; length is not quality.",
].join("\n");

const listText = (label: string, r: Row | undefined) => {
  const lines = r?.reply ? [...r.reply.additions.map((l) => ["Add", l] as const), ...r.reply.cuts.map((l) => ["Cut", l] as const)] : [];
  return [`${label}:`, ...(lines.length === 0 ? ["(empty: no suggestions)"] : lines.map(([k, l]) => `- ${k} ${l.card}: ${l.rationale} [${l.evidence.map((e) => `${e.kind}: ${e.value}`).join("; ")}]`))].join("\n");
};

const a = rowsOf(args.a!);
const b = rowsOf(args.b!);
const part = args.part === undefined ? null : Number(args.part);
if (part !== null && part !== 1 && part !== 2) throw new Error("--part must be 1 or 2");
// Halves, because the guard sums every request's worst case and twelve together is over the cap.
const decks = [...a.keys()].filter((d) => b.has(d)).sort().filter((_, i) => part === null || i % 2 === part - 1)
  // `--only "Yuriko,Counter Intelligence"` keeps the decks whose names contain one of the fragments.
  .filter((d) => args.only === undefined || args.only.split(",").some((f) => d.includes(f.trim())));
if (decks.length === 0) throw new Error("no decks in common between the two arms' rows");
log(`${decks.length} decks in common`);

const app = await openTuning();
const ids = decks.map((n) => a.get(n)!.deckId);
const prepared = await app.prepare(ids, TUNING_VARIANTS.base, null);
const order = new Map<string, "ab" | "ba">();
const keys = new Map<string, string>();
const first = prepared.map((deck, i) => {
  const name = decks[i];
  const flip = createHash("sha256").update(`judge:${name}`).digest()[0] % 2 === 0 ? "ab" : "ba";
  order.set(name, flip);
  const [x, y] = flip === "ab" ? [a.get(name), b.get(name)] : [b.get(name), a.get(name)];
  const customId = `judge-${part ?? 0}-${i}`;
  keys.set(customId, name);
  const user = [`The deck's evidence pack:`, deck.user, "", listText("List 1", x), "", listText("List 2", y)].join("\n");
  return { customId, params: buildParams({ model: JUDGE, system: SYSTEM, user, maxTokens: 1400, schema: verdict }) };
});

const run = await runRequests({
  feature: "tuning-blind-judge", label: `judge${part ? `-p${part}` : ""}${args.only ? "-only" : ""}`, first, schema: verdict, realtime: true, dryRun: args["dry-run"]!, planDone: 0,
  meta: { a: args.a, b: args.b, judge: JUDGE, decks }, prepared: { order: [...order] }, log, ledger: { path: LEDGER, limits: LIMITS },
});
if (!run) process.exit(args["dry-run"] ? 0 : 2);

const out = new URL("judgements.jsonl", run.dir);
for (const [customId, answer] of run.answers) {
  const deck = keys.get(customId)!;
  const flip = order.get(deck)!;
  const v = answer.value;
  // Back to the arms: `ab` showed arm a first.
  const scoreA = v ? (flip === "ab" ? v.list1.score : v.list2.score) : null;
  const scoreB = v ? (flip === "ab" ? v.list2.score : v.list1.score) : null;
  const winner = !v ? null : v.winner === "tie" ? "tie" : (v.winner === "list1") === (flip === "ab") ? args.a : args.b;
  appendFileSync(out, `${JSON.stringify({ deck, order: flip, scoreA, scoreB, winner, problemsA: v ? (flip === "ab" ? v.list1.problems : v.list2.problems) : null, problemsB: v ? (flip === "ab" ? v.list2.problems : v.list1.problems) : null, why: v?.why ?? null })}\n`);
}
writeFileSync(new URL("done", run.dir), "ok\n");
log(`wrote ${run.answers.size} judgements to ${out.pathname}`);
process.exit(0);
