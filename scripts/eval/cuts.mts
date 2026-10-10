/**
 * `pnpm eval:cuts` — Proposed cuts tier 1 against the cuts Hugh actually made. READ-ONLY, staging.
 *
 * No staging deck is over 100, so recall is scored on the five decks with a v1 -> v2 history. Each
 * is rebuilt at its PRE-CUT size: v1's list plus the cards v2 added (the oversize list Hugh was
 * choosing from), and the cards v2 dropped are the cuts to find. K is the number he cut; the
 * engine's top K are its proposal. Weights are the shipped, UNTUNED ones; nothing here tunes.
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

const STAGING = process.env.THE_99_NEON_STAGING_DIRECT;
if (!STAGING) throw new Error("THE_99_NEON_STAGING_DIRECT is not set");
process.env.DATABASE_URL = STAGING;

const { and, eq, inArray } = await import("drizzle-orm");
const { db } = await import("../../src/db");
const schema = await import("../../src/db/schema");
const { loadDeckProfileFromHead } = await import("../../src/lib/profile/load");
const { readCutSupport } = await import("../../src/lib/decks/cuts-read");
const { proposeCuts } = await import("../../src/lib/tuning/cuts");
type Head = Parameters<typeof loadDeckProfileFromHead>[0];

const DECKS: { name: string; id: string }[] = [
  { name: "HD - Avatar Aang", id: "0f585441-203e-475b-be7c-f11e67e20d79" },
  { name: "HD Tune - Counter Intelligence", id: "2829cf41-1e07-4ec7-8353-8b0d9dfd678b" },
  { name: "HD Tune - Prismari Artistry", id: "1a352a97-00fc-4309-a60e-5d518d56d34f" },
  { name: "HD - Gods", id: "13a6dc28-958c-4591-a2bb-c0297bbe5d92" },
  { name: "HD - Wizards", id: "7653dec3-bcf4-4045-8242-9000765c7601" },
];
const GISHATH = "904fdc61-e190-4ba5-8e34-2b18fa0584f2";

async function versionCards(deckId: string, number: number) {
  const [v] = await db.select().from(schema.deckVersions)
    .where(and(eq(schema.deckVersions.deckId, deckId), eq(schema.deckVersions.number, number)));
  if (!v) throw new Error(`deck ${deckId} has no version ${number}`);
  const rows = await db.select({ oracleId: schema.deckVersionCards.oracleId, quantity: schema.deckVersionCards.quantity })
    .from(schema.deckVersionCards).where(eq(schema.deckVersionCards.versionId, v.id));
  return { v, rows };
}

async function userOf(deckId: string) {
  const [d] = await db.select({ userId: schema.decks.userId }).from(schema.decks).where(eq(schema.decks.id, deckId));
  return d.userId;
}

type Row = { deck: string; k: number; pool: number; hit: number; hit2k: number; misses: string[]; noSignal: number };
const rows: Row[] = [];

for (const d of DECKS) {
  const [v1, v2] = [await versionCards(d.id, 1), await versionCards(d.id, 2)];
  const in2 = new Map(v2.rows.map((r) => [r.oracleId, r.quantity]));
  const in1 = new Set(v1.rows.map((r) => r.oracleId));
  const cut = v1.rows.filter((r) => !in2.has(r.oracleId)).map((r) => r.oracleId);
  const added = v2.rows.filter((r) => !in1.has(r.oracleId));
  const head: Head = {
    deckId: d.id,
    userId: await userOf(d.id),
    commanderOracleId: v2.v.commanderOracleId,
    partnerOracleId: v2.v.partnerOracleId,
    declaredBracket: v2.v.declaredBracket,
    cards: [...v1.rows, ...added],
  };
  const [profile, support] = await Promise.all([
    loadDeckProfileFromHead(head),
    readCutSupport(head.commanderOracleId, head.partnerOracleId),
  ]);
  const result = proposeCuts({ profile, locked: new Set(), support });
  const rank = new Map(result.candidates.map((c, i) => [c.oracleId, i]));
  const names = new Map(profile.cards.map((c) => [c.oracleId, c.name]));
  const k = cut.length;
  const hit = cut.filter((id) => (rank.get(id) ?? Infinity) < k).length;
  const hit2k = cut.filter((id) => (rank.get(id) ?? Infinity) < 2 * k).length;
  const missed = cut.filter((id) => (rank.get(id) ?? Infinity) >= k);
  const noSignal = missed.filter((id) => !rank.has(id)).length;
  rows.push({
    deck: d.name, k, pool: profile.cards.length, hit, hit2k, noSignal,
    misses: missed.map((id) => {
      const r = rank.get(id);
      const c = r === undefined ? null : result.candidates[r];
      return `${names.get(id) ?? id}: ${c ? `rank ${r + 1}, ${c.reason.kind}` : "no signal"}`;
    }),
  });
  console.error(`${d.name}: over ${result.over}, missing [${result.missing.join(", ")}], support ${support ? support.listed : "none"}`);
}

const totalK = rows.reduce((n, r) => n + r.k, 0);
const totalHit = rows.reduce((n, r) => n + r.hit, 0);
const totalHit2k = rows.reduce((n, r) => n + r.hit2k, 0);
const totalNoSignal = rows.reduce((n, r) => n + r.noSignal, 0);
const chance = rows.reduce((n, r) => n + (r.k * r.k) / r.pool, 0);

console.log("# Proposed cuts tier 1: recall against the cuts Hugh made (untuned weights)\n");
const lift = totalHit / Math.max(chance, 1e-9);
console.log(
  `**Answer: ${lift < 1.5 ? "yes, badly" : totalHit < totalK ? "yes" : "no"}. The free tier ${totalHit < totalK ? "misses most of" : "finds all of"} the cuts Hugh made.** ` +
  `Its top K holds ${totalHit} of ${totalK} (${pct(totalHit, totalK)}), ${lift.toFixed(1)}x what chance would hold (${chance.toFixed(1)}). ` +
  `Within the top 2K it holds ${totalHit2k} of ${totalK} (${pct(totalHit2k, totalK)}). ` +
  `${totalNoSignal} of ${totalK - totalHit} misses carry no signal at all (never listed); the rest were listed but ranked below the cut line.\n`,
);
console.log("| Deck | Cut (K) | Pool | In top K | In top 2K | No signal |");
console.log("|---|---|---|---|---|---|");
for (const r of rows) console.log(`| ${r.deck} | ${r.k} | ${r.pool} | ${r.hit} | ${r.hit2k} | ${r.noSignal} |`);
console.log("\n## Missed cuts\n");
for (const r of rows) if (r.misses.length) console.log(`- **${r.deck}**: ${r.misses.join("; ")}`);
console.log("\nCaveats: a v1 -> v2 swap may drop a card because of its replacement, not its own weakness; a basic land counts as cut only when v2 holds none of it; five decks, one player.\n");

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
    loadDeckProfileFromHead(head), readCutSupport(head.commanderOracleId, head.partnerOracleId),
  ]);
  const padded = { ...profile, counts: { ...profile.counts, total: 100 + over } };
  const r = proposeCuts({ profile: padded, locked: new Set(), support });
  console.log(`## HD - Gishath, asked for ${over} cuts as if ${over} over\n`);
  console.log(`Missing signals: ${r.missing.join(", ") || "none"}. Support list: ${support ? `${support.listed} cards, ${support.deckCount ?? "?"} decks` : "none"}. Candidates: ${r.candidates.length} of ${profile.cards.length} cards.\n`);
  const cmdr = new Set(profile.commanderOracleIds);
  console.log(`Commander proposed: ${r.candidates.some((c) => cmdr.has(c.oracleId)) ? "YES (defect)" : "no"}.`);
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

