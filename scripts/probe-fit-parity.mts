// Do the two expressions of the synergy allocation agree?
//
// Ruling D put every Fit's synergy on the stored commander index. Two pieces of
// code now compute the same overlap from it: the SQL a row's payload is built
// from, written below, and the TypeScript `scoreCommander` runs
// (`loadSupportLists` then `supportOverlap`). Two expressions of one allocation
// drifting apart is how the deck page and its receipt came to disagree once
// already, which is why `loadDeckBuyRows` is asserted beside `loadAvailability`
// rather than assumed to match it.
//
// Before Ruling D this compared the stored counts against a LIVE EDHREC name
// match and found 57 numerators and 20 Fit figures disagreeing over 95
// commanders. That comparison is retired: `edhrecOverlap`, the name matcher, is
// gone.
//
// IT COMPARES EVERY CANDIDATE, AND THAT IS THE SCOPE DECISION. Three review
// rounds landed on an earlier version's POPULATION: it sampled the highest
// overlaps and so could not see a stored 0 against a live positive; its order
// was unspecified, so two runs compared different commanders; it dropped a
// stored total of 0; it capped the count for cost; and it filtered out rows that
// failed to score and then checked a floor, which let a broken read shrink a
// 95-row run to 20 and still pass. Every one of those was a question about WHICH
// commanders to compare, so the answer is to stop choosing.
//
// The earlier version called `scoreOneCommander`, the detail page's entry point,
// which reads live EDHREC for `inclusionByName` — so it had to filter to warm
// cache rows to stay side-effect-free, and every population question followed
// from that filter. Since Ruling D the live read cannot touch the figure, so
// this calls `scoreCommander` directly with the list `loadSupportLists`
// returns: the whole allocation path and nothing else. No cache, no TTL, no
// fetch, no writes, no cap — and the population is every candidate the index has
// a total for, which is thousands rather than 95.
//
// What the decomposition gives up, stated rather than hidden:
// `scoreOneCommander`'s ASSEMBLY — which commander it looks up, which pool it
// passes — is not exercised here. That is unit-tested in
// `recommend-detail.test.ts`, it is not an allocation expression, and it was
// never what the two sides could disagree about.
//
// Run: `pnpm probe:fit-parity`  ·  `USER_ID=…` to pick the account
//
// First, and on its own line: src/db reads DATABASE_URL at module scope.
import { requireEnv } from "./lib/env.mjs";
requireEnv(["DATABASE_URL"]);
import { and, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../src/db";
import { cards, collectionItems, commanderSupportCards } from "../src/db/schema";
import { loadCandidates } from "../src/lib/discovery/candidates";
import { loadSupportLists } from "../src/lib/edhrec/support-read";
import { loadCollectionPool } from "../src/lib/recs/recommend";
import { SYNERGY_WEIGHT, scoreCommander, type PoolCard } from "../src/lib/recs/score";
import { ROLE_TARGETS } from "../src/lib/recs/roles";

/** Below this many compared commanders a run proves too little to trust. A
    question about the fixture, never about the code. */
const MIN_COMPARED = 20;

const owner =
  process.env.USER_ID ??
  (
    await db
      .select({ userId: collectionItems.userId })
      .from(collectionItems)
      .groupBy(collectionItems.userId)
      // The user id is the tiebreak: two fixture accounts of equal size would
      // otherwise send successive runs at different collections.
      .orderBy(sql`count(*) desc`, collectionItems.userId)
      .limit(1)
  )[0]?.userId;
if (!owner) throw new Error("no collection in this database — pass USER_ID or seed one");
console.log(`user ${owner}\n`);

const { collection } = await loadCollectionPool(owner);
const candidates = await loadCandidates(
  owner,
  collection.map((c) => c.oracleId),
);
if (candidates.length === 0) throw new Error("no discovery candidates for this account");

/**
 * The row's numerator, in SQL: support cards this reader owns whose colour
 * identity is a subset of the commander's.
 *
 * Written here rather than reusing `loadCandidates.ownedSupport`, which omits
 * the identity restriction — the two disagreed on `Faceless One`, a colourless
 * commander whose stored list holds 83 off-identity cards of 322, reading 122
 * owned against 96 playable. And written in SQL rather than reusing
 * `supportOverlap`, because a second expression of the same allocation is the
 * entire point: sharing the implementation would compare a function with itself.
 *
 * Three clauses, each mirroring one the TypeScript side applies:
 *   • identity subset   — `commanderPool`'s filter
 *   • not the commander — `commanderPool` excludes its own card
 *   • commander-legal   — `loadCollectionPool` filters the collection before
 *                         `scoreCommander` ever sees it (`recommend.ts:188`)
 */
async function storedNumerators(
  userId: string,
  commanderIds: string[],
): Promise<Map<string, number>> {
  if (commanderIds.length === 0) return new Map();
  const cmd = alias(cards, "cmd");
  const sup = alias(cards, "sup");
  const owned = db
    .selectDistinct({ oracleId: collectionItems.oracleId })
    .from(collectionItems)
    .where(eq(collectionItems.userId, userId))
    .as("own");

  const rows = await db
    .select({
      commanderOracleId: commanderSupportCards.commanderOracleId,
      owned: sql<number>`count(distinct ${commanderSupportCards.oracleId})::int`,
    })
    .from(commanderSupportCards)
    .innerJoin(cmd, eq(cmd.oracleId, commanderSupportCards.commanderOracleId))
    .innerJoin(sup, eq(sup.oracleId, commanderSupportCards.oracleId))
    .innerJoin(owned, eq(owned.oracleId, commanderSupportCards.oracleId))
    .where(
      and(
        inArray(commanderSupportCards.commanderOracleId, commanderIds),
        sql`${sup.colorIdentity} <@ ${cmd.colorIdentity}`,
        sql`${sup.oracleId} <> ${cmd.oracleId}`,
        sql`${sup.commanderLegal}`,
      ),
    )
    .groupBy(commanderSupportCards.commanderOracleId);

  return new Map(rows.map((r) => [r.commanderOracleId, r.owned]));
}

// EVERY candidate with a stored total. A null total is the index having no
// usable reading, which both sides score as nothing — there is no allocation to
// compare there.
const population = candidates
  .filter((c) => c.edhrecTotal != null)
  .sort((a, b) => a.oracleId.localeCompare(b.oracleId));

const ids = population.map((c) => c.oracleId);

/**
 * Each commander's own `PoolCard`, which `scoreCommander` needs and a candidate
 * row does not carry.
 *
 * Read from `cards` rather than from the collection, because discovery
 * candidates are by definition commanders the reader does NOT own — an earlier
 * revision looked them up in the collection and compared nothing at all, which
 * is the mistake `scoreOneCommander` avoids with its own `loadPoolCard`
 * fallback. One bulk query rather than that per-id lookup: the whole point of
 * this rewrite is that nothing is paid per row.
 */
const poolCards = await db
  .select({
    oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine,
    oracleText: cards.oracleText, keywords: cards.keywords,
    colorIdentity: cards.colorIdentity, imageUri: cards.imageUri,
    artCropUri: cards.artCropUri, manaCost: cards.manaCost,
  })
  .from(cards)
  .where(inArray(cards.oracleId, ids));
const byOracleId = new Map<string, PoolCard>(poolCards.map((c) => [c.oracleId, c]));
const [supportLists, sqlOwned] = await Promise.all([
  loadSupportLists(ids),
  storedNumerators(owner, ids),
]);

console.log(`${candidates.length} candidates · comparing ${population.length} with a stored total`);
if (population.length < MIN_COMPARED) {
  throw new Error(
    `only ${population.length} candidates have a stored total, need ${MIN_COMPARED}. ` +
      "Run `pnpm db:build:index` against this branch, or point at one whose commander " +
      "index is built.",
  );
}

type Row = {
  name: string;
  sqlOwned: number;
  tsOwned: number | null;
  /** What the LANE QUERY projects — `loadCandidates.ownedSupport`, the figure
      the row itself computes Fit from. The third side of the comparison, and
      the one the reader actually sees. */
  laneOwned: number;
  storedTotal: number;
  tsTotal: number | null;
  sqlSynergy: number | null;
  tsSynergy: number | null;
};

/** Null where there is no ratio to offer, mirroring `scoreCommander`, which
    leaves `fitSynergy` null rather than zeroing it. */
const synergyOf = (owned: number, total: number): number | null =>
  total > 0 ? Math.round((owned / total) * SYNERGY_WEIGHT) : null;

const missingCard = population.filter((c) => !byOracleId.has(c.oracleId));
if (missingCard.length > 0) {
  throw new Error(
    `${missingCard.length} candidates have no row in \`cards\`, which cannot happen — ` +
      "`loadCandidates` joins that table.",
  );
}

const rows: Row[] = population.map((c) => {
  const commander = byOracleId.get(c.oracleId)!;
  const scored = scoreCommander({
    commander,
    collection,
    // Not what this probe measures: the synergy figure is its whole subject, and the role
    // component does not enter it.
    roleTargets: ROLE_TARGETS,
    support: supportLists.get(c.oracleId) ?? null,
    // Not read by the allocation. The synergy figure is the whole subject here.
    inclusionByName: null,
  });
  const owned = sqlOwned.get(c.oracleId) ?? 0;
  return {
    name: c.name,
    sqlOwned: owned,
    laneOwned: c.ownedSupport,
    tsOwned: scored.edhrecOwnedCount,
    storedTotal: c.edhrecTotal!,
    tsTotal: scored.edhrecTotal,
    sqlSynergy: synergyOf(owned, c.edhrecTotal!),
    tsSynergy: scored.fitSynergy,
  };
});

// EVERY ROW MUST SCORE. The population carries a stored total and that column is
// exactly what `scoreCommander` reports back, so a null here means
// `loadSupportLists` returned nothing for a commander the index holds — the
// failure this script exists to catch. Never a reason to compare fewer.
const unscored = rows.filter((r) => r.tsTotal == null);
if (unscored.length > 0) {
  for (const r of unscored.slice(0, 8)) console.log(`   ${r.name}: no scored total`);
  throw new Error(
    `${unscored.length} of ${rows.length} candidates have a stored total but scored ` +
      "none. `loadSupportLists` is returning nothing for commanders the index holds.",
  );
}

const withOverlap = rows.filter((r) => r.sqlOwned > 0).length;
console.log(`compared ${rows.length} — ${withOverlap} with a non-zero stored overlap\n`);
if (withOverlap === 0) {
  throw new Error(
    `all ${rows.length} compared candidates have an overlap of 0 — the comparison is ` +
      "vacuous. Use an account with a larger collection.",
  );
}

// THE DENOMINATOR IS NOT A COMPARISON and is not reported as one: both sides read
// `commander_support.edhrec_total`. An "AGREE" would be one column read twice and
// would hold with `supportOverlap` or the identity filter broken. It is an
// invariant — if these differ, one of the two reads has changed source.
const denominatorDiffs = rows.filter((r) => r.storedTotal !== r.tsTotal);
if (denominatorDiffs.length > 0) {
  for (const r of denominatorDiffs.slice(0, 5)) {
    console.log(`   ${r.name}: stored ${r.storedTotal} vs scored ${r.tsTotal}`);
  }
  throw new Error(
    `${denominatorDiffs.length} of ${rows.length} denominators differ, which should be ` +
      "impossible: both sides read commander_support.edhrec_total.",
  );
}
console.log(`denominator  one column, read twice — ${rows.length} identical, as required\n`);

const numeratorDiffs = rows.filter((r) => r.sqlOwned !== r.tsOwned);
const synergyDiffs = rows.filter((r) => r.sqlSynergy !== r.tsSynergy);
// THE THIRD SIDE, and the one this script used to step around. Its own SQL was
// written because `loadCandidates.ownedSupport` omitted the identity
// restriction, so for as long as that was true the probe could prove the two
// SCORING paths agreed while the figure on the ROW came from a third
// computation that agreed with neither. The row is the surface the ruling is
// about, so it is compared rather than worked around.
//
// WHAT THIS ACTUALLY EXERCISES IS THE IDENTITY SUBSET, and saying more than
// that would be this script overclaiming about itself. `commanderPool` applies
// three restrictions and only one of them is reachable here:
//
//   • identity subset   — exercised. Reverting `IDENTITY_RESTRICTION` fails
//                         this check on 2 rows while both assertions above
//                         still read AGREE.
//   • the commander's own card — UNREACHABLE on this lane. `loadCandidates`
//                         lists only commanders the reader does not own, so the
//                         commander's own id is never in the owned array the
//                         support aggregate unnests. Deleting that clause from
//                         `storedNumerators` leaves this check at 0 — measured,
//                         not assumed. It stays because this function mirrors
//                         `commanderPool`, and a mirror with a piece missing
//                         invites the next reader to add it to the lane too.
//   • commander-legal   — satisfied UPSTREAM rather than here. Both sides take
//                         their ids from `loadCollectionPool`, which filters on
//                         `commanderLegal` before either sees them.
//
// So a lane that grew to include owned commanders would need this check
// re-thought, not merely re-run.
const laneDiffs = rows.filter((r) => r.laneOwned !== r.sqlOwned);

const report = (label: string, bad: Row[], pick: (r: Row) => string) => {
  const verdict = bad.length === 0 ? "AGREE" : `DIFFER on ${bad.length}/${rows.length}`;
  console.log(`${label.padEnd(12)} ${verdict}`);
  for (const r of bad.slice(0, 12)) console.log(`   ${r.name}: ${pick(r)}`);
  if (bad.length > 12) console.log(`   ... and ${bad.length - 12} more`);
};

report("numerator", numeratorDiffs, (r) => `sql ${r.sqlOwned} vs ts ${r.tsOwned}`);
report("lane numerator", laneDiffs, (r) => `lane ${r.laneOwned} vs sql ${r.sqlOwned}`);
report("fitSynergy", synergyDiffs, (r) => `sql ${r.sqlSynergy} vs ts ${r.tsSynergy}`);

console.log();
// BOTH. `fitSynergy` is the numerator rounded onto a 0-60 scale, so a one-card
// drift can leave it unchanged — gating on the figure alone would print a
// numerator disagreement and exit 0.
if (numeratorDiffs.length === 0 && synergyDiffs.length === 0 && laneDiffs.length === 0) {
  console.log(
    `PARITY HOLDS over ${rows.length} commanders — the row may print the stored figure.\n` +
      "Scope: the allocation expressions only. `scoreOneCommander`'s assembly is unit-tested.",
  );
  process.exit(0);
}
console.log(
  `PARITY FAILS — ${numeratorDiffs.length} numerator(s), ${laneDiffs.length} lane ` +
    `numerator(s) and ${synergyDiffs.length} Fit ` +
    "figure(s) disagree.\nThe SQL a row's payload is built from and the TypeScript the score " +
    "runs have come apart.\nCheck the identity restriction, the commander's own card and the " +
    "commander-legal\nfilter first: those are the three clauses the two can differ on.",
);
process.exit(1);
