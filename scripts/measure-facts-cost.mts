/**
 * What does a row of push-line facts cost, for a whole candidate pool?
 *
 * READ-ONLY, and pointed at STAGING by default, for the reason `measure:profile-cost` is:
 * local-dev's decks are fixtures, and every figure here is a function of how many cards a
 * real deck holds and how many combos the index matches against them.
 *
 * WHY THIS EXISTS. Round 4 bills itself as "one union member in a pure function, plus copy",
 * and both audits found that nothing in production builds a `DeckProfile` or a
 * `CandidateFacts` yet. The top-off pool is 262 candidates for the average commander, 423 at
 * the widest and 480 for a pair — so "a fact per candidate" is either one batched query or
 * it is five hundred, and the difference decides whether the push line is a PR or a page of
 * them. The plan refuses to open that PR until this is a measured number.
 *
 * WHAT IT MEASURES:
 *   · the profile, once — the cost the row's facts are computed against
 *   · `completesCombos` for the WHOLE pool in ONE statement — the shape that has to work
 *   · the same thing candidate-by-candidate, for the first few, to price the naive shape
 *
 * The three flags that are not `completesCombos` are column reads on `cards` and a flags
 * table the profile already loads, so they are not the question and are not timed apart.
 */
import "dotenv/config";
// No signed-in reader here: every switch read takes the environment itself (`process.env`).

const staging = process.env.THE_99_NEON_STAGING_DIRECT;
const url = staging ?? (process.env.MEASURE_ALLOW_LOCAL === "1" ? process.env.DATABASE_URL : undefined);
if (!url) {
  console.error(
    "Set THE_99_NEON_STAGING_DIRECT. To measure another database deliberately, set\n" +
      "MEASURE_ALLOW_LOCAL=1 as well — the figures are then NOT a staging bar.",
  );
  process.exit(1);
}
process.env.DATABASE_URL = url;

const { neon } = await import("@neondatabase/serverless");
const { loadProfileHead, loadDeckProfileFromHead } = await import("../src/lib/profile/load");

const sql = neon(url);

/** The biggest deck by default — the slowest profile, which is the floor worth knowing. */
const NAMED = process.env.MEASURE_DECK ?? null;
const [deck] = (await sql`
  select d.id, d.user_id, d.name, coalesce(sum(dc.quantity), 0)::int as cards
  from decks d left join deck_cards dc on dc.deck_id = d.id
  where ${NAMED}::text is null or d.name = ${NAMED}
  group by d.id, d.user_id, d.name
  order by cards desc
  limit 1`) as { id: string; user_id: string; name: string; cards: number }[];
if (!deck) {
  console.error("No decks to measure.");
  process.exit(1);
}

console.log(`Measuring against ${deck.name} (${deck.cards} cards) on ` +
  `${staging ? "STAGING" : "a NON-STAGING database — not a bar"}.\n`);

const t0 = performance.now();
const head = await loadProfileHead(deck.id, deck.user_id);
if (!head) { console.error("No profile head."); process.exit(1); }
const profile = await loadDeckProfileFromHead(head, process.env);
const profileMs = performance.now() - t0;
console.log(`profile (cold)                       ${profileMs.toFixed(0)}ms`);

const deckIds = profile.cards.map((c) => c.oracleId);

/**
 * A stand-in pool at the size the real one reaches. The COST is a function of how many ids
 * the statement carries and how many variants they touch, not of which cards they are, so a
 * pool drawn from the catalog prices the shape a ranked pool would.
 */
const POOL = Number(process.env.MEASURE_POOL ?? 480);

// SEEDED WITH REAL COMPLETIONS FIRST. A pool of arbitrary catalog cards matches nothing, and
// a query that matches nothing is cheaper than one that does — so the figure would price the
// empty case and read as though it priced the real one. The first version did exactly that
// and reported 0 completions beside its timing.
const completers = ((await sql`
  with two_card as (
    select v.variant_id, vc.oracle_id
    from spellbook_variants v
    join spellbook_variant_cards vc on vc.variant_id = v.variant_id
    where v.card_count = 2 and cardinality(v.requires_template_ids) = 0
  ),
  held as (
    select variant_id, count(*)::int as n
    from two_card where oracle_id = any(${deckIds}::uuid[])
    group by variant_id
  )
  select distinct t.oracle_id from two_card t
  join held h on h.variant_id = t.variant_id and h.n = 1
  where t.oracle_id <> all(${deckIds}::uuid[])
  limit ${POOL}`) as { oracle_id: string }[]).map((r) => r.oracle_id);

const filler = ((await sql`
  select oracle_id from cards
  where oracle_id <> all(${deckIds}::uuid[])
  limit ${Math.max(0, POOL - completers.length)}`) as { oracle_id: string }[]).map((r) => r.oracle_id);

const pool = [...new Set([...completers, ...filler])].slice(0, POOL);
console.log(`candidate pool                       ${pool.length} ` +
  `(${completers.length} of them complete something this deck half-holds)`);
if (completers.length === 0) {
  console.log("  NOTE: this deck half-holds no two-card combo, so the timing below is the");
  console.log("  empty case. Point MEASURE_DECK at a deck that does before quoting it.");
}

// ONE STATEMENT FOR THE WHOLE POOL. Every two-card variant with exactly one piece already in
// the deck and the other among the candidates — which is what "this card completes it" means,
// expressed as a set rather than as a diff of two runs per candidate.
const t1 = performance.now();
const rows = (await sql`
  with two_card as (
    select v.variant_id, vc.oracle_id
    from spellbook_variants v
    join spellbook_variant_cards vc on vc.variant_id = v.variant_id
    where v.card_count = 2 and cardinality(v.requires_template_ids) = 0
  ),
  held as (
    select variant_id, count(*)::int as n
    from two_card where oracle_id = any(${deckIds}::uuid[])
    group by variant_id
  )
  select t.oracle_id as candidate, t.variant_id
  from two_card t
  join held h on h.variant_id = t.variant_id and h.n = 1
  where t.oracle_id = any(${pool}::uuid[])`) as { candidate: string; variant_id: string }[];
const batchedMs = performance.now() - t1;
console.log(`completesCombos, whole pool, 1 query ${batchedMs.toFixed(0)}ms  ` +
  `(${rows.length} completion(s) across ${new Set(rows.map((r) => r.candidate)).size} candidate(s))`);

// The naive shape, priced on a sample rather than run 480 times.
const SAMPLE = 5;
const t2 = performance.now();
for (const id of pool.slice(0, SAMPLE)) {
  await sql`
    select v.variant_id from spellbook_variants v
    join spellbook_variant_cards vc on vc.variant_id = v.variant_id
    where v.card_count = 2 and cardinality(v.requires_template_ids) = 0
      and vc.oracle_id = any(${[...deckIds, id]}::uuid[])
    group by v.variant_id having count(*) = 2`;
}
const perCandidate = (performance.now() - t2) / SAMPLE;
console.log(`the same, per candidate              ${perCandidate.toFixed(0)}ms each ` +
  `→ ${((perCandidate * pool.length) / 1000).toFixed(1)}s for ${pool.length}`);

console.log(
  `\nOne statement is ${(perCandidate * pool.length / batchedMs).toFixed(0)}x cheaper than a ` +
    `query per candidate.\nThe profile is paid once either way and is the floor.`,
);
