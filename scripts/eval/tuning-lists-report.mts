/**
 * `pnpm eval:tuning-lists-report <runId>` — free: reads a tuning-lists run's rows and prints the
 * switch-off versus switch-on comparison as Markdown. Nothing is sent to the model.
 */
import "../lib/env.mjs";

import { readFileSync } from "node:fs";

const runId = process.argv[2];
if (!runId) throw new Error("eval:tuning-lists-report needs a run id");
type Row = {
  arm: "off" | "on"; deck: string; outcome: string; returnedAdditions?: number; returnedCuts?: number;
  keptAdditions?: number; keptCuts?: number; drops?: string[]; usdAsRun: number; attempts: number;
  usage: { input_tokens: number; output_tokens: number }[];
  keptSuggestions?: { addOracleId: string | null; cutOracleId: string | null; evidence: { kind: string; value: string }[]; rationale: string }[];
  reply: { additions: { card: string; rationale: string; evidence: { kind: string; value: string }[] }[]; cuts: { card: string; rationale: string; evidence: { kind: string; value: string }[] }[] } | null;
};
const rows = readFileSync(new URL(`../../docs/superpowers/eval/runs/${runId}/rows.jsonl`, import.meta.url), "utf8")
  .split("\n").filter(Boolean).map((l) => JSON.parse(l) as Row);

const { connectStaging } = await import("./lib/staging.mjs");
const db = await connectStaging();
const { sql } = await import("drizzle-orm");
const names = [...new Set(rows.flatMap((r) => [...(r.reply?.additions ?? []), ...(r.reply?.cuts ?? [])].map((l) => l.card)))];
const counter = new Set<string>();
if (names.length > 0) {
  const res = await db.execute(sql`select name from cards where name in (${sql.join(names.map((n) => sql`${n}`), sql`, `)})
    and oracle_text ~* 'counter target[^.]*spell'`);
  for (const r of res.rows as { name: string }[]) counter.add(r.name);
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const lines: string[] = [];
const P = (s = "") => lines.push(s);
P(`# Suggested changes, two lists: switch off vs on (${runId})`);
P();
P("| arm | n | survived | adds returned | cuts returned | adds kept | cuts kept | out tok (mean) | in tok (mean) | $ (batch) |");
P("|---|---|---|---|---|---|---|---|---|---|");
for (const arm of ["off", "on"] as const) {
  const g = rows.filter((r) => r.arm === arm);
  const u = g.flatMap((r) => r.usage);
  P(`| ${arm} | ${g.length} | ${g.filter((r) => r.outcome === "survived").length} | ${(sum(g.map((r) => r.returnedAdditions ?? 0)) / g.length).toFixed(2)} | ${(sum(g.map((r) => r.returnedCuts ?? 0)) / g.length).toFixed(2)} | ${(sum(g.map((r) => r.keptAdditions ?? 0)) / g.length).toFixed(2)} | ${(sum(g.map((r) => r.keptCuts ?? 0)) / g.length).toFixed(2)} | ${Math.round(sum(u.map((x) => x.output_tokens)) / g.length)} | ${Math.round(sum(u.map((x) => x.input_tokens)) / g.length)} | $${sum(g.map((r) => r.usdAsRun)).toFixed(4)} |`);
}
P();
P("## Drops by rule");
for (const arm of ["off", "on"] as const) {
  const d = new Map<string, number>();
  for (const r of rows.filter((x) => x.arm === arm)) for (const x of r.drops ?? []) d.set(x, (d.get(x) ?? 0) + 1);
  P(`- **${arm}**: ${[...d].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", ") || "none"}`);
}
P();
P("## Per deck: kept adds/cuts, mix citations, counterspell named as removal");
P("| deck | off adds/cuts | on adds/cuts | off mix cites | on mix cites | same additions | same cuts |");
P("|---|---|---|---|---|---|---|");
const decks = [...new Set(rows.map((r) => r.deck))];
let counterAsRemoval = 0;
const detail: string[] = [];
for (const deck of decks) {
  const o = rows.find((r) => r.deck === deck && r.arm === "off")!;
  const n = rows.find((r) => r.deck === deck && r.arm === "on")!;
  const lists = (r: Row) => ({ a: (r.reply?.additions ?? []).map((l) => l.card), c: (r.reply?.cuts ?? []).map((l) => l.card) });
  const mix = (r: Row) => [...(r.reply?.additions ?? []), ...(r.reply?.cuts ?? [])].flatMap((l) => l.evidence.filter((e) => e.kind === "mix").map((e) => e.value));
  const lo = lists(o), ln = lists(n);
  const inter = (a: string[], b: string[]) => `${a.filter((x) => b.includes(x)).length}/${Math.max(a.length, b.length)}`;
  P(`| ${deck} | ${o.keptAdditions ?? "-"}/${o.keptCuts ?? "-"} | ${n.keptAdditions ?? "-"}/${n.keptCuts ?? "-"} | ${mix(o).length} | ${mix(n).length} | ${inter(lo.a, ln.a)} | ${inter(lo.c, ln.c)} |`);
  for (const r of [o, n]) for (const l of [...(r.reply?.additions ?? []), ...(r.reply?.cuts ?? [])]) {
    if (counter.has(l.card) && /removal/i.test(`${l.rationale} ${l.evidence.map((e) => e.value).join(" ")}`)) {
      counterAsRemoval++;
      detail.push(`- ${r.arm} / ${deck}: ${l.card} (a counterspell) is discussed as removal: "${l.rationale}"`);
    }
  }
  detail.push(`- ${deck} mix cites off: ${mix(o).join("; ") || "none"} | on: ${mix(n).join("; ") || "none"}`);
}
P();
P(`Counterspells named as removal: **${counterAsRemoval}**`);
P();
P("## Detail");
for (const d of detail) P(d);
console.log(lines.join("\n"));
process.exit(0);
