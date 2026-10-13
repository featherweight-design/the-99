// Proves `planFill` against a real Postgres and the real catalog.
//
// WHY A PROBE. Every rule the fill applies is unit tested against a hand-built pool, and a
// hand-built pool is exactly what cannot answer the questions below. Four of the seven checks
// turn on facts only the CATALOG holds — which cards are `modal_dfc` against `transform`, which
// land-backed spells exist at all, what a commander's measured land count actually is — and two
// more turn on a skeleton assembled from five database reads down a four-rung chain. A fixture
// that stated those facts would be asserting the answer it was built to check.
//
// Fourteen sections, each naming the mutation it exists to catch in its own block. Sections 9 to
// 14 are the staples step and the inclusion band (H25), read from the real `format_staples`.
//
// Section 8 is the basics split, against the real catalog. It reproduces HD - Thorin: a `{R,W}`
// deck whose top-off produced 18 Plains, 6 Wastes and NO Mountains. Wastes reaches every pool
// because its colour identity is EMPTY and `[].every(…)` is true, and the spare-redistribution
// loop then handed a capped Plains allocation's leftovers to the only other colour with copies on
// the shelf. What dropped red out of the split was the CENSUS scoring zero red pips, not the
// shelf: the basics were chosen before the residual ran, so the pips of the commanders and of
// every residual row were missing from it.
//
// Its fixture owns ZERO Mountains on purpose all the same, to pin a second and separate property
// — that the shelf quantity does not decide whether a colour is in the mana base. Note this is a
// state production cannot reach through `ownedColorLegalPool`, which builds the pool
// `.from(collectionItems)`: a basic the player holds no collection row for is absent from the
// candidate pool entirely, and no split can supply what it never sees.
//
// It writes a fixture under a per-run `user_id` and deletes it in a `finally`. Point it at
// `local-dev` or a scratch Neon branch, NEVER production.

// .env has to be loaded before the import below reaches it.
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";

import { isResidual, planFill, type FillCandidate, type FillPlan, type FillRow } from "../src/lib/decks/fill";
import {
  chooseFillStaples, FILL_STAPLE_INCLUSION_BAR, gatherFillStaples, loadFillStaples, type StapleRow,
} from "../src/lib/staples/fill-staples";
import { universalStaples } from "../src/lib/staples/universal";
import { budgetGate } from "../src/lib/intake/fill-gate";
import { loadPrices } from "../src/lib/discovery/price";
import type { ProfileSkeleton } from "../src/lib/profile/types";
import { landTarget } from "../src/lib/decks/deck-size";
import { loadSkeletonForCommanders } from "../src/lib/profile/load";
import { loadCatalogBasics } from "../src/lib/decks/catalog-basics";
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
const BUILD_FILL_PLAN_SRC = readFileSync("src/lib/decks/fill-plan.ts", "utf8")
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
/** The fixture commander's identity, which the staples sections read beside the skeleton. */
let cmdIdentity: string[] = [];
/** The Game Changer staple row section 12 raises past the bar, restored in the `finally`. */
let stapleRestore: { oracleId: string; condition: string; avgInclusion: number } | null = null;
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

const candidate = (r: CardRow, owned = true, qty = 1, inclusionPct: number | null = 50): FillCandidate => ({
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

/**
 * A modal fixture the fill actually SLEEVES, found by building with each candidate in turn.
 *
 * Having a non-land role is not enough: the role pass fills a role only up to its floor and the
 * residual only to the body, so a card whose role is already satisfied is refused and the case
 * reports "never placed" about a build that is working. Krenko's own skeleton fills `removal` to
 * ZERO out of a target of 7 — the same on this branch and on `origin/main` — so every removal
 * candidate is unplaceable there, which is exactly what this search walks past.
 *
 * It was flaky-green before. The pool's `limit 400` was unordered, so the fixture changed per run
 * and a placeable card turned up often enough to hide it; ordering the pool made the failure
 * permanent rather than causing it.
 */
const placeableModal = (
  candidates: CardRow[], basePool: FillCandidate[], skeleton: ProfileSkeleton,
): { card: CardRow; plan: FillPlan; row: FillRow } | null => {
  for (const card of candidates) {
    if (!playableAsLand(card.type_line, card.layout)) continue;
    const own: Role[] = rolesOf(card).filter((x) => x !== "land");
    if (own.length === 0) continue;
    // WITHOUT RIVALS FOR ITS ROLES. The card is first in preference, but the role pass's
    // tie-break hands its slot to any card closing MORE open floors (§2.5a), so on a real pool
    // the multi-role cards shut the floor before this one is taken and the case measures nothing.
    // It was never the role pass refusing a land-backed modal card: `classifyRoles` reads the
    // FRONT face (`isLandFace`), so such a card is a spell there and is taken when a floor is open.
    const pool = basePool.filter((c) => !classifyRoles({
      typeLine: c.typeLine, oracleText: castFaceText(c.oracleText, c.layout), keywords: c.keywords,
    }).some((r) => own.includes(r)));
    const plan = planFill([fixtureCard(card), ...pool], { hasPartner: false, skeleton });
    const row = plan.rows.find((r) => r.oracleId === card.oracle_id);
    if (row) return { card, plan, row };
  }
  return null;
};

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
  cmdIdentity = cmd.color_identity;

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
    -- ORDERED, and that is not tidiness. An unordered limit lets Postgres return any 400 rows, so
    -- whether a land-backed modal card lands in the pool — and therefore whether the land ceiling
    -- is the measured figure or one lower — varied between runs on the same database. Check 8d
    -- asserts that ceiling exactly, so it could fail on a correct build.
    order by oracle_id
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
  // ON THE COMMANDER'S IDENTITY, exactly as `pool400` is. An off-identity card is not castable, so
  // the fill refuses it and the case reports "never placed" about a build that is working. That was
  // invisible while the pool was unordered — the fixture picked a different modal card per run —
  // and became permanent the moment the ORDER BY above made the choice deterministic: a green card
  // for a mono-red commander, every run, on this branch and on `origin/main` alike.
  const modalCandidates = await rows<CardRow>(sql`
    select oracle_id, name, type_line, oracle_text, keywords, mana_cost, layout
    from cards where layout = 'modal_dfc' and commander_legal
      and type_line not ilike 'land%' and type_line ilike '% // %land%'
      and (color_identity <@ ${`{${cmd.color_identity.join(",")}}`}::text[] or cardinality(color_identity) = 0)
    order by oracle_id limit 40`);
  const xformCandidates = await rows<CardRow>(sql`
    select oracle_id, name, type_line, oracle_text, keywords, mana_cost, layout
    from cards where layout = 'transform' and commander_legal
      and type_line ilike '% // %land%' order by oracle_id limit 40`);
  // A modal card the fill can actually SLEEVE: one the classifier gives a non-land role, or
  // the role pass and the residual both skip it and the case reports "never placed" about a
  // build that is working.
  const found = placeableModal(modalCandidates, basePool, skeleton);
  const xform = xformCandidates.find((r) => r.layout === "transform");
  if (!found) {
    fail("3 · the fixture", "no commander-legal modal_dfc with a land back that this fill will sleeve");
  } else {
    const { card: modal, plan: withModal, row: modalRow } = found;
    console.log(`  fixture card: ${modal.name}`);
    truthy("the catalog's own modal card is land-capable", playableAsLand(modal.type_line, modal.layout));
    // Placed on a NON-land role and still counted as a land drop. Never `role: "land"`, or
    // the same card would take a role slot and a land slot — the §2.5a double credit.
    check("it is placed on a non-land role", modalRow.role !== "land", true);
    truthy("and credits landCapable above the land count",
      withModal.landCapable > withModal.rows.filter((r) => r.role === "land")
        .reduce((n, r) => n + r.quantity, 0));
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
      and oracle_text ilike '%: add %'
      and (color_identity <@ ${`{${cmd.color_identity.join(",")}}`}::text[] or cardinality(color_identity) = 0)
    order by oracle_id limit 40`);
  // The back must tap for mana AND the front must be something the fill will sleeve, or the
  // card is never placed and the case measures nothing either way.
  const rampFound = placeableModal(rampLookingCandidates, basePool, skeleton);
  if (!rampFound) {
    fail("4 · the fixture", "no commander-legal modal card whose back taps for mana that this fill will sleeve");
  } else {
    check(`${rampFound.card.name} is not sleeved as ramp`, rampFound.row.role === "ramp", false);
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

  // ---- 8 · the basics follow the deck's IDENTITY, not the shelf ---------------------------
  console.log("\n8 · a Boros deck's basics");
  // HD - Thorin, reproduced against the real catalog. Its top-off gave a `{R,W}` deck 18 Plains,
  // 6 Wastes and NO Mountains: Wastes is admitted to every pool because its colour identity is
  // empty and `[].every(…)` is true, and the spare-redistribution loop then handed a capped
  // Plains allocation's leftovers to the only other colour with copies on the shelf.
  //
  // WHAT DROPPED RED was the pip census, not the shelf: Thorin's owner had 81 Mountains, and the
  // census saw neither the commanders nor the residual, so red scored zero pips. This fixture
  // holds **no Mountain row at all** for a separate reason: it checks that the split does not
  // depend on the shelf either, which is a synthetic case rather than a reproduction of Thorin.
  // Rows are found BY QUERY rather than by a name that rots with the catalog.
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
      // NO MOUNTAIN ROW AT ALL, deliberately: the pool is the collection, so a player with none
      // offers the split no red basic. The catalog's Mountain arrives through `basics`, loaded by
      // the same `loadCatalogBasics` `buildFillPlan` calls. With that argument dropped this is
      // what vanishes.
      candidate(wastesRow, true, 9),
    ];
    const boros = planFill(borosPool, {
      hasPartner: false, skeleton, identity: ["R", "W"], basics: await loadCatalogBasics(),
    });
    const qty = (id: string) => boros.rows
      .filter((r) => r.oracleId === id).reduce((n, r) => n + r.quantity, 0);
    const plains = qty(plainsRow.oracle_id);
    const mountain = qty(mountainRow.oracle_id);
    const wastes = qty(wastesRow.oracle_id);
    console.log(`  Plains ${plains} · Mountain ${mountain} · Wastes ${wastes}`);
    check("8a · no Wastes in a Boros deck", wastes, 0);
    truthy("8b · Mountains present with no Mountain in the collection", mountain > 0);
    truthy("8c · Plains present", plains > 0);
    // THE BASE IS STILL COMPLETE, which is the check the other three cannot make. Excluding
    // Wastes is only half the ruling: a fix that dropped it and left the mana base six lands short
    // would pass 8a, 8b and 8c and be worse than the bug. `8d` was first written as
    // `plains + mountain > 0 && wastes === 0`, which is implied by the three above and could not
    // fail on its own — a check that restates its neighbours.
    const landTotal = boros.rows
      .filter((r) => r.role === "land").reduce((n, r) => n + r.quantity, 0);
    // MINUS THE MODAL DROPS, computed the way section 7 computes them. The basics fill to
    // `landCeiling - modalDrops`, never to the ceiling, so asserting the bare target fails on a
    // correct build the moment the ordered 400 happens to contain a land-backed modal card placed
    // on a non-land role. Ordering the pool made that outcome stable per catalog, not correct: a
    // refresh that inserts such a card into the first 400 flips it.
    const borosModalDrops = boros.rows.filter((r) => {
      if (r.role === "land") return false;
      const card = borosPool.find((x) => x.oracleId === r.oracleId);
      return card ? playableAsLand(card.typeLine, card.layout) : false;
    }).length;
    // `measuredLand`, not `landTarget(false)`: this probe passes a real skeleton, so the ceiling is
    // the measured figure and the flat default would be a different number on any indexed database.
    check("8d · the base is filled to the land target", landTotal, measuredLand - borosModalDrops);
  }

  await stapleSections(skeleton, basePool, pool400);
}

/** The catalog rows for these names, one per name, or the names it could not find. */
async function cardsNamed(names: string[]): Promise<{ found: Map<string, CardRow>; missing: string[] }> {
  const got = await rows<CardRow>(sql`
    select distinct on (name) oracle_id, name, type_line, oracle_text, keywords, mana_cost, layout
    from cards where name = any(${sql.param(names)}::text[]) order by name, oracle_id`);
  const found = new Map(got.map((r) => [r.name, r]));
  return { found, missing: names.filter((n) => !found.has(n)) };
}

const stapleRowsOf = (plan: FillPlan) => plan.rows.filter((r) => r.source === "staple");

/**
 * SECTIONS 9-14: the staples step and the inclusion band (H25, plan
 * `2026-10-02-fill-includes-staples.md` §6). The staples are read from the REAL `format_staples`
 * through the same `loadFillStaples` `buildFillPlan` calls, so the universal set, the condition
 * chain and the Game Changer exclusion are checked against what the table holds rather than
 * against a list this script wrote. The fixture collection OWNS every staple it offers, the state
 * of Hugh's staging account (17 Sol Rings, 15 Arcane Signets).
 */
async function stapleSections(skeleton: ProfileSkeleton, basePool: FillCandidate[], pool400: CardRow[]) {
  const reader = fixture as unknown as Parameters<typeof loadFillStaples>[1];
  const allRows = await rows<StapleRow>(sql`
    select fs.oracle_id as "oracleId", fs.condition, fs.avg_inclusion as "avgInclusion",
           c.game_changer as "gameChanger"
    from format_staples fs join cards c on c.oracle_id = fs.oracle_id`);
  if (allRows.length === 0) {
    fail("9-14 · the fixture", "format_staples is empty — run db:build:staples");
    return;
  }
  const universal = universalStaples(allRows);
  /** Inside the identity, as the pool (`ownedColorLegalPool`) and the catalog read
   *  (`loadStapleCards`) both are: `count:3` pools every three-color identity, so its rows include
   *  cards a given three-color deck cannot play, and production never sees them. */
  const catalogOf = async (ids: string[], identity: string[]) => new Map((await rows<CardRow>(sql`
    select oracle_id, name, type_line, oracle_text, keywords, mana_cost, layout
    from cards where oracle_id = any(${sql.param(ids)}::uuid[])
      and color_identity <@ ${sql.param(identity)}::text[]`)).map((r) => [r.oracle_id, r]));
  /** The staples as `buildFillPlan` would hand them over for a collection owning all of them. */
  const ownedStaples = async (identity: string[]) => {
    const ids = await loadFillStaples(identity, reader);
    const cards = await catalogOf(ids, identity);
    return ids.flatMap((id) => cards.has(id) ? [candidate(cards.get(id)!, true, 1, 60)] : []);
  };
  const lands = basePool.filter((c) => /basic land/i.test(c.typeLine));

  // ---- 9 · inclusion bounds the tie-break -----------------------------------------------
  console.log("\n9 · inclusion bounds the tie-break");
  // Found THROUGH the classifier. One owned single-role ramp card at a high sentinel inclusion
  // and three owned ramp-and-draw cards with no figure: before the band, every one of the three
  // closed two floors and took the slot (Omnath, Locus of Creation's measured role rows).
  const rampish = await rows<CardRow>(sql`
    select oracle_id, name, type_line, oracle_text, keywords, mana_cost, layout
    from cards where commander_legal and oracle_text ilike '%add {%'
      and type_line not ilike '%land%' order by oracle_id limit 800`);
  const single = rampish.find((r) => { const x = rolesOf(r); return x.length === 1 && x[0] === "ramp"; });
  const duals = rampish.filter((r) => { const x = rolesOf(r); return x.includes("ramp") && x.includes("draw"); }).slice(0, 3);
  if (!single || duals.length < 3) {
    fail("9 · the fixture", "the catalog has no single-role ramp card and three ramp-and-draw cards");
  } else {
    const narrow = {
      ...skeleton,
      roleTargets: { of: skeleton.roleTargets.of, targets: { ramp: 1, draw: 1, removal: 0, wipes: 0 } },
    } as ProfileSkeleton;
    const plan = planFill([candidate(single, true, 1, 80), ...duals.map((d) => candidate(d, true, 1, null))], {
      hasPartner: false, skeleton: narrow,
    });
    console.log(`  single ${single.name} · duals ${duals.map((d) => d.name).join(", ")}`);
    check("9 · the figured single-role card keeps the ramp slot",
      plan.rows.find((r) => r.role === "ramp")?.oracleId, single.oracle_id);
  }

  // ---- 10 · universal staples land --------------------------------------------------------
  console.log("\n10 · universal staples land");
  const { found: named, missing } = await cardsNamed([
    "Sol Ring", "Arcane Signet", "Swords to Plowshares", "Swiftfoot Boots",
  ]);
  if (missing.length > 0) fail("10 · the fixture", `not in the catalog: ${missing.join(", ")}`);
  const sol = named.get("Sol Ring");
  const signet = named.get("Arcane Signet");
  for (const [label, row] of [["Sol Ring", sol], ["Arcane Signet", signet]] as const) {
    truthy(`10 · ${label} is a universal staple in this table`, !!row && universal.has(row.oracle_id));
  }
  const monoStaples = await ownedStaples(cmdIdentity);
  const mono = planFill([...basePool], { hasPartner: false, skeleton, staples: monoStaples });
  const seeded = new Set(stapleRowsOf(mono).map((r) => r.oracleId));
  console.log(`  ${seeded.size} staples seeded for a ${cmdIdentity.join("")} deck`);
  for (const [label, row] of [["Sol Ring", sol], ["Arcane Signet", signet]] as const) {
    truthy(`10 · ${label} arrives as a staple`, !!row && seeded.has(row.oracle_id));
  }

  // ---- 11 · the identity condition --------------------------------------------------------
  console.log("\n11 · the identity condition");
  const swords = named.get("Swords to Plowshares");
  const white = await loadFillStaples(["W"], reader);
  truthy("11a · a white deck is offered Swords to Plowshares", !!swords && white.includes(swords.oracle_id));
  // The THREE-COLOR deck has no exact bucket and is served by `count:3`. Found by query: a
  // count:3 row at the bar that is not universal and not a Game Changer.
  // Its identity is DERIVED from the row: `count:3` pools every three-color identity, so a row
  // there may be a card one three-color deck cannot play (on local-dev the only nonland row at the
  // bar that is not universal is Swords to Plowshares). The deck is that card's colors, widened to
  // three in WUBRG order.
  const count3Rows = allRows.filter((r) => r.condition === "count:3"
    && r.avgInclusion >= FILL_STAPLE_INCLUSION_BAR && !universal.has(r.oracleId) && !r.gameChanger);
  const count3Cards = await rows<CardRow & { color_identity: string[] }>(sql`
    select oracle_id, name, type_line, oracle_text, keywords, mana_cost, layout, color_identity
    from cards where oracle_id = any(${sql.param(count3Rows.map((r) => r.oracleId))}::uuid[])
      and type_line not ilike '%land%' and cardinality(color_identity) <= 3
    order by oracle_id`);
  const count3 = count3Cards[0];
  const three = count3
    ? [...new Set([...count3.color_identity, ..."WUBRG"])].slice(0, 3)
    : [];
  if (!count3) {
    fail("11b · the fixture", "count:3 holds no non-universal nonland row at the bar");
  } else {
    const threeStaples = await ownedStaples(three);
    const threePlan = planFill([...basePool], { hasPartner: false, skeleton, staples: threeStaples });
    console.log(`  ${three.join("")} deck · count:3 row ${count3.name}`);
    truthy("11b · a three-color deck seeds a count:3 row as a staple",
      stapleRowsOf(threePlan).some((r) => r.oracleId === count3.oracle_id));
  }
  const four = await loadFillStaples(["W", "U", "B", "R"], reader);
  const universalOffer = [...universal].filter((id) => !allRows.find((r) => r.oracleId === id)?.gameChanger);
  check("11c · a four-color deck is offered the universal staples only",
    [...four].sort(), universalOffer.sort());
  truthy("11d · and so a four-color deck is not offered Swords to Plowshares",
    !!swords && !four.includes(swords.oracle_id));

  // ---- 12 · the gate --------------------------------------------------------------------
  console.log("\n12 · the gate");
  // THE GAME CHANGER EXCLUSION needs a SENTINEL: no Game Changer reaches the bar in any
  // condition today (the highest, Jeska's Will in R, reads 30.4 on local-dev), so without one the
  // exclusion is asserted by nobody. The highest Game Changer row in an exact condition is raised
  // past the bar, captured before the write and restored in the `finally`.
  const [gc] = allRows
    .filter((r) => r.gameChanger && !r.condition.startsWith("count:"))
    .sort((a, b) => b.avgInclusion - a.avgInclusion || a.oracleId.localeCompare(b.oracleId));
  if (!gc) {
    fail("12a · the fixture", "format_staples holds no Game Changer row in an exact condition");
  } else {
    stapleRestore = { oracleId: gc.oracleId, condition: gc.condition, avgInclusion: gc.avgInclusion };
    await fixture.execute(sql`
      update format_staples set avg_inclusion = ${FILL_STAPLE_INCLUSION_BAR + 10}
       where oracle_id = ${gc.oracleId}::uuid and condition = ${gc.condition}`);
    const identity = gc.condition === "C" ? [] : [...gc.condition];
    const raised = allRows.map((r) => r.oracleId === gc.oracleId && r.condition === gc.condition
      ? { ...r, avgInclusion: FILL_STAPLE_INCLUSION_BAR + 10 } : r);
    truthy("12a · the sentinel would be offered without the exclusion",
      chooseFillStaples(raised.map((r) => ({ ...r, gameChanger: false })), identity).includes(gc.oracleId));
    const offered = await ownedStaples(identity);
    const gcPlan = planFill([...basePool], { hasPartner: false, skeleton, staples: offered });
    console.log(`  sentinel: a Game Changer raised to ${FILL_STAPLE_INCLUSION_BAR + 10} in ${gc.condition}`);
    truthy("12b · an owned Game Changer staple is not offered", !offered.some((c) => c.oracleId === gc.oracleId));
    truthy("12c · nor seeded, with no bracket answer",
      !stapleRowsOf(gcPlan).some((r) => r.oracleId === gc.oracleId));
  }
  // THE BUDGET: a staple priced above what is left is refused, through the real gate and real
  // prices, while a cheaper one still lands. The budget is set just under the dearer staple's own
  // price rather than at a fixed $20: no staple this identity is offered costs that much today,
  // and a fixed figure would measure nothing.
  const priced = await loadPrices(monoStaples.map((c) => c.oracleId));
  const priceOf = (id: string) => priced.get(id)?.liveCents ?? null;
  // NONLAND only: the step never places a land, so a land here would pass 12d with the gate
  // removed and fail 12e on a correct build.
  const byPrice = monoStaples.filter((c) => priceOf(c.oracleId) !== null && !/\bland\b/i.test(c.typeLine))
    .sort((a, b) => priceOf(b.oracleId)! - priceOf(a.oracleId)!);
  const dear = byPrice[0];
  const cheap = byPrice.at(-1);
  if (!dear || !cheap || priceOf(dear.oracleId)! <= priceOf(cheap.oracleId)!) {
    fail("12d · the fixture", "fewer than two staples with different prices");
  } else {
    const unowned = monoStaples.map((c) => ({ ...c, owned: false, ownedQuantity: 0 }));
    const budget = planFill([...lands], {
      hasPartner: false, skeleton, staples: [dear, cheap].map((c) => unowned.find((u) => u.oracleId === c.oracleId)!),
      gate: budgetGate({ remainingCents: priceOf(dear.oracleId)! - 1, buys: (c) => !c.owned, priceOf }),
    });
    console.log(`  dear ${dear.name} $${(priceOf(dear.oracleId)! / 100).toFixed(2)} · cheap ${cheap.name}`);
    truthy("12d · a budget under a staple's price refuses it", !budget.rows.some((r) => r.oracleId === dear.oracleId));
    truthy("12e · and still seeds a cheaper one", stapleRowsOf(budget).some((r) => r.oracleId === cheap.oracleId));
  }

  // ---- 13 · lands -----------------------------------------------------------------------
  console.log("\n13 · land staples go to the land sweep");
  const landStaple = monoStaples.find((c) => /\bland\b/i.test(c.typeLine) && !/basic/i.test(c.typeLine));
  if (!landStaple) {
    fail("13 · the fixture", "no land among this identity's staples");
  } else {
    // AT THE BACK of the pool's own order, so only the staple preference can bring it forward.
    const nonbasics = pool400.filter((r) => /\bland\b/i.test(r.type_line) && !/basic/i.test(r.type_line))
      .slice(0, 20).map((r) => candidate(r, true, 1, 99));
    const pool = [...basePool, ...nonbasics, { ...landStaple, inclusionPct: 1 }];
    const withStaple = planFill(pool, { hasPartner: false, skeleton, staples: [landStaple] });
    const without = planFill(pool, { hasPartner: false, skeleton });
    const landRows = withStaple.rows.filter((r) => r.oracleId === landStaple.oracleId);
    console.log(`  ${landStaple.name}`);
    check("13a · the land staple arrives once, as a land, through the sweep",
      landRows, [{ oracleId: landStaple.oracleId, quantity: 1, role: "land" }]);
    const landCount = (p: FillPlan) => p.rows.filter((r) => r.role === "land").reduce((n, r) => n + r.quantity, 0);
    check("13b · and the land count is unchanged", landCount(withStaple), landCount(without));
    truthy("13c · ahead of the nonbasics the pool preferred",
      withStaple.rows.filter((r) => r.role === "land")[0]?.oracleId === landStaple.oracleId);
  }

  // ---- 14 · the caller's bounds ------------------------------------------------------------
  console.log("\n14 · the caller's bounds");
  const one = planFill([...basePool], { hasPartner: false, skeleton, slots: 1, staples: monoStaples });
  check("14a · a one-slot fill places one card", one.filled, 1);
  if (sol) {
    const gathered = await gatherFillStaples({
      // Sol Ring IN SCOPE, owned, so only the allow-list can keep it out: left out of the pool, it
      // drops for want of a candidate and the check passes over a build that ignores the list.
      identity: cmdIdentity, scoped: [...basePool, candidate(sol, true, 1, 60)],
      excludeOracleIds: new Set(), commanderIds: new Set(),
      onlyOracleIds: new Set(monoStaples.map((c) => c.oracleId).filter((id) => id !== sol.oracle_id)),
      sleeveableOnly: false, inclusionOf: () => null,
    }, { staples: (id) => loadFillStaples(id, reader), cards: async () => [] });
    truthy("14b · an allow-list without Sol Ring keeps it out", !gathered.some((c) => c.oracleId === sol.oracle_id));
    const unbounded = await gatherFillStaples({
      identity: cmdIdentity, scoped: [...basePool, candidate(sol, true, 1, 60)],
      excludeOracleIds: new Set(), commanderIds: new Set(), sleeveableOnly: false, inclusionOf: () => null,
    }, { staples: (id) => loadFillStaples(id, reader), cards: async () => [] });
    truthy("14b · while without one it is offered", unbounded.some((c) => c.oracleId === sol.oracle_id));
  }
  const boots = named.get("Swiftfoot Boots");
  if (boots) {
    const roleless = planFill([...basePool], {
      hasPartner: false, skeleton, slots: 1, pool: "sleeveable", staples: [candidate(boots, true, 1, 60)],
    });
    const row = roleless.rows[0];
    truthy("14c · a one-slot fill's roleless staple is a tick, not residual",
      !!row && row.oracleId === boots.oracle_id && !isResidual(row));
  }
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
      ["the staple sentinel", async () => {
        if (!stapleRestore) return;
        await fixture.execute(sql`
          update format_staples set avg_inclusion = ${stapleRestore.avgInclusion}
           where oracle_id = ${stapleRestore.oracleId}::uuid and condition = ${stapleRestore.condition}`);
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
