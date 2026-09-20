// Measures the oracle-text extra-turn classifier BEFORE it is believed.
//
// READ-ONLY. Writes nothing, creates no fixture. Point it at any branch you can read.
//
// Sibling to `measure-mld.mts`, and it exists for the same reason: §4.2's second source is a
// classifier we own, and this repository's rule is that nothing is believed before it is
// measured (§2.4a). Extra turns matter more than their rarity suggests —
//
//   · Bracket 1 forbids extra-turn cards OUTRIGHT, which makes this the only hard COUNT rule
//     in the whole system. One Time Warp moves a deck out of B1.
//   · The extra-turn list is reported as a fact on EVERY verdict, not only at B1, so
//     under-detection under-reports everywhere.
//   · Under-reporting is the direction that misleads a pod: it tells a player their deck is
//     gentler than it is.
//
// Two numbers, and a third reading the other two cannot give:
//
//   RECALL    — of cards that unambiguously grant an extra turn, how many are caught?
//   PRECISION — what is caught that must NOT be? A false positive here moves a deck out of
//               Bracket 1 over a card that grants nothing.
//   THE SWEEP — every card in the catalog whose text mentions an extra turn at all, split by
//               whether the rule claims it. That third list is where a miss hides: a curated
//               positive set can only find what its author already thought of.

import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const client = new Pool({ connectionString: DATABASE_URL });

/**
 * Grants an extra turn. The wording is close to templated, which is why this is a far easier
 * problem than mass land denial — but the negation clause is load-bearing and is the whole
 * reason a naive `/extra turn/` match is wrong.
 */
const GRANTS = [
  { why: "takes an extra turn", re: /takes? (an|two|three|x|that many) extra turns?/i },
  { why: "take an extra turn", re: /take an extra turn after this one/i },
];

/**
 * Text that mentions an extra turn while granting none — a prevention, a skip, or a
 * restriction. Checked FIRST.
 *
 * An earlier version of this comment said "because every one of these also matches a grant
 * pattern", and the spec repeated it. Measured: FALSE for three of the four fixtures.
 * `Stranglehold`, `Trouble in Pairs` and `Gerrard's Hourglass Pendant` read "if a player
 * would begin an extra turn, that player skips that turn instead" and match NEITHER grant
 * pattern — they are excluded by matching nothing, so they would pass with this whole array
 * deleted. Only `Ugin's Nexus` earns the clause, because its death trigger really does say
 * "take an extra turn after this one".
 *
 * The order is still right — a card that both grants and prevents must read as prevention —
 * but the reason is one card, not four, and the run now prints which mechanism excluded each
 * fixture so a vacuous row cannot hide behind a passing one.
 */
const NEGATIONS = [
  { why: "skips that turn", re: /would begin an extra turn.{0,40}skips? that turn/i },
  { why: "can't take extra turns", re: /can'?t take extra turns/i },
  { why: "skip extra turns", re: /skips? (all )?extra turns/i },
];

const negated = (t: string) => NEGATIONS.filter((n) => n.re.test(t)).map((n) => n.why);
const granted = (t: string) => GRANTS.filter((g) => g.re.test(t)).map((g) => g.why);
const classify = (t: string | null) => {
  if (!t) return { hit: false, why: [] as string[], blockedBy: [] as string[] };
  const block = negated(t);
  const grant = granted(t);
  return { hit: grant.length > 0 && block.length === 0, why: grant, blockedBy: block };
};

/** Unambiguous grants. Recall is measured here. */
const KNOWN_POSITIVE = [
  "Time Warp", "Temporal Manipulation", "Capture of Jingzhou", "Nexus of Fate",
  "Temporal Mastery", "Alrund's Epiphany", "Karn's Temporal Sundering", "Part the Waterveil",
  "Beacon of Tomorrows", "Time Stretch", "Alchemist's Gambit", "Temporal Trespass",
  "Final Fortune", "Last Chance", "Savor the Moment", "Time Sieve", "Emrakul, the Aeons Torn",
  "Medomai the Ageless", "Notorious Throng", "Expropriate", "Stitch in Time", "Walk the Aeons",
];

/**
 * Mentions an extra turn and grants none. A hit on any of these is a defect: it would move a
 * deck out of Bracket 1 over a card that does the opposite.
 */
const KNOWN_NEGATIVE = [
  "Ugin's Nexus", "Obeka, Brute Chronologist", "Sundial of the Infinite", "Chronatog",
];

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
  const { rows } = await client.query<{ name: string; oracle_text: string | null }>(
    `select name, oracle_text from cards where commander_legal = true`,
  );
  console.log(`\n== corpus ==\ncommander-legal cards  ${rows.length}`);
  await loadAllNames();

  const flagged = rows.filter((r) => classify(r.oracle_text).hit);
  console.log(`flagged by classifier  ${flagged.length}  (${((flagged.length / rows.length) * 100).toFixed(3)}%)`);

  const byName = new Map(rows.map((r) => [r.name.toLowerCase(), r]));
  const flaggedNames = new Set(flagged.map((f) => f.name.toLowerCase()));

  console.log(`\n== recall: cards that unambiguously grant an extra turn ==`);
  let caught = 0, absent = 0;
  for (const n of KNOWN_POSITIVE) {
    const row = byName.get(n.toLowerCase());
    if (!row) { absent++; console.log(`  ?  ${n.padEnd(26)} ${excludedReason(n)}`); continue; }
    const ok = flaggedNames.has(n.toLowerCase());
    if (ok) caught++;
    console.log(`  ${ok ? "✓" : "✗"}  ${n.padEnd(26)} ${ok ? classify(row.oracle_text).why.join(", ") : "MISSED"}`);
  }
  const denom = KNOWN_POSITIVE.length - absent;
  console.log(`\n  recall ${caught}/${denom}  (${((caught / denom) * 100).toFixed(1)}%)   [${absent} outside the corpus — see the reason printed above]`);

  console.log(`\n== precision: mentions an extra turn, grants none ==`);
  let falsePos = 0;
  let negationExercised = 0;
  for (const n of KNOWN_NEGATIVE) {
    const row = byName.get(n.toLowerCase());
    if (!row) { console.log(`  ?  ${n.padEnd(26)} not in catalog`); continue; }
    const c = classify(row.oracle_text);
    if (c.hit) falsePos++;
    // WHICH MECHANISM excluded it, printed per row. A fixture excluded because no grant
    // pattern matched it tests nothing about NEGATIONS — it passes with that whole array
    // deleted — and three of the original four were exactly that while the header claimed
    // all four exercised the clause.
    const mechanism = c.blockedBy.length
      ? `NEGATION earned it — blocked by: ${c.blockedBy.join(", ")}`
      : `matched no grant pattern (does NOT exercise NEGATIONS)`;
    if (c.blockedBy.length) negationExercised++;
    console.log(`  ${c.hit ? "✗ FALSE POSITIVE" : "✓"}  ${n.padEnd(26)} ${mechanism}`);
  }
  console.log(`\n  false positives ${falsePos}`);
  console.log(`  fixtures actually exercising the negation clause: ${negationExercised} of ${KNOWN_NEGATIVE.length}`);
  if (negationExercised === 0) {
    console.log(`  WARNING: no fixture exercises NEGATIONS — this precision run would pass`);
    console.log(`  with the whole negation array deleted, and measures nothing about it.`);
  }

  // THE SWEEP. A curated positive set only finds what its author thought of; this finds the
  // rest. Every card whose text mentions an extra turn, split by whether the rule claims it.
  console.log(`\n== sweep: every card mentioning an extra turn, by verdict ==`);
  const mentions = rows.filter((r) => /extra turns?/i.test(r.oracle_text ?? ""));
  const claimed = mentions.filter((r) => classify(r.oracle_text).hit);
  const unclaimed = mentions.filter((r) => !classify(r.oracle_text).hit);
  console.log(`  mention an extra turn: ${mentions.length}  ·  claimed ${claimed.length}  ·  NOT claimed ${unclaimed.length}`);
  console.log(`\n  not claimed — each must be a genuine non-grant, or it is a miss:`);
  for (const r of unclaimed) {
    const c = classify(r.oracle_text);
    const snip = (r.oracle_text ?? "").replace(/\n/g, " ").match(/.{0,72}extra turns?.{0,42}/i)?.[0] ?? "";
    console.log(`   · ${r.name.padEnd(30)} ${c.blockedBy.length ? `[blocked: ${c.blockedBy.join(",")}] ` : ""}${snip.trim()}`);
  }

  await client.end();
  console.log("\ndone — read-only, nothing written.\n");
}

main().catch(async (err) => {
  await client.end().catch(() => {});
  console.error(err);
  process.exitCode = 1;
});
