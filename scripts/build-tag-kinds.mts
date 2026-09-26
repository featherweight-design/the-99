// Regenerates `src/lib/edhrec/tag-kinds.generated.ts` — the set of EDHREC theme
// labels that name a MECHANIC rather than a creature type or a format.
//
// Run: `pnpm build:tag-kinds`. Reads the commander index, the card catalog and
// six Scryfall subtype catalogs; writes no database rows. Point it at any branch
// whose index is current — the tag vocabulary is identical on local-dev and
// production (401 labels on both).
//
// TWO INDEPENDENT PROBLEMS LIVE HERE, and both took several rounds to get right:
// WHICH WORDS ARE CREATURE TYPES (this file) and HOW A PLURAL LABEL REDUCES TO
// ONE (`singularForms`, in tag-kinds.ts — a hand table of known words was tried
// there and replaced by rules, after it was found missing four tribes).
//
// THE CREATURE VOCABULARY TAKES TWO SOURCES BECAUSE NEITHER IS SUFFICIENT.
// An earlier version derived it from `cards.type_line` alone and got three
// separate things wrong, none of them visible without measuring:
//   • `Servo` is a token-only creature type, and `transform.ts:13` drops token
//     layouts, so it was absent from `cards` entirely and `Servos` was
//     allowlisted as a mechanic.
//   • `Time Lord` is a MULTI-WORD creature type. Splitting subtypes on
//     whitespace recorded `time` and `lord`, so `Time Lords` could never match.
//   • Subtracting every subtype that ever appears on a non-creature line deleted
//     `Dinosaur`, which has 231 creature printings and ONE non-creature line.
// Scryfall's catalogs fix all three. But the catalog alone is not enough either:
// `Cephalid` is a real tribe that appears in NO Scryfall subtype catalog, so a
// catalog-only vocabulary allowlists `Cephalids` as a mechanic. The two halves
// each cover the other's gap — see `creatureVocabularyFor`.
//
// WHY AN ALLOWLIST OF MECHANICS AND NOT A DENYLIST OF TRIBES. A denylist defaults
// an unrecognised label to *shown*, so the first creature type EDHREC adds after
// the last run of this script reaches the reader — which is the defect the gap
// line exists to avoid, arriving by itself. An allowlist defaults it to hidden: a
// thinner sentence until someone runs this again, and never a tribe on screen.
//
// First, and on its own line: src/db reads DATABASE_URL at module scope.
import { requireEnv } from "./lib/env.mjs";
requireEnv(["DATABASE_URL"]);
import { writeFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { cards, commanderSupport } from "../src/db/schema";
import {
  classifyLabels,
  creatureSubtypesFromTypeLines,
  FORMAT_LABELS,
} from "../src/lib/edhrec/tag-kinds";

const OUT = new URL("../src/lib/edhrec/tag-kinds.generated.ts", import.meta.url);

/** Scryfall's subtype catalogs. Measured 2026-09-15: the six are DISJOINT —
    nothing in `creature-types` appears in any other — which is what makes the
    non-creature ones usable as an exclusion set. */
const CREATURE_CATALOG = "creature-types";
const OTHER_CATALOGS = [
  "artifact-types",
  "enchantment-types",
  "land-types",
  "spell-types",
  "planeswalker-types",
];

/**
 * One Scryfall catalog, lower-cased.
 *
 * The shape is asserted rather than assumed, in the same spirit as
 * `check:scryfall`: these are the upstream dependency the classification rests
 * on, and a silently empty or reshaped payload would allowlist every tribe in
 * EDHREC's vocabulary as a mechanic. There is no daily contract check because
 * the generator is run by hand and fails loudly here instead.
 */
async function catalog(name: string, floor: number): Promise<Set<string>> {
  const url = `https://api.scryfall.com/catalog/${name}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "the-99/tag-kinds" },
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  const body = (await res.json()) as { object?: string; data?: unknown };
  if (body.object !== "catalog" || !Array.isArray(body.data)) {
    throw new Error(`${url} -> not a catalog payload`);
  }
  const data = body.data.filter((d): d is string => typeof d === "string" && d.length > 0);
  if (data.length < floor) {
    throw new Error(`${url} -> only ${data.length} entries, expected ${floor}+`);
  }
  return new Set(data.map((d) => d.toLowerCase()));
}

/**
 * The creature vocabulary: Scryfall's catalog, plus any creature subtype in
 * this database that Scryfall's catalog omits.
 *
 * NEITHER SOURCE IS SUFFICIENT ALONE, and each covers the other's gap.
 *
 * Scryfall's catalog is authoritative, carries multi-word types verbatim
 * (`Time Lord`) and includes token-only types (`Servo`) that `cards` cannot
 * know about, since `transform.ts:13` drops token layouts. But it omits at
 * least one real tribe: `Cephalid` is in NO Scryfall subtype catalog, so the
 * catalog alone allowlists `Cephalids` as a mechanic.
 *
 * The card-derived half fills that in — and the exclusion is by CATALOG rather
 * than by card occurrence, which is the fix for the third failure mode. An
 * earlier version subtracted every subtype that ever appeared on a non-creature
 * line, and that deleted `Dinosaur`, which has 231 creature printings against a
 * single non-creature one. Subtracting the artifact, enchantment, land, spell
 * and planeswalker catalogs instead removes exactly the dual-role subtypes
 * (`Food`, `Equipment`, `Treasure`, `Saga`, `Aura`, …) and nothing else.
 *
 * One residual gap, stated rather than papered over: a MULTI-WORD subtype that
 * Scryfall omits would still be split into words here and missed. No such case
 * exists in the current vocabulary.
 */
async function creatureVocabularyFor(): Promise<Set<string>> {
  const [fromCatalog, ...others] = await Promise.all([
    catalog(CREATURE_CATALOG, 250),
    ...OTHER_CATALOGS.map((c) => catalog(c, 5)),
  ]);
  const notCreature = new Set(others.flatMap((s) => [...s]));

  // The parsing lives in `creatureSubtypesFromTypeLines`, unit-tested with
  // fixtures, because a classification asserted only through the checked-in
  // artifact can go stale without anything going red.
  const rows = await db.select({ typeLine: cards.typeLine }).from(cards);
  const derived = creatureSubtypesFromTypeLines(
    rows.map((r) => r.typeLine),
    notCreature,
  );
  return new Set([...fromCatalog, ...derived]);
}

async function vocabulary(): Promise<string[]> {
  const rows = await db
    .select({
      label: sql<string>`distinct jsonb_array_elements(${commanderSupport.tags})->>'label'`,
    })
    .from(commanderSupport);
  return rows.map((r) => r.label).sort((a, b) => a.localeCompare(b));
}

/**
 * Cases this script must get right, asserted here so a regeneration proves its
 * own rules rather than restating them. Every one cost a wrong classification.
 */
const MUST_BE_MECHANIC = [
  // Artifact and enchantment subtypes that a card-derived vocabulary keeps,
  // because each also appears on a creature somewhere — `Artifact Creature —
  // Food Golem`. Scryfall's catalog lists none of them as creature types, so
  // they need no special handling now; they stay asserted because they are the
  // cases that proved the derived vocabulary wrong.
  "Adventures", "Auras", "Books", "Clues", "Equipment", "Food",
  "Sagas", "Shrines", "Treasure", "Vehicles",
  // NEGATIVE cases for the plural rules: each of these FIRES the rule beside it
  // and must still come out a mechanic, so a rule that over-reduces into the
  // creature vocabulary fails here rather than in the tests alone.
  "Caves", // -ves
  "Sacrifice", // -ice
  "Activated Abilities", // -ies
  "Curses", // -(sh|ch|s|x|z)es
  "Artifacts", // -s
  // `-men`, `-oes` and `-i` have no negative case because no mechanic label in
  // the vocabulary ends that way.
];
const MUST_BE_CREATURE = [
  "Bears", "Crocodiles", "Frogs", // the reported row
  // ONE CASE PER PLURAL RULE, so deleting a rule fails a case. Four of these
  // were missing while the rules were a hand table of known words, and two more
  // rules were unexercised until review pointed out that the claim above was
  // wider than the list below.
  "Wolves", "Elves", "Dwarves", "Werewolves", // -ves -> -f / -fe
  "Cybermen", // -men -> -man
  "Fungi", "Pegasi", // -i -> -us
  "Mice", // -ice -> -ouse
  "Heroes", // -oes
  "Allies", // -ies -> -y
  "Foxes", // -(sh|ch|s|x|z)es
  "Faeries", "Horses", "Humans", "Zombies", // the plain trailing -s
  "Eggs", "Mounts", "Toys", // real creature types whose EDHREC tag is ambiguous
  "Servos", // TOKEN-ONLY: absent from `cards` entirely, since tokens are dropped
  "Time Lords", // MULTI-WORD: whitespace-split subtypes could never match it
  "Dinosaurs", // 231 creature printings and one non-creature line, which an
  // unconditional subtraction deleted
  "Cephalids", // in NO Scryfall subtype catalog; only the card-derived half has it
  // Asserted in gap-slot.test.ts as card-derived corrections, and invariants
  // here too: a list the tests pin but the generator does not can be
  // regenerated out from under them without anything going red.
  "Daleks", "Specters",
];

const creatureVocabulary = await creatureVocabularyFor();
const labels = await vocabulary();

const { mechanic, creature, format } = classifyLabels(labels, creatureVocabulary);

/**
 * Mechanic labels that LOOK like an unreduced creature plural, printed for a
 * human to read on every regeneration.
 *
 * THE SCOPE DECISION, after three review rounds landed on this file. There is no
 * lexical guarantee available here and it is worth being plain about why. The
 * allowlist's safe default only protects labels the generator never saw; a label
 * it sees and misclassifies is actively added to the mechanic list and SHOWN,
 * which is what happened to `Mice`, `Werewolves`, `Cybermen` and `Pegasi`. Nor
 * can a bidirectional check help: pluralising the catalog uses the inverse of
 * the same rules, so it cannot find a pattern those rules do not encode.
 *
 * So the rule set is CLOSED, and the guarantees are empirical instead:
 *   1. the pinned counts in `gap-slot.test.ts` — any movement is a visible diff
 *   2. one invariant per plural rule, each proved by its own mutation
 *   3. this report, which a person reads
 *
 * It is deliberately not fatal. It found `Cybermen` and `Pegasi` — two tribes a
 * review round had missed — and it also flags a dozen genuine mechanics whose
 * first letters happen to match a creature type, so failing on it would train
 * whoever runs this to append to an exceptions list without looking.
 */
function reportNearMisses(mechanicLabels: string[], creatures: Set<string>): void {
  const flagged: string[] = [];
  for (const label of mechanicLabels) {
    const low = label.toLowerCase();
    for (const c of creatures) {
      if (c.length < 4 || low === c) continue;
      if (low.startsWith(c.slice(0, 4)) && Math.abs(low.length - c.length) <= 3) {
        flagged.push(`${label} ~ ${c}`);
        break;
      }
    }
  }
  if (flagged.length === 0) return;
  console.log(`\n${flagged.length} mechanic label(s) resemble a creature type — read these:`);
  for (const f of flagged) console.log(`  ${f}`);
  console.log("  (most are genuine mechanics; two real tribes were found this way)\n");
}

const problems: string[] = [];
for (const l of MUST_BE_MECHANIC) {
  if (!mechanic.includes(l)) problems.push(`${l} should be a mechanic, is not`);
}
for (const l of MUST_BE_CREATURE) {
  if (!creature.includes(l)) problems.push(`${l} should be a creature type, is not`);
}
for (const l of FORMAT_LABELS) {
  if (!labels.includes(l)) problems.push(`format label ${l} is not in the vocabulary`);
}
if (problems.length > 0) {
  console.error(`tag-kinds: ${problems.length} classification problem(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

const body = `// GENERATED by \`pnpm build:tag-kinds\` — do not edit by hand.
//
// The EDHREC theme labels that name a MECHANIC: not a creature type, not a
// format. An ALLOWLIST, so a label EDHREC adds after the last regeneration is
// hidden from the gap line rather than shown — see scripts/build-tag-kinds.mts
// for why that direction is the safe one.
//
// Vocabulary at generation: ${labels.length} EDHREC labels against
// a ${creatureVocabulary.size}-entry creature vocabulary
//   mechanic ${mechanic.length} · creature type ${creature.length} · format ${format.length}

export const MECHANIC_LABELS: readonly string[] = [
${mechanic.map((m) => `  ${JSON.stringify(m)},`).join("\n")}
];

/** Classified as creature types, kept for the generator's own assertions and for
    anyone auditing what the gap line is hiding. Read at runtime by Help me choose, which treats
    a theme with one of these labels as tribal (tribesFor in src/lib/intake/vocabulary.ts). */
export const CREATURE_TYPE_LABELS: readonly string[] = [
${creature.map((c) => `  ${JSON.stringify(c)},`).join("\n")}
];
`;

writeFileSync(OUT, body);
console.log(
  `tag-kinds: ${labels.length} labels — ${mechanic.length} mechanic, ` +
    `${creature.length} creature, ${format.length} format`,
);
reportNearMisses(mechanic, creatureVocabulary);
console.log(`wrote ${OUT.pathname}`);
process.exit(0);
