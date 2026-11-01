/**
 * `pnpm eval:tuning-focus` — strategy focus PR 4a's paid eval: does the focus line steer Suggested changes? The same
 * staging decks and the same contract, once with no focus and once with a focus set in memory (the deck's Nth strategy,
 * `--rank`, default 2 so the focus is not simply what the deck already leads with), one sample per deck, through the Batch
 * API. It prints, per arm, the kept additions that count toward the focus and the kept cuts on none of the top
 * strategies, the cost per run from the ledger, and writes every row for the PR's two before/after examples.
 *
 *   pnpm eval:tuning-focus [--dry-run] [--rank 2] [--count 10] [--label focus] [--arms none,focus]
 *
 * Hard cap $3 on ITS OWN ledger (`ledger-strategy-focus.jsonl`, d9 2026-10-22), checked against each request's worst
 * case before anything is sent. Staging is read-only: nothing is written to any deck. `src/` is imported, never restated.
 */
import "../lib/env.mjs";

import { appendFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { LEDGER_LIMITS } from "../../src/lib/eval/ledger-limits";
import type { StrategyKey } from "../../src/lib/strategy/score";
import { buildParams } from "./lib/request.mjs";
import { commonRow, parseCell, ROOT, runRequests } from "./lib/run.mjs";
import { openTuning } from "./lib/tuning-app.mjs";
import { TUNING_VARIANTS } from "./variants/tuning.mjs";

const { values: args } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    label: { type: "string", default: "focus" },
    // Plan 4c compares the focus arm with and without its candidate list (`EVAL_FOCUS_CANDIDATES=off`), so it runs
    // `--arms focus` twice rather than paying for a no-focus arm it does not read.
    arms: { type: "string", default: "none,focus" },
    rank: { type: "string", default: "2" },
    count: { type: "string", default: "10" },
  },
});
const log = (line: string) => console.log(`[eval:tuning-focus] ${line}`);

/** Hugh's staging decks, varied plans: tribes, spells, tokens, lands, artifacts. */
const NAMES = ["HD - Wizards", "HD - Yuriko", "HD - Gishath", "HD - Elves", "HD - Goblins", "HD - Zombies",
  "HD - Avatar Aang", "HD - Eldrazi", "HD Tune - Blood Rites", "HD Tune - Prismari Artistry", "HD - Soldiers", "HD - Kratos"];
const LEDGER = new URL("ledger-strategy-focus.jsonl", ROOT).pathname;
const LIMITS = LEDGER_LIMITS["ledger-strategy-focus.jsonl"];
const rank = Number(args.rank);

const app = await openTuning();
// AFTER `openTuning`: it points DATABASE_URL at staging, and `src/db` reads it when first imported.
const { loadAddCards, loadRunStrategy, strategyChips } = await import("../../src/lib/strategy/run");
const { onStrategy } = await import("../../src/lib/strategy/score");
const { loadCardRoles } = await import("../../src/lib/strategy/candidates");
// The basis the eval's profiles count by: labels, the app's only basis since LABEL_ROLE_COUNTS_ENABLED retired.
const roleBasis = "labels" as const;
const { tuningInputs } = await import("../../src/lib/decks/tuning-read");
const named = NAMES.slice(0, Number(args.count)).map((n) => {
  const hit = [...app.nameOf].find(([, name]) => name === n);
  if (!hit) throw new Error(`eval: no staging deck named ${n}`);
  return hit[0];
});

// Each deck's focus: its Nth strategy on its own list, read by the run's own path.
const focusOf = new Map<string, StrategyKey>();
const strategyOf = new Map<string, Awaited<ReturnType<typeof loadRunStrategy>>>();
for (const deckId of named) {
  const inputs = await tuningInputs(deckId, app.userId, process.env);
  if (!inputs) throw new Error(`eval: deck ${deckId} not readable`);
  const top = (await loadRunStrategy(inputs.head, "tokens")).top;
  const key = top[rank - 1] ?? top[0];
  if (!key) { log(`${app.nameOf.get(deckId)}: no strategy, skipped`); continue; }
  focusOf.set(deckId, key);
  strategyOf.set(deckId, await loadRunStrategy(inputs.head, key));
}
const ids = [...focusOf.keys()];
for (const id of ids) log(`${app.nameOf.get(id)}: focus ${focusOf.get(id)} (${strategyOf.get(id)!.copies} cards; top ${strategyOf.get(id)!.top.join(", ")})`);

const cell = parseCell("sonnet-medium", app.model);
const variant = TUNING_VARIANTS.base;
const ARMS = ["none", "focus"] as const;
const arms = ARMS.filter((a) => args.arms!.split(",").includes(a));
if (arms.length === 0) throw new Error(`eval: --arms names none of ${ARMS.join(", ")}`);
const prepared = {
  none: arms.includes("none") ? await app.prepare(ids, variant, null) : [],
  focus: arms.includes("focus") ? await app.prepare(ids, variant, null, focusOf) : [],
};

const keys = new Map<string, { arm: (typeof ARMS)[number]; deck: (typeof prepared.none)[number] }>();
const first = arms.flatMap((arm) => prepared[arm].map((deck, d) => {
  const customId = `${arm}-d${d}`;
  keys.set(customId, { arm, deck });
  return { customId, params: buildParams({ model: cell.model, system: deck.system, user: deck.user, maxTokens: app.maxTokens, schema: app.schema }, cell) };
}));

const run = await runRequests({
  feature: "strategy-focus",
  label: args.label!,
  first,
  schema: app.schema,
  realtime: false,
  dryRun: args["dry-run"]!,
  planDone: 0,
  meta: { arms, rank, promptVersion: app.promptVersion, cell: cell.id, decks: ids.map((id) => ({ name: app.nameOf.get(id), deckId: id, focus: focusOf.get(id) })) },
  prepared,
  log,
  ledger: { path: LEDGER, limits: LIMITS },
});
if (!run) process.exit(args["dry-run"] ? 0 : 2);

const parsed = [...run.answers].filter(([, a]) => a.value !== null);
const scores = await app.score(parsed.map(([id, a]) => ({ pack: keys.get(id)!.deck.pack, value: a.value! })));
const scoreOf = new Map(parsed.map(([id], i) => [id, scores[i]]));
const out = new URL("rows.jsonl", run.dir);
const blank = () => ({ adds: 0, onFocus: 0, cuts: 0, offTop: 0, gaps: 0, covered: 0, usd: 0, runs: 0 });
const tally = { none: blank(), focus: blank() };
for (const [customId, answer] of run.answers) {
  const { arm, deck } = keys.get(customId)!;
  const scored = scoreOf.get(customId);
  const strategy = strategyOf.get(deck.deckId)!;
  const kept = scored && "keptSuggestions" in scored ? scored.keptSuggestions : [];
  const adds = await loadAddCards(kept.flatMap((k) => (k.addOracleId ? [k.addOracleId] : [])));
  // The chips the app writes, on the focus arm only (a deck with no focus gets none). Both arms are COUNTED by the same
  // rule (\`onStrategy\`), not by the chips.
  const chipped = arm === "focus" ? strategyChips(kept, strategy, adds) : kept;
  const deckCard = new Map(strategy.cards.map((c) => [c.oracleId, c]));
  const t = tally[arm];
  t.runs += 1;
  t.usd += commonRow(cell, answer, false, app.maxTokens).usdAsRun ?? 0;
  // Roles covered (plan 4c): each role two or more short of its target (not advisory, not land) that at least one kept
  // addition fills, by the candidates' own role rule.
  const addRoles = await loadCardRoles(kept.flatMap((k) => (k.addOracleId ? [k.addOracleId] : [])), roleBasis);
  const gaps = deck.pack.targets.roles.filter((r) => r.role !== "land" && !r.advisory && r.target - r.have >= 2);
  t.gaps += gaps.length;
  t.covered += gaps.filter((g) => [...addRoles.values()].some((roles) => roles.includes(g.role))).length;
  for (const k of chipped) {
    if (k.addOracleId) {
      t.adds += 1;
      const card = adds.get(k.addOracleId);
      if (card && onStrategy(card, strategy.key)) t.onFocus += 1;
    } else {
      t.cuts += 1;
      const card = k.cutOracleId ? deckCard.get(k.cutOracleId) : undefined;
      if (card && strategy.top.length > 0 && ![...strategy.top, strategy.key].some((key) => onStrategy(card, key))) t.offTop += 1;
    }
  }
  appendFileSync(out, `${JSON.stringify({
    runId: run.runId, arm, deck: app.nameOf.get(deck.deckId), deckId: deck.deckId, focus: strategy.key,
    ...commonRow(cell, answer, false, app.maxTokens), ...(scored ?? { outcome: "malformed" }), chipped, reply: answer.value,
  })}\n`);
}
for (const arm of arms) {
  const t = tally[arm];
  log(`${arm}: additions on the focus ${t.onFocus} of ${t.adds}; cuts on none of the top strategies ${t.offTop} of ${t.cuts}; roles two or more short covered ${t.covered} of ${t.gaps}; $${(t.usd / Math.max(t.runs, 1)).toFixed(4)} per run over ${t.runs} runs`);
}
writeFileSync(new URL("done", run.dir), "ok\n");
log(`wrote ${run.answers.size} rows to ${out.pathname}`);
process.exit(0);
