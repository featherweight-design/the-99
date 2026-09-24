/**
 * `pnpm eval:rescore-lines [--runs a,b]` — every stored overview answer scored again under the
 * what-if "drop the line, not the section" rule (`lib/line-rule.mts`), beside the shipped rule.
 * It sends nothing to the model; it reads staging, read-only, only for the Weaknesses catalog.
 *
 * SELF-TEST FIRST. The line checks, rolled up under the shipped rule, must give exactly the
 * verdicts `validateSynopsis` gives on every answer. One disagreement and nothing is printed but
 * the disagreements, because a what-if built on checks that differ from the app's measures nothing.
 */
import "../lib/env.mjs";

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { DESIGN_MINIMUMS, dropLineRule, flatMinimums, shippedRule, type SectionPass } from "./lib/line-rule.mjs";
import { ROOT } from "./lib/run.mjs";
import { openSynopsis } from "./lib/synopsis-app.mjs";

const { values: args } = parseArgs({ options: { runs: { type: "string" }, out: { type: "string" } } });
const app = await openSynopsis();
const runsDir = new URL("runs/", ROOT);
const wanted = args.runs ? new Set(args.runs.split(",")) : null;

type Row = { runId: string; cell: string; maxTokens: number; variant: string; set: string; deckId: string; trial: number; reply: never | null; usdRealtime: number };
const RULES: [string, (r: never, f: never, c: never) => SectionPass][] = [
  ["shipped", (r, f, c) => shippedRule(r, f, c)],
  ["drop line, Design minimums", (r, f, c) => dropLineRule(r, f, c, DESIGN_MINIMUMS)],
  ["drop line, minimum 2", (r, f, c) => dropLineRule(r, f, c, flatMinimums(2))],
  ["drop line, minimum 3", (r, f, c) => dropLineRule(r, f, c, flatMinimums(3))],
];

const groups = new Map<string, { n: number; usd: number; pass: Map<string, SectionPass[]> }>();
const disagreements: string[] = [];
const seen = new Set<string>();
for (const run of readdirSync(runsDir).filter((r) => r.includes("-synopsis-")).sort()) {
  if (wanted && !wanted.has(run)) continue;
  const f = new URL(`${run}/rows.jsonl`, runsDir);
  if (!existsSync(f)) continue;
  const meta = JSON.parse(readFileSync(new URL(`${run}/meta.json`, runsDir), "utf8")) as { split: { dev: string[] } };
  const facts = new Map((JSON.parse(readFileSync(new URL(`${run}/prepared.json`, runsDir), "utf8")) as { deckId: string; facts: never }[]).map((p) => [p.deckId, p.facts]));
  for (const line of readFileSync(f, "utf8").split("\n").filter(Boolean)) {
    const row = JSON.parse(line) as Row;
    if (row.set === "all") row.set = meta.split.dev.includes(row.deckId) ? "dev" : "heldOut";
    const cell = `${row.cell.replace(/@max\d+$/, "")}@max${row.maxTokens}`;
    const k = `${row.set}|${cell}|${row.variant}`;
    // One answer per deck and trial, the earliest run's, as the report counts them.
    const once = `${k}|${row.deckId}|${row.trial}`;
    if (seen.has(once)) continue;
    seen.add(once);
    const g = groups.get(k) ?? { n: 0, usd: 0, pass: new Map(RULES.map(([name]) => [name, [] as SectionPass[]])) };
    groups.set(k, g);
    g.n += 1;
    g.usd += row.usdRealtime;
    const fx = facts.get(row.deckId)!;
    if (!row.reply) {
      for (const [name] of RULES) g.pass.get(name)!.push({ overview: false, primer: false, keyCards: false, weaknesses: false });
      continue;
    }
    const catalog = await app.catalog(row.reply, fx);
    const app_ = app.validate(row.reply, fx, catalog).verdicts;
    const mine = shippedRule(row.reply, fx, catalog);
    for (const v of app_) {
      const ok = v.status === "ok";
      if (mine[v.section as keyof SectionPass] !== ok) disagreements.push(`${run} ${row.cell} ${row.deckId} t${row.trial} ${v.section}: app ${v.status}${"reason" in v ? ` (${v.reason})` : ""}, line checks ${mine[v.section as keyof SectionPass] ? "ok" : "refused"}`);
    }
    for (const [name, rule] of RULES) g.pass.get(name)!.push(rule(row.reply, fx as never, catalog as never));
  }
}

if (disagreements.length > 0) {
  console.error(`eval:rescore-lines: the line checks disagree with validateSynopsis on ${disagreements.length} sections; no results printed:\n${disagreements.join("\n")}`);
  process.exit(1);
}

const pct = (n: number, d: number) => (d === 0 ? "–" : `${((100 * n) / d).toFixed(0)}%`);
const lines = ["# The overview under \"drop the line, not the section\"", "",
  "A what-if, measured on the stored answers. The line checks agree with `validateSynopsis` on every stored answer under the shipped rule (the self-test above passed).", "",
  "| set | cell | variant | rule | n | all 4 render | overview | primer | keyCards | weaknesses | $/answer | $/all-4 answer |",
  "|---|---|---|---|---|---|---|---|---|---|---|---|"];
for (const [k, g] of [...groups].sort()) {
  const [set, cell, variant] = k.split("|");
  for (const [name] of RULES) {
    const p = g.pass.get(name)!;
    const all = p.filter((s) => s.overview && s.primer && s.keyCards && s.weaknesses).length;
    const sec = (s: keyof SectionPass) => pct(p.filter((x) => x[s]).length, g.n);
    lines.push(`| ${set} | ${cell} | ${variant} | ${name} | ${g.n} | ${pct(all, g.n)} | ${sec("overview")} | ${sec("primer")} | ${sec("keyCards")} | ${sec("weaknesses")} | $${(g.usd / g.n).toFixed(4)} | ${all ? `$${(g.usd / all).toFixed(4)}` : "–"} |`);
  }
}
const text = lines.join("\n") + "\n";
if (args.out) writeFileSync(args.out, text);
console.log(text);
process.exit(0);
