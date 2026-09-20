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
  // "permanents" needs TWO guards, each paid for by a real false positive the sweep below
  // found. A NARROWING qualifier reduces the sweep to a subset that need not contain lands —
  // `destroy all permanents named Wirefly`, `…with that spell's mana value`, `…of the chosen
  // type`. And an EXCEPTION CLAUSE THAT NAMES LANDS spares them outright: Scourglass reads
  // `destroy all permanents except for artifacts and lands`, the exact opposite of this rule.
  //
  // The second guard tests for `land` inside the exception rather than for the exception
  // itself, and that distinction is the whole of it: Worldslayer's `destroy all permanents
  // other than this Equipment` leaves every land dead and IS mass land denial. A guard on
  // `other than` alone reads the two alike and loses it.
  {
    why: "destroy all permanents",
    re: /destroy all (?:artifacts, creatures, and lands|permanents(?!\s+(?:named|with|of)\b)(?![^.]*\b(?:except|other than)\b[^.]*\bland))/i,
  },
  // "exile"
  { why: "exile all lands", re: /exile all lands/i },
  // "bounce"
  { why: "return all lands", re: /return all lands .{0,40}owner'?s'? hands?/i },
  // "affecting four or more lands per player" via a sacrifice clause
  { why: "sacrifice N lands", re: /(each player|players) sacrifices? (four|five|six|seven|all|x|\d+) lands?/i },
  // Cataclysm-style: keep a few, sacrifice the rest
  { why: "keeps N, sacs rest", re: /chooses? .{0,60}\ba land\b.{0,80}sacrifices? (the |all the )?rest/i },
  // "keep lands tapped". The word boundary is load-bearing: without it this matches INSIDE
  // `Islands don't untap`, and flagged Choke and Curse of Marit Lage — single-colour hosers
  // that hit only the opponents on that colour, where the definition asks for four or more
  // lands PER PLAYER. `Nonbasic lands` and `Lands` both still match, which is what it is for.
  // …and `target` is excluded for the definition's OTHER clause: `up to three target lands
  // don't untap during their controller's next untap step` (Reduce // Rubble) is a bounded
  // selection for one turn, where the rule asks for four or more lands per player. A global
  // statement never says "target".
  { why: "lands don't untap", re: /(?<!target )\blands don'?t untap/i },
  // "keep lands tapped" — the Orb/Stasis family words this several ways
  // `You can't untap…` is a DRAWBACK on your own card (Mungha Wurm), not denial aimed at the
  // table. `Players` and `Your opponents` both still match, which is the Orb family.
  { why: "can't untap more than", re: /(?<!\byou )can'?t untap more than (one|two|three|\w+) (land|permanent)/i },
  { why: "skip untap step", re: /skips? (their|your|his or her) untap steps?/i },
  // Three guards, all found by reading the sweep. A NARROWING adjective can exclude lands
  // outright (`Nonland permanents don't untap` — Embargo) or reduce the effect to a sliver
  // of them (`Snow permanents` — Freyalise's Radiance, a snow hoser on the Choke pattern).
  // And `those permanents … next untap step` is Lorthos: eight TARGETED permanents for one
  // turn, the same bounded-and-temporary shape excluded on the `lands don't untap` clause.
  {
    why: "permanents don't untap",
    re: /(?<!\b(?:nonland|snow|those|artifact|creature|enchantment)\s)permanents don'?t untap during(?![^.]*\bnext untap step)/i,
  },
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
  // Added 2026-09-19, each one a card this classifier ACTUALLY FLAGGED while the line above
  // read "zero false positives" — found by the sweep, not by the fixture. A negative fixture
  // of cards no pattern was ever going to match measures nothing; these six all matched.
  "Choke",                 // `Islands don't untap` — a colour hoser, not four lands per player
  "Curse of Marit Lage",   // same
  "Reduce // Rubble",      // three TARGET lands, for one untap step
  "Scourglass",            // `destroy all permanents EXCEPT FOR artifacts and lands`
  "Wirefly Hive",          // `destroy all permanents named Wirefly`
  "Season of Gathering",   // `destroy all permanents of the chosen type`
  "Embargo",               // `NONLAND permanents don't untap` — the opposite of this rule
  "Freyalise's Radiance",  // `Snow permanents` — a snow hoser, on the Choke pattern
  "Lorthos, the Tidemaker",// eight TARGETED permanents, for one untap step
  "Mungha Wurm",           // `YOU can't untap more than one land` — a drawback on its own card
];

const hit = (text: string | null) =>
  text ? PATTERNS.filter((p) => p.re.test(text)).map((p) => p.why) : [];

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
