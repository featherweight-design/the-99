// Measures the oracle-text mass-land-denial classifier BEFORE it is believed.
//
// READ-ONLY. Writes nothing, creates no fixture. Point it at any branch you can read.
//
// The spec (§4.2) proposes a second mass-land-denial source beside the Spellbook-derived
// one, implementing WotC's published definition:
//
//   "effects that destroy, exile, or bounce other players' lands, keep lands tapped, or
//    change what mana they produce, affecting four or more lands per player, without
//    replacing them"
//
// The spec then asserted it "reaches the common cases" and measured nothing, which is the
// exact failure the staples measurement had just caught. This settles two numbers that
// Design cannot write the verdict's warning copy without:
//
//   RECALL    — of a curated list of cards that unambiguously qualify, how many does it
//               catch? A low number means the "detection is partial" warning is the most
//               important thing on the verdict.
//   PRECISION — what does it catch that should NOT qualify? A false positive is worse than
//               a miss here: it tells a player their Bracket 2 deck is illegal when it is
//               not, and they cut a card over it.
//
// The curated list is a TEST FIXTURE, not a data source (§4.1's distinction). It exists to
// measure recall against, and every entry is a card whose qualification under the quoted
// definition is not in dispute.

import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const client = new Pool({ connectionString: DATABASE_URL });

/**
 * The candidate classifier. Each clause maps to a phrase in the quoted definition, and the
 * comment says which — so a reader can check the rule against the rule rather than against
 * an intuition about what mass land denial "feels like".
 */
const PATTERNS: { why: string; re: RegExp }[] = [
  // "destroy … other players' lands … four or more per player"
  { why: "destroy all lands", re: /destroy all (creatures and |artifacts and |nonland permanents and )?lands/i },
  { why: "destroy N lands", re: /destroys? (four|five|six|seven|eight|nine|ten|\d+) lands/i },
  { why: "destroy all nonbasic", re: /destroy all nonbasic lands/i },
  { why: "destroy all permanents", re: /destroy all (artifacts, creatures, and lands|permanents)/i },
  // "exile"
  { why: "exile all lands", re: /exile all lands/i },
  // "bounce"
  { why: "return all lands", re: /return all lands .{0,40}owner'?s'? hands?/i },
  // "affecting four or more lands per player" via a sacrifice clause
  { why: "sacrifice N lands", re: /(each player|players) sacrifices? (four|five|six|seven|all|x|\d+) lands?/i },
  // Cataclysm-style: keep a few, sacrifice the rest
  { why: "keeps N, sacs rest", re: /chooses? .{0,60}\ba land\b.{0,80}sacrifices? (the |all the )?rest/i },
  // "keep lands tapped"
  { why: "lands don't untap", re: /lands don'?t untap/i },
  // "keep lands tapped" — the Orb/Stasis family words this several ways
  { why: "can't untap more than", re: /can'?t untap more than (one|two|three|\w+) (land|permanent)/i },
  { why: "skip untap step", re: /skips? (their|your|his or her) untap steps?/i },
  { why: "permanents don't untap", re: /permanents don'?t untap during/i },
  // "change what mana they produce"
  { why: "nonbasic lands are", re: /nonbasic lands are mountains|nonbasic lands? lose all land types/i },
  { why: "lands produce colorless", re: /lands? .{0,30}produce .{0,10}colorless instead/i },
];

/** Cards that unambiguously qualify under the quoted definition. Recall is measured here. */
const KNOWN_POSITIVE = [
  "Armageddon", "Ravages of War", "Catastrophe", "Jokulhaups", "Obliterate",
  "Decree of Annihilation", "Wildfire", "Burning of Xinye", "Impending Disaster",
  "Global Ruin", "Ruination", "Sunder", "Wave of Vitriol", "Cataclysm",
  "Winter Orb", "Static Orb", "Rising Waters", "Stasis", "Blood Moon", "Back to Basics",
  "Boom // Bust", "Devastation", "Fall of the Thran", "Myojin of Infinite Rage",
];

/**
 * Cards a naive rule tends to catch that must NOT qualify — a one-sided removal spell, a
 * symmetrical effect that replaces what it destroys, or a single-land effect. Precision is
 * measured here, and a hit on any of these is a defect rather than a tuning question.
 */
const KNOWN_NEGATIVE = [
  "Strip Mine", "Wasteland", "Ghost Quarter", "Field of Ruin", "Tectonic Edge",
  "Path to Exile", "Assassin's Trophy", "Beast Within", "Generous Gift",
  "Scapeshift", "Splendid Reclamation", "Harrow",
];

const hit = (text: string | null) =>
  text ? PATTERNS.filter((p) => p.re.test(text)).map((p) => p.why) : [];

async function main() {
  const { rows } = await client.query<{ name: string; oracle_text: string | null; tl: string }>(
    `select name, oracle_text, type_line tl from cards where commander_legal = true`,
  );
  console.log(`\n== corpus ==\ncommander-legal cards  ${rows.length}`);

  const flagged = rows
    .map((r) => ({ ...r, why: hit(r.oracle_text) }))
    .filter((r) => r.why.length > 0);
  console.log(`flagged by classifier  ${flagged.length}  (${((flagged.length / rows.length) * 100).toFixed(3)}%)`);

  const byName = new Map(rows.map((r) => [r.name.toLowerCase(), r]));
  const flaggedNames = new Set(flagged.map((f) => f.name.toLowerCase()));

  console.log(`\n== recall: cards that unambiguously qualify ==`);
  let caught = 0, absent = 0;
  for (const n of KNOWN_POSITIVE) {
    const inCatalog = byName.has(n.toLowerCase());
    if (!inCatalog) { absent++; console.log(`  ?  ${n.padEnd(28)} not in catalog under this name`); continue; }
    const ok = flaggedNames.has(n.toLowerCase());
    if (ok) caught++;
    console.log(`  ${ok ? "✓" : "✗"}  ${n.padEnd(28)} ${ok ? hit(byName.get(n.toLowerCase())!.oracle_text).join(", ") : "MISSED"}`);
  }
  const denom = KNOWN_POSITIVE.length - absent;
  console.log(`\n  recall ${caught}/${denom}  (${((caught / denom) * 100).toFixed(1)}%)   [${absent} not resolvable by name]`);

  console.log(`\n== precision: cards that must NOT qualify ==`);
  let falsePos = 0;
  for (const n of KNOWN_NEGATIVE) {
    if (!byName.has(n.toLowerCase())) { console.log(`  ?  ${n.padEnd(28)} not in catalog`); continue; }
    const bad = flaggedNames.has(n.toLowerCase());
    if (bad) falsePos++;
    console.log(`  ${bad ? "✗ FALSE POSITIVE" : "✓"}  ${n}`);
  }
  console.log(`\n  false positives ${falsePos}`);

  console.log(`\n== everything else it flagged (eyeball for precision) ==`);
  const known = new Set([...KNOWN_POSITIVE, ...KNOWN_NEGATIVE].map((n) => n.toLowerCase()));
  const extra = flagged.filter((f) => !known.has(f.name.toLowerCase()));
  console.log(`  ${extra.length} cards beyond the fixture:`);
  for (const e of extra.slice(0, 40)) console.log(`   · ${e.name.padEnd(34)} ${e.why.join(", ")}`);
  if (extra.length > 40) console.log(`   … and ${extra.length - 40} more`);

  await client.end();
  console.log("\ndone — read-only, nothing written.\n");
}

main().catch(async (err) => {
  await client.end().catch(() => {});
  console.error(err);
  process.exitCode = 1;
});
