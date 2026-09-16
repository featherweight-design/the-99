// Does a commander row's Fit equal the Fit its own detail page prints?
//
// BOTH SIDES NOW READ THE STORED INDEX — Ruling D shipped. Before it, Commander
// Details derived the overlap by matching the live EDHREC payload's card NAMES
// against the pool while a row would read the stored counts, and this probe
// measured 57 numerators, 56 denominators and 20 Fit figures disagreeing across
// 95 commanders. `edhrecOverlap`, the name matcher, is gone.
//
// So the question it answers now is narrower and still worth asking: do TWO
// INDEPENDENT EXPRESSIONS of the same allocation agree — the SQL a row's payload
// will be built from, written below, against the TypeScript `scoreCommander`
// runs? `page.tsx` scores every commander through `scoreOneCommander`, so every
// row links to a page that recomputes the figure by the other expression.
//
// This script is the acceptance test for Ruling D. It went green when
// `scoreCommander` moved to the stored index, and it is what will catch the
// figure drifting back apart.
//
// WHAT IT COMPARES NOW. Both sides read the stored index, so the question is no
// longer stored-versus-live — it is whether TWO INDEPENDENT EXPRESSIONS of the
// same allocation agree: the SQL the row's payload will be built from, written
// here, against the TypeScript `scoreCommander` runs. Two expressions of one
// figure drifting apart is how the deck page and its receipt came to disagree
// once already, which is why `loadDeckBuyRows` is asserted beside
// `loadAvailability` rather than assumed to match it.
//
// THE IDENTITY FILTER IS THE WHOLE REASON THE SQL IS WRITTEN HERE. An earlier
// version compared `loadCandidates.ownedSupport`, which counts support cards the
// reader owns WITHOUT restricting them to the commander's colour identity, and
// it disagreed with the score on `Faceless One` — a colourless commander whose
// stored support list holds 83 off-identity cards out of 322, so 122 owned
// against 96 playable. The score's figure is the right one for Fit, which
// measures what could actually be played; `ownedSupport` is a different
// quantity and PR 3 must not build the row's Fit from it.
//
// IT COMPARES EVERY WARM CANDIDATE AND SAMPLES NOTHING. Three review rounds
// landed on an earlier version's sampling: it took only the highest stored
// overlaps, so it could not see a stored 0 against a live positive; its order
// was unspecified, so two runs compared different commanders; and it dropped a
// stored total of 0, which is a real reading the index writes rather than a
// missing one. Every one of those was a property of the SAMPLE, so the sample is
// gone rather than patched a fourth time.
//
// The population is instead "every candidate whose EDHREC cache row is already
// fresh". That is deterministic, complete over what it can reach, and — the
// reason it replaced a cap — MAKES NO WRITES AND NO UPSTREAM REQUESTS.
// `resolveEdhrecData` serves a cached row only inside a 30-day TTL and otherwise
// fetches EDHREC and upserts `edhrec_cache` (client.ts:54-74), so filtering to
// fresh rows first means `scoreOneCommander` always hits the cache. An earlier
// header claimed this script made no writes while it was doing exactly that.
//
// Coverage is therefore a function of cache warmth, and is REPORTED rather than
// assumed: a run that reaches too little of the catalog fails instead of
// printing a green over a handful of rows.
//
// WHAT IT DOES NOT COVER. `loadCandidates` is the discovery query, so it excludes
// commanders the reader owns or has built — this proves parity for DISCOVERY
// rows and says nothing about the `/commanders` or Home populations, which
// Ruling D also covers. Those score through `getRankedList` / `rankFree` rather
// than through this path, and proving them is PR 2's job, in the PR that makes
// the change. Stated here rather than left implied, because a green run would
// otherwise read as a wider acceptance than it is.
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
import { readEdhrecCache } from "../src/lib/edhrec/client";
import { loadCollectionPool, scoreOneCommander } from "../src/lib/recs/recommend";
import { SYNERGY_WEIGHT } from "../src/lib/recs/score";

/** The same 30-day window `resolveEdhrecData` uses to decide a cache row is
    still good. Restated rather than exported, because a probe that widened it
    would start fetching — the behaviour this script exists without. */
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Freshness is required with an hour to spare.
 *
 *  The filter below takes ONE `Date.now()` snapshot while `resolveEdhrecData`
 *  re-checks the clock on every call, so a row sitting just inside the TTL here
 *  could expire before its turn in a serial loop — and that means an upstream
 *  fetch and an `edhrec_cache` upsert, in a script whose contract is neither.
 *  An hour is far more than the loop can take. */
const TTL_SLACK_MS = 60 * 60 * 1000;

/** Below this many COMPARED commanders a run proves too little to trust. */
const MIN_COMPARED = 20;

/** A hand-run script may not grind the whole catalog.
 *
 *  `scoreOneCommander` is the real detail-page path, which is why it is used
 *  rather than a second scorer written here — two expressions of one figure
 *  drifting apart is the defect this probe exists to detect. The cost is that
 *  each call re-reads the collection, the committed decks and one cache row, so
 *  the population is capped by COUNT rather than by sampling: the order is
 *  deterministic, so the cap takes a stable prefix rather than an arbitrary
 *  subset. Raise it with `MAX_COMPARED` when a fuller answer is worth the
 *  queries. A batch scorer would remove the cap and is a follow-up, not a
 *  round-6 addition. */
const MAX_COMPARED = Number(process.env.MAX_COMPARED ?? 150);

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

// A stored total of null means the index has no usable synergy reading. A total
// of 0 is UNREACHABLE rather than a real reading, and by constraint rather than
// by luck: the index writes `edhrec_total` only when `synergyStateFrom` returns
// "ok", which needs a non-empty `topCards`, and `commander_support` carries
// `(synergy_state = 'ok') = (edhrec_total is not null)`. The count below is kept
// as a tripwire on that pairing, not as a population the run expects.
const withStoredTotal = candidates.filter((c) => c.edhrecTotal != null);
const cache = await readEdhrecCache(withStoredTotal.map((c) => c.oracleId));
const now = Date.now();
const warm = withStoredTotal
  .filter((c) => {
    const row = cache.get(c.oracleId);
    return row != null && now - row.fetchedAt.getTime() < TTL_MS - TTL_SLACK_MS;
  })
  .sort((a, b) => a.oracleId.localeCompare(b.oracleId));
const population = warm.slice(0, MAX_COMPARED);

console.log(
  `${candidates.length} candidates · ${withStoredTotal.length} with a stored total · ` +
    `${warm.length} with a fresh EDHREC cache row · comparing ${population.length}` +
    (warm.length > population.length ? ` (capped at MAX_COMPARED=${MAX_COMPARED})` : ""),
);

/**
 * The row's numerator, in SQL: support cards this reader owns whose colour
 * identity is a subset of the commander's.
 *
 * Written here rather than reusing `loadCandidates.ownedSupport` because that
 * figure omits the identity restriction — see the header. Written in SQL rather
 * than reusing `supportOverlap` because a second expression of the same
 * allocation is the entire point: sharing the implementation would make this
 * compare a function with itself.
 */
async function storedNumerators(
  userId: string,
  commanderIds: string[],
): Promise<Map<string, number>> {
  if (commanderIds.length === 0) return new Map();
  // Two aliases of `cards`: one for the commander, one for the support card.
  // Both are needed because the identity test compares the two rows.
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
        // The identity restriction the score applies and `ownedSupport` does not.
        sql`${sup.colorIdentity} <@ ${cmd.colorIdentity}`,
        // `commanderPool` excludes the commander's own card from its pool.
        sql`${sup.oracleId} <> ${cmd.oracleId}`,
        // And `loadCollectionPool` filters the collection to commander-legal
        // cards before `scoreCommander` ever sees it (`recommend.ts:188`).
        // Without this the two sides count different populations, so a banned
        // support card the reader owns would read as a mismatch that is really
        // the probe asking a different question.
        sql`${sup.commanderLegal}`,
      ),
    )
    .groupBy(commanderSupportCards.commanderOracleId);

  return new Map(rows.map((r) => [r.commanderOracleId, r.owned]));
}

type Row = {
  name: string;
  storedOwned: number;
  liveOwned: number | null;
  storedTotal: number;
  liveTotal: number | null;
  storedSynergy: number | null;
  liveSynergy: number | null;
};

/** Null where the stored side has no ratio to offer, mirroring `scoreCommander`,
    which leaves `fitSynergy` null rather than zeroing it. A stored null against
    a live number is a disagreement and is counted as one. */
const synergyOf = (owned: number, total: number): number | null =>
  total > 0 ? Math.round((owned / total) * SYNERGY_WEIGHT) : null;

const sqlOwned = await storedNumerators(
  owner,
  population.map((c) => c.oracleId),
);

const rows: Row[] = [];
for (const c of population) {
  const detail = await scoreOneCommander(owner, c.oracleId, c.name);
  // 0 rather than undefined: a commander with no owned support card produces no
  // GROUP BY row, and that is a real overlap of zero.
  const storedOwned = sqlOwned.get(c.oracleId) ?? 0;
  rows.push({
    name: c.name,
    storedOwned,
    liveOwned: detail?.edhrecOwnedCount ?? null,
    storedTotal: c.edhrecTotal!,
    liveTotal: detail?.edhrecTotal ?? null,
    storedSynergy: synergyOf(storedOwned, c.edhrecTotal!),
    liveSynergy: detail?.fitSynergy ?? null,
  });
}

const scored = rows.filter((r) => r.liveTotal != null);
const zeroTotals = rows.filter((r) => r.storedTotal === 0).length;
// Counted from `scored`, not `rows`: a warm row whose cache holds no parsed
// top-card list is never compared, and one such row with a stored overlap
// could otherwise satisfy this guard while every COMPARED row had zero. Same
// mistake as the floor above, in the same expression's sibling.
const withOverlap = scored.filter((r) => r.storedOwned > 0).length;
console.log(
  `compared ${rows.length} — ${scored.length} scored live, ${withOverlap} with a ` +
    `non-zero stored overlap, ${zeroTotals} with a stored total of 0\n`,
);
// The floor belongs on what was actually COMPARED, not on what looked warm.
//
// `scored` keys on a non-null `liveTotal`, and since Ruling D that comes from
// `commander_support.edhrec_total` — so a row dropped here is one the INDEX has
// no usable total for, not one whose EDHREC cache is cold. Warming the cache
// cannot add any of them; building the index can. The remedy said the opposite
// until the source moved under it.
if (scored.length < MIN_COMPARED) {
  throw new Error(
    `only ${scored.length} of ${population.length} compared candidates have a stored ` +
      `synergy total, need ${MIN_COMPARED}. Run \`pnpm db:build:index\` against this ` +
      "branch, or point at one whose commander index is built.",
  );
}
if (withOverlap === 0) {
  throw new Error(
    `all ${scored.length} compared candidates have a stored overlap of 0 — the ` +
      "comparison is vacuous. Use an account with a larger collection.",
  );
}

const numeratorDiffs = scored.filter((r) => r.storedOwned !== r.liveOwned);
const synergyDiffs = scored.filter((r) => r.storedSynergy !== r.liveSynergy);

// THE DENOMINATOR IS NO LONGER A COMPARISON and is not reported as one. Both
// sides now read `commander_support.edhrec_total` — `loadCandidates` selects it
// and `loadSupportLists` selects it — so an "AGREE" here would be one column
// read twice, and it would keep saying AGREE with `supportOverlap` or the
// identity filter broken. It is asserted as an INVARIANT instead: if the two
// ever differ, one of the two reads has stopped reading that column, which is a
// different and worse failure than drift.
const denominatorDiffs = scored.filter((r) => r.storedTotal !== r.liveTotal);
if (denominatorDiffs.length > 0) {
  for (const r of denominatorDiffs.slice(0, 5)) {
    console.log(`   ${r.name}: stored ${r.storedTotal} vs live ${r.liveTotal}`);
  }
  throw new Error(
    `${denominatorDiffs.length} of ${scored.length} denominators differ, which should be ` +
      "impossible: both sides read commander_support.edhrec_total. One of the two reads " +
      "has changed source.",
  );
}

const report = (label: string, bad: Row[], pick: (r: Row) => string) => {
  const verdict = bad.length === 0 ? "AGREE" : `DIFFER on ${bad.length}/${scored.length}`;
  console.log(`${label.padEnd(12)} ${verdict}`);
  for (const r of bad.slice(0, 12)) console.log(`   ${r.name}: ${pick(r)}`);
  if (bad.length > 12) console.log(`   ... and ${bad.length - 12} more`);
};

console.log(`denominator  one column, read twice — ${scored.length} identical, as required\n`);
report("numerator", numeratorDiffs, (r) => `stored ${r.storedOwned} vs live ${r.liveOwned}`);
report("fitSynergy", synergyDiffs, (r) => `stored ${r.storedSynergy} vs live ${r.liveSynergy}`);

console.log();
if (synergyDiffs.length === 0) {
  console.log(
    `PARITY HOLDS over ${scored.length} DISCOVERY commanders — a row may print the ` +
      "stored figure. The owned lane and Home are not covered here; see the header.",
  );
  process.exit(0);
}
console.log(
  "PARITY FAILS. The SQL a row's payload is built from and the TypeScript the\n" +
    "score runs disagree, so the row and the detail page it links to would print\n" +
    "different figures for the same commander — the defect the commander row\n" +
    "exists to remove. Check the identity restriction and the commander's own\n" +
    "card first: those are the two clauses the two expressions can differ on.",
);
process.exit(1);
