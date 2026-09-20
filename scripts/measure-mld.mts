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

// THE PRODUCTION CLASSIFIER, imported rather than restated. These two files were separate
// copies of one rule for a day, and in that day the spec's "zero false positives" line was
// measured against a curated set while the catalog held eleven. A script that restates a rule
// measures its own copy.
import { matchedMldClauses } from "../src/lib/bracket/oracle-rules";


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
  // Added 2026-09-19: the ELEVEN cards this classifier actually flagged while the line above
  // read "zero false positives" — found by the sweep, not by the fixture. A negative fixture
  // of cards no pattern was ever going to match measures nothing; every one of these matched.
  // They stay as REGRESSION ANCHORS: each is now excluded by a guard, so dropping a guard puts
  // its card back here as a counted false positive rather than leaving it to be noticed in the
  // sweep by a reader who may not be looking.
  "Choke",                 // `Islands don't untap` — a colour hoser, not four lands per player
  "Curse of Marit Lage",   // same
  "Reduce // Rubble",      // three TARGET lands, for one untap step
  "Scourglass",            // `destroy all permanents EXCEPT FOR artifacts and lands`
  "Wirefly Hive",          // `destroy all permanents named Wirefly`
  "Celestial Kirin",       // `destroy all permanents with that spell's mana value`
  "Season of Gathering",   // `destroy all permanents of the chosen type`
  "Embargo",               // `NONLAND permanents don't untap` — the opposite of this rule
  "Freyalise's Radiance",  // `Snow permanents` — a snow hoser, on the Choke pattern
  "Lorthos, the Tidemaker",// eight TARGETED permanents, for one untap step
  "Mungha Wurm",           // `YOU can't untap more than one land` — a drawback on its own card
];

const hit = matchedMldClauses;

/**
 * Why a fixture name is missing from the corpus — the CORPUS is commander-legal cards, so a
 * card can be absent for two quite different reasons and the run used to report both as
 * "not in catalog under this name".
 *
 * `Emrakul, the Aeons Torn` is the case: it is in `cards` under exactly that name and is
 * BANNED (`commander_legal = false`), so the query filters it. Reporting that as an
 * unresolvable name told a reader the fixture had a typo, and the recall denominator quietly
 * dropped a card for a reason nobody had stated.
 */
let allNames: Map<string, boolean> | null = null;
async function loadAllNames(): Promise<void> {
  const { rows } = await client.query<{ name: string; legal: boolean }>(
    `select name, commander_legal as legal from cards`,
  );
  allNames = new Map(rows.map((r) => [r.name.toLowerCase(), r.legal]));
}
function excludedReason(name: string): string {
  const legal = allNames?.get(name.toLowerCase());
  if (legal === undefined) return "not in the catalog under this name";
  return legal ? "in the catalog, legal — but absent from this corpus (unexpected)"
               : "in the catalog but BANNED (commander_legal = false), so outside this corpus";
}

async function main() {
  const { rows } = await client.query<{ name: string; oracle_text: string | null; tl: string }>(
    `select name, oracle_text, type_line tl from cards where commander_legal = true`,
  );
  console.log(`\n== corpus ==\ncommander-legal cards  ${rows.length}`);
  await loadAllNames();

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
    if (!inCatalog) { absent++; console.log(`  ?  ${n.padEnd(28)} ${excludedReason(n)}`); continue; }
    const ok = flaggedNames.has(n.toLowerCase());
    if (ok) caught++;
    console.log(`  ${ok ? "✓" : "✗"}  ${n.padEnd(28)} ${ok ? hit(byName.get(n.toLowerCase())!.oracle_text).join(", ") : "MISSED"}`);
  }
  const denom = KNOWN_POSITIVE.length - absent;
  console.log(`\n  recall ${caught}/${denom}  (${((caught / denom) * 100).toFixed(1)}%)   [${absent} outside the corpus — see the reason printed above]`);

  console.log(`\n== precision: cards that must NOT qualify ==`);
  let falsePos = 0;
  for (const n of KNOWN_NEGATIVE) {
    if (!byName.has(n.toLowerCase())) { console.log(`  ?  ${n.padEnd(28)} not in catalog`); continue; }
    const bad = flaggedNames.has(n.toLowerCase());
    if (bad) falsePos++;
    console.log(`  ${bad ? "✗ FALSE POSITIVE" : "✓"}  ${n}`);
  }
  console.log(`\n  false positives ${falsePos}  [against the curated set of ${KNOWN_NEGATIVE.length}]`);
  console.log(`  NOTE: that figure is scoped to the list above and is NOT a claim about the`);
  console.log(`  catalog. The sweep below is the one that can make that claim.`);

  // THE SWEEP — every flagged card, printed in full, and the reading the curated set cannot
  // give. `measure-extra-turns.mts` has had this from the start ("the reading that earns it
  // is the third one"); this script did not, and the gap is exactly where five false
  // positives hid behind a "zero false positives" line: Choke and Curse of Marit Lage
  // through `Islands don't untap`, Reduce // Rubble through a three-land one-turn clause,
  // and Wirefly Hive, Celestial Kirin, Season of Gathering and Scourglass through
  // `destroy all permanents` + a qualifier. Every one of them was already being PRINTED
  // here, truncated at 40 rows and never read.
  //
  // So: no truncation, and the count is the headline. A precision claim about the catalog
  // costs a human reading this list; there is no instrument that can rule on it, which is
  // why the output says so rather than printing a percentage nobody derived.
  console.log(`\n== the sweep: EVERY card this classifier flags, for precision ==`);
  const known = new Set([...KNOWN_POSITIVE, ...KNOWN_NEGATIVE].map((n) => n.toLowerCase()));
  const extra = flagged.filter((f) => !known.has(f.name.toLowerCase()));
  console.log(`  ${flagged.length} flagged in total; ${extra.length} beyond the fixture, all listed:`);
  for (const e of extra) console.log(`   · ${e.name.padEnd(34)} ${e.why.join(", ")}`);
  console.log(`\n  Read every line. A card here that does not affect four or more lands per`);
  console.log(`  player, without replacing them, is a false positive and a wrong bracket.`);

  await client.end();
  console.log("\ndone — read-only, nothing written.\n");
}

main().catch(async (err) => {
  await client.end().catch(() => {});
  console.error(err);
  process.exitCode = 1;
});
