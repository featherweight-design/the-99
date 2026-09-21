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

const url = process.env.THE_99_NEON_STAGING_DIRECT ?? process.env.DATABASE_URL;
if (!url) {
  console.error("Set THE_99_NEON_STAGING_DIRECT (preferred) or DATABASE_URL.");
  process.exit(1);
}
process.env.DATABASE_URL = url;
const onStaging = Boolean(process.env.THE_99_NEON_STAGING_DIRECT);

const { neon } = await import("@neondatabase/serverless");
const { loadProfileHead, loadDeckProfileFromHead } = await import("../src/lib/profile/load");

const sql = neon(url);

const decks = (await sql`
  select d.id, d.user_id, d.name, count(dc.oracle_id)::int as cards
  from decks d left join deck_cards dc on dc.deck_id = d.id
  group by d.id, d.user_id, d.name
  order by cards desc
  limit 8`) as { id: string; user_id: string; name: string; cards: number }[];

if (decks.length === 0) {
  console.error("No decks in this database — nothing to measure.");
  process.exit(1);
}

console.log(`Measuring ${decks.length} decks on ${onStaging ? "STAGING" : "the DATABASE_URL database"}.\n`);
console.log("deck                                 cards   head    build    total");
console.log("-".repeat(70));

const totals: number[] = [];
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
  const head_ms = t1 - t0;
  const build_ms = t2 - t1;
  totals.push(head_ms + build_ms);
  const combos = profile.brackets.twoCardCombos.length;
  console.log(
    `${d.name.slice(0, 34).padEnd(34)} ${String(d.cards).padStart(5)}  ` +
      `${head_ms.toFixed(0).padStart(5)}ms ${build_ms.toFixed(0).padStart(6)}ms ` +
      `${(head_ms + build_ms).toFixed(0).padStart(6)}ms   (${combos} combo${combos === 1 ? "" : "s"})`,
  );
}

if (totals.length) {
  const sorted = [...totals].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  console.log("-".repeat(70));
  console.log(
    `median ${median.toFixed(0)}ms · slowest ${Math.max(...totals).toFixed(0)}ms · ` +
      `fastest ${Math.min(...totals).toFixed(0)}ms`,
  );
  console.log(
    "\nThis is the COLD cost of one Analysis tab open. Every figure is a cache MISS; a warm\n" +
      "visit pays `cacheForUser`'s lookup instead, which this script cannot measure.",
  );
}
