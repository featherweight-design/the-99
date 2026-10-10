/**
 * `pnpm eval:mana` — Mana Balance tier 1 against a hand-checked golden deck, then across the golden
 * deck owner's staging decks as a measurement. READ-ONLY, staging; no model call.
 *
 * Section 1 asserts the engine's counted output for HD - Gishath equals `mana-balance-golden.json`
 * (exit 1 on any difference). If the deck's list has moved since the expectation was checked it
 * stops with exit 2 and says so, rather than failing on a stale expectation. Section 2 prints each
 * deck's verdict and how many decks read a short color at 1, 2 and 3 sources under: the evidence
 * `SHORT_BY` was judged on. `--print` prints Gishath's shape as JSON for writing a new expectation,
 * which is then checked by hand against the cards before it is committed.
 */
import "../lib/env.mjs";

import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { connectStaging } from "./lib/staging.mjs";
import { diffGolden, goldenShape, GOLDEN_COLORS, type GoldenBalance } from "./lib/mana-golden.mjs";

const { values: args } = parseArgs({ options: { print: { type: "boolean", default: false } } });
const GOLDEN = new URL("../../docs/superpowers/eval/mana-balance-golden.json", import.meta.url);
const golden = JSON.parse(readFileSync(GOLDEN, "utf8")) as { deck: { name: string; deckId: string; listFingerprint: string }; expected: GoldenBalance };

const db = await connectStaging();
const { eq } = await import("drizzle-orm");
const schema = await import("../../src/db/schema");
const { getDeckDetail } = await import("../../src/lib/decks/read");
const { loadManaBalance } = await import("../../src/lib/tuning/mana-balance-load");
const { listFingerprint } = await import("../../src/lib/profile/fingerprint");

const [owner] = await db.select({ userId: schema.decks.userId }).from(schema.decks).where(eq(schema.decks.id, golden.deck.deckId));
if (!owner) throw new Error(`eval:mana: golden deck ${golden.deck.deckId} is not on staging`);

const detail = await getDeckDetail(golden.deck.deckId, owner.userId);
if (!detail) throw new Error("eval:mana: the golden deck could not be read");
const balance = await loadManaBalance(detail);
if (!balance) throw new Error("eval:mana: the golden deck's text reads failed");
const names = new Map(detail.cards.map((c) => [c.oracleId, c.name]));
const actual = goldenShape(balance, (id) => names.get(id) ?? id);

if (args.print) {
  console.log(JSON.stringify({ listFingerprint: listFingerprint({ commanderOracleId: detail.commander.oracleId, partnerOracleId: detail.partner?.oracleId ?? null, cards: detail.cards }), expected: actual }, null, 2));
  process.exit(0);
}

const fingerprint = listFingerprint({ commanderOracleId: detail.commander.oracleId, partnerOracleId: detail.partner?.oracleId ?? null, cards: detail.cards });
console.log(`# ${golden.deck.name} (${golden.deck.deckId.slice(0, 8)}), list ${fingerprint.slice(0, 8)}`);
if (fingerprint !== golden.deck.listFingerprint) {
  console.error(`eval:mana: the list has moved since the expectation was checked (pinned ${golden.deck.listFingerprint.slice(0, 8)}, now ${fingerprint.slice(0, 8)}). Re-check the golden by hand: pnpm eval:mana --print`);
  process.exit(2);
}

console.log("\n## 1. Golden check\n");
console.log("| color | pips | sources (lands + other) | target | gap | state |\n|---|---|---|---|---|---|");
for (const c of GOLDEN_COLORS) {
  const a = actual.colors[c];
  if (a.demand === 0 && a.lands.length + a.nonland.length === 0) continue;
  console.log(`| ${c} | ${a.demand} | ${a.lands.length + a.nonland.length} (${a.lands.length} + ${a.nonland.length}) | ${a.target} | ${a.gap} | ${a.state} |`);
}
console.log(`\nsource cards ${actual.sourceCards}, colorless supply ${actual.colorlessSupply}, unattributed ${actual.unattributedNonland}`);
const diffs = diffGolden(golden.expected, actual);
if (diffs.length > 0) {
  console.log(`\nFAIL: ${diffs.length} difference(s) from the golden:`);
  for (const d of diffs) console.log(`- ${d}`);
} else {
  console.log("\nPASS: the counted output equals the golden.");
}

console.log("\n## 2. Every deck of the same owner (measurement)\n");
const decks = await db.select({ id: schema.decks.id, name: schema.decks.name }).from(schema.decks).where(eq(schema.decks.userId, owner.userId));
const rows: { name: string; state: string; gaps: number[]; margins: number[]; line: string }[] = [];
for (const d of decks) {
  const detailN = await getDeckDetail(d.id, owner.userId);
  const b = detailN ? await loadManaBalance(detailN) : null;
  if (!b) { rows.push({ name: d.name, state: "read failed", gaps: [], margins: [], line: "read failed" }); continue; }
  rows.push({
    name: d.name,
    state: b.state,
    gaps: b.colors.map((c) => c.gap),
    margins: b.colors.filter((c) => c.demand > 0).map((c) => -c.gap),
    line: `${b.state}, ${b.sourceCards} sources: ${b.colors.filter((c) => c.demand > 0).map((c) => `${c.color} ${c.supply.total}/${c.target}${c.state === "short" ? " SHORT" : ""}`).join("  ")}`,
  });
}
for (const r of rows) console.log(`- ${r.name}: ${r.line}`);
const judged = rows.filter((r) => r.state === "ok");
console.log(`\n${rows.length} decks, ${judged.length} judged (${rows.length - judged.length} colorless or unread).`);
for (const n of [1, 2, 3]) console.log(`- a color ${n} or more sources under its pip share: ${judged.filter((r) => r.gaps.some((g) => g >= n)).length} of ${judged.length}`);
// A one-color deck holds every source for its one color, so its margin says nothing; a color with no pip asks for nothing.
const thinnest = judged.filter((r) => r.margins.length >= 2).map((r) => ({ name: r.name, margin: Math.min(...r.margins) })).sort((x, y) => x.margin - y.margin).slice(0, 5);
console.log(`- thinnest cover, multicolor decks (sources a pip-bearing color holds beyond its share, fewest first): ${thinnest.map((t) => `${t.name} +${t.margin}`).join("; ")}`);
process.exit(diffs.length > 0 ? 1 : 0);
