/**
 * `pnpm eval:cuts` — Proposed cuts tier 1 against the cuts Hugh actually made. READ-ONLY, staging.
 *
 * No staging deck is over 100, so recall is scored on the five decks with a v1 -> v2 history. Each
 * is rebuilt at its PRE-CUT size: v1's list plus the cards v2 added (the oversize list Hugh was
 * choosing from), and the cards v2 dropped are the cuts to find. K is the number he cut; the
 * engine's top K are its proposal. The headline and section 1 use the shipped, UNTUNED weights; section 3 tunes on four decks and scores the fifth, never the same decks.
 *
 * Caveats it prints: a v1 -> v2 swap drops a card for a reason that may be the replacement, not the
 * card's own weakness, and a basic land counts as cut only when v2 holds none of that land.
 *
 * Gishath (no history) gets a figures-and-key-cards check instead: the engine is asked for N cuts
 * as if the deck were N over, and the output lists what it reads and what it would take out.
 */
import "../lib/env.mjs";

import { parseArgs } from "node:util";

const { values: args } = parseArgs({ options: { gishathOver: { type: "string", default: "5" } } });
if (!/^\d+$/.test(args.gishathOver ?? "")) throw new Error("--gishathOver must be a non-negative integer");

import { connectStaging } from "./lib/staging.mjs";
import { CUT_DECKS, GISHATH_DECK, loadCutTruth, pairedSwaps, type Head } from "./lib/cuts-truth.mjs";
// No signed-in reader here: every switch read takes the environment itself (`process.env`).

const db = await connectStaging();
const { eq, inArray } = await import("drizzle-orm");
const schema = await import("../../src/db/schema");
const { loadDeckProfileFromHead } = await import("../../src/lib/profile/load");
const { readCutSupport } = await import("../../src/lib/decks/cuts-read");
const { proposeCuts } = await import("./lib/cuts-ranking.mjs");
const { readLabels } = await import("../../src/lib/labels/read");
const { FILLS } = await import("../../src/lib/labels/consider");
const { classifyCards } = await import("../../src/lib/edhrec/role-targets");
const GISHATH = GISHATH_DECK;

type Profile = Awaited<ReturnType<typeof loadDeckProfileFromHead>>;
type Support = Awaited<ReturnType<typeof readCutSupport>>;
type Weights = import("./lib/cuts-ranking.mjs").CutWeights;
const ROLE_KEYS = ["ramp", "draw", "removal", "wipes"] as const;

type Case = {
  name: string;
  k: number;
  cut: string[];
  paired: Set<string>;
  profile: Profile;
  labelProfile: Profile | null;
  support: Support;
};

/** The profile with its four role counts, the cards behind them and the targets read from card
 *  labels instead of the text classifier (the direction of #1327). Land stays the classifier's:
 *  labels carry no land role. A nonland card with no fresh label keeps its classifier roles. The
 *  targets are EDHREC's inclusion summed over the support list per labeled role, the same
 *  derivation `deriveRoleTargets` runs on classifier roles. An approximation of the plan's rebuild. */
async function withLabelRoles(profile: Profile, support: Support): Promise<Profile | null> {
  if (!support || !profile.skeleton) return null;
  const ids = [...new Set([...profile.cards.map((c) => c.oracleId), ...support.inclusion.keys()])];
  const labels = await readLabels(ids);
  const labelRoles = (id: string) => {
    const jobs = labels.get(id);
    return jobs ? ROLE_KEYS.filter((r) => jobs.some((j) => j.space === "role" && FILLS[r].includes(j.kind))) : null;
  };
  const cards: Record<string, { oracleId: string; name: string }[]> = { ramp: [], draw: [], removal: [], wipes: [], land: [...profile.roles.cards.land] };
  const counts: Record<string, number> = { ramp: 0, draw: 0, removal: 0, wipes: 0, land: profile.roles.counts.land };
  const excl: Record<string, number> = { ramp: 0, draw: 0, removal: 0, wipes: 0, land: profile.roles.excludingCommanders.land };
  const commanders = new Set(profile.commanderOracleIds);
  const classifierRolesOf = new Map<string, string[]>();
  for (const r of ROLE_KEYS) for (const c of profile.roles.cards[r] ?? []) classifierRolesOf.set(c.oracleId, [...(classifierRolesOf.get(c.oracleId) ?? []), r]);
  for (const c of profile.cards) {
    const roles = labelRoles(c.oracleId) ?? classifierRolesOf.get(c.oracleId) ?? [];
    for (const r of roles) {
      cards[r].push({ oracleId: c.oracleId, name: c.name });
      counts[r] += c.quantity;
      if (!commanders.has(c.oracleId)) excl[r] += c.quantity;
    }
  }
  // A support card with no fresh label takes the classifier's roles, as a deck card does above, so
  // the targets are not shrunk by the cards labels have not reached.
  const unlabeled = [...support.inclusion.keys()].filter((id) => !labels.has(id));
  const fallback = unlabeled.length === 0 ? new Map() : classifyCards(
    await db.select({ oracleId: schema.cards.oracleId, typeLine: schema.cards.typeLine, oracleText: schema.cards.oracleText, layout: schema.cards.layout, keywords: schema.cards.keywords })
      .from(schema.cards).where(inArray(schema.cards.oracleId, unlabeled)),
  );
  const targets = { ramp: 0, draw: 0, removal: 0, wipes: 0 };
  for (const [id, pct] of support.inclusion) {
    if (pct == null || pct <= 0) continue;
    const roles: string[] = labelRoles(id) ?? fallback.get(id) ?? [];
    for (const r of ROLE_KEYS) if (roles.includes(r)) targets[r] += pct / 100;
  }
  return {
    ...profile,
    roles: { counts, excludingCommanders: excl, cards } as unknown as Profile["roles"],
    skeleton: { ...profile.skeleton, roleTargets: { of: "commander", targets } },
  };
}

const cases: Case[] = [];
for (const t of await loadCutTruth(db)) {
  const [profile, support] = await Promise.all([
    loadDeckProfileFromHead(t.head, process.env),
    readCutSupport(t.head.commanderOracleId, t.head.partnerOracleId),
  ]);
  const rolesOf = new Map<string, Set<string>>();
  for (const r of [...ROLE_KEYS, "land"] as const) {
    for (const c of profile.roles.cards[r] ?? []) rolesOf.set(c.oracleId, (rolesOf.get(c.oracleId) ?? new Set()).add(r));
  }
  const paired = pairedSwaps(t.cut, t.added, rolesOf);
  cases.push({ name: t.name, k: t.cut.length, cut: t.cut, paired, profile, labelProfile: await withLabelRoles(profile, support), support });
  console.error(`${t.name}: ${t.cut.length} cut, ${t.added.length} added, ${paired.size} swapped for a card of the same role`);
}

/** Hits in the engine's top K, by cut id. */
function topK(c: Case, opts: { labels?: boolean; weights?: Weights; mult?: number } = {}): Set<string> {
  const profile = opts.labels && c.labelProfile ? c.labelProfile : c.profile;
  const r = proposeCuts({ profile, locked: new Set(), support: c.support, weights: opts.weights });
  return new Set(r.candidates.slice(0, c.k * (opts.mult ?? 1)).map((x) => x.oracleId));
}
const hitsOf = (c: Case, opts?: Parameters<typeof topK>[1], only?: (id: string) => boolean) => {
  const top = topK(c, opts);
  return c.cut.filter((id) => (!only || only(id)) && top.has(id)).length;
};

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const totalK = sum(cases.map((c) => c.k));
const poolOf = (c: Case) => c.profile.cards.filter((x) => !c.profile.commanderOracleIds.includes(x.oracleId)).length;
const chanceOf = (c: Case, n = c.k) => (n * c.k) / poolOf(c);
const totalHit = sum(cases.map((c) => hitsOf(c)));
const totalHit2k = sum(cases.map((c) => hitsOf(c, { mult: 2 })));
const chance = sum(cases.map((c) => chanceOf(c)));
const lift = totalHit / Math.max(chance, 1e-9);

// Leave-one-out: pick the weights that find the most cuts on the other four decks, score the fifth.
const GRID: Weights[] = [];
for (let a = 0; a <= 20; a++) for (let b = 0; a + b <= 20; b++) for (let c = 0; a + b + c <= 20; c++) {
  GRID.push({ inclusion: a / 20, role: b / 20, curve: c / 20, bracket: (20 - a - b - c) / 20 });
}
const loo = cases.map((held) => {
  const train = cases.filter((c) => c !== held);
  let best = GRID[0];
  let bestHits = -1;
  for (const w of GRID) {
    const h = sum(train.map((c) => hitsOf(c, { weights: w })));
    if (h > bestHits) { bestHits = h; best = w; }
  }
  return { held, weights: best, trainHits: bestHits, trainK: sum(train.map((c) => c.k)), heldHits: hitsOf(held, { weights: best }) };
});
const looHit = sum(loo.map((l) => l.heldHits));
const labelHit = sum(cases.map((c) => hitsOf(c, { labels: true })));

console.log("# Proposed cuts tier 1: recall against the cuts Hugh made\n");
console.log(
  `**Answer: ${totalHit * 2 < totalK ? "yes" : "no"}, the free tier ${totalHit * 2 < totalK ? "misses most of" : "finds at least half of"} the cuts Hugh made${lift < 1.5 ? ", and does little better than chance" : ""}.** ` +
  `Its top K holds ${totalHit} of ${totalK} (${pct(totalHit, totalK)}), ${lift.toFixed(1)}x what chance would hold (${chance.toFixed(1)}); the top 2K holds ${totalHit2k} (${pct(totalHit2k, totalK)}). ` +
  `With roles read from card labels it holds ${labelHit} (${(labelHit / Math.max(chance, 1e-9)).toFixed(1)}x chance); with weights tuned on four decks and scored on the fifth it holds ${looHit} (${(looHit / Math.max(chance, 1e-9)).toFixed(1)}x). Caveats: five decks, one player; a basic land counts as cut only when v2 holds none of it, so a trimmed basic count is not a cut here; a v1 to v2 removal is often a swap for a better card rather than a card the deck was too big for (see the split below).\n`,
);
console.log("| Deck | Cut (K) | Pool | In top K | In top 2K | Not listed at all |");
console.log("|---|---|---|---|---|---|");
for (const c of cases) {
  const r = proposeCuts({ profile: c.profile, locked: new Set(), support: c.support });
  const listed = new Set(r.candidates.map((x) => x.oracleId));
  console.log(`| ${c.name} | ${c.k} | ${poolOf(c)} | ${hitsOf(c)} | ${hitsOf(c, { mult: 2 })} | ${c.cut.filter((id) => !listed.has(id)).length} |`);
}

console.log("\n## 1. Upgrade swaps against net reductions\n");
console.log("A removal is a swap when v2 added a card that fills one of its roles (each add pairs once).\n");
console.log("| Kind | Cuts | In top K | Chance |");
console.log("|---|---|---|---|");
for (const [label, swap] of [["Swapped for the same role", true], ["Net reduction", false]] as const) {
  const n = sum(cases.map((c) => c.cut.filter((id) => c.paired.has(id) === swap).length));
  const h = sum(cases.map((c) => hitsOf(c, {}, (id) => c.paired.has(id) === swap)));
  const ch = sum(cases.map((c) => (c.cut.filter((id) => c.paired.has(id) === swap).length * c.k) / poolOf(c)));
  console.log(`| ${label} | ${n} | ${h} (${pct(h, n)}) | ${ch.toFixed(1)} |`);
}

console.log("\n## 2. Roles from card labels instead of the classifier\n");
const labelHit2k = sum(cases.map((c) => hitsOf(c, { labels: true, mult: 2 })));
console.log(`Top K: ${totalHit} of ${totalK} with classifier roles, ${labelHit} with label roles. Top 2K: ${totalHit2k} against ${labelHit2k}. ` +
  `Decks without a label profile (no support list or skeleton): ${cases.filter((c) => !c.labelProfile).map((c) => c.name).join(", ") || "none"}.\n`);
console.log("| Deck | Classifier | Labels |");
console.log("|---|---|---|");
for (const c of cases) console.log(`| ${c.name} | ${hitsOf(c)} | ${hitsOf(c, { labels: true })} |`);

console.log("\n## 3. Weights tuned on four decks, scored on the fifth\n");
console.log(`Grid of ${GRID.length} weight sets (steps of 0.05, summing to 1), best top-K hits on the four training decks, scored on the held-out one. Untuned: ${totalHit} of ${totalK}. Held out: ${looHit} of ${totalK}.\n`);
console.log("| Held-out deck | Cuts | Untuned | Held-out | Weights chosen (inclusion / role / curve / bracket) | Training hits |");
console.log("|---|---|---|---|---|---|");
for (const l of loo) {
  const w = l.weights;
  console.log(`| ${l.held.name} | ${l.held.k} | ${hitsOf(l.held)} | ${l.heldHits} | ${w.inclusion} / ${w.role} / ${w.curve} / ${w.bracket} | ${l.trainHits} of ${l.trainK} |`);
}
console.log("\n## Missed cuts (untuned)\n");
for (const c of cases) {
  const top = topK(c);
  const r = proposeCuts({ profile: c.profile, locked: new Set(), support: c.support });
  const rank = new Map(r.candidates.map((x, i) => [x.oracleId, i]));
  const names = new Map(c.profile.cards.map((x) => [x.oracleId, x.name]));
  const missed = c.cut.filter((id) => !top.has(id));
  if (missed.length) console.log(`- **${c.name}**: ${missed.map((id) => { const i = rank.get(id); return `${names.get(id)}: ${i === undefined ? "not listed" : `rank ${i + 1}, ${r.candidates[i].reason.kind}`}`; }).join("; ")}`);
}
console.log();

// Gishath: figures and key cards.
{
  const over = Number(args.gishathOver);
  const { rows: cards } = { rows: await db.select({ oracleId: schema.deckCards.oracleId, quantity: schema.deckCards.quantity })
    .from(schema.deckCards).where(eq(schema.deckCards.deckId, GISHATH)) };
  const [deck] = await db.select().from(schema.decks).where(eq(schema.decks.id, GISHATH));
  const head: Head = {
    deckId: GISHATH, userId: deck.userId, commanderOracleId: deck.commanderOracleId,
    partnerOracleId: deck.partnerOracleId, declaredBracket: deck.declaredBracket, cards,
  };
  const [profile, support] = await Promise.all([
    loadDeckProfileFromHead(head, process.env), readCutSupport(head.commanderOracleId, head.partnerOracleId),
  ]);
  const padded = { ...profile, counts: { ...profile.counts, total: 100 + over } };
  const r = proposeCuts({ profile: padded, locked: new Set(), support });
  console.log(`## HD - Gishath, asked for ${over} cuts as if ${over} over\n`);
  console.log(`Missing signals: ${r.missing.join(", ") || "none"}. Support list: ${support ? `${support.listed} cards, ${support.deckCount ?? "?"} decks` : "none"}. Candidates: ${r.candidates.length} of ${profile.cards.length - profile.commanderOracleIds.length} cards.\n`);
  const cmdr = new Set(profile.commanderOracleIds);
  const cmdrProposed = r.candidates.some((c) => cmdr.has(c.oracleId));
  console.log(`Commander proposed: ${cmdrProposed ? "YES (defect)" : "no"}.`);
  if (cmdrProposed) process.exitCode = 1;
  const gc = new Set(profile.brackets.gameChangers.map((c) => c.oracleId));
  console.log(`Game Changers held: ${profile.brackets.gameChangers.map((c) => c.name).join(", ") || "none"}; proposed: ${r.candidates.filter((c) => gc.has(c.oracleId)).map((c) => c.name).join(", ") || "none"}.\n`);
  console.log("| # | Card | Score | Reason | Opens gap |");
  console.log("|---|---|---|---|---|");
  r.candidates.slice(0, Math.max(over, 10)).forEach((c, i) =>
    console.log(`| ${i + 1} | ${c.name} | ${c.score.toFixed(3)} | ${JSON.stringify(c.reason)} | ${c.opensGap ?? ""} |`));
}

function pct(a: number, b: number) {
  return b === 0 ? "n/a" : `${Math.round((a / b) * 100)}%`;
}

