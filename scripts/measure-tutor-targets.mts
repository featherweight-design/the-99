// What `classifyTutor` actually does to the live catalog.
//
// Read-only: no fixture, no writes, no locks. Point it at `local-dev`.
//
// It exists because a classifier built from a named fixture agrees with that fixture and
// says nothing about the 960 cards nobody listed. §4.2's trap is tuning against the fixture
// until it passes; the defence is printing the whole sweep and fixing a CLAUSE when a family
// comes out wrong, never adding a name to a list.
//
// It prints three things: the fixture's recall and precision, the corpus splits the parser's
// own decisions rest on, and the first 60 parses for reading.
//
// First, and on its own line: src/db reads DATABASE_URL at module scope.
import { requireEnv } from "./lib/env.mjs";
requireEnv(["DATABASE_URL"]);
import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { classifyTutor, isTutorTarget, tutorReaches, type TutorTarget } from "../src/lib/bracket/tutor-targets";

/** Every claim in `tutor-targets.ts`'s header, as a card the catalog can be asked about. */
const EXPECTED: { name: string; want: Partial<TutorTarget> | null; why: string }[] = [
  { name: "Demonic Tutor", want: { kinds: "any" }, why: "untargeted, to hand" },
  { name: "Vampiric Tutor", want: { kinds: "any" }, why: "untargeted, to the top" },
  { name: "Gamble", want: { kinds: "any" }, why: "untargeted, with a cost" },
  { name: "Diabolic Tutor", want: { kinds: "any" }, why: "untargeted" },
  { name: "Worldly Tutor", want: { kinds: [[["creature"]]] }, why: "one type" },
  { name: "Eladamri's Call", want: { kinds: [[["creature"]]] }, why: "one type, to hand" },
  { name: "Mystical Tutor", want: { kinds: [[["instant"]], [["sorcery"]]] }, why: "two types" },
  { name: "Enlightened Tutor", want: { kinds: [[["artifact"]], [["enchantment"]]] }, why: "two types" },
  { name: "Idyllic Tutor", want: { kinds: [[["enchantment"]]] }, why: "one type" },
  { name: "Fabricate", want: { kinds: [[["artifact"]]] }, why: "one type" },
  { name: "Crop Rotation", want: { kinds: [[["land"]]], basicOnly: false }, why: "land, NOT basic" },
  { name: "Sylvan Scrying", want: { kinds: [[["land"]]], basicOnly: false }, why: "land, NOT basic" },
  { name: "Green Sun's Zenith", want: { kinds: [[["creature"]]], colors: ["G"] }, why: "colour + type" },
  { name: "Trinket Mage", want: { kinds: [[["artifact"]]], maxManaValue: 1 }, why: "N or less" },
  { name: "Tribute Mage", want: { kinds: [[["artifact"]]], maxManaValue: 2 }, why: "exact N, read as a ceiling" },
  { name: "Evolving Wilds", want: { basicOnly: true }, why: "basics only" },
  // The hate cards. NOT excluded by a negation rule — they never match the clause at all.
  { name: "Stranglehold", want: null, why: "no search clause" },
  { name: "Aven Mindcensor", want: null, why: "no search clause" },
  { name: "Opposition Agent", want: null, why: "no search clause" },
  { name: "Leonin Arbiter", want: null, why: "no search clause" },
  // Sentence scope, both directions.
  { name: "Ranger-Captain of Eos", want: { kinds: [[["creature"]]] }, why: "opponent named in ANOTHER sentence" },
  { name: "Entomb", want: null, why: "graveyard destination assembles nothing" },
];

const pad = (s: string | number, n: number) => String(s).padEnd(n);

async function main() {
  // ---- 1 · the fixture -------------------------------------------------------------------
  console.log(`\n== 1 · the named fixture ==`);
  let ok = 0;
  let missing = 0;
  for (const c of EXPECTED) {
    const [row] = (
      await db.execute(sql`select oracle_text from cards where name = ${c.name} limit 1`)
    ).rows as { oracle_text: string | null }[];
    if (!row) {
      console.log(`  MISSING  ${c.name} — not in this catalog`);
      missing++;
      continue;
    }
    const got = classifyTutor(row.oracle_text);
    const agrees =
      c.want === null
        ? got === null
        : got !== null &&
          Object.entries(c.want).every(
            ([k, v]) => JSON.stringify(got[k as keyof TutorTarget]) === JSON.stringify(v),
          );
    if (agrees) ok++;
    console.log(
      `  ${agrees ? "ok  " : "WRONG"}  ${pad(c.name, 24)}${pad(c.why, 40)}${
        agrees ? "" : `got ${JSON.stringify(got)}`
      }`,
    );
  }
  console.log(`  ${ok}/${EXPECTED.length - missing} agree` + (missing ? ` (${missing} absent)` : ""));

  // ---- 2 · the corpus --------------------------------------------------------------------
  const rows = (
    await db.execute(sql`
      select name, type_line, oracle_text, color_identity, cmc from cards
      where commander_legal = true and oracle_text ~* 'search(es)? (your|their) library for'
      order by name`)
  ).rows as {
    name: string; type_line: string; oracle_text: string; color_identity: string[]; cmc: number;
  }[];

  const parsed = rows.map((r) => ({ ...r, t: classifyTutor(r.oracle_text) }));
  const tally = {
    matched: rows.length,
    // What the app calls a tutor (`isTutorTarget`): a search that is not for lands alone. This is
    // the population the Tutors row on "How we make these decisions" describes; `matched` also
    // counts every fetch land and ramp spell.
    tutors: parsed.filter((p) => isTutorTarget(p.t)).length,
    refused: parsed.filter((p) => p.t === null).length,
    any: parsed.filter((p) => p.t?.kinds === "any").length,
    basics: parsed.filter((p) => p.t?.basicOnly).length,
    typed: parsed.filter((p) => Array.isArray(p.t?.kinds) && p.t.kinds.length > 0).length,
    alternatives: parsed.filter((p) => Array.isArray(p.t?.kinds) && p.t.kinds.length > 1).length,
    // Kept at zero deliberately. It was 253 before subtypes were carried through, and a
    // counter that has to STAY zero is the only thing that would notice it coming back.
    unreachable: parsed.filter((p) => Array.isArray(p.t?.kinds) && p.t.kinds.length === 0).length,
    conjunctions: parsed.filter(
      (p) => Array.isArray(p.t?.kinds) && p.t.kinds.some((alt) => alt.length > 1),
    ).length,
    coloured: parsed.filter((p) => p.t?.colors != null).length,
    capped: parsed.filter((p) => p.t?.maxManaValue != null).length,
  };
  console.log(`\n== 2 · the corpus ==`);
  for (const [k, v] of Object.entries(tally)) console.log(`  ${pad(k, 14)}${v}`);
  // `unreachable` is UNCONSTRUCTIBLE against the current classifier: `kinds` is either "any"
  // or a non-empty list, because `targetWords` returns null rather than an empty array. It is
  // printed as a structural invariant rather than as a live guard, and the warning says which.
  //
  // The regression it CANNOT see is the likelier one: a word dropped rather than kept gives
  // `words === null` and lands in the `any` bucket, silently widening every such tutor. Watch
  // `any` against 129 — that is the figure a dropped-subtype regression moves.
  if (tally.unreachable > 0) {
    console.log(`\n  WARNING: ${tally.unreachable} cards parse to a target that reaches NOTHING.`);
    console.log(`  That is unconstructible against the classifier as written, so a non-zero`);
    console.log(`  figure means \`targetWords\` started returning an empty array — a clause bug,`);
    console.log(`  never a card to add to a list. The figure was 253 before subtypes were`);
    console.log(`  carried through as themselves.`);
  }

  // ---- 3 · what reaches a real piece ------------------------------------------------------
  // The figure the feature is actually about: over the cards a tutor could be asked to find,
  // how many does each family reach? Read against one concrete piece rather than in the
  // abstract, because "reaches" is a relation and a count with no object is not one.
  const [oracle] = (
    await db.execute(
      sql`select name, type_line, color_identity, cmc from cards where name = 'Thassa''s Oracle' limit 1`,
    )
  ).rows as { name: string; type_line: string; color_identity: string[]; cmc: number }[];
  if (oracle) {
    const piece = {
      typeLine: oracle.type_line, colorIdentity: oracle.color_identity, cmc: oracle.cmc,
    };
    const reaching = parsed.filter((p) => p.t && tutorReaches(p.t, piece));
    console.log(`\n== 3 · reach against ${oracle.name} (${oracle.type_line}, mv ${oracle.cmc}) ==`);
    console.log(`  ${reaching.length} of ${rows.length} reach it`);
    for (const r of reaching.slice(0, 12)) console.log(`    ${r.name}`);
  }

  // ---- 4 · the sweep, for reading ---------------------------------------------------------
  console.log(`\n== 4 · the first 60 parses ==   (a family coming out wrong is a CLAUSE bug)`);
  for (const p of parsed.slice(0, 60)) {
    console.log(
      `  ${pad(p.name.slice(0, 30), 32)}${
        p.t === null ? "— refused" : JSON.stringify(p.t)
      }`,
    );
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
