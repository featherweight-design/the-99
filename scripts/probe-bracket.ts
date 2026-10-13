// The bracket verdict, proved against a real Postgres by calling the real loader.
//
// Everything the verdict says is a pure function over a `DeckProfile` and every one of those
// is unit-tested. What no unit test in this repository can reach is the GATHER: a deck row,
// `deck_cards`, a flags read, a four-rung composition chain, a staples join and a Spellbook
// combo join with three rules in its SQL. The pure half proves the rules; only a database
// proves the loader assembles the right rows to apply them to.
//
// WHAT IT PROVES
//
//   THE DRAFT IS THE DECK. A card staged into `deck_cards` moves the slot before any commit,
//   because the loader reads the draft rather than the last committed version.
//   THE COMBO JOIN'S THREE RULES. A template-gated variant does not slot; a `must_be_commander`
//   piece in the 99 does not slot; the commander as a piece DOES — the false-negative half,
//   and the most consequential of the three.
//   THE COMBO IS DETECTED AND WIDENS THE RANGE. An assembled two-card infinite takes the deck
//   out of [1,2]. The probe deliberately does NOT assert which end — whether a given local
//   variant produces infinite TURNS decides [4,5] against [3,4], and that is a property of
//   whichever variant the query found rather than of the code. `slot.test.ts` pins the loop
//   clause itself on both sides, deterministically, which is the better trade than a browser-
//   less check whose expected value depends on the bulk file.
//   A FLAGGED COMMANDER COUNTS. A deck led by a Game Changer legend slots [3] or worse with
//   the commander in the receipts — the commanders-are-cards rule, end to end.
//   THE SKELETON PICKS THE RIGHT CONDITION, and the basis chain takes the FIRST hit. Local-dev
//   carries neither an `identity_composition` row nor a non-null `commander_support.avg_*`, so
//   without sentinels the chain would have exactly one reachable state and three of its four
//   rungs would be asserted by nobody. The probe writes them, and reads rung 3 BEFORE writing
//   rung 2 — with a commander row present, the identity rung is unreachable by construction.
//   THE PAYLOAD FITS. `JSON.stringify(profile).length` against the 2 MB ceiling, measured on
//   a realistic worst case rather than assumed.
//
// WHAT IT DOES NOT PROVE, deliberately: that `cachedDeckProfile` retires a stale entry. That
// needs a reader whose cache can be observed across a catalog stamp, and no route calls the
// wrapper yet — the first Tier B consumer proves it, and its plan carries that as a task.
//
// THREE CLEANUP SHAPES, kept distinct because confusing them loses data:
//
//   · A row this run CREATED is deleted — and only when the insert's own `returning` says it
//     was created. An earlier version set the handle before an `on conflict do nothing` and
//     deleted unconditionally, which removes a row somebody else's index run wrote.
//   · A row this run OVERWROTE is restored, all eleven columns of it. An earlier version
//     captured `avg_land` alone and set the other nine to null, which is a delete with extra
//     steps rather than a restore.
//   · A row this run LIFTED to reach an empty state is put back.
//
// Every handle is populated BEFORE the write it covers, so a throw part-way through cannot
// strand catalog state, and every cleanup step runs even when an earlier one throws.
//
// ALL FOUR RUNGS of the basis chain are covered, the pair included. Its sentinel fabricates
// `bracket_counts` and `edhrec_total` because both are not-null — that is what a sentinel is —
// and it is what lets the population's `of: "pair"`, its declared total and the deck count
// beside it be asserted at all. An earlier version of this header said the pair rung was NOT
// covered and withdrew the claim rather than building it; both the code and this sentence
// have caught up.
//
// IT FAILS RATHER THAN SKIPS. A state it claims to test and cannot reach is a failure, not a
// note — a conditional "when the row exists" check is the silent pass this repository keeps
// paying for. It refuses to start at all when `spellbook_variants` is empty.
//
// SIX MUTATIONS, and what each one failed:
//
//   the `game_changer` read dropped .................. 6 checks
//   the combo join's `produces` test dropped ......... 2 checks
//   `detection` reported as empty .................... 1 check
//   `bracketDelta` returning `moves` for a tutor ..... 1 check
//   extra turns counted at bracket 2 ................. 1 check
//   `basis` hard-coded rather than derived ........... 2 checks
//
// The second measured NOTHING on its first attempt, and that bought the case the reading had
// missed. The combo fixture is found by a query that already filters on `%infinite%`, so
// every variant it could pick passed the test whether or not the test ran. 703 of 3,842
// sampled two-card variants produce something the system does not count — "Draw the game", a
// targeted destroy — and a deck holding one of those is the only fixture that can tell the
// two builds apart.
//
// Run it against local dev or a scratch Neon branch — NEVER production.
//
// Run: `pnpm probe:bracket`
// First, and on its own line: src/db reads DATABASE_URL at module scope, so the .env has to
// be loaded before the import below reaches it.
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";

import { canonicalPair } from "../src/lib/edhrec/pair";
import { classifyTutor, tutorReaches } from "../src/lib/bracket/tutor-targets";
import { loadDeckProfile } from "../src/lib/profile/load";
import { fitSkeleton } from "../src/lib/profile/fit";
import { slotDeck } from "../src/lib/bracket/slot";
import { bracketDelta } from "../src/lib/bracket/delta";
import { upgradePath } from "../src/lib/bracket/upgrade";
// No signed-in reader here: every switch read takes the environment itself (`process.env`).

neonConfig.webSocketConstructor = ws;

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-bracket-${Date.now()}`;

let failures = 0;

// Populated BEFORE the write each one covers. A commander's composition is an UPDATE to a row
// that exists, so it is RESTORED; the identity row is new, so it is DELETED. Confusing the two
// removes a real index row.
type CompositionColumns = {
  avg_land: number | null; avg_basic: number | null; avg_nonbasic: number | null;
  avg_creature: number | null; avg_instant: number | null; avg_sorcery: number | null;
  avg_artifact: number | null; avg_enchantment: number | null;
  avg_planeswalker: number | null; avg_battle: number | null;
  avg_curve: Record<string, number> | null;
};

/** The four ROLE columns, captured and cleared beside the type ones and for the same reason
 *  the header gives about the composition rungs: the role chain reads commander before
 *  identity, so a fixture commander carrying real role figures makes the identity role rung
 *  unreachable and whatever is asserted there stops being asserted. */
type RoleColumns = {
  avg_ramp: number | null; avg_draw: number | null;
  avg_removal: number | null; avg_wipes: number | null;
};

/** The commander sentinel's land target — recognisable, and what every restore checks for. */
const SENTINEL_LAND = 34;
/** The pair sentinel's, deliberately different so the two rungs cannot be confused. */
const SENTINEL_PAIR_LAND = 39;
let commanderCleanup: {
  oracleId: string; before: CompositionColumns & RoleColumns;
} | null = null;
/** A pair row this run created. New, so it is deleted rather than restored. */
let pairCleanup: { commanderOracleId: string; partnerOracleId: string } | null = null;
/** Set ONLY when this run created the row — from the insert's own `returning`. */
let identityCleanup: string | null = null;
/** The `count:1` sentinel, created only by this run. Same ownership rule as the identity one. */
let countCleanup: string | null = null;
/** A row that was already there, lifted so the chain's empty state is reachable. */
let identityRestore:
  | {
      condition: string;
      /** The ROLE columns are carried beside the type ones because they restore differently:
       *  a dropped nullable type column reads as absent, while these default to 0, which reads
       *  as a measurement nobody took. */
      row: CompositionColumns & {
        avg_ramp: number; avg_draw: number; avg_removal: number; avg_wipes: number;
        with_roles: number;
      };
      commanders: number;
      withComposition: number;
      computedAt: string;
    }
  | null = null;
/** Counts its own failures. A probe whose exit code disagrees with its output is worse than
 *  no probe — the count used to live at each call site, and a check that forgot it printed
 *  FAIL and then "All checks passed" over the top. */
const check = (label: string, actual: unknown, expected: unknown) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${a}, expected ${e}`);
};
const fail = (label: string, why: string) => {
  failures += 1;
  console.log(`FAIL  ${label} — ${why}`);
};

const rows = async <T>(text: ReturnType<typeof sql>): Promise<T[]> =>
  (await fixture.execute(text)).rows as T[];

type CardRow = { oracle_id: string; name: string };

/** A deck under the fixture user, with its 99 (or however many the caller names). */
async function makeDeck(
  name: string,
  commanderOracleId: string,
  cardIds: readonly string[],
  partnerOracleId: string | null = null,
): Promise<string> {
  const [deck] = await rows<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id, partner_oracle_id)
    values (${USER}, ${name}, ${commanderOracleId}::uuid,
            ${partnerOracleId}::uuid)
    returning id`);
  for (const oracleId of cardIds) {
    await fixture.execute(sql`
      insert into deck_cards (deck_id, oracle_id, quantity)
      values (${deck.id}::uuid, ${oracleId}::uuid, 1)
      on conflict do nothing`);
  }
  return deck.id;
}

async function profileFor(deckId: string) {
  const profile = await loadDeckProfile(deckId, USER, process.env);
  if (!profile) throw new Error(`no profile for ${deckId} — the fixture did not take`);
  return profile;
}

async function run() {
  // ---- 0 · preconditions -----------------------------------------------------------------
  //
  // A probe over empty tables passes while measuring nothing, which is this repository's
  // most-paid-for trap. Refuse loudly rather than reporting green.
  const [{ variants }] = await rows<{ variants: number }>(
    sql`select count(*)::int as variants from spellbook_variants`,
  );
  console.log(`\n== 0 · preconditions ==`);
  console.log(`  spellbook_variants: ${variants}`);
  if (variants === 0) {
    console.error(
      "  REFUSED: spellbook_variants is empty. Run `pnpm db:seed:combos` against this " +
        "branch first — every combo check below would pass while proving nothing.",
    );
    failures += 1;
    return;
  }

  const [{ flagged }] = await rows<{ flagged: number }>(
    sql`select count(*)::int as flagged from card_bracket_flags`,
  );
  console.log(`  card_bracket_flags: ${flagged}`);
  if (flagged === 0) {
    console.error("  REFUSED: card_bracket_flags is empty. Run `pnpm db:seed:combos` first.");
    failures += 1;
    return;
  }

  // ---- fixture selection, BY QUERY ---------------------------------------------------------
  //
  // Never hard-coded names: a name rots with the catalog and a probe that cannot find its
  // fixture reports a broken build rather than a stale list.
  const [gameChanger] = await rows<CardRow>(sql`
    select oracle_id, name from cards
    where game_changer = true and commander_legal = true
    order by oracle_id limit 1`);
  const [gcLegend] = await rows<CardRow>(sql`
    select c.oracle_id, c.name from cards c
    where c.game_changer = true and c.commander_legal = true
      and c.type_line ilike '%legendary%creature%'
    order by c.oracle_id limit 1`);
  const [mld] = await rows<CardRow>(sql`
    select c.oracle_id, c.name from cards c
    join card_bracket_flags f on f.oracle_id = c.oracle_id
    where f.mass_land_denial = true order by c.oracle_id limit 1`);
  const [extraTurn] = await rows<CardRow>(sql`
    select c.oracle_id, c.name from cards c
    join card_bracket_flags f on f.oracle_id = c.oracle_id
    where f.extra_turn = true order by c.oracle_id limit 1`);
  // JOINED to commander_support, because rung 2 of the basis chain is an UPDATE to that row
  // — a legend with no index row cannot reach it, and the probe would report a broken build
  // rather than a fixture that cannot answer the question.
  const [monoWhite] = await rows<CardRow>(sql`
    select c.oracle_id, c.name from cards c
    join commander_support cs on cs.commander_oracle_id = c.oracle_id
    where c.commander_legal = true and c.type_line ilike '%legendary%creature%'
      and c.color_identity = array['W']::text[]
    order by c.oracle_id limit 1`);
  const [plain] = await rows<CardRow>(sql`
    select oracle_id, name from cards
    where commander_legal = true and game_changer = false
      and type_line ilike 'creature%' and cmc = 2
      and oracle_id not in (select oracle_id from card_bracket_flags)
    order by oracle_id limit 1`);

  console.log(`\n== fixture ==`);
  for (const [label, row] of [
    ["game changer", gameChanger], ["GC legend", gcLegend], ["mass land denial", mld],
    ["extra turn", extraTurn], ["mono-white legend", monoWhite], ["plain creature", plain],
  ] as const) {
    console.log(`  ${label.padEnd(20)}${row ? row.name : "NONE"}`);
    // A fixture that cannot reach a rule proves nothing about that rule.
    if (!row) fail(`fixture: ${label}`, "the catalog holds no card matching this query");
  }
  if (failures > 0) return;

  // ---- 1 · the draft IS the deck -----------------------------------------------------------
  console.log(`\n== 1 · a staged add moves the slot, before any commit ==`);
  const deckId = await makeDeck("probe clean", monoWhite.oracle_id, [plain.oracle_id]);
  const clean = slotDeck(await profileFor(deckId));
  check("a clean deck permits [1,2]", clean.permits, [1, 2]);

  await fixture.execute(sql`
    insert into deck_cards (deck_id, oracle_id, quantity)
    values (${deckId}::uuid, ${gameChanger.oracle_id}::uuid, 1)`);
  const staged = slotDeck(await profileFor(deckId));
  check("after staging a Game Changer it permits [3]", staged.permits, [3]);
  check(
    "the staged card is in the receipts",
    staged.limits.bracket3.gameChangers.cards.some((c) => c.oracleId === gameChanger.oracle_id),
    true,
  );

  // ---- 2 · a flagged COMMANDER counts -------------------------------------------------------
  //
  // The commanders-are-cards rule end to end. A commander is a column on `decks`, never a
  // `deck_cards` row, which is exactly why every pass that forgot them under-reported.
  console.log(`\n== 2 · a Game Changer commander counts against every limit ==`);
  const ledDeck = await makeDeck("probe gc-led", gcLegend.oracle_id, [plain.oracle_id]);
  const led = slotDeck(await profileFor(ledDeck));
  check("a deck LED by a Game Changer is not [1,2]", led.permits.includes(1), false);
  check(
    "the commander is in the Game Changer receipts",
    led.limits.bracket3.gameChangers.cards.some((c) => c.oracleId === gcLegend.oracle_id),
    true,
  );

  // ---- 3 · mass land denial, and partial detection reported ---------------------------------
  console.log(`\n== 3 · mass land denial drops to [4,5], with its provenance ==`);
  const mldDeck = await makeDeck("probe mld", monoWhite.oracle_id, [mld.oracle_id]);
  const mldProfile = await profileFor(mldDeck);
  const mldVerdict = slotDeck(mldProfile);
  check("permits [4,5]", mldVerdict.permits, [4, 5]);
  check("the card carries its sources", mldProfile.brackets.massLandDenial[0]?.sources.length > 0, true);
  check(
    "detection is reported as partial, with a basis",
    mldVerdict.detection.massLandDenial.basis.length > 0,
    true,
  );

  // ---- 4 · extra turns are counted at bracket 1 and not above it -----------------------------
  console.log(`\n== 4 · the extra-turn split ==`);
  const turnDeck = await makeDeck("probe turns", monoWhite.oracle_id, [extraTurn.oracle_id]);
  const turns = slotDeck(await profileFor(turnDeck));
  check("permits [2]", turns.permits, [2]);
  check("bracket 1 counts them", turns.limits.bracket1.extraTurns.counted, true);
  check("bracket 2 does not", turns.limits.bracket2.extraTurns.counted, false);
  check("and reports them unquantified", turns.unquantified.extraTurns.length, 1);

  // ---- 5 · the combo join's three rules -----------------------------------------------------
  console.log(`\n== 5 · the combo join ==`);
  await comboChecks();

  // ---- 6 · the skeleton picks its condition --------------------------------------------------
  console.log(`\n== 6 · the skeleton ==`);
  const baseProfile = await profileFor(deckId);
  const fit = fitSkeleton(baseProfile);
  check("the condition is the commander's exact identity", baseProfile.skeleton.condition, "W");
  const staple = fit.missingStaples[0] ?? fit.presentStaples[0];
  if (!staple) {
    fail("the floor is non-empty", "no staple row for condition W — run pnpm db:build:staples");
  } else {
    check(
      "a staple carries its STORED denominator",
      staple.commanderTotal > 0 && staple.commanders <= staple.commanderTotal,
      true,
    );
  }

  await basisChainChecks(deckId, monoWhite.oracle_id, plain.oracle_id);

  // ---- 7 · the push check and the upgrade path ------------------------------------------------
  console.log(`\n== 7 · bracketDelta and upgradePath ==`);
  const gcProfile = await profileFor(ledDeck);
  const asTutor = bracketDelta(gcProfile, {
    card: { oracleId: "probe-tutor", name: "Probe Tutor" },
    gameChanger: false, massLandDenial: false, extraTurn: false, tutor: true,
    completesCombos: [],
  });
  // NEVER `moves`. No bracket rule counts a tutor, and `unquantified` would imply a rule we
  // cannot measure rather than one that does not exist.
  check("a tutor is ruleless", asTutor.kind, "ruleless");

  const asMld = bracketDelta(gcProfile, {
    card: { oracleId: mld.oracle_id, name: mld.name },
    gameChanger: false, massLandDenial: true, extraTurn: false, tutor: false,
    completesCombos: [],
  });
  check("mass land denial moves the slot", asMld.kind, "moves");

  const path = upgradePath(gcProfile, 2);
  check("to bracket 2, the Game Changer is an item", path.items.length > 0, true);
  check(
    "and the COMMANDER is never a candidate",
    path.items.some(
      (i) => "candidates" in i && i.candidates.some((c) => c.oracleId === gcLegend.oracle_id),
    ),
    false,
  );
  check("which makes the path blocked", path.blocked, true);

  // ---- 7b · the tutor wiring, end to end ----------------------------------------------------
  //
  // §7's tutor check builds `CandidateFacts` by hand, so it proves `bracketDelta` and nothing
  // about the LOADER — which classifies every card's oracle text and hands the builder a
  // predicate. A regression in that map or that predicate makes the [3,4] lean wrong while
  // every other check here passes, so this loads a deck holding a real tutor and reads
  // `comboReach` off the profile.
  //
  // BOTH SIDES of the relation. A check that only asserts a reach passes on a build where the
  // predicate always returns true, which is precisely the regression that matters: that is
  // what "every tutor reaches every piece" looks like.
  console.log(`\n== 7b · comboReach through the real loader ==`);
  await tutorWiringChecks();

  // ---- 8 · the payload fits -------------------------------------------------------------------
  //
  // MEASURED, not assumed. The profile is cached as JSON, so its size is a real constraint on
  // the object's shape rather than a style note.
  // A REALISTIC BODY. Measured on the §1 fixture — two cards — the ceiling cannot be
  // approached under any regression, so the check could not fail and the header's claim to
  // measure "a realistic worst case" was not what the code did.
  console.log(`\n== 8 · the serialised payload ==`);
  const body = await rows<CardRow>(sql`
    select oracle_id, name from cards
    where commander_legal = true and type_line not ilike 'basic land%'
    order by oracle_id limit 99`);
  const fatDeck = await makeDeck(
    "probe payload",
    gcLegend.oracle_id,
    body.map((c) => c.oracle_id),
  );
  const fat = await profileFor(fatDeck);
  const bytes = JSON.stringify(fat).length;
  console.log(`  ${bytes.toLocaleString()} bytes for a ${fat.counts.total}-card deck`);
  check("the fixture is a full body, not a stub", fat.counts.total >= 99, true);
  check("under the 2 MB ceiling", bytes < 2_000_000, true);
}


/**
 * The basis chain's FALLBACK rungs, which no local database carries until a widened index run.
 *
 * `identity_composition` is empty and every `commander_support.avg_*` is null on local-dev, so
 * without sentinels the chain has exactly one reachable state — `none` — and three of its four
 * rungs would be asserted by nobody. The probe writes them.
 *
 * TWO CLEANUP SHAPES, kept distinct because confusing them loses data:
 *
 *   · The commander's `avg_*` is an UPDATE to a row that already exists, so it is
 *     capture-before-write and RESTORE. Deleting it would remove a real index row.
 *   · The `identity_composition` row is NEW, so it is insert-and-DELETE.
 *
 * Both handles are populated BEFORE the write they cover, so a throw part-way through cannot
 * strand catalog state — the rule `probe:review`'s collection block is built on.
 */
async function basisChainChecks(
  deckId: string,
  commanderOracleId: string,
  plainOracleId: string,
) {
  const TARGETS = {
    land: 37, basic: 17, nonbasic: 20, creature: 26, instant: 11,
    sorcery: 5, artifact: 13, enchantment: 6, planeswalker: 1, battle: 0,
  };
  const CURVE = { "1": 8, "2": 14, "7": 2, "9": 1 };

  // --- concurrency ------------------------------------------------------------------------
  //
  // NO ADVISORY LOCK, and that is a measured decision rather than an omission.
  //
  // These sentinels are SHARED rows — `identity_composition.condition = 'W'` and one
  // `commander_support` row — so two concurrent runs really can interleave, and the fixture
  // user scoping that protects every other write here does nothing for rows that belong to no
  // user. A Postgres advisory lock is the obvious instrument and it does not work against this
  // database. Both flavours were tried and both leaked:
  //
  //   · A SESSION lock is counted, and Neon's pooler reuses backends, so `pg_backend_pid()` is
  //     not a stable session identity across runs. Three consecutive runs, the third refused,
  //     and `pg_locks` still held the id for a pid whose own unlock had returned true.
  //   · A TRANSACTION lock on a dedicated client leaked too, and the session left holding it
  //     was one of `src/db`'s pooled connections — its last statement a `card_bracket_flags`
  //     read. The pooler multiplexes, so the lock is not scoped to the client that took it.
  //
  // A guard that fails one run in three, and whose only workaround is `pg_terminate_backend`,
  // is worse than none: it teaches the operator to terminate backends by hand, which is how
  // real data gets lost. So the CORRUPTION is guarded instead of the concurrency — the
  // commander restore verifies it is putting a value back over the sentinel THIS run wrote
  // and refuses loudly otherwise, so a second run can still make a mess of the assertions but
  // not of the catalog. The refusal leaves the sentinel in place deliberately: an operator
  // who can see 34 in `avg_land` can put the real value back, where a silent overwrite of
  // whatever the other run restored leaves nothing to see.
  //
  // What a single run CANNOT prove: the guard only fires under concurrency, so no mutation
  // here distinguishes it. Forcing the branch was run instead — it prints `cleanup REFUSED`,
  // counts the failure, exits 1, and leaves the sentinel — and that is the evidence for it.

  // --- rung 0: nothing ----------------------------------------------------------------
  //
  // LIFTED FIRST, so the empty state is reachable on any database rather than only on one
  // that has never had a widened index run. Both handles are populated before the write they
  // cover; the commander's row is restored, the identity row is put back.
  // `computed_at` is captured with the rest. Left out, the restore reinserts at the column
  // DEFAULT and every probe run silently re-stamps the row as freshly generated — a restore
  // that changes the one field a freshness consumer reads is not a restore.
  const [existingIdentity] = await rows<CompositionColumns & {
    avg_ramp: number; avg_draw: number; avg_removal: number; avg_wipes: number;
    with_roles: number;
    commanders: number; with_composition: number; computed_at: string;
  }>(sql`
    select avg_land, avg_basic, avg_nonbasic, avg_creature, avg_instant, avg_sorcery,
           avg_artifact, avg_enchantment, avg_planeswalker, avg_battle, avg_curve,
           -- THE ROLE COLUMNS AND THEIR DENOMINATOR. Captured because this cleanup RESTORES a
           -- row it deleted, and a restore that omits a column writes that column's DEFAULT —
           -- so on a database whose index has run, omitting these would put back a row with
           -- every measured role target silently zeroed. The type columns are nullable and a
           -- dropped one reads as absent; these default to 0, which reads as a measurement.
           avg_ramp, avg_draw, avg_removal, avg_wipes, with_roles,
           commanders, with_composition, computed_at
    from identity_composition where condition = 'W'`);
  if (existingIdentity) {
    identityRestore = {
      condition: "W",
      row: existingIdentity,
      commanders: existingIdentity.commanders,
      withComposition: existingIdentity.with_composition,
      computedAt: existingIdentity.computed_at,
    };
    await fixture.execute(sql`delete from identity_composition where condition = 'W'`);
  }

  const [existingCommander] = await rows<CompositionColumns & RoleColumns>(sql`
    select avg_land, avg_basic, avg_nonbasic, avg_creature, avg_instant, avg_sorcery,
           avg_artifact, avg_enchantment, avg_planeswalker, avg_battle, avg_curve,
           avg_ramp, avg_draw, avg_removal, avg_wipes
    from commander_support where commander_oracle_id = ${commanderOracleId}::uuid`);
  if (existingCommander) {
    commanderCleanup = { oracleId: commanderOracleId, before: existingCommander };
    await fixture.execute(sql`
      update commander_support
      set avg_land = null, avg_basic = null, avg_nonbasic = null, avg_creature = null,
          avg_instant = null, avg_sorcery = null, avg_artifact = null, avg_enchantment = null,
          avg_planeswalker = null, avg_battle = null,
          avg_ramp = null, avg_draw = null, avg_removal = null, avg_wipes = null
      where commander_oracle_id = ${commanderOracleId}::uuid`);
  }

  // An earlier version asserted `fit.basis !== "none" || true` here, which is `true` — a
  // check that could not fail, over the one figure the basis chain exists to produce.
  const emptyFit = fitSkeleton(await profileFor(deckId));
  check(
    "rung 0: with no composition anywhere, the basis is none and no target is invented",
    [emptyFit.basis, emptyFit.types.length],
    ["none", 0],
  );

  // --- rung 3: identity ------------------------------------------------------------------
  // Written FIRST and asserted before the commander row exists, because the chain takes the
  // first hit: with a commander row present this rung is unreachable by construction.
  // INSERTED, and the cleanup handle comes from the insert's own `returning`. An earlier
  // version set the handle before an `on conflict do nothing` and then deleted
  // unconditionally — which removes a row this run did not create, and the state where that
  // bites is exactly the one this probe exists to anticipate: a database that has had a
  // widened index run.
  const [created] = await rows<{ condition: string }>(sql`
    insert into identity_composition
      (condition, avg_land, avg_basic, avg_nonbasic, avg_creature, avg_instant, avg_sorcery,
       avg_artifact, avg_enchantment, avg_planeswalker, avg_battle, avg_curve,
       commanders, with_composition)
    values ('W', ${TARGETS.land}, ${TARGETS.basic}, ${TARGETS.nonbasic}, ${TARGETS.creature},
            ${TARGETS.instant}, ${TARGETS.sorcery}, ${TARGETS.artifact}, ${TARGETS.enchantment},
            ${TARGETS.planeswalker}, ${TARGETS.battle}, ${JSON.stringify(CURVE)}::jsonb, 336, 300)
    on conflict (condition) do nothing
    returning condition`);
  if (created) identityCleanup = created.condition;
  else fail("rung 3: the identity sentinel", "a W row was already present and was not replaced");

  // THE ROLE CHAIN IS SEPARATE FROM THE TYPE CHAIN, and this sentinel is the one fixture that
  // can show it. `identity_composition.avg_ramp` and its three siblings are `NOT NULL DEFAULT
  // 0` where the commander and pair columns are nullable, so a bucket derived before the role
  // pass reads back four honest-looking ZEROES rather than nulls — and a reader checking
  // nullity alone accepts them, stopping the chain at `identity` with a measurement nobody
  // took. The row inserted above carries exactly that shape: `with_roles = 0`.
  const preRole = await profileFor(deckId);
  check(
    "an identity row with no role denominator falls through to the flat targets",
    preRole.skeleton.roleTargets.of,
    "flat",
  );
  check("and the type chain is unaffected by it", preRole.skeleton.composition?.of, "identity");

  // Now give the SAME row a denominator and real figures: the role chain must take it.
  await fixture.execute(sql`
    update identity_composition
       set avg_ramp = 9, avg_draw = 11, avg_removal = 7, avg_wipes = 2, with_roles = 200
     where condition = 'W'`);
  const withRole = await profileFor(deckId);
  check("with a denominator, the identity bucket serves the roles", withRole.skeleton.roleTargets.of, "identity");
  check("and the figures are the bucket's", withRole.skeleton.roleTargets.targets.ramp, 9);
  await fixture.execute(sql`
    update identity_composition
       set avg_ramp = 0, avg_draw = 0, avg_removal = 0, avg_wipes = 0, with_roles = 0
     where condition = 'W'`);

  // THE ROLE CHAIN FALLS THROUGH TO THE COUNT BUCKET ON ITS OWN. The composition chain only
  // loads a count row when the identity row is ABSENT, which is right for types and wrong for
  // roles: an identity row can serve the types and carry no roles at all, and the measured
  // answer then sits one rung below where nothing would read it. A `count:1` row with roles,
  // beside the identity row above which has none, is the only fixture that shows it.
  const [countCreated] = await rows<{ condition: string }>(sql`
    insert into identity_composition
      (condition, avg_land, avg_basic, avg_nonbasic, avg_creature, avg_instant, avg_sorcery,
       avg_artifact, avg_enchantment, avg_planeswalker, avg_battle,
       commanders, with_composition, avg_ramp, avg_draw, avg_removal, avg_wipes, with_roles)
    values ('count:1', ${TARGETS.land}, ${TARGETS.basic}, ${TARGETS.nonbasic}, ${TARGETS.creature},
            ${TARGETS.instant}, ${TARGETS.sorcery}, ${TARGETS.artifact}, ${TARGETS.enchantment},
            ${TARGETS.planeswalker}, ${TARGETS.battle}, 400, 380, 6, 5, 4, 3, 380)
    on conflict (condition) do nothing
    returning condition`);
  if (countCreated) {
    countCleanup = countCreated.condition;
    const fellThrough = await profileFor(deckId);
    check(
      "the role chain reaches the count bucket past an identity row with no roles",
      fellThrough.skeleton.roleTargets.of,
      "count",
    );
    check("and takes its figures", fellThrough.skeleton.roleTargets.targets.ramp, 6);
    // The TYPE chain must not follow it — it still has an identity row, and a fix that moved
    // both would pass a check watching only the roles.
    check("while the type chain stays on the identity row", fellThrough.skeleton.composition?.of, "identity");

    // THE CAVEAT NAMES A BUCKET SOMEBODY READ. With NEITHER bucket supplying roles, the flag
    // has to come from the one serving the TYPES — and `thin` is a boolean, so a `??` chain
    // takes a `false` off the count row whose roles were never used and never reaches the
    // identity row that is actually thin. A thin bucket then renders as non-thin.
    await fixture.execute(sql`
      update identity_composition set with_roles = 0, avg_ramp = 0, avg_draw = 0,
             avg_removal = 0, avg_wipes = 0, thin = false where condition = 'count:1'`);
    await fixture.execute(sql`
      update identity_composition set thin = true where condition = 'W'`);
    const thinRead = await profileFor(deckId);
    check("no bucket supplies roles, so the flat targets serve", thinRead.skeleton.roleTargets.of, "flat");
    check(
      "and the caveat comes from the bucket serving the types",
      thinRead.skeleton.thinCondition,
      true,
    );
    await fixture.execute(sql`
      update identity_composition set thin = false where condition = 'W'`);
    await fixture.execute(sql`
      update identity_composition set with_roles = 380, avg_ramp = 6, avg_draw = 5,
             avg_removal = 4, avg_wipes = 3 where condition = 'count:1'`);
  } else {
    fail("the count sentinel", "a count:1 row was already present and was not replaced");
  }

  const identityFit = fitSkeleton(await profileFor(deckId));
  check("rung 3: an identity row gives basis 'identity'", identityFit.basis, "identity");
  check("and ten type targets", identityFit.types.length, 10);
  check(
    "a land target of 37 against a landless fixture reads -37",
    identityFit.types.find((t) => t.type === "land")?.delta,
    -37,
  );
  // EDHREC's own keys run past 7 and `manaCurve` caps there. Unfolded, the top bucket would
  // report a phantom gap on every deck.
  check(
    "the curve's tail is folded into the 7+ bucket",
    identityFit.curve?.buckets.find((b) => b.cmc === 7)?.average,
    3,
  );

  // --- rung 1: the pair's own page ------------------------------------------------------
  //
  // Read against its OWN deck — a second legend in the partner column — rather than against
  // the fixture the other rungs use. The chain takes the first hit, so a pair row shadows
  // every rung below it for a PAIR deck and is invisible to a single-commander one; reading
  // both from one deck would make the two rungs mutually unreachable and one of them would
  // silently stop being asserted.
  const [partner] = await rows<CardRow>(sql`
    select oracle_id, name from cards
    where commander_legal = true and type_line ilike '%legendary%creature%'
      and oracle_id <> ${commanderOracleId}::uuid
    order by oracle_id limit 1`);
  if (!partner) {
    fail("rung 1: a pair", "the catalog holds no second legend");
  } else {
    const pair = canonicalPair(commanderOracleId, partner.oracle_id);
    const [pairCreated] = await rows<{ commander_oracle_id: string }>(sql`
      insert into commander_pair_support
        (commander_oracle_id, partner_oracle_id, synergy_state, edhrec_total, deck_count,
         bracket_counts, avg_land, avg_basic, avg_nonbasic, avg_creature, avg_instant,
         avg_sorcery, avg_artifact, avg_enchantment, avg_planeswalker, avg_battle)
      -- edhrec_total is required by the table own check: an ok row must carry one,
      -- because a state that says the page parsed while the total is null is the shape the
      -- constraint exists to refuse.
      values (${pair.commanderOracleId}::uuid, ${pair.partnerOracleId}::uuid, 'ok', 40, 1200,
              ${JSON.stringify({ "1": 4, "2": 30, "3": 120, "4": 40, "5": 6 })}::jsonb,
              ${SENTINEL_PAIR_LAND}, 15, 21, 28, 10, 6, 11, 5, 0, 0)
      on conflict do nothing
      returning commander_oracle_id`);
    if (!pairCreated) {
      fail("rung 1: the pair sentinel", "a row for this pair was already present");
    } else {
      pairCleanup = pair;
      const pairDeck = await makeDeck(
        "probe pair",
        commanderOracleId,
        [plainOracleId],
        partner.oracle_id,
      );
      const pairProfile = await profileFor(pairDeck);
      const pairFit = fitSkeleton(pairProfile);
      check("rung 1: a pair row outranks every rung below it", pairFit.basis, "pair");
      check(
        "and its target is the pair's",
        pairFit.types.find((t) => t.type === "land")?.target,
        SENTINEL_PAIR_LAND,
      );
      // THE POPULATION, and its own denominator. A reader shown "200 decks" who believes it
      // is out of 1,200 has been misled by us, so the declared total travels with it.
      const population = pairProfile.brackets.population;
      check("the population is the PAIR's", population?.of, "pair");
      check("its declared total is the sum, not the deck count", population?.declaredTotal, 200);
      check("and the deck count is carried beside it", population?.deckCount, 1200);
    }
  }

  // --- rung 2: the commander's own page -----------------------------------------------------
  if (!existingCommander) {
    fail("rung 2: the commander's own composition", "no commander_support row for the fixture");
  } else {
    // The row was captured and cleared at rung 0 — ALL ELEVEN COLUMNS. An earlier version
    // captured `avg_land` alone and then "restored" by setting the other nine to null, which
    // is a delete with extra steps: on any database a widened index run has filled, it drops
    // that commander off rung 2 permanently.
    await fixture.execute(sql`
      update commander_support
      set avg_land = ${SENTINEL_LAND}, avg_basic = 12, avg_nonbasic = 22, avg_creature = 30,
          avg_instant = 9, avg_sorcery = 4, avg_artifact = 10, avg_enchantment = 7,
          avg_planeswalker = 1, avg_battle = 0
      where commander_oracle_id = ${commanderOracleId}::uuid`);

    const commanderFit = fitSkeleton(await profileFor(deckId));
    // THE CHAIN TAKES THE FIRST HIT. The identity row is still there; the commander's own
    // page outranks it, and a reader must see which one answered.
    check("rung 2: the commander's own page outranks the identity row", commanderFit.basis, "commander");
    check(
      "and its target is the commander's, not the identity's",
      commanderFit.types.find((t) => t.type === "land")?.target,
      SENTINEL_LAND,
    );
  }
}


/**
 * A deck holding a real tutor and two combo pieces it can tell apart.
 *
 * Found by query: an untargeted tutor reaches everything and proves only half the relation,
 * so the fixture wants a TYPED one — and then a combo with one piece of that type and one of
 * another. A fixture that cannot tell the predicate's two answers apart FAILS rather than
 * measuring nothing.
 */
async function tutorWiringChecks() {
  const [tutor] = await rows<CardRow & { oracle_text: string }>(sql`
    select oracle_id, name, oracle_text from cards
    where commander_legal = true
      and oracle_text ~* 'search your library for an? (artifact|creature) card'
      and oracle_text !~* 'basic'
    order by oracle_id limit 1`);
  if (!tutor) {
    fail("the tutor wiring", "the catalog holds no typed tutor to build the fixture from");
    return;
  }

  const target = classifyTutor(tutor.oracle_text);
  if (!target || target.kinds === "any") {
    fail("the tutor wiring", `${tutor.name} parses as untargeted — it cannot tell pieces apart`);
    return;
  }
  const wanted = target.kinds[0][0][0];

  // THE PREDICATE PICKS THE FIXTURE, not a type-word match on the type line. A tutor can also
  // be colour- or mana-value-constrained, and a piece chosen on its type alone can then be
  // unreachable for a reason the SQL never saw — which fails a correct loader. Asking
  // `tutorReaches` for both pieces and keeping the pair it disagrees about is the only
  // selection that cannot do that, and it needs no second copy of the rule.
  // IDS ONLY out of the aggregate. `array_agg` over `color_identity` raises
  // `cannot accumulate empty arrays` the moment a colourless piece is in range — which is a
  // fact about Postgres rather than about the data, and it took a run to find.
  const candidates = await rows<{ a: string; b: string }>(sql`
    select (array_agg(vc.oracle_id order by vc.oracle_id))[1] as a,
           (array_agg(vc.oracle_id order by vc.oracle_id))[2] as b
    from spellbook_variants v
    join spellbook_variant_cards vc on vc.variant_id = v.variant_id
    where v.card_count = 2 and cardinality(v.requires_template_ids) = 0
      and not exists (select 1 from spellbook_variant_cards x
                      where x.variant_id = v.variant_id and x.must_be_commander)
      and exists (select 1 from unnest(v.produces) p
                  where p ilike '%infinite%' or p ilike '%win the game%')
    group by v.variant_id having count(*) = 2
    order by v.variant_id limit 400`);

  const pieceIds = [...new Set(candidates.flatMap((c) => [c.a, c.b]))];
  const pieceRows = await rows<{
    oracle_id: string; type_line: string; color_identity: string[] | null; cmc: number | null;
  }>(sql`
    select oracle_id, type_line, color_identity, cmc from cards
    where oracle_id = any(${sql.param(pieceIds)}::uuid[])`);
  const pieceById = new Map(pieceRows.map((r) => [r.oracle_id, r]));

  const piece = (typeLine: string, colorIdentity: string[], cmc: number) => ({
    typeLine, colorIdentity: colorIdentity ?? [], cmc: cmc ?? 0,
  });
  const reachOf = (oracleId: string) => {
    const row = pieceById.get(oracleId);
    return row ? tutorReaches(target, piece(row.type_line, row.color_identity ?? [], row.cmc ?? 0)) : null;
  };
  const split = candidates
    .map((c) => ({ ...c, aReaches: reachOf(c.a), bReaches: reachOf(c.b) }))
    .find((c) => c.aReaches !== null && c.bReaches !== null && c.aReaches !== c.bReaches);
  if (!split) {
    fail(
      "the tutor wiring",
      `no two-card combo among 400 holds one piece ${tutor.name} can reach and one it cannot, ` +
        `so a reach check here would measure nothing`,
    );
    return;
  }

  const [legend] = await rows<CardRow>(sql`
    select oracle_id, name from cards
    where commander_legal = true and type_line ilike '%legendary%creature%'
      and oracle_id not in (${split.a}::uuid, ${split.b}::uuid, ${tutor.oracle_id}::uuid)
    order by oracle_id limit 1`);
  const deck = await makeDeck("probe tutor wiring", legend.oracle_id, [
    tutor.oracle_id,
    split.a,
    split.b,
  ]);
  const profile = await profileFor(deck);

  console.log(`  tutor: ${tutor.name} (searches for a ${wanted})`);
  check(
    "the loader classified the tutor",
    profile.brackets.comboReach.tutors.some((t) => t.oracleId === tutor.oracle_id),
    true,
  );
  check("and the deck assembles the combo", profile.brackets.twoCardCombos.length > 0, true);

  const reached = profile.brackets.comboReach.reaches.map((r) => r.piece.oracleId);
  const findable = split.aReaches ? split.a : split.b;
  const unfindable = split.aReaches ? split.b : split.a;

  check("it reaches the piece the predicate says it can find", reached.includes(findable), true);
  // The half that fails on "every tutor reaches every piece".
  check("and NOT the piece it cannot", reached.includes(unfindable), false);
}

/**
 * The three §4.3b rules, one case each, plus the loop clause.
 *
 * Every variant is found BY QUERY against the ingested table. A rule whose case cannot be
 * built from the local catalog FAILS rather than being skipped — the whole point of these
 * four is that they are the cases a reading would get wrong.
 */
async function comboChecks() {
  // A two-card variant, no template, both pieces in the catalog, producing something the
  // system counts. `isInfiniteOrGameEnding` is applied in TypeScript, so the query only has
  // to find a candidate and the loader decides.
  const [pair] = await rows<{ variant_id: string; a: string; b: string }>(sql`
    select v.variant_id,
           (array_agg(vc.oracle_id order by vc.oracle_id))[1] as a,
           (array_agg(vc.oracle_id order by vc.oracle_id))[2] as b
    from spellbook_variants v
    join spellbook_variant_cards vc on vc.variant_id = v.variant_id
    where v.card_count = 2 and cardinality(v.requires_template_ids) = 0
      and not exists (select 1 from spellbook_variant_cards x
                      where x.variant_id = v.variant_id and x.must_be_commander)
      and exists (select 1 from unnest(v.produces) p
                  where p ilike '%infinite%' or p ilike '%win the game%')
    group by v.variant_id having count(*) = 2
    order by v.variant_id limit 1`);

  if (!pair) {
    fail("combo: an assembled two-card infinite", "no such variant in the local index");
  } else {
    const [legend] = await rows<CardRow>(sql`
      select oracle_id, name from cards
      where commander_legal = true and type_line ilike '%legendary%creature%'
        and oracle_id not in (${pair.a}::uuid, ${pair.b}::uuid)
      order by oracle_id limit 1`);
    const deck = await makeDeck("probe combo", legend.oracle_id, [pair.a, pair.b]);
    const verdict = slotDeck(await profileFor(deck));
    check("an assembled two-card infinite is detected", verdict.limits.bracket2.twoCardCombos.have > 0, true);
    // [3,4] for a generic infinite, [4,5] when it loops — the probe accepts either and
    // asserts the RULE that tells them apart below.
    check("and the deck is no longer [1,2]", verdict.permits.includes(1), false);
  }

  // CARD COUNT IS NEVER THE TEST, and this case exists because the mutation proving it
  // measured NOTHING at first: the fixture query above already filters on `%infinite%`, so
  // dropping `isInfiniteOrGameEnding` left every check passing. 703 of 3,842 sampled two-card
  // variants produce something the system does not count — "Draw the game", a targeted
  // destroy — and a deck holding one of those must report no combo at all.
  const [mundane] = await rows<{ a: string; b: string; produces: string[] }>(sql`
    select (array_agg(vc.oracle_id order by vc.oracle_id))[1] as a,
           (array_agg(vc.oracle_id order by vc.oracle_id))[2] as b,
           v.produces
    from spellbook_variants v
    join spellbook_variant_cards vc on vc.variant_id = v.variant_id
    where v.card_count = 2 and cardinality(v.requires_template_ids) = 0
      and not exists (select 1 from spellbook_variant_cards x
                      where x.variant_id = v.variant_id and x.must_be_commander)
      and not exists (select 1 from unnest(v.produces) p
                      where p ilike '%infinite%' or p ilike '%win the game%'
                         or p ilike '%lose the game%' or p ilike '%arbitrarily large%')
    group by v.variant_id, v.produces having count(*) = 2
    order by v.variant_id limit 1`);
  if (!mundane) {
    fail("combo: a two-card variant the system does not count", "none in the local index");
  } else {
    const [legend] = await rows<CardRow>(sql`
      select oracle_id, name from cards
      where commander_legal = true and type_line ilike '%legendary%creature%'
        and oracle_id not in (${mundane.a}::uuid, ${mundane.b}::uuid)
      order by oracle_id limit 1`);
    const deck = await makeDeck("probe mundane", legend.oracle_id, [mundane.a, mundane.b]);
    const profile = await profileFor(deck);
    console.log(`  the mundane pair produces: ${JSON.stringify(mundane.produces).slice(0, 90)}`);
    check(
      "a two-card variant producing nothing the system counts does not slot",
      profile.brackets.twoCardCombos.length,
      0,
    );
    check("so the deck stays [1,2]", slotDeck(profile).permits, [1, 2]);
  }

  // RULE 1: template-gated. Present in the deck, must NOT slot.
  const [templated] = await rows<{ a: string; b: string }>(sql`
    select (array_agg(vc.oracle_id order by vc.oracle_id))[1] as a,
           (array_agg(vc.oracle_id order by vc.oracle_id))[2] as b
    from spellbook_variants v
    join spellbook_variant_cards vc on vc.variant_id = v.variant_id
    where v.card_count = 2 and cardinality(v.requires_template_ids) > 0
    group by v.variant_id having count(*) = 2
    order by v.variant_id limit 1`);
  if (!templated) {
    fail("combo rule 1: a template-gated pair", "no such variant in the local index");
  } else {
    const [legend] = await rows<CardRow>(sql`
      select oracle_id, name from cards
      where commander_legal = true and type_line ilike '%legendary%creature%'
        and oracle_id not in (${templated.a}::uuid, ${templated.b}::uuid)
      order by oracle_id limit 1`);
    const deck = await makeDeck("probe templated", legend.oracle_id, [templated.a, templated.b]);
    const profile = await profileFor(deck);
    check(
      "rule 1: a template-gated pair does not slot",
      profile.brackets.twoCardCombos.length,
      0,
    );
  }

  // RULE 2 and RULE 3, on the SAME variant — the false-negative half is the consequential
  // one, so both halves are read off one pair rather than two unrelated fixtures.
  const [gated] = await rows<{ commander_piece: string; other: string }>(sql`
    -- max() has no uuid overload, so the pick is over the TEXT form and cast back. One row
    -- of each kind per variant, guaranteed by the having clause below.
    select (max(vc.oracle_id::text) filter (where vc.must_be_commander))::uuid as commander_piece,
           (max(vc.oracle_id::text) filter (where not vc.must_be_commander))::uuid as other
    from spellbook_variants v
    join spellbook_variant_cards vc on vc.variant_id = v.variant_id
    where v.card_count = 2 and cardinality(v.requires_template_ids) = 0
      and exists (select 1 from spellbook_variant_cards x
                  where x.variant_id = v.variant_id and x.must_be_commander)
      and exists (select 1 from unnest(v.produces) p
                  where p ilike '%infinite%' or p ilike '%win the game%')
    group by v.variant_id
    having count(*) = 2
       and count(*) filter (where vc.must_be_commander) = 1
    order by v.variant_id limit 1`);

  if (!gated || !gated.commander_piece || !gated.other) {
    fail("combo rules 2 and 3: a mustBeCommander pair", "no such variant in the local index");
    return;
  }

  // RULE 2: the flagged piece in the 99 assembles nothing.
  const [bystander] = await rows<CardRow>(sql`
    select oracle_id, name from cards
    where commander_legal = true and type_line ilike '%legendary%creature%'
      and oracle_id not in (${gated.commander_piece}::uuid, ${gated.other}::uuid)
    order by oracle_id limit 1`);
  const inNinetyNine = await makeDeck("probe rule2", bystander.oracle_id, [
    gated.commander_piece,
    gated.other,
  ]);
  check(
    "rule 2: a mustBeCommander piece in the 99 does not slot",
    (await profileFor(inNinetyNine)).brackets.twoCardCombos.length,
    0,
  );

  // RULE 3: the same piece AS the commander does slot. The false-negative half.
  const asCommander = await makeDeck("probe rule3", gated.commander_piece, [gated.other]);
  const commandedProfile = await profileFor(asCommander);
  check(
    "rule 3: the same piece AS the commander slots",
    commandedProfile.brackets.twoCardCombos.length > 0,
    true,
  );
  check(
    "and the combo reports usesCommander",
    commandedProfile.brackets.twoCardCombos[0]?.usesCommander,
    true,
  );
}

run()
  .catch((error) => {
    // A throw COUNTS as a failure before the exit code is computed: three probes in this
    // repository have printed "all checks passed" over an exception a `finally` swallowed.
    failures += 1;
    console.error(error);
  })
  .finally(async () => {
    for (const [what, step] of [
      ["fixture decks", async () => {
        await fixture.execute(sql`delete from decks where user_id = ${USER}`);
      }],
      ["the commander's composition", async () => {
        if (!commanderCleanup) return;
        // TWO states this run is responsible for, not one. `avg_land` is the sentinel if the
        // run got as far as rung 2, and NULL if it threw between rung 0's clearing and that
        // write — and an earlier version restored only the first, so any throw in between
        // erased the captured values it was holding. Both are ours to put back.
        //
        // Anything else belongs to somebody: a concurrent run that has already restored the
        // real value must not have it overwritten by our stale capture.
        const [now] = await rows<{ avg_land: number | null }>(sql`
          select avg_land from commander_support
          where commander_oracle_id = ${commanderCleanup.oracleId}::uuid`);
        const ours = now && (now.avg_land === SENTINEL_LAND || now.avg_land === null);
        if (!ours) {
          failures += 1;
          console.error(
            `cleanup REFUSED: the commander's avg_land is ${now?.avg_land ?? "gone"} — neither ` +
              `the ${SENTINEL_LAND} this run wrote nor the null it cleared to. Another run has ` +
              `already restored it, or something else changed the row; overwriting would lose ` +
              `whatever is there now.`,
          );
          return;
        }
        const b = commanderCleanup.before;
        await fixture.execute(sql`
          update commander_support
          set avg_land = ${b.avg_land}, avg_basic = ${b.avg_basic},
              avg_nonbasic = ${b.avg_nonbasic}, avg_creature = ${b.avg_creature},
              avg_instant = ${b.avg_instant}, avg_sorcery = ${b.avg_sorcery},
              avg_artifact = ${b.avg_artifact}, avg_enchantment = ${b.avg_enchantment},
              avg_planeswalker = ${b.avg_planeswalker}, avg_battle = ${b.avg_battle},
              avg_curve = ${b.avg_curve === null ? null : JSON.stringify(b.avg_curve)}::jsonb,
              avg_ramp = ${b.avg_ramp}, avg_draw = ${b.avg_draw},
              avg_removal = ${b.avg_removal}, avg_wipes = ${b.avg_wipes}
          where commander_oracle_id = ${commanderCleanup.oracleId}::uuid`);
      }],
      ["the count sentinel", async () => {
        if (!countCleanup) return;
        await fixture.execute(
          sql`delete from identity_composition where condition = ${countCleanup}`,
        );
      }],
      ["the identity sentinel", async () => {
        // Only a row this run CREATED. The handle is set from the insert's own `returning`,
        // so a pre-existing row — the state after a widened index run — is never deleted.
        if (!identityCleanup) return;
        await fixture.execute(
          sql`delete from identity_composition where condition = ${identityCleanup}`,
        );
      }],
      ["the pair sentinel", async () => {
        if (!pairCleanup) return;
        // OWNERSHIP-CHECKED, the same rule the commander restore follows. A key-only delete
        // removes whatever is at that key, and a concurrent index job can have replaced this
        // run's sentinel with real data by now. The sentinel's own `avg_land` is what says
        // the row is still ours.
        const [now] = await rows<{ avg_land: number | null }>(sql`
          select avg_land from commander_pair_support
          where commander_oracle_id = ${pairCleanup.commanderOracleId}::uuid
            and partner_oracle_id = ${pairCleanup.partnerOracleId}::uuid`);
        if (!now) return;
        if (now.avg_land !== SENTINEL_PAIR_LAND) {
          failures += 1;
          console.error(
            `cleanup REFUSED: the pair row's avg_land is ${now.avg_land} rather than the ` +
              `${SENTINEL_PAIR_LAND} this run wrote — something replaced the sentinel, and ` +
              `deleting by key would take that with it.`,
          );
          return;
        }
        await fixture.execute(sql`
          delete from commander_pair_support
          where commander_oracle_id = ${pairCleanup.commanderOracleId}::uuid
            and partner_oracle_id = ${pairCleanup.partnerOracleId}::uuid
            and avg_land = ${SENTINEL_PAIR_LAND}`);
      }],
      ["the pre-existing identity row", async () => {
        if (!identityRestore) return;
        await fixture.execute(sql`
          insert into identity_composition
            (condition, avg_land, avg_basic, avg_nonbasic, avg_creature, avg_instant,
             avg_sorcery, avg_artifact, avg_enchantment, avg_planeswalker, avg_battle,
             avg_curve, avg_ramp, avg_draw, avg_removal, avg_wipes, with_roles,
             commanders, with_composition, computed_at)
          values (${identityRestore.condition}, ${identityRestore.row.avg_land},
                  ${identityRestore.row.avg_basic}, ${identityRestore.row.avg_nonbasic},
                  ${identityRestore.row.avg_creature}, ${identityRestore.row.avg_instant},
                  ${identityRestore.row.avg_sorcery}, ${identityRestore.row.avg_artifact},
                  ${identityRestore.row.avg_enchantment}, ${identityRestore.row.avg_planeswalker},
                  ${identityRestore.row.avg_battle},
                  ${identityRestore.row.avg_curve === null
                      ? null
                      : JSON.stringify(identityRestore.row.avg_curve)}::jsonb,
                  ${identityRestore.row.avg_ramp}, ${identityRestore.row.avg_draw},
                  ${identityRestore.row.avg_removal}, ${identityRestore.row.avg_wipes},
                  ${identityRestore.row.with_roles},
                  ${identityRestore.commanders}, ${identityRestore.withComposition},
                  ${identityRestore.computedAt}::timestamp)
          on conflict (condition) do nothing`);
      }],
      // Every step runs even when an earlier one throws — a cleanup that stops at the first
      // failure leaves the rest of the fixture behind, which is how a probe poisons the next
      // run of itself.
    ] as const) {
      try {
        await step();
      } catch (error) {
        failures += 1;
        console.error(`cleanup failed: ${what}`, error);
      }
    }
    console.log(`\ncleaned up fixture user ${USER}`);
    await pool.end();
    console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
    process.exit(failures === 0 ? 0 : 1);
  });
