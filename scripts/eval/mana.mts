/**
 * `pnpm eval:mana` — Mana Balance's evidence against a hand-checked golden deck, then printed for
 * the golden deck owner's staging decks. READ-ONLY, staging; no model call.
 *
 * Section 1 asserts the engine's counted output for HD - Gishath equals `mana-balance-golden.json`
 * (exit 1 on any difference). If the deck's list has moved since the expectation was checked it
 * stops with exit 2 and says so, rather than failing on a stale expectation. Section 2 prints each
 * deck's evidence: nothing in it is a verdict, because the shortfall rules scored against Hugh's play
 * experience all failed (plan, "Verdict rules rejected"). `--print` prints Gishath's shape as JSON for
 * writing a new expectation, which is then checked by hand against the cards before it is committed.
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
// A source row's id is an oracle id; the commanders' are `commander:N`, which only patterns list.
const names = new Map(detail.cards.map((c) => [c.oracleId, c.name]));
const actual = goldenShape(balance, (id) => names.get(id) ?? id);
const fingerprint = listFingerprint({ commanderOracleId: detail.commander.oracleId, partnerOracleId: detail.partner?.oracleId ?? null, cards: detail.cards });

if (args.print) {
  console.log(JSON.stringify({ listFingerprint: fingerprint, expected: actual }, null, 2));
  process.exit(0);
}

console.log(`# ${golden.deck.name} (${golden.deck.deckId.slice(0, 8)}), list ${fingerprint.slice(0, 8)}`);
if (fingerprint !== golden.deck.listFingerprint) {
  console.error(`eval:mana: the list has moved since the expectation was checked (pinned ${golden.deck.listFingerprint.slice(0, 8)}, now ${fingerprint.slice(0, 8)}). Re-check the golden by hand: pnpm eval:mana --print`);
  process.exit(2);
}

const karstenText = (k: { kind: string; sources?: number }) => (k.kind === "unknown" ? "no row" : `${k.kind === "atMost" ? "at most " : ""}${k.sources}`);
const evidenceLines = (b: NonNullable<typeof balance>) => {
  const out: string[] = [];
  for (const c of b.colors.filter((x) => x.pips.withCommander > 0 || x.sources.total > 0)) {
    const hardest = c.patterns.slice(0, 3).map((p) => `${p.pattern} x${p.copies} (Karsten ${karstenText(p.karsten)})`).join(", ");
    out.push(`  ${c.color}: pips ${c.pips.withCommander} (${c.pips.withoutCommander} without the commander), sources ${c.sources.total} (${c.sources.lands} lands + ${c.sources.nonland}); hardest ${hardest || "none"}`);
  }
  const l = b.lands;
  out.push(`  lands ${l.count}, tapped ${l.tapped.always} always (${((100 * l.tapped.always) / Math.max(1, l.count)).toFixed(1)}%) + ${l.tapped.unless} unless a condition + ${l.tapped.fetch} fetch a tapped land; average MV ${l.averageManaValue.toFixed(2)}, cheap ramp ${l.cheapRamp}, Karsten lands ${l.karstenLands.toFixed(1)}`);
  return out;
};

console.log("\n## 1. Golden check\n");
for (const line of evidenceLines(balance)) console.log(line);
console.log(`  colorless supply ${actual.colorlessSupply}, unattributed ${actual.unattributedNonland}`);
for (const c of GOLDEN_COLORS) if (actual.colors[c].pipsWith > 0 || actual.colors[c].lands.length + actual.colors[c].nonland.length > 0) console.log(`  ${c}: ${actual.colors[c].order || "no patterns"}`);
const diffs = diffGolden(golden.expected, actual);
if (diffs.length > 0) {
  console.log(`\nFAIL: ${diffs.length} difference(s) from the golden:`);
  for (const d of diffs) console.log(`- ${d}`);
} else {
  console.log("\nPASS: the counted output equals the golden.");
}

console.log("\n## 2. Every deck of the same owner (evidence, no verdict)\n");
const decks = await db.select({ id: schema.decks.id, name: schema.decks.name }).from(schema.decks).where(eq(schema.decks.userId, owner.userId));
for (const d of decks) {
  const detailN = await getDeckDetail(d.id, owner.userId);
  const b = detailN ? await loadManaBalance(detailN) : null;
  console.log(`- ${d.name}${!b ? ": read failed" : b.state === "ok" ? "" : ` [${b.state}]`}`);
  // A colorless or no-source deck still has lands, tapped counts, an average and Karsten's figure.
  if (b) for (const line of evidenceLines(b)) console.log(line);
}
process.exit(diffs.length > 0 ? 1 : 0);
