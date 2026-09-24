/**
 * `pnpm eval:report [--feature tuning] [--out path]` — the automatic metrics, recomputed from the
 * rows on disk. It sends nothing and reads no database, so any report can be rebuilt for free.
 *
 * One table row per feature × cell × variant × set. Costs are at REAL-TIME prices, because that is
 * what a player's press costs the app; the batch price the harness actually paid is in the ledger.
 * "Per accepted answer" divides a cell's whole spend, failures and retries included, by the
 * answers that survived, so a model refused twice as often costs twice as much.
 *
 * `visible` output is an ESTIMATE, at four characters a token over the reply's JSON. Thinking is
 * billed as output but its text is not returned, so the output meter minus that estimate is
 * roughly what thinking cost. It is labelled as an estimate wherever it is printed.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  options: {
    feature: { type: "string", default: "tuning" },
    out: { type: "string" },
    runs: { type: "string" },
    baseline: { type: "string", default: "sonnet@max8000|base" },
  },
});

const ROOT = new URL("../../docs/superpowers/eval/", import.meta.url);
const runsDir = new URL("runs/", ROOT);
const wanted = args.runs ? new Set(args.runs.split(",")) : null;

type Row = {
  runId: string; feature: string; cell: string; model: string; variant: string; set: string; deckId: string; trial: number;
  attempts: number; usage: { input_tokens: number; output_tokens: number; cache_creation_input_tokens?: number | null; cache_read_input_tokens?: number | null }[];
  usdRealtime: number; maxTokens: number; outcome: string; returned?: number; kept?: number; drops?: string[]; outsideNames?: number; reply: unknown;
};

const rows: Row[] = [];
if (existsSync(runsDir)) {
  for (const run of readdirSync(runsDir)) {
    if (wanted && !wanted.has(run)) continue;
    const f = new URL(`${run}/rows.jsonl`, runsDir);
    if (!existsSync(f)) continue;
    // A run over `all` decks is split back into its development and held-out decks, because the
    // decision rule reads the held-out decks alone.
    const meta = JSON.parse(readFileSync(new URL(`${run}/meta.json`, runsDir), "utf8")) as { split: { dev: string[] } };
    const dev = new Set(meta.split.dev);
    for (const line of readFileSync(f, "utf8").split("\n")) {
      if (!line.trim()) continue;
      const row = JSON.parse(line) as Row;
      if (row.set === "all") row.set = dev.has(row.deckId) ? "dev" : "heldOut";
      // A cell is named by what it SENT: the same id can mean a different ceiling after the app's
      // own constant moves (D1 raised tuning's from 3,000 to 8,000), and pooling the two would
      // rule on neither.
      row.cell = `${row.cell.replace(/@max\d+$/, "")}@max${row.maxTokens}`;
      rows.push(row);
    }
  }
}
// ONE answer per (set, cell, variant, deck, trial): the earliest run's, since run ids begin with
// their start time. A configuration run twice, or a calibration repeated by a sweep, would
// otherwise add samples beyond the plan's decks × trials and weigh some decks twice.
const seen = new Set<string>();
let duplicates = 0;
const mine = rows
  .filter((r) => r.feature === args.feature)
  .sort((a, b) => a.runId.localeCompare(b.runId))
  .filter((r) => {
    const k = `${r.set}|${r.cell}|${r.variant}|${r.deckId}|${r.trial}`;
    if (seen.has(k)) { duplicates += 1; return false; }
    seen.add(k);
    return true;
  });

const pct = (n: number, d: number) => (d === 0 ? "–" : `${((100 * n) / d).toFixed(0)}%`);
const mean = (xs: number[]) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);
const p95 = (xs: number[]) => (xs.length === 0 ? 0 : [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(0.95 * xs.length))]);

const groups = new Map<string, Row[]>();
for (const r of mine) {
  const k = `${r.set}|${r.cell}|${r.variant}`;
  groups.set(k, [...(groups.get(k) ?? []), r]);
}

const lines: string[] = [];
lines.push(`# Automatic metrics: ${args.feature}`, "");
lines.push(`Recomputed from ${mine.length} rows in ${new Set(mine.map((r) => r.runId)).size} runs, one per set, cell, variant, deck and trial (${duplicates} later repeats set aside). Costs at real-time prices.`, "");
lines.push("| set | cell | variant | n | survived | ungrounded | malformed | upstream | kept/run | returned/run | outside names | in tok | out tok (p95) | visible out (est.) | cache r/w | $/answer | $/accepted |");
lines.push("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
const dropLines: string[] = [];
for (const [k, g] of [...groups].sort()) {
  const [set, cell, variant] = k.split("|");
  const n = g.length;
  const count = (o: string) => g.filter((r) => r.outcome === o).length;
  const survived = count("survived");
  const last = (r: Row) => r.usage[r.usage.length - 1];
  const outs = g.flatMap((r) => r.usage.map((u) => u.output_tokens));
  const ins = g.flatMap((r) => r.usage.map((u) => u.input_tokens));
  const cacheR = g.flatMap((r) => r.usage.map((u) => u.cache_read_input_tokens ?? 0));
  const cacheW = g.flatMap((r) => r.usage.map((u) => u.cache_creation_input_tokens ?? 0));
  const visible = g.filter((r) => r.reply && last(r)).map((r) => JSON.stringify(r.reply).length / 4);
  const usd = g.reduce((a, r) => a + r.usdRealtime, 0);
  lines.push(`| ${set} | ${cell} | ${variant} | ${n} | ${pct(survived, n)} | ${pct(count("ungrounded"), n)} | ${pct(count("malformed"), n)} | ${pct(count("upstream_busy"), n)} | ${mean(g.map((r) => r.kept ?? 0)).toFixed(2)} | ${mean(g.map((r) => r.returned ?? 0)).toFixed(2)} | ${pct(g.filter((r) => (r.outsideNames ?? 0) > 0).length, n)} | ${mean(ins).toFixed(0)} | ${mean(outs).toFixed(0)} (${p95(outs)}) | ${mean(visible).toFixed(0)} | ${mean(cacheR).toFixed(0)}/${mean(cacheW).toFixed(0)} | $${(usd / n).toFixed(4)} | ${survived ? `$${(usd / survived).toFixed(4)}` : "–"} |`);

  const drops = new Map<string, number>();
  for (const r of g) for (const d of r.drops ?? []) drops.set(d, (drops.get(d) ?? 0) + 1);
  const byTrial = [...new Set(g.map((r) => r.trial))].sort().map((t) => pct(g.filter((r) => r.trial === t && r.outcome === "survived").length, g.filter((r) => r.trial === t).length));
  dropLines.push(`- **${set} / ${cell} / ${variant}**: survived by trial ${byTrial.join(", ")}; drops ${[...drops].sort((a, b) => b[1] - a[1]).map(([d, c]) => `${d} ${c}`).join(", ") || "none"}.`);
}
lines.push("", "## Drops by rule, and stability across trials", "", ...dropLines, "");

// ---- The decision rule, as the plan wrote it before any result (plan, "The decision rule") ----
// Computed on the HELD-OUT decks, and on the overlay for tuning, against S = `--baseline`.
if (args.feature === "tuning") {
  const S = args.baseline!;
  const stat = (set: string, key: string) => {
    const g = groups.get(`${set}|${key}`) ?? [];
    const n = g.length;
    const survived = g.filter((r) => r.outcome === "survived").length;
    return {
      n,
      survived: n ? survived / n : 0,
      malformed: n ? g.filter((r) => r.outcome === "malformed").length / n : 0,
      kept: mean(g.map((r) => r.kept ?? 0)),
      outside: n ? g.filter((r) => (r.outsideNames ?? 0) > 0).length / n : 0,
      perAccepted: survived ? g.reduce((a, r) => a + r.usdRealtime, 0) / survived : Infinity,
    };
  };
  const base = stat("heldOut", S);
  const baseOverlay = stat("overlay", S);
  lines.push("## The decision rule", "", `Baseline S = \`${S.replace("|", " / ")}\`: held-out survived ${(100 * base.survived).toFixed(0)}%, kept ${base.kept.toFixed(2)}, $${base.perAccepted.toFixed(4)} per accepted answer.`, "");
  lines.push("| candidate | cheaper | survived ≥ S−10 | kept ≥ 80% of S | overlay survived ≥ S−10 | malformed ≤ 5% | outside ≤ S+5 | eligible |", "|---|---|---|---|---|---|---|---|");
  const keys = [...new Set([...groups.keys()].filter((k) => k.startsWith("heldOut|")).map((k) => k.slice("heldOut|".length)))].filter((k) => k !== S).sort();
  for (const k of keys) {
    const c = stat("heldOut", k);
    const o = stat("overlay", k);
    const gates = [
      c.perAccepted < base.perAccepted,
      c.survived >= base.survived - 0.1,
      c.kept >= 0.8 * base.kept,
      o.n > 0 && o.survived >= baseOverlay.survived - 0.1,
      c.malformed <= 0.05,
      c.outside <= base.outside + 0.05,
    ];
    const mark = (b: boolean) => (b ? "yes" : "**no**");
    lines.push(`| \`${k.replace("|", " / ")}\` ($${c.perAccepted.toFixed(4)}) | ${gates.map(mark).join(" | ")} | ${gates.every(Boolean) ? "**eligible**" : "no"} |`);
  }
  lines.push("");
}

const text = lines.join("\n");
if (args.out) writeFileSync(args.out, text);
console.log(text);
