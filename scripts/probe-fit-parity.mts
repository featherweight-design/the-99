// Does a commander row's Fit equal the Fit its own detail page prints?
//
// The row would compute `fitSynergy` from STORED counts — `edhrec_total` and an
// `oracle_id` join over `commander_support_cards` (candidates.ts:310). Commander
// Details computes it from the LIVE EDHREC payload, by NAME, with a front-face
// fallback for DFCs (`edhrecOverlap`, score.ts:151, reaching `fitSynergy` at
// score.ts:288, via scoreOneCommander). Two computations over two data paths, and
// `page.tsx` calls `scoreOneCommander` for every commander, owned or not — so
// every row links to a page that recomputes the same number a different way.
//
// The whole "three surfaces, one number" ruling rests on them agreeing, and
// nothing proved they do. This script is that proof, and it must pass before any
// surface prints a Fit derived from the stored counts.
//
// IT WRITES, AND IT REACHES UPSTREAM. No fixture — it reads whatever collection
// the account already has and creates no deck — but the live half of the
// comparison goes through `resolveEdhrecData`, which serves a cached row only
// inside a 30-day TTL and otherwise FETCHES EDHREC and upserts `edhrec_cache`
// (client.ts:54-74). Discovery candidates are by definition commanders the
// reader does not own, so their cache rows are the least likely to be warm: a
// cold run costs up to `SAMPLE` live EDHREC requests and that many cache
// upserts. Keep the sample modest, do not loop it, and point it at local-dev or
// a scratch branch — never production.
//
// Run: `pnpm probe:fit-parity`  ·  `SAMPLE=n` to widen it
//
// First, and on its own line: src/db reads DATABASE_URL at module scope.
import { requireEnv } from "./lib/env.mjs";
requireEnv(["DATABASE_URL"]);
import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { collectionItems } from "../src/db/schema";
import { loadCandidates } from "../src/lib/discovery/candidates";
import { loadCollectionPool, scoreOneCommander } from "../src/lib/recs/recommend";
import { SYNERGY_WEIGHT } from "../src/lib/recs/score";

/** How many commanders to compare. Each one may cost a live EDHREC request and
    a cache upsert — see the header. 40 was enough to settle the question
    decisively (15 of 60 disagreed at the widest run). */
const SAMPLE = Number(process.env.SAMPLE ?? 40);

// `USER_ID` overrides; otherwise the largest collection, with the user id as a
// tiebreak. Without that tiebreak two fixture accounts of equal size make
// successive acceptance runs compare different collections, which is the same
// non-determinism the sample ordering had.
const owner = await db
  .select({ userId: collectionItems.userId, items: sql<number>`count(*)::int` })
  .from(collectionItems)
  .groupBy(collectionItems.userId)
  .orderBy(sql`count(*) desc`, collectionItems.userId)
  .limit(1);
if (owner.length === 0) throw new Error("no collection in this database");
const userId = owner[0].userId;
console.log(`user ${userId} · ${owner[0].items} collection rows · sample ${SAMPLE}\n`);

const { collection } = await loadCollectionPool(userId);
const ownedOracleIds = collection.map((c) => c.oracleId);

// The stored side, read exactly as the row would read it.
const candidates = await loadCandidates(userId, ownedOracleIds);
if (candidates.length === 0) throw new Error("no discovery candidates for this account");

// THE SAMPLE SPANS THE POPULATION, and both properties below were defects.
//
// An earlier version took the SAMPLE highest stored overlaps, on the reasoning
// that a stored 0 agrees with a live 0 for free. That is a real blind spot: the
// index can say 0 while the live name match has gone positive since the monthly
// snapshot, which is a parity failure the probe would never compare. Zero-
// overlap rows are now sampled deliberately.
//
// And it was not deterministic. `loadCandidates` imposes no ordering and the
// comparator returns 0 for every tie, so the slice depended on unspecified
// database order — two runs of an acceptance test compared different
// commanders. Sorting by `oracleId` fixes the order; striding over it is what
// keeps the sample spread across the whole range rather than clustered at one
// end of it.
// A stored `edhrec_total` of 0 is a REAL state, not a missing one — the index
// writes `topCards.length`, which is 0 when EDHREC listed nothing at snapshot
// time. If EDHREC has cards now, the live side returns a number while the stored
// side has no ratio to offer, and that is a parity failure too. An earlier
// version filtered those rows out and could never see it.
const eligible = [...candidates]
  .filter((c) => c.edhrecTotal != null)
  .sort((a, b) => a.oracleId.localeCompare(b.oracleId));
if (eligible.length === 0) {
  throw new Error(
    "no candidate has a stored edhrec_total — nothing to compare. " +
      "Is the commander index built on this branch?",
  );
}
const stride = Math.max(1, Math.floor(eligible.length / Math.max(1, SAMPLE)));
const ranked = eligible.filter((_, i) => i % stride === 0).slice(0, SAMPLE);

// Distinguished from the zero-overlap case below, which an earlier version
// conflated: `SAMPLE=0` reported that every sampled candidate had no overlap.
if (ranked.length === 0) {
  throw new Error(`SAMPLE=${SAMPLE} selected no candidates from ${eligible.length} eligible`);
}
const withOverlap = ranked.filter((c) => c.ownedSupport > 0).length;
const zeroTotals = ranked.filter((c) => c.edhrecTotal === 0).length;
console.log(
  `comparing ${ranked.length} of ${eligible.length} eligible candidates ` +
    `(stride ${stride}) — ${withOverlap} with a non-zero stored overlap, ` +
    `${ranked.length - withOverlap} with zero, ${zeroTotals} with a stored total of 0`,
);
if (withOverlap === 0) {
  throw new Error(
    `all ${ranked.length} sampled candidates have a stored overlap of 0 — ` +
      "the comparison is vacuous. Raise SAMPLE or use an account with a larger collection.",
  );
}

type Row = {
  name: string;
  storedOwned: number;
  liveOwned: number | null;
  storedTotal: number;
  liveTotal: number | null;
  zeroTotal: boolean;
  storedSynergy: number | null;
  liveSynergy: number | null;
};

/** Null where the stored side has no ratio to offer, mirroring `scoreCommander`,
    which leaves `fitSynergy` null rather than zeroing it. A stored null against
    a live number is a disagreement, and is counted as one below. */
const synergyOf = (owned: number, total: number): number | null =>
  total > 0 ? Math.round((owned / total) * SYNERGY_WEIGHT) : null;

const rows: Row[] = [];
for (const c of ranked) {
  const detail = await scoreOneCommander(userId, c.oracleId, c.name);
  const liveOwned = detail?.edhrecOwnedCount ?? null;
  const liveTotal = detail?.edhrecTotal ?? null;
  rows.push({
    name: c.name,
    storedOwned: c.ownedSupport,
    liveOwned,
    storedTotal: c.edhrecTotal!,
    liveTotal,
    storedSynergy: synergyOf(c.ownedSupport, c.edhrecTotal!),
    zeroTotal: c.edhrecTotal === 0,
    liveSynergy: detail?.fitSynergy ?? null,
  });
}

const unscored = rows.filter((r) => r.liveTotal == null);
const scored = rows.filter((r) => r.liveTotal != null);
console.log(`  ${scored.length} scored live, ${unscored.length} with no live synergy read\n`);
if (scored.length === 0) {
  // Not a cold cache — a cold row is fetched, not skipped. A null live total
  // means EDHREC had no page for these commanders or the fetch failed, and
  // either way nothing was compared.
  throw new Error("no candidate scored live — EDHREC returned nothing, so nothing was compared");
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
  console.log("PARITY HOLDS on this sample — a row may print the stored figure.");
  process.exit(0);
}
console.log(
  "PARITY FAILS. The row must NOT print a Fit derived from the stored counts.\n" +
    "The resolution named in the spec is to make Commander Details read the same\n" +
    "stored counts, not to teach the row the name match — a per-row EDHREC read is\n" +
    "what rankFree already refuses to do (free-ranking.ts:105-112).",
);
process.exit(1);
