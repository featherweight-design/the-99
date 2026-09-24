/**
 * `pnpm eval:tuning-strategy --runs <runId>,<runId>… [--set heldOut] [--trial 0]`
 *
 * The four checks Hugh's blind round 1 notes asked for, over the KEPT suggestions of each cell and
 * variant, which is what a player would see:
 *  - Key-card cuts: a cut naming a Key card of the deck's own stored overview (must be 0 under the
 *    `strategy` variant, which tells the model so);
 *  - universal-staple cuts: a cut naming a universal staple;
 *  - one-slot double fills: two or more suggestions filling a role that is exactly one short, read
 *    off their own `mix` citations (`role: have of target`, with or without the colon with have below target);
 *  - threshold-only share: suggestions whose only citations are role counts.
 * Reads `runs/strategy-overviews.json` for the Key cards and the universal set. Sends nothing.
 */
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { ROOT } from "./lib/run.mjs";
import type { StrategyInput } from "./variants/tuning.mjs";

const { values: args } = parseArgs({ options: { runs: { type: "string" }, set: { type: "string", default: "heldOut" }, trial: { type: "string" } } });
if (!args.runs) throw new Error("eval:tuning-strategy needs --runs");

const input = JSON.parse(readFileSync(new URL("runs/strategy-overviews.json", ROOT), "utf8")) as StrategyInput;
const universal = new Set(input.universal.map((n) => n.toLowerCase()));
type Suggestion = { cut: string; add: string; evidence: { kind: string; value: string }[] };
type Row = { set: string; cell: string; maxTokens: number; variant: string; deckId: string; trial: number; outcome: string; keptPositions?: number[]; reply: { suggestions: Suggestion[] } | null; usdRealtime: number };

const groups = new Map<string, { answers: number; kept: number; keyCut: number; universalCut: number; doubleFill: number; thresholdOnly: number; usd: number }>();
for (const run of args.runs.split(",")) {
  // A run over `all` decks is split back into its development and held-out decks, as report.mts does.
  const dev = new Set((JSON.parse(readFileSync(new URL(`runs/${run}/meta.json`, ROOT), "utf8")) as { split?: { dev: string[] } }).split?.dev ?? []);
  for (const line of readFileSync(new URL(`runs/${run}/rows.jsonl`, ROOT), "utf8").split("\n").filter(Boolean)) {
    const r = JSON.parse(line) as Row;
    if (r.set === "all") r.set = dev.has(r.deckId) ? "dev" : "heldOut";
    if (r.set !== args.set || (args.trial !== undefined && r.trial !== Number(args.trial))) continue;
    const k = `${r.cell.replace(/@max\d+$/, "")}@max${r.maxTokens} / ${r.variant}`;
    const g = groups.get(k) ?? { answers: 0, kept: 0, keyCut: 0, universalCut: 0, doubleFill: 0, thresholdOnly: 0, usd: 0 };
    groups.set(k, g);
    g.answers += 1;
    g.usd += r.usdRealtime;
    const kept = r.outcome === "survived" && r.reply && r.keptPositions ? r.keptPositions.map((i) => r.reply!.suggestions[i]) : [];
    const keyCards = new Set((input.decks[r.deckId]?.keyCards ?? []).map((n) => n.toLowerCase()));
    const fills = new Map<string, { n: number; gap: number }>();
    for (const s of kept) {
      g.kept += 1;
      if (keyCards.has(s.cut.toLowerCase())) g.keyCut += 1;
      if (universal.has(s.cut.toLowerCase())) g.universalCut += 1;
      if (s.evidence.every((e) => e.kind === "mix")) g.thresholdOnly += 1;
      for (const e of s.evidence) {
        const m = e.kind === "mix" ? /^(.+?):? (\d+) of (\d+)$/.exec(e.value) : null;
        if (m && Number(m[2]) < Number(m[3])) {
          const f = fills.get(m[1]) ?? { n: 0, gap: Number(m[3]) - Number(m[2]) };
          f.n += 1;
          fills.set(m[1], f);
        }
      }
    }
    if ([...fills.values()].some((f) => f.gap === 1 && f.n > 1)) g.doubleFill += 1;
  }
}

console.log(`| cell / variant | answers | kept per answer | Key-card cuts | universal-staple cuts | answers double-filling a one-slot gap | threshold-only share | $/answer |`);
console.log(`|---|---|---|---|---|---|---|---|`);
for (const [k, g] of [...groups].sort()) {
  console.log(`| ${k} | ${g.answers} | ${(g.kept / g.answers).toFixed(2)} | ${g.keyCut} | ${g.universalCut} | ${g.doubleFill} | ${g.kept ? Math.round((100 * g.thresholdOnly) / g.kept) : 0}% | $${(g.usd / g.answers).toFixed(4)} |`);
}
