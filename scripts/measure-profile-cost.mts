/**
 * What does the Analysis tab cost, on real decks?
 *
 * READ-ONLY, and pointed at STAGING by default — `THE_99_NEON_STAGING_DIRECT`. That is the
 * standing rule for a bar on new work: local-dev's decks are fixtures that nobody plays, and
 * a profile's cost is a function of how big the decklist is, how many combos it assembles and
 * how much of the collection it touches. A fixture answers a question nobody asked.
 *
 * WHY THIS EXISTS. `cachedDeckProfile` has never run in a request — its own doc comment says
 * so, and names the first Tier B consumer as the proof. The Analysis tab is that consumer, and
 * the plan refuses to open PR 1 until the cost is a measured number rather than an assumption.
 * A second expensive read on the deck page is the regression the decklist's own cache exists
 * to prevent.
 *
 * WHAT IT MEASURES, and what it deliberately does NOT. The two halves are timed apart:
 *   · the HEAD — one cheap read, and the only thing that runs outside the cache on every visit
 *   · the BUILD — the flags, combos, staples, composition, population and the assembly, which
 *     is everything the cache is there to avoid repeating
 * It does not measure a warm `cachedDeckProfile` hit. That path is `cacheForUser`, which needs
 * a request context, so calling it from a script would either throw or silently measure a cold
 * build twice and report it as a cache. The honest figure here is the COLD cost; the warm cost
 * is a cache lookup whose price is the cache layer's, not this gather's.
 */
import "dotenv/config";

// STAGING OR NOTHING, unless the caller says otherwise IN WORDS.
//
// A `?? DATABASE_URL` fallback is not "staging by default" — in a developer checkout that
// variable is local-dev, whose decks are fixtures nobody plays, so the documented command
// would quietly produce the exact non-representative figure this script exists to replace,
// under a heading claiming it came from staging. The fallback now requires
// `MEASURE_ALLOW_LOCAL=1`, and the run says which database it read either way.
const staging = process.env.THE_99_NEON_STAGING_DIRECT;
const url = staging ?? (process.env.MEASURE_ALLOW_LOCAL === "1" ? process.env.DATABASE_URL : undefined);
if (!url) {
  console.error(
    "Set THE_99_NEON_STAGING_DIRECT. To measure some other database deliberately, set\n" +
      "MEASURE_ALLOW_LOCAL=1 as well — the figures are then NOT a staging bar.",
  );
  process.exit(1);
}
process.env.DATABASE_URL = url;
const onStaging = Boolean(staging);

const { neon } = await import("@neondatabase/serverless");
const { loadProfileHead, loadDeckProfileFromHead } = await import("../src/lib/profile/load");
const { computeReadingBenchmarks, newestLabel } = await import("../src/lib/benchmarks/reading");

const sql = neon(url);

// EVERY deck, and SUM(quantity) rather than a row count.
//
// Two corrections, both from review. `deck_cards` groups repeated copies into `quantity`, so
// counting rows calls a 99-card deck 68 cards whenever it holds basics — which is the normal
// representation, not an edge. And taking the top eight by size then reporting "the median"
// reports the median OF THE EIGHT BIGGEST: profile cost depends on combos, staples and the
// collection as well as list length, so a smaller deck can be the slowest one in the database
// and a sample ordered by size is the one sample guaranteed not to contain it.
const decks = (await sql`
  select d.id, d.user_id, d.name, coalesce(sum(dc.quantity), 0)::int as cards
  from decks d left join deck_cards dc on dc.deck_id = d.id
  group by d.id, d.user_id, d.name
  order by cards desc`) as { id: string; user_id: string; name: string; cards: number }[];

if (decks.length === 0) {
  console.error("No decks in this database — nothing to measure.");
  process.exit(1);
}

console.log(
  `Measuring all ${decks.length} decks on ` +
    `${onStaging ? "STAGING" : "a NON-STAGING database (MEASURE_ALLOW_LOCAL) — not a bar"}.\n`,
);
console.log("deck                                 cards   head    build    total    bench   b-key");
console.log("-".repeat(87));

const totals: number[] = [];
// The evidence benchmarks' read (plan 2026-10-10-evidence-benchmarks, Cost). `bench` is its cold
// cost, a cache miss; `b-key` is what every open pays to build the cache key (the newest label among
// the list's cards), which is the warm cost apart from the cache lookup this script cannot reach.
const benches: number[] = [];
const keys: number[] = [];
for (const d of decks) {
  const t0 = performance.now();
  const head = await loadProfileHead(d.id, d.user_id);
  const t1 = performance.now();
  if (!head) {
    console.log(`${d.name.slice(0, 34).padEnd(34)} ${String(d.cards).padStart(5)}   — no head`);
    continue;
  }
  const profile = await loadDeckProfileFromHead(head);
  const t2 = performance.now();
  await computeReadingBenchmarks(profile);
  const t3 = performance.now();
  await newestLabel(profile);
  const bench_ms = t3 - t2;
  const key_ms = performance.now() - t3;
  benches.push(bench_ms);
  keys.push(key_ms);
  const head_ms = t1 - t0;
  const build_ms = t2 - t1;
  totals.push(head_ms + build_ms);
  const combos = profile.brackets.twoCardCombos.length;
  console.log(
    `${d.name.slice(0, 34).padEnd(34)} ${String(d.cards).padStart(5)}  ` +
      `${head_ms.toFixed(0).padStart(5)}ms ${build_ms.toFixed(0).padStart(6)}ms ` +
      `${(head_ms + build_ms).toFixed(0).padStart(6)}ms ${bench_ms.toFixed(0).padStart(6)}ms ${key_ms.toFixed(0).padStart(6)}ms   (${combos} combo${combos === 1 ? "" : "s"})`,
  );
}

if (totals.length) {
  const sorted = [...totals].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  console.log("-".repeat(70));
  console.log(
    `median ${median.toFixed(0)}ms · slowest ${Math.max(...totals).toFixed(0)}ms · ` +
      `fastest ${Math.min(...totals).toFixed(0)}ms · over all ${totals.length} decks`,
  );
  const b = [...benches].sort((x, y) => x - y);
  console.log(
    `benchmarks: median ${b[Math.floor(b.length / 2)].toFixed(0)}ms · p90 ${b[Math.floor(b.length * 0.9)].toFixed(0)}ms · ` +
      `slowest ${b[b.length - 1].toFixed(0)}ms cold (a cache miss)`,
  );
  const k = [...keys].sort((x, y) => x - y);
  console.log(`benchmarks' cache key: median ${k[Math.floor(k.length / 2)].toFixed(0)}ms · slowest ${k[k.length - 1].toFixed(0)}ms (paid on every open)`);
  console.log(
    "\nThis is the COLD cost of one Analysis tab open. Every figure is a cache MISS; a warm\n" +
      "visit pays `cacheForUser`'s lookup instead, which this script cannot measure.",
  );
}
