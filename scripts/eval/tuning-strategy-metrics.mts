/**
 * `pnpm eval:tuning-strategy --runs <runId>,<runId>… [--set heldOut] [--trial 0]`
 *
 * The four checks Hugh's blind round 1 notes asked for, over the KEPT suggestions of each cell and
 * variant, which is what a player would see:
 *  - Key-card cuts: a cut naming a Key card of the deck's own stored overview (must be 0 under the
 *    `strategy` variant, which tells the model so);
 *  - universal-staple cuts: a cut naming a universal staple;
 *  - one-slot double fills: two or more suggestions filling a role that is exactly one short, read
 *    off their own `mix` citations as the accept contract reads them (see `roleFilled`);
 *  - threshold-only share: suggestions whose only citations are role counts;
 * and two from his round 3 notes (round 4):
 *  - chip restatements: kept suggestions whose rationale states an `N of M` figure one of its own
 *    citations already shows as a chip;
 *  - repeated openings: kept rationales that open (in their first four words) on the same role an
 *    earlier rationale in the same answer opened on;
 * with malformed answers and output tokens per answer, since S lost two answers at ~6,000 thinking
 * tokens.
 * Reads `runs/strategy-overviews.json` for the Key cards and the universal set. Sends nothing.
 */
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

import type { EvidencePack } from "../../src/lib/tuning/evidence";
import { NUMBER_WORDS } from "../../src/lib/tuning/presentation";
import { ROOT } from "./lib/run.mjs";
import type { StrategyInput } from "./variants/tuning.mjs";

const { values: args } = parseArgs({ options: { runs: { type: "string" }, set: { type: "string", default: "heldOut" }, trial: { type: "string" } } });
if (!args.runs) throw new Error("eval:tuning-strategy needs --runs");

const input = JSON.parse(readFileSync(new URL("runs/strategy-overviews.json", ROOT), "utf8")) as StrategyInput;
const universal = new Set(input.universal.map((n) => n.toLowerCase()));
type Suggestion = { cut: string; add: string; evidence: { kind: string; value: string }[] };
type Suggestion2 = Suggestion & { rationale: string };
type Row = { set: string; cell: string; maxTokens: number; variant: string; deckId: string; trial: number; outcome: string; keptPositions?: number[]; reply: { suggestions: Suggestion2[] } | null; usdRealtime: number; usage?: { output_tokens: number }[] };

/** Every `N of M` figure in a text, the numerator a digit or a number word, as `N/M`. */
function figuresOf(text: string): Set<string> {
  const out = new Set<string>();
  for (const [, n, m] of text.toLowerCase().matchAll(new RegExp(`\\b(\\d+|${NUMBER_WORDS})\\s+of\\s+(?:the\\s+|your\\s+)?(\\d+)\\b`, "g"))) {
    out.add(`${/^\d+$/.test(n) ? Number(n) : NUMBER_WORDS.split("|").indexOf(n)}/${m}`);
  }
  return out;
}

/** The first pack role named in a rationale's first four words, or null. */
function openingRole(rationale: string, pack: EvidencePack): string | null {
  const head = rationale.toLowerCase().split(/\s+/).slice(0, 4).join(" ");
  const hit = pack.targets.roles.find((c) => new RegExp(`\\b${c.role.replace(/s$/, "").toLowerCase()}`).test(head));
  return hit?.role ?? null;
}

/**
 * The role a `mix` citation fills, resolved as the accept contract resolves it (`validate.ts`,
 * `oneFigure` and the `mix` case): exactly one `N of M` figure, the numerator a digit or a number
 * word, an optional "the"/"your" and an optional "card(s)"; then the pack's own role cell carrying
 * that have and that target and named in the citation. `oneFigure` is private to the validator and
 * `src/` is outside this lane, so its grammar is restated here, with `NUMBER_WORDS` imported.
 */
function roleFilled(value: string, pack: EvidencePack): { role: string; gap: number } | null {
  const text = value.toLowerCase();
  const figures = [...text.matchAll(new RegExp(`\\b(\\d+|${NUMBER_WORDS})\\s+of\\s+(?:the\\s+|your\\s+)?(\\d+)(?:\\s+cards?)?\\b`, "g"))];
  if (figures.length !== 1) return null;
  const [, n, m] = figures[0];
  const have = /^\d+$/.test(n) ? Number(n) : NUMBER_WORDS.split("|").indexOf(n);
  const cell = pack.targets.roles.find((c) => c.have === have && c.target === Number(m) && text.includes(c.role.replace(/s$/, "")));
  return cell && cell.have < cell.target ? { role: cell.role, gap: cell.target - cell.have } : null;
}

const groups = new Map<string, { answers: number; kept: number; keyCut: number; universalCut: number; doubleFill: number; thresholdOnly: number; usd: number; malformed: number; output: number; chip: number; repeated: number }>();
for (const run of args.runs.split(",")) {
  // A run over `all` decks is split back into its development and held-out decks, as report.mts does.
  const packs = new Map((JSON.parse(readFileSync(new URL(`runs/${run}/prepared.json`, ROOT), "utf8")) as { deckId: string; pack: EvidencePack }[]).map((p) => [p.deckId, p.pack]));
  const dev = new Set((JSON.parse(readFileSync(new URL(`runs/${run}/meta.json`, ROOT), "utf8")) as { split?: { dev: string[] } }).split?.dev ?? []);
  for (const line of readFileSync(new URL(`runs/${run}/rows.jsonl`, ROOT), "utf8").split("\n").filter(Boolean)) {
    const r = JSON.parse(line) as Row;
    if (r.set === "all") r.set = dev.has(r.deckId) ? "dev" : "heldOut";
    if (r.set !== args.set || (args.trial !== undefined && r.trial !== Number(args.trial))) continue;
    const k = `${r.cell.replace(/@max\d+$/, "")}@max${r.maxTokens} / ${r.variant}`;
    const g = groups.get(k) ?? { answers: 0, kept: 0, keyCut: 0, universalCut: 0, doubleFill: 0, thresholdOnly: 0, usd: 0, malformed: 0, output: 0, chip: 0, repeated: 0 };
    groups.set(k, g);
    g.answers += 1;
    g.usd += r.usdRealtime;
    if (r.outcome === "malformed") g.malformed += 1;
    // Every attempt's output, retries included: that is what was paid for.
    g.output += (r.usage ?? []).reduce((t, u) => t + u.output_tokens, 0);
    // Fail rather than measure nothing: a survived row without its kept positions (a run the
    // rescorer never saw), or a deck the strategy input has no overview for, would each read as
    // zero violations.
    if (r.outcome === "survived" && r.reply && !r.keptPositions) throw new Error(`${run} ${r.deckId} t${r.trial}: a survived row has no keptPositions; run eval:rescore over it first`);
    const deckInput = input.decks[r.deckId];
    if (!deckInput) throw new Error(`deck ${r.deckId} has no stored overview in strategy-overviews.json; run eval:strategy-input first`);
    const kept = r.outcome === "survived" && r.reply ? r.keptPositions!.map((i) => r.reply!.suggestions[i]) : [];
    const keyCards = new Set(deckInput.keyCards.map((n) => n.toLowerCase()));
    const fills = new Map<string, { n: number; gap: number }>();
    const opened = new Set<string>();
    for (const s of kept) {
      g.kept += 1;
      const chips = new Set(s.evidence.flatMap((e) => [...figuresOf(e.value)]));
      if ([...figuresOf(s.rationale)].some((f) => chips.has(f))) g.chip += 1;
      const role = openingRole(s.rationale, packs.get(r.deckId)!);
      if (role && opened.has(role)) g.repeated += 1;
      if (role) opened.add(role);
      if (keyCards.has(s.cut.toLowerCase())) g.keyCut += 1;
      if (universal.has(s.cut.toLowerCase())) g.universalCut += 1;
      if (s.evidence.every((e) => e.kind === "mix")) g.thresholdOnly += 1;
      // Each role a suggestion fills counts ONCE for it, however many times it cites that role.
      const filled = new Map<string, number>();
      for (const e of s.evidence) {
        const f = e.kind === "mix" ? roleFilled(e.value, packs.get(r.deckId)!) : null;
        if (f) filled.set(f.role, f.gap);
      }
      for (const [role, gap] of filled) {
        const f = fills.get(role) ?? { n: 0, gap };
        f.n += 1;
        fills.set(role, f);
      }
    }
    if ([...fills.values()].some((f) => f.gap === 1 && f.n > 1)) g.doubleFill += 1;
  }
}

console.log(`| cell / variant | answers | malformed | output tokens / answer | kept per answer | Key-card cuts | universal-staple cuts | answers double-filling a one-slot gap | threshold-only share | chip restatements | repeated openings | $/answer |`);
console.log(`|---|---|---|---|---|---|---|---|---|---|---|---|`);
for (const [k, g] of [...groups].sort()) {
  console.log(`| ${k} | ${g.answers} | ${g.malformed} | ${Math.round(g.output / g.answers)} | ${(g.kept / g.answers).toFixed(2)} | ${g.keyCut} | ${g.universalCut} | ${g.doubleFill} | ${g.kept ? Math.round((100 * g.thresholdOnly) / g.kept) : 0}% | ${g.chip} of ${g.kept} | ${g.repeated} | $${(g.usd / g.answers).toFixed(4)} |`);
}
