// Does a commander row's Fit equal the Fit its own detail page prints?
//
// The row would compute `fitSynergy` from STORED counts — `edhrec_total` and an
// `oracle_id` join over `commander_support_cards` (candidates.ts:310). Commander
// Details computes it from the LIVE EDHREC payload, by NAME, with a front-face
// fallback for DFCs (`edhrecOverlap`, score.ts:151, reaching `fitSynergy` at
// score.ts:288, via scoreOneCommander). Two computations over two data paths,
// and `page.tsx` calls `scoreOneCommander` for every commander, owned or not —
// so every row links to a page that recomputes the same number a different way.
//
// This script is the acceptance test for Ruling D, and it must go GREEN before
// any surface prints a Fit derived from the stored counts.
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
import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { collectionItems } from "../src/db/schema";
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

// A stored total of null means the index never scored it; 0 is a real reading.
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

const rows: Row[] = [];
for (const c of population) {
  const detail = await scoreOneCommander(owner, c.oracleId, c.name);
  rows.push({
    name: c.name,
    storedOwned: c.ownedSupport,
    liveOwned: detail?.edhrecOwnedCount ?? null,
    storedTotal: c.edhrecTotal!,
    liveTotal: detail?.edhrecTotal ?? null,
    storedSynergy: synergyOf(c.ownedSupport, c.edhrecTotal!),
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
// The floor belongs on what was actually COMPARED, not on what looked warm: a
// fresh cache row can hold no parsed top-card list, so 20 warm rows can yield
// fewer than 20 comparisons.
if (scored.length < MIN_COMPARED) {
  throw new Error(
    `only ${scored.length} of ${population.length} compared candidates scored live, ` +
      `need ${MIN_COMPARED}. Load /commanders and /discover once to warm the cache, ` +
      "then re-run.",
  );
}
if (withOverlap === 0) {
  throw new Error(
    `all ${scored.length} compared candidates have a stored overlap of 0 — the ` +
      "comparison is vacuous. Use an account with a larger collection.",
  );
}

const numeratorDiffs = scored.filter((r) => r.storedOwned !== r.liveOwned);
const denominatorDiffs = scored.filter((r) => r.storedTotal !== r.liveTotal);
const synergyDiffs = scored.filter((r) => r.storedSynergy !== r.liveSynergy);

const report = (label: string, bad: Row[], pick: (r: Row) => string) => {
  const verdict = bad.length === 0 ? "AGREE" : `DIFFER on ${bad.length}/${scored.length}`;
  console.log(`${label.padEnd(12)} ${verdict}`);
  for (const r of bad.slice(0, 12)) console.log(`   ${r.name}: ${pick(r)}`);
  if (bad.length > 12) console.log(`   ... and ${bad.length - 12} more`);
};

report("numerator", numeratorDiffs, (r) => `stored ${r.storedOwned} vs live ${r.liveOwned}`);
report("denominator", denominatorDiffs, (r) => `stored ${r.storedTotal} vs live ${r.liveTotal}`);
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
  "PARITY FAILS. The row must NOT print a Fit derived from the stored counts.\n" +
    "The resolution is Ruling D: Commander Details reads the same stored counts,\n" +
    "not the row learning the name match — a per-row EDHREC read is what rankFree\n" +
    "already refuses to do (free-ranking.ts:105-112).",
);
process.exit(1);
