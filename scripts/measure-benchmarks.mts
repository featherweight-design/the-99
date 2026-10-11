// Derives the evidence benchmarks' cut points from the commander index, and prints the whole
// derivation (plan `2026-10-10-evidence-benchmarks.md`, "The cut points").
//
// READ-ONLY. Every query runs in a read-only session, and the branch it reads is printed first.
// Point it at staging, where the index is built:
//
//   BENCHMARKS_SOURCE_URL=<staging> pnpm measure:benchmarks [--samples 10] [--user <clerk id>]
//
// THE MODEL IS IMPORTED, NEVER RESTATED. Each commander's typical deck is SAMPLED as a legal list
// and handed to the app's own readers (`velocity`, `flow`, `interaction`, `winSpeed`,
// `dependencyFigures`), so a cut is derived over exactly the figure the app grades. The plan named
// expectations for the linear figures and samples for the rest. Sampling them too is NOT the same
// population: a sampled figure carries each commander's deck-to-deck spread, which an expectation
// averages away. That spread is the point: the app grades one real list, never an average, so the
// cuts are drawn over lists. It also lets every figure come from the shipped function.
//
// A sample: the commander in the command zone, `avg_land` basic lands (36 where the row has none),
// and the rest of a 99-card body drawn from the commander's `commander_support_cards` without
// replacement, in proportion to `inclusion` (a percent; a null inclusion carries no weight, the
// `db:build:staples` null policy). Each sample weighs `coalesce(deck_count, 1) / samples`, so a
// commander built a thousand times moves a cut more than one built once. Fixed seed throughout.
//
// The cuts, as the plan fixes them:
//   - grades: the weighted quintiles of velocity's index, flow's points, interaction's weight,
//     and, over the samples that assemble a line, win speed's odds;
//   - dependencies: light at the smallest whole value whose upper tail is at most 25% of the
//     weight, heavy at most 10% (the plan's 75th and 90th percentiles, taken as tails because a
//     small integer figure's plain 75th percentile can be 1, which would draw the artifacts row for
//     41% of decks); artifacts and enchantments cut on both their figures, the row taking the
//     stronger;
//   - combat reliance: light at or under the largest route count whose lower tail is at most 10% of
//     the samples with no line (heavy is a fact, no route at all, and needs no cut). When no-route
//     decks alone pass 10%, light does not occur.
//
// It also prints how often each row is drawn over the population, so "a row names what is unusual"
// is a measured claim.
//
// The constants it prints are pasted into `src/lib/benchmarks/cuts.ts` by hand. It runs in no
// workflow; re-run it after an index rebuild moves the population.

import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { requireEnv } from "./lib/env.mjs";
import { dependencyFigures, dependencyStrengths, DEPENDENCY_ROWS, type DependencyFigures } from "../src/lib/benchmarks/dependencies";
import { flow } from "../src/lib/benchmarks/flow";
import { interaction } from "../src/lib/benchmarks/interaction";
import { assembledLines, benchmarkInput, type TextRow } from "../src/lib/benchmarks/load";
import { jobsFromText } from "../src/lib/benchmarks/text-jobs";
import type { BenchCard, BenchLine } from "../src/lib/benchmarks/types";
import { velocity } from "../src/lib/benchmarks/velocity";
import { winSpeed } from "../src/lib/benchmarks/win-speed";
import { castFaceText } from "../src/lib/cards/facet";
import { freshLabels } from "../src/lib/labels/read";
import type { Job } from "../src/lib/labels/types";
import type { DeckProfile } from "../src/lib/profile/types";
import { isInfiniteOrGameEnding } from "../src/lib/spellbook/combo-features";
import { GAME_ENDING_FEATURES } from "../src/lib/spellbook/produces-kinds.generated";
import { MAX_COMBO_PIECES, type ComboPieceRow } from "../src/lib/synopsis/combo-facts";

neonConfig.webSocketConstructor = ws;
const { BENCHMARKS_SOURCE_URL } = requireEnv(["BENCHMARKS_SOURCE_URL"]);
const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
// Ten per commander: at three, reordering the population alone moved four grade cuts (the seed's
// stream lands on different commanders), so three is too few to commit a cut from.
const SAMPLES = Number(arg("samples") ?? 10);
const REFERENCE_USER = arg("user") ?? "user_3GkZrrTwOJBdqUpq6GambP0BC8w";

const pool = new Pool({ connectionString: BENCHMARKS_SOURCE_URL });
/** A read-only session. Sampling holds the event loop for minutes at higher `--samples`, long
 *  enough for an idle socket to close, so the reads after it open a fresh session. */
const readOnly = async () => {
  const c = await pool.connect();
  await c.query("set default_transaction_read_only = on");
  return c;
};
let client = await readOnly();
const q = async <T,>(sql: string, params: unknown[] = []) => (await client.query(sql, params)).rows as T[];

const [{ branch }] = await q<{ branch: string }>("select current_setting('neon.branch_id', true) as branch");
console.log(`# measure:benchmarks\n\nRead-only, branch \`${branch}\`, ${SAMPLES} sampled decks per commander.\n`);

// ---- the population ---------------------------------------------------------------------------
type Header = { commander: string; deckCount: number; avgLand: number | null };
const headers = (await q<{ commander_oracle_id: string; deck_count: number | null; avg_land: number | null }>(`
  select commander_oracle_id, deck_count, avg_land from commander_support where synergy_state = 'ok'
   order by commander_oracle_id`))
  .map((h): Header => ({ commander: h.commander_oracle_id, deckCount: h.deck_count ?? 1, avgLand: h.avg_land }));

const support = await q<{ commander_oracle_id: string; oracle_id: string; inclusion: number | null }>(`
  select csc.commander_oracle_id, csc.oracle_id, csc.inclusion
    from commander_support_cards csc
    join commander_support cs on cs.commander_oracle_id = csc.commander_oracle_id
    join cards c on c.oracle_id = csc.oracle_id
   where cs.synergy_state = 'ok' and split_part(c.type_line, ' // ', 1) !~* '\\mland\\M'
   order by csc.commander_oracle_id, csc.oracle_id`);
const pools = new Map<string, { id: string; weight: number }[]>();
for (const r of support) {
  if (r.inclusion == null) continue;
  const list = pools.get(r.commander_oracle_id) ?? [];
  list.push({ id: r.oracle_id, weight: r.inclusion / 100 });
  pools.set(r.commander_oracle_id, list);
}

// ---- every card the population or the reference decks can hold, read once --------------------
type CardRow = { oracle_id: string; name: string; type_line: string; cmc: number; mana_cost: string | null; oracle_text: string | null; keywords: string[]; color_identity: string[]; layout: string };
const cardRows = await q<CardRow>(`
  select oracle_id, name, type_line, cmc, mana_cost, oracle_text, keywords, color_identity, layout from cards
   where oracle_id in (select oracle_id from commander_support_cards union select commander_oracle_id from commander_support)`);
const labelRows = await q<Parameters<typeof freshLabels>[0][number]>(`
  select l.oracle_id, l.labels, l.model, l.prompt_version, l.input_hash, c.name, c.mana_cost, c.type_line, c.oracle_text, c.layout
    from card_labels l join cards c on c.oracle_id = l.oracle_id`);
const labels = freshLabels(labelRows);
const cardById = new Map(cardRows.map((c) => [c.oracle_id, c]));
const bench = (id: string, commander = false): BenchCard | null => {
  const c = cardById.get(id);
  if (!c) return null;
  const oracleText = castFaceText(c.oracle_text, c.layout);
  const jobs: Job[] = labels.get(id) ?? jobsFromText({ typeLine: c.type_line, oracleText, keywords: c.keywords });
  return {
    oracleId: id, name: c.name, quantity: 1, commander, typeLine: c.type_line, manaValue: c.cmc, manaCost: c.mana_cost,
    colorIdentity: c.color_identity, oracleText, keywords: c.keywords, jobs,
  };
};
const BASIC: BenchCard = {
  oracleId: "basic", name: "Basic land", quantity: 1, commander: false, typeLine: "Basic Land", manaValue: 0,
  manaCost: null, colorIdentity: [], oracleText: null, keywords: [], jobs: [],
};

// ---- Spellbook's counted variants, held in memory --------------------------------------------
const variantRows = await q<{ variant_id: string; produces: string[]; card_count: number; oracle_id: string; must_be_commander: boolean }>(`
  select v.variant_id, v.produces, v.card_count, vc.oracle_id, vc.must_be_commander
    from spellbook_variants v join spellbook_variant_cards vc on vc.variant_id = v.variant_id
   where v.card_count between 2 and $2 and cardinality(v.requires_template_ids) = 0
     and exists (select 1 from unnest(v.produces) f where f ~* '^infinite ' or f = any($1::text[]))`, [[...GAME_ENDING_FEATURES], MAX_COMBO_PIECES]);
type Variant = { id: string; pieces: { id: string; commanderOnly: boolean }[]; count: number; produces: string[] };
const variants = new Map<string, Variant>();
for (const r of variantRows) {
  const v = variants.get(r.variant_id) ?? { id: r.variant_id, pieces: [], count: r.card_count, produces: r.produces };
  v.pieces.push({ id: r.oracle_id, commanderOnly: r.must_be_commander });
  variants.set(r.variant_id, v);
}
const byPiece = new Map<string, Variant[]>();
for (const v of variants.values()) {
  if (v.pieces.length !== v.count || !isInfiniteOrGameEnding(v.produces)) continue;
  for (const p of v.pieces) byPiece.set(p.id, [...(byPiece.get(p.id) ?? []), v]);
}
/**
 * The rows `anySizeComboQuery` would return for this deck, built from the variants held in memory
 * (one query per sampled deck would be 10,401 round trips), then assembled by the app's own
 * `assembledLines`, so a sampled deck's lines follow the rule a reading's do.
 */
function linesFor(cards: readonly BenchCard[]): BenchLine[] {
  const present = new Set(cards.map((c) => c.oracleId));
  const commanders = cards.filter((c) => c.commander).map((c) => c.oracleId);
  const candidates = new Set([...present].flatMap((id) => byPiece.get(id) ?? []));
  const rows: ComboPieceRow[] = [...candidates].flatMap((v) => v.pieces.map((p) => ({
    variant_id: v.id, produces: v.produces, card_count: v.count, mana_value_needed: null,
    oracle_id: p.id, name: p.id, must_be_commander: p.commanderOnly,
    held: p.commanderOnly ? commanders.includes(p.id) : present.has(p.id),
    commander_legal: true, color_identity: [],
  })));
  return assembledLines(rows, commanders);
}

// ---- sampling --------------------------------------------------------------------------------
let seed = 0x5eed99;
const random = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
/** Weighted sampling without replacement (Efraimidis-Spirakis keys). */
function draw(list: readonly { id: string; weight: number }[], k: number): string[] {
  return list
    .filter((x) => x.weight > 0)
    .map((x) => ({ id: x.id, key: Math.pow(random(), 1 / x.weight) }))
    .sort((a, b) => b.key - a.key)
    .slice(0, k)
    .map((x) => x.id);
}

type Figures = { weight: number; velocity: number; flow: number; interaction: number; win: number | null; deps: DependencyFigures };
const figuresOf = (cards: BenchCard[], weight: number): Figures => {
  const lines = linesFor(cards);
  return {
    weight,
    velocity: velocity(cards, 0).index,
    flow: flow(cards).points,
    interaction: interaction(cards).weighted,
    win: winSpeed(cards, lines)?.odds ?? null,
    deps: dependencyFigures(cards, lines.length),
  };
};

const samples: Figures[] = [];
let skipped = 0;
const started = Date.now();
for (const h of headers) {
  const commander = bench(h.commander, true);
  const list = pools.get(h.commander);
  if (!commander || !list || list.length === 0) { skipped++; continue; }
  const lands = Math.round(h.avgLand ?? 36);
  for (let s = 0; s < SAMPLES; s++) {
    const picked = draw(list, 99 - lands).map((id) => bench(id)).filter((c): c is BenchCard => c !== null);
    const cards = [commander, ...picked, { ...BASIC, quantity: 99 - picked.length }];
    samples.push(figuresOf(cards, h.deckCount / SAMPLES));
  }
}
client.release(true);
client = await readOnly();
console.log(`${headers.length} ok commanders, ${skipped} with no commander row or card list, ${samples.length} sampled decks, ${((Date.now() - started) / 1000).toFixed(0)}s.\n`);

// ---- weighted percentiles ---------------------------------------------------------------------
function percentile(xs: readonly { v: number; w: number }[], p: number): number {
  const sorted = [...xs].sort((a, b) => a.v - b.v);
  const total = sorted.reduce((s, x) => s + x.w, 0);
  let acc = 0;
  for (const x of sorted) {
    acc += x.w;
    if (acc >= p * total) return x.v;
  }
  return sorted.at(-1)?.v ?? 0;
}
const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
function describe(name: string, xs: { v: number; w: number }[], cuts: number[]) {
  const below = (c: number) => xs.filter((x) => x.v < c).reduce((s, x) => s + x.w, 0) / xs.reduce((s, x) => s + x.w, 0);
  const ps = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1].map((p) => round(percentile(xs, p)));
  console.log(`- **${name}** (${xs.length} decks): min ${ps[0]}, p10 ${ps[1]}, p25 ${ps[2]}, median ${ps[3]}, p75 ${ps[4]}, p90 ${ps[5]}, max ${ps[6]}`);
  for (const c of cuts) console.log(`  - cut ${round(c)}: ${(below(c) * 100).toFixed(1)}% of the weight below it, ${((1 - below(c)) * 100).toFixed(1)}% at or above`);
}
const series = (f: (s: Figures) => number | null, keep: (s: Figures) => boolean = () => true) =>
  samples.filter(keep).map((s) => ({ v: f(s), w: s.weight })).filter((x): x is { v: number; w: number } => x.v !== null);
const quintiles = (xs: { v: number; w: number }[]) => [0.2, 0.4, 0.6, 0.8].map((p) => round(percentile(xs, p)));
/**
 * The smallest whole value whose tail (the weight at or above it) is at most `share`. On a small
 * integer figure a plain 75th percentile can be 1, which would draw the row for any deck holding a
 * single card of the kind (artifact payoffs: 41% of decks); the tail rule keeps a row for what is
 * unusual. Heavy is always above light.
 */
function tailCut(xs: { v: number; w: number }[], share: number): number {
  const total = xs.reduce((s, x) => s + x.w, 0);
  const max = Math.max(...xs.map((x) => x.v));
  for (let v = 1; v <= max + 1; v++) {
    if (xs.filter((x) => x.v >= v).reduce((s, x) => s + x.w, 0) / total <= share) return v;
  }
  return max + 1;
}
const lightHeavy = (xs: { v: number; w: number }[]) => {
  const light = tailCut(xs, 0.25);
  return { light, heavy: Math.max(light + 1, tailCut(xs, 0.1)) };
};

console.log("## Grades (weighted quintiles)\n");
const grades = {
  velocity: quintiles(series((s) => s.velocity)),
  flow: quintiles(series((s) => s.flow)),
  interaction: quintiles(series((s) => s.interaction)),
  win: quintiles(series((s) => s.win, (s) => s.win !== null)),
};
describe("velocity index", series((s) => s.velocity), grades.velocity);
describe("flow points", series((s) => s.flow), grades.flow);
describe("interaction weight", series((s) => s.interaction), grades.interaction);
describe("win odds, decks with a line", series((s) => s.win, (s) => s.win !== null), grades.win);
const weightOf = (keep: (s: Figures) => boolean) => samples.filter(keep).reduce((t, s) => t + s.weight, 0);
console.log(`- decks with at least one line: ${(weightOf((s) => s.win !== null) / weightOf(() => true) * 100).toFixed(1)}% of the weight\n`);

console.log("## Dependencies (light where at most 25% of the weight is at or above, heavy at most 10%)\n");
const dep = (f: (d: DependencyFigures) => number) => series((s) => f(s.deps));
const dependencies = {
  graveyard: lightHeavy(dep((d) => d.graveyard)),
  artifacts: { cards: lightHeavy(dep((d) => d.artifacts)), payoffs: lightHeavy(dep((d) => d.artifactPayoffs)) },
  enchantments: { cards: lightHeavy(dep((d) => d.enchantments)), payoffs: lightHeavy(dep((d) => d.enchantmentPayoffs)) },
  creatures: lightHeavy(dep((d) => d.creaturePayoffs)),
  activated: lightHeavy(dep((d) => d.activated)),
  combat: { lightMax: combatLightMax(series((s) => s.deps.routes, (s) => s.deps.lines === 0)) },
};

/** The most routes a no-line deck can have and still read as leaning on combat: the largest value
 *  whose lower tail (at or under it) is at most 10% of no-line decks. Zero routes is heavy whatever
 *  this says; when zero alone already passes 10%, light does not occur. */
function combatLightMax(xs: { v: number; w: number }[]): number {
  const total = xs.reduce((s, x) => s + x.w, 0);
  let best = 0;
  for (let v = 1; v < 30; v++) {
    if (xs.filter((x) => x.v <= v).reduce((s, x) => s + x.w, 0) / total <= 0.1) best = v; else break;
  }
  return best;
}
const both = (c: { light: number; heavy: number }) => [c.light, c.heavy];
describe("graveyard", dep((d) => d.graveyard), both(dependencies.graveyard));
describe("artifacts", dep((d) => d.artifacts), both(dependencies.artifacts.cards));
describe("artifact payoffs", dep((d) => d.artifactPayoffs), both(dependencies.artifacts.payoffs));
describe("enchantments", dep((d) => d.enchantments), both(dependencies.enchantments.cards));
describe("enchantment payoffs", dep((d) => d.enchantmentPayoffs), both(dependencies.enchantments.payoffs));
describe("creature payoffs", dep((d) => d.creaturePayoffs), both(dependencies.creatures));
describe("creatures with abilities", dep((d) => d.activated), both(dependencies.activated));
describe("routes outside combat, decks with no line", series((s) => s.deps.routes, (s) => s.deps.lines === 0), [dependencies.combat.lightMax + 1]);

// ---- how often each row is drawn, over the whole population -----------------------------------
/** The rows a reading would draw, through the app's own `dependencyStrengths`. */
function rowsOf(d: DependencyFigures, c: typeof dependencies): string[] {
  const s = dependencyStrengths(d, c);
  return DEPENDENCY_ROWS.flatMap((row) => (s[row] ? [`${row} ${s[row]}`] : []));
}
const totalWeight = samples.reduce((s, x) => s + x.weight, 0);
console.log("\n## How often each row is drawn (share of the population's weight)\n");
for (const row of DEPENDENCY_ROWS) {
  const share = (strength: string) => samples.filter((x) => rowsOf(x.deps, dependencies).includes(`${row} ${strength}`)).reduce((s, x) => s + x.weight, 0) / totalWeight;
  console.log(`- ${row}: light ${(share("light") * 100).toFixed(1)}%, heavy ${(share("heavy") * 100).toFixed(1)}%`);
}
const rowCount = (n: number) => samples.filter((x) => rowsOf(x.deps, dependencies).length === n).reduce((s, x) => s + x.weight, 0) / totalWeight;
console.log(`- rows per deck: none ${(rowCount(0) * 100).toFixed(1)}%, one ${(rowCount(1) * 100).toFixed(1)}%, two ${(rowCount(2) * 100).toFixed(1)}%, three or more ${((1 - rowCount(0) - rowCount(1) - rowCount(2)) * 100).toFixed(1)}%`);

// ---- where the reference account's decks land -------------------------------------------------
console.log(`\n## The reference decks (${REFERENCE_USER}), on these cuts\n`);
const step = (v: number, cuts: number[]) => 1 + cuts.filter((c) => v >= c).length;
const profiles = await q<{ name: string; profile: DeckProfile }>(`
  select d.name, p.profile from deck_profiles p join decks d on d.id = p.deck_id where d.user_id = $1 order by d.name`, [REFERENCE_USER]);
for (const { name, profile } of profiles) {
  const ids = profile.cards.map((c) => c.oracleId);
  const text: TextRow[] = ids.flatMap((id) => {
    const c = cardById.get(id);
    return c ? [{ oracleId: id, oracleText: c.oracle_text, keywords: c.keywords, manaCost: c.mana_cost, colorIdentity: c.color_identity }] : [];
  });
  const missing = ids.filter((id) => !cardById.has(id));
  if (missing.length > 0) {
    for (const c of await q<CardRow>(`select oracle_id, name, type_line, cmc, mana_cost, oracle_text, keywords, color_identity, layout from cards where oracle_id = any($1::uuid[])`, [missing])) {
      cardById.set(c.oracle_id, c);
      text.push({ oracleId: c.oracle_id, oracleText: c.oracle_text, keywords: c.keywords, manaCost: c.mana_cost, colorIdentity: c.color_identity });
    }
  }
  const input = benchmarkInput(profile, text, labels, [] as ComboPieceRow[]);
  const f = figuresOf(input.cards, 1);
  const rows = rowsOf(f.deps, dependencies);
  console.log(`- ${name}: velocity ${round(f.velocity)} (step ${step(f.velocity, grades.velocity)}), flow ${f.flow} (${step(f.flow, grades.flow)}), interaction ${f.interaction} (${step(f.interaction, grades.interaction)}), win ${f.win === null ? "no line" : `${round(f.win * 100, 0)}% (${step(f.win, grades.win)})`}; rows: ${rows.join(", ") || "none"}`);
}

console.log("\n## For `src/lib/benchmarks/cuts.ts`\n\n```ts");
console.log(`export const BENCHMARK_CUTS: BenchmarkCuts = ${JSON.stringify({ grades, dependencies }, null, 2)};`);
console.log("```");
client.release();
await pool.end();
