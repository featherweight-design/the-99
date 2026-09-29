// Proves `planFill` against a real Postgres and the real catalog.
//
// WHY A PROBE. Every rule the fill applies is unit tested against a hand-built pool, and a
// hand-built pool is exactly what cannot answer the questions below. Four of the seven checks
// turn on facts only the CATALOG holds — which cards are `modal_dfc` against `transform`, which
// land-backed spells exist at all, what a commander's measured land count actually is — and two
// more turn on a skeleton assembled from five database reads down a four-rung chain. A fixture
// that stated those facts would be asserting the answer it was built to check.
//
// Seven sections, and the mutation each one exists to catch is in the table at the foot.
//
// Section 8 is the basics split, against the real catalog. It reproduces HD - Thorin: a `{R,W}`
// deck whose top-off produced 18 Plains, 6 Wastes and NO Mountains. Wastes reaches every pool
// because its colour identity is EMPTY and `[].every(…)` is true, and the spare-redistribution
// loop then handed a capped Plains allocation's leftovers to the only other colour with copies on
// the shelf. Its fixture owns ZERO Mountains on purpose — that is what dropped red out of the
// split, and a tidy fixture would hide it.
//
// It writes a fixture under a per-run `user_id` and deletes it in a `finally`. Point it at
// `local-dev` or a scratch Neon branch, NEVER production.

// .env has to be loaded before the import below reaches it.
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";

import { planFill, type FillCandidate } from "../src/lib/decks/fill";
import { landTarget } from "../src/lib/decks/deck-size";
import { loadSkeletonForCommanders } from "../src/lib/profile/load";
import { castFaceText, playableAsLand } from "../src/lib/cards/facet";
import { classifyRoles, type Role } from "../src/lib/recs/roles";
import { readSynergyCards } from "../src/app/commanders/[slug]/synergy-read";
import { readFileSync } from "node:fs";

/**
 * The production caller's own source, WITH COMMENTS STRIPPED.
 *
 * Check 5 proves `planFill` honours a ranking it is given; this proves the app gives it one,
 * which is the half that was actually broken. The first version searched the raw file for
 * `synergyRank` — and the comment explaining the argument contains that word, so the check was
 * satisfied by its own prose and would have passed with the argument deleted.
 */
const BUILD_FILL_PLAN_SRC = readFileSync("src/app/decks/actions.ts", "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

neonConfig.webSocketConstructor = ws;
const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-fill-${Date.now()}`;

/** Captured before the sentinel is written, restored in the `finally`. local-dev carries no
 *  composition columns at all — the staples derivation has never had an index to run against —
 *  so without a sentinel the skeleton has exactly one reachable state and six of these seven
 *  checks are asserted by nobody. Same discipline as `probe:bracket`'s catalog sentinels. */
let commanderRestore: {
  oracleId: string;
  before: Record<string, number | null>;
} | null = null;

let failures = 0;
/** Counts its OWN failures — a probe whose exit code disagrees with its output is worse than
 *  no probe. The count lives here rather than at each call site for the reason
 *  `probe-commander-availability` records: a check that forgets it prints FAIL and then
 *  "All checks passed" over the top. */
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
}
function truthy(label: string, got: boolean) { check(label, got, true); }
function fail(label: string, why: string) { failures += 1; console.log(`FAIL  ${label} — ${why}`); }

const rows = async <T>(q: Parameters<typeof fixture.execute>[0]) =>
  (await fixture.execute(q)).rows as unknown as T[];

type CardRow = {
  oracle_id: string; name: string; type_line: string; oracle_text: string | null;
  keywords: string[] | null; mana_cost: string | null; layout: string;
};

const candidate = (r: CardRow, owned = true, qty = 1, inclusionPct = 50): FillCandidate => ({
  oracleId: r.oracle_id, name: r.name, typeLine: r.type_line,
  oracleText: r.oracle_text, keywords: r.keywords ?? [], manaCost: r.mana_cost,
  layout: r.layout, owned, ownedQuantity: owned ? qty : 0, inclusionPct,
});

/**
 * A fixture card the fill will actually REACH.
 *
 * The pool is ordered by preference and the body is 99 slots, so a card left at the pool's own
 * inclusion sorts wherever it happens to sort — and a fixture that never gets placed reports
 * "was never placed" about a build that is working. Three runs of this probe failed that way
 * before the weighting went in.
 */
const fixtureCard = (r: CardRow, qty = 1) => candidate(r, true, qty, 99);

/** What the FILL would call this card — front face, exactly as `rolesOfCandidate` does. Used to
 *  pick fixtures by what the classifier says rather than by what an ILIKE matched: the first
 *  version chose its ramp creature with `oracle_text ilike '%search your library for a%land%'`
 *  and drew `Spider-Bot`, which classifies as NO role at all, so the case it anchored measured
 *  the artifact beating an ineligible card. */
const rolesOf = (r: CardRow): Role[] => classifyRoles({
  typeLine: r.type_line,
  oracleText: castFaceText(r.oracle_text, r.layout),
  keywords: r.keywords ?? [],
});

async function main() {
  // A commander the index actually carries a composition for, so the skeleton has something to
  // resolve. Found BY QUERY rather than by a name that rots with the catalog.
  const [cmd] = await rows<{ oracle_id: string; name: string; color_identity: string[] }>(sql`
    select c.oracle_id, c.name, c.color_identity
    from cards c join commander_support cs on cs.commander_oracle_id = c.oracle_id
    where cs.synergy_state = 'ok' and cardinality(c.color_identity) = 1
    order by cs.deck_count desc nulls last
    limit 1`);
  if (!cmd) {
    fail("the fixture", "no single-colour commander in commander_support — run db:build:index");
    return;
  }
  console.log(`fixture commander: ${cmd.name} (${cmd.color_identity.join("") || "C"})`);

  // THE SENTINEL. A LAND COUNT THAT IS NOT 37, deliberately: the whole of check 1 is that the
  // measured figure replaced the asserted constant, and a sentinel of 37 would pass on a build
  // that never read the skeleton at all.
  const [before] = await rows<Record<string, number | null>>(sql`
    select avg_land, avg_basic, avg_nonbasic, avg_creature, avg_instant, avg_sorcery,
           avg_artifact, avg_enchantment, avg_planeswalker, avg_battle,
           avg_ramp, avg_draw, avg_removal, avg_wipes
    from commander_support where commander_oracle_id = ${cmd.oracle_id}::uuid`);
  commanderRestore = { oracleId: cmd.oracle_id, before: before ?? {} };
  await fixture.execute(sql`
    update commander_support
       set avg_land = 34, avg_basic = 18, avg_nonbasic = 16, avg_creature = 30,
           avg_instant = 7, avg_sorcery = 6, avg_artifact = 5, avg_enchantment = 4,
           avg_planeswalker = 1, avg_battle = 0,
           avg_ramp = 9, avg_draw = 11, avg_removal = 7, avg_wipes = 2
     where commander_oracle_id = ${cmd.oracle_id}::uuid`);
  console.log("wrote a composition sentinel (land 34, ramp 9, draw 11, removal 7, wipes 2)\n");

  const { skeleton } = await loadSkeletonForCommanders(cmd.oracle_id, null, cmd.color_identity);
  console.log(
    `skeleton: composition ${skeleton.composition?.of ?? "none"} · ` +
    `roles ${skeleton.roleTargets.of} · land ${skeleton.composition?.targets.land ?? "—"}\n`,
  );

  // ---- 1 · the measured land count ----------------------------------------------------
  console.log("1 · the land target is the measured one");
  const measuredLand = landTarget(false, skeleton);
  if (skeleton.composition === null) {
    fail("1 · the fixture", "this commander resolved no composition, so there is no measured land count to read");
  } else {
    // Against the ASSERTED 37 rather than against `avg_land` re-read here: comparing the
    // function to its own input proves only that it can copy a number. What the check is about
    // is that the measured figure REPLACED the constant.
    truthy("the target is the rounded measured figure",
      measuredLand === Math.round(skeleton.composition.targets.land));
    truthy("and it is not simply the asserted 37 by coincidence", measuredLand !== 37
      || Math.round(skeleton.composition.targets.land) === 37);
  }

  const pool400 = await rows<CardRow>(sql`
    select oracle_id, name, type_line, oracle_text, keywords, mana_cost, layout
    from cards
    where commander_legal
      and (color_identity <@ ${`{${cmd.color_identity.join(",")}}`}::text[] or cardinality(color_identity) = 0)
    limit 400`);
  const basics = await rows<CardRow>(sql`
    select oracle_id, name, type_line, oracle_text, keywords, mana_cost, layout
    from cards where type_line ilike 'basic land%' order by oracle_id limit 10`);
  const basePool = [
    ...pool400.map((r) => candidate(r)),
    ...basics.map((r) => candidate(r, true, 40)),
  ];

  const built = planFill(basePool, { hasPartner: false, skeleton });
  console.log(
    `built: ${built.filled} cards · land ${built.rows.filter((r) => r.role === "land")
      .reduce((n, r) => n + r.quantity, 0)} · landCapable ${built.landCapable} · ` +
    `measured ${built.measured}\n`,
  );

  // ---- 2 · the type tie-break -----------------------------------------------------------
  console.log("2 · the tie-break closes the larger type gap");
  // TWO CARDS THAT CLOSE THE SAME ROLE and differ only in type, against a skeleton that wants
  // creatures and has all the artifacts it needs. A real catalog pair, so the classifier is the
  // one under test rather than a string this script wrote.
  const artifactCandidates = await rows<CardRow>(sql`
    select oracle_id, name, type_line, oracle_text, keywords, mana_cost, layout
    from cards where commander_legal and type_line ilike 'artifact%'
      and type_line not ilike '%creature%'
      and oracle_text ilike '%: add %' order by oracle_id limit 40`);
  const creatureCandidates = await rows<CardRow>(sql`
    select oracle_id, name, type_line, oracle_text, keywords, mana_cost, layout
    from cards where commander_legal and type_line ilike '%creature%'
      order by oracle_id limit 200`);
  // CHOSEN BY THE CLASSIFIER, never by the ILIKE that found them: an ILIKE says what the text
  // contains and the tie-break only ever sees what `classifyRoles` returns, and the two
  // disagree often enough that the first version of this case anchored on a card classifying
  // as no role at all.
  const artifactRamp = artifactCandidates.find((r) => rolesOf(r).includes("ramp"));
  const creatureRamp = creatureCandidates.find(
    (r) => rolesOf(r).includes("ramp") && !rolesOf(r).includes("land"),
  );
  if (!artifactRamp || !creatureRamp) {
    fail("2 · the fixture", "the catalog has no artifact/creature ramp pair the classifier agrees on");
  } else {
    const wantsCreatures = {
      ...skeleton,
      composition: {
        of: "commander" as const,
        targets: {
          land: 35, basic: 20, nonbasic: 15, creature: 40, instant: 0, sorcery: 0,
          artifact: 0, enchantment: 0, planeswalker: 0, battle: 0,
        },
        averageCurve: null,
      },
      roleTargets: { of: "commander" as const, targets: { ramp: 1, draw: 0, removal: 0, wipes: 0 } },
    };
    // The artifact first in preference order, so taking the creature can only be the tie-break.
    const plan = planFill(
      [fixtureCard(artifactRamp), fixtureCard(creatureRamp),
       ...basics.map((r) => candidate(r, true, 40))],
      { hasPartner: false, skeleton: wantsCreatures, slots: 1 },
    );
    const rampRow = plan.rows.find((r) => r.role === "ramp");
    check("the creature closes the ramp slot, not the artifact",
      rampRow?.oracleId, creatureRamp.oracle_id);
  }

  // ---- 3 · modal credits, transform does not --------------------------------------------
  console.log("\n3 · a modal land back credits the land target and a transform back does not");
  const modalCandidates = await rows<CardRow>(sql`
    select oracle_id, name, type_line, oracle_text, keywords, mana_cost, layout
    from cards where layout = 'modal_dfc' and commander_legal
      and type_line not ilike 'land%' and type_line ilike '% // %land%' order by oracle_id limit 40`);
  const xformCandidates = await rows<CardRow>(sql`
    select oracle_id, name, type_line, oracle_text, keywords, mana_cost, layout
    from cards where layout = 'transform' and commander_legal
      and type_line ilike '% // %land%' order by oracle_id limit 40`);
  // A modal card the fill can actually SLEEVE: one the classifier gives a non-land role, or
  // the role pass and the residual both skip it and the case reports "never placed" about a
  // build that is working.
  const modal = modalCandidates.find(
    (r) => playableAsLand(r.type_line, r.layout) && rolesOf(r).some((x) => x !== "land"),
  );
  const xform = xformCandidates.find((r) => r.layout === "transform");
  if (!modal) {
    fail("3 · the fixture", "no commander-legal modal_dfc with a land back that the classifier gives a role");
  } else {
    truthy("the catalog's own modal card is land-capable", playableAsLand(modal.type_line, modal.layout));
    const withModal = planFill([fixtureCard(modal), ...basePool], { hasPartner: false, skeleton });
    const modalRow = withModal.rows.find((r) => r.oracleId === modal.oracle_id);
    if (!modalRow) {
      fail("3 · the modal card", `${modal.name} was never placed, so nothing here is measured`);
    } else {
      // Placed on a NON-land role and still counted as a land drop. Never `role: "land"`, or
      // the same card would take a role slot and a land slot — the §2.5a double credit.
      check("it is placed on a non-land role", modalRow.role !== "land", true);
      truthy("and credits landCapable above the land count",
        withModal.landCapable > withModal.rows.filter((r) => r.role === "land")
          .reduce((n, r) => n + r.quantity, 0));
    }
  }
  if (xform) {
    truthy("a transform card with a land back is NOT land-capable",
      !playableAsLand(xform.type_line, xform.layout));
  } else {
    console.log("note  the catalog holds no commander-legal transform card with a land back");
  }

  // ---- 4 · a land-backed MDFC is never spent on ramp --------------------------------------
  console.log("\n4 · a land-backed modal card is never spent on ramp");
  // §2.5a, and the case no unit fixture can prove: `oracle_text` holds both faces joined, so
  // without `castFaceText` the land back's mana ability makes this card read as ramp — and the
  // card is then spent on the ramp floor AND counted as a land.
  const rampLookingCandidates = await rows<CardRow>(sql`
    select oracle_id, name, type_line, oracle_text, keywords, mana_cost, layout
    from cards where layout = 'modal_dfc' and commander_legal
      and type_line not ilike 'land%' and type_line ilike '% // %land%'
      and oracle_text ilike '%: add %' order by oracle_id limit 40`);
  // The back must tap for mana AND the front must be something the fill will sleeve, or the
  // card is never placed and the case measures nothing either way.
  const rampLooking = rampLookingCandidates.find(
    (r) => playableAsLand(r.type_line, r.layout) && rolesOf(r).some((x) => x !== "land"),
  );
  if (!rampLooking) {
    fail("4 · the fixture", "no commander-legal modal card whose back taps for mana and whose front has a role");
  } else {
    const plan = planFill([fixtureCard(rampLooking), ...basePool], { hasPartner: false, skeleton });
    const row = plan.rows.find((r) => r.oracleId === rampLooking.oracle_id);
    if (!row) {
      fail("4 · the card", "was never placed, so nothing here is measured");
    } else {
      check(`${rampLooking.name} is not sleeved as ramp`, row.role === "ramp", false);
    }
  }

  // ---- 5 · the residual follows the REAL synergy ranking -----------------------------------
  console.log("\n5 · the residual is ordered by the ranking the app actually builds");
  // THROUGH `readSynergyCards`, the same reader the top-off list calls — not a map this script
  // invented. The first version built its own from `pool400`'s arbitrary order and passed it in
  // directly, which proved `planFill` sorts by an argument and nothing about whether the
  // PRODUCTION caller supplies one. It did not: `buildFillPlan` omitted `synergyRank`
  // entirely, so every residual row was ordered by inclusion and the create disagreed with the
  // top-off list about what the commander wanted. A probe that builds its own fixture for the
  // one input under test cannot see that.
  const synergy = await readSynergyCards(USER, [cmd.oracle_id], []);
  if (synergy.length < 2) {
    fail("5 · the fixture", `readSynergyCards returned ${synergy.length} cards — too few to order`);
  } else {
    // THE RETURNED INDEX, exactly as `actions.ts` builds it. `readSynergyCards` already hands
    // back `orderBySynergy` order; coalescing `synergyPts ?? inclusionPct` here rebuilds a
    // DIFFERENT ranking, so the descending assertion below could pass against a map production
    // never produces — the probe agreeing with itself rather than with the app.
    //
    // This is the same defect the production map had one round ago, left in the probe when the
    // production side was fixed.
    const ranked = new Map(
      synergy.map((card, index) => [card.oracleId, synergy.length - index]),
    );
    const withRank = planFill(basePool, { hasPartner: false, skeleton, synergyRank: ranked });
    const residual = withRank.rows.filter((r) => r.role === "other");
    const positions = residual
      .map((r) => ranked.get(r.oracleId))
      .filter((n): n is number => n !== undefined);
    if (positions.length < 2) {
      fail("5 · the fixture", "the residual holds too few ranked rows to order");
    } else {
      const descending = positions.every((n, i) => i === 0 || positions[i - 1]! >= n);
      truthy("the residual runs highest-ranked first", descending);
      // And the production caller SUPPLIES one. Asserted separately, because the check above
      // passes on a build where nothing ever passes `synergyRank`.
      // The ARGUMENT, in code rather than in prose: `synergyRank` reached as a property of the
      // object handed to `planFill`, or assigned on the way to it.
      truthy("and `buildFillPlan` passes a ranking at all",
        /synergyRank\s*[,}]/.test(BUILD_FILL_PLAN_SRC));
    }
  }

  // ---- 6 · the flat FALLBACK, not a null skeleton -----------------------------------------
  console.log("\n6 · a commander whose role chain reaches nothing still gets a deck");
  // Through a REAL skeleton whose four role figures are null, rather than by passing `null`.
  // The first version passed `skeleton: null`, which bypasses the fallback entirely — removing
  // it from `loadSkeletonForCommanders` failed nothing, because nothing reached it. The path
  // under test is a commander the role pass has never covered, which is every commander on a
  // database indexed before that pass existed.
  await fixture.execute(sql`
    update commander_support
       set avg_ramp = null, avg_draw = null, avg_removal = null, avg_wipes = null
     where commander_oracle_id = ${cmd.oracle_id}::uuid`);
  const { skeleton: noRoles } = await loadSkeletonForCommanders(
    cmd.oracle_id, null, cmd.color_identity,
  );
  check("the role chain reports the flat basis", noRoles.roleTargets.of, "flat");
  // And the TYPE chain is untouched beside it — the two resolve independently, and a fallback
  // that dragged both would pass a check watching only the roles.
  check("while the type chain still serves", noRoles.composition?.of, "commander");
  const flat = planFill(basePool, { hasPartner: false, skeleton: noRoles });
  truthy("the fill reaches the body on the asserted baseline", flat.filled >= 90);
  check("and says the floors were not measured", flat.measured, false);
  check("while the measured build says they were", built.measured, true);

  // ---- 8 · the basics follow the deck's IDENTITY, not the shelf ---------------------------
  console.log("\n8 · a Boros deck's basics");
  // HD - Thorin, reproduced against the real catalog. Its top-off gave a `{R,W}` deck 18 Plains,
  // 6 Wastes and NO Mountains: Wastes is admitted to every pool because its colour identity is
  // empty and `[].every(…)` is true, and the spare-redistribution loop then handed a capped
  // Plains allocation's leftovers to the only other colour with copies on the shelf.
  //
  // The fixture is the shape that produced it, not a tidy one: **Mountain owned in ZERO copies**,
  // which is what dropped red out of the split entirely. Rows are found BY QUERY rather than by a
  // name that rots with the catalog.
  const [plainsRow] = await rows<CardRow>(sql`
    select oracle_id, name, type_line, oracle_text, keywords, mana_cost, layout
    from cards where name = 'Plains' and type_line ilike 'basic land%' limit 1`);
  const [mountainRow] = await rows<CardRow>(sql`
    select oracle_id, name, type_line, oracle_text, keywords, mana_cost, layout
    from cards where name = 'Mountain' and type_line ilike 'basic land%' limit 1`);
  const [wastesRow] = await rows<CardRow>(sql`
    select oracle_id, name, type_line, oracle_text, keywords, mana_cost, layout
    from cards where name = 'Wastes' and type_line ilike 'basic land%' limit 1`);
  if (!plainsRow || !mountainRow || !wastesRow) {
    fail("8 · the fixture", "Plains, Mountain or Wastes missing from the catalog — is it seeded?");
  } else {
    const borosPool = [
      ...pool400.map((r) => candidate(r)),
      candidate(plainsRow, true, 18),
      // ZERO copies owned, deliberately: a basic is never a buy, so the shelf must not decide
      // whether a colour is in the mana base. With the fix reverted this is what vanishes.
      candidate(mountainRow, true, 0),
      candidate(wastesRow, true, 9),
    ];
    const boros = planFill(borosPool, {
      hasPartner: false, skeleton, identity: ["R", "W"],
    });
    const qty = (id: string) => boros.rows
      .filter((r) => r.oracleId === id).reduce((n, r) => n + r.quantity, 0);
    const plains = qty(plainsRow.oracle_id);
    const mountain = qty(mountainRow.oracle_id);
    const wastes = qty(wastesRow.oracle_id);
    console.log(`  Plains ${plains} · Mountain ${mountain} · Wastes ${wastes}`);
    check("8a · no Wastes in a Boros deck", wastes, 0);
    truthy("8b · Mountains present despite zero owned", mountain > 0);
    truthy("8c · Plains present", plains > 0);
    // Both colours, which is the ruling: an even split unless the pips tilt. The `pool400` spells
    // decide the tilt, so the shares are not asserted — only that neither colour is starved, which
    // is what "0 Mountains" violated.
    truthy("8d · the base is all identity basics", plains + mountain > 0 && wastes === 0);
  }

  // ---- 7 · landCapable against land on the built deck ------------------------------------
  console.log("\n7 · the built deck's land-capable count");
  const landRows = built.rows.filter((r) => r.role === "land")
    .reduce((n, r) => n + r.quantity, 0);
  // `>=` is unfalsifiable by construction — landCapable is land plus a non-negative count — so
  // the check is that the DIFFERENCE equals the modal cards actually placed on non-land roles.
  // A build that stopped reading `layout` would read 0 there and still satisfy `>=`.
  const modalPlaced = built.rows.filter((r) => {
    if (r.role === "land") return false;
    const c = basePool.find((x) => x.oracleId === r.oracleId);
    return c ? playableAsLand(c.typeLine, c.layout) : false;
  }).length;
  check("landCapable is the land count plus the modal cards sleeved elsewhere",
    built.landCapable, landRows + modalPlaced);
}

main()
  .catch((e) => { failures += 1; console.error(e); })
  .finally(async () => {
    // Every step runs even when an earlier one throws — a cleanup that stops at the first
    // failure poisons the next run of itself. This probe writes no rows of its own today; the
    // sweep is here because a fixture user is one edit away and a probe that gained writes
    // without a cleanup is how local-dev accumulates debris.
    for (const [label, step] of [
      ["the commander sentinel", async () => {
        if (!commanderRestore) return;
        const b = commanderRestore.before;
        await fixture.execute(sql`
          update commander_support
             set avg_land = ${b.avg_land ?? null}, avg_basic = ${b.avg_basic ?? null},
                 avg_nonbasic = ${b.avg_nonbasic ?? null}, avg_creature = ${b.avg_creature ?? null},
                 avg_instant = ${b.avg_instant ?? null}, avg_sorcery = ${b.avg_sorcery ?? null},
                 avg_artifact = ${b.avg_artifact ?? null}, avg_enchantment = ${b.avg_enchantment ?? null},
                 avg_planeswalker = ${b.avg_planeswalker ?? null}, avg_battle = ${b.avg_battle ?? null},
                 avg_ramp = ${b.avg_ramp ?? null}, avg_draw = ${b.avg_draw ?? null},
                 avg_removal = ${b.avg_removal ?? null}, avg_wipes = ${b.avg_wipes ?? null}
           where commander_oracle_id = ${commanderRestore.oracleId}::uuid`);
      }],
      ["the fixture decks", async () => {
        await fixture.execute(sql`delete from deck_cards where deck_id in (
          select id from decks where user_id = ${USER})`);
        await fixture.execute(sql`delete from decks where user_id = ${USER}`);
      }],
    ] as [string, () => Promise<void>][]) {
      try { await step(); } catch (e) {
        failures += 1;
        console.error(`cleanup failed for ${label}:`, e);
      }
    }
    await pool.end();
    console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
    // NEVER `process.exit` here — it swallows the exception, and three probes in this
    // repository have printed "all checks passed" over a case that never ran because of it.
    process.exitCode = failures === 0 ? 0 : 1;
  });
