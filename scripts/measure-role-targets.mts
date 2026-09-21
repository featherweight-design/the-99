// Measures whether the four FUNCTIONAL role targets — ramp, draw, removal, wipes — can be
// derived per commander, which is what §2.5 of the informed-building spec rests on.
//
// READ-ONLY. Writes nothing, takes no locks, creates no fixture. Point it at any branch you
// can read; every frequency claim in the spec was measured against `catalog-staging`, because
// local-dev's decks are fixtures and a figure drawn from them about how real decks are built
// is worthless.
//
// It exists because the PREDECESSOR spec said this could not be done. §4A.5 of
// `2026-09-19-deck-analysis-foundation-design.md` records "no source available here produces
// them, EDHREC publishing types rather than functions", and §4A.4 gives the measurement behind
// it: summed inclusion over `commander_support_cards` reaches only 56.9 of 99 cards. That
// figure is exactly right and it does not defeat the derivation, which is the one thing this
// script exists to show — so section 2 asks specifically what the missing 42 cards ARE.
//
// Five sections, and only the first three are questions. The rest are the evidence the spec's
// figures cite, printed so anyone disputing a number has something to argue with rather than
// an assertion. That is the `measure-gap-line.mts` precedent and this repo's own ruling: a
// threshold nobody can see the working for is an asserted constant with extra steps.
//
//   1 · THE DERIVATION. Expected count per role per commander, and its spread. If the figures
//       do not MOVE by commander there is nothing here a flat constant does not already say.
//   2 · WHAT THE COVERAGE GAP IS MADE OF. The 56.9-of-99 objection, asked properly: are the
//       missing cards roleless basics, or are they spells whose absence biases every figure?
//   3 · VALIDATION against real decks. Mean absolute error of the derived target versus the
//       flat constant, per role.
//   4 · THE SCORING ENGINE, and why these targets must NOT reach it. Measured rather than
//       argued, because §4A.6 dismissed the rescore risk on a premise this change removes.
//   5 · THE ORPHAN BUCKETS. Colourless, four- and five-colour commanders have no composition
//       fallback under the commander rung. Section 5 asks whether one global row could serve
//       them, and answers no.
//
// THE DERIVATION IS IMPORTED, NEVER REIMPLEMENTED. This calls `deriveRoleTargets` — the same
// function the index build writes from — rather than restating the probability sum, the
// front-face split or the classifier. `measure-gap-line.mts` was corrected for exactly that,
// twice, and `facet.ts`'s own header exists to stop a second copy of one rule.
//
// The cost is worth naming: the two were briefly separate implementations, and running them
// side by side on 2026-09-20 was a real cross-check — both read ramp 7.8, draw 8.2, removal
// 5.1, wipes 0.7 over local-dev's 3,279 commanders. That reading is recorded here because it
// cannot be re-run now. An ongoing drift risk is the worse trade: a duplicate that drifted
// would make THIS script's output stop describing what the app actually writes, which is the
// one thing it exists to show.

import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { ROLE_TARGETS } from "../src/lib/recs/roles";
import {
  classifyCards,
  deriveRoleTargets,
  type RoleTargetRow,
} from "../src/lib/edhrec/role-targets";
import type { Role } from "../src/lib/recs/roles";

neonConfig.webSocketConstructor = ws;
const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const client = new Pool({ connectionString: DATABASE_URL });

const ROLES = ["ramp", "draw", "removal", "wipes"] as const;
type RoleKey = (typeof ROLES)[number];

/** The front face carries a land type. Matches `isLandFace`, in SQL, for the coverage split. */
const LAND_FRONT = `split_part(c.type_line, ' // ', 1) ~* '\\mland\\M'`;

const f = (n: number, d = 1) => (Number.isFinite(n) ? n.toFixed(d) : "—");
const pad = (s: string | number, n: number) => String(s).padEnd(n);
const num = (s: string | number, n: number) => String(s).padStart(n);

async function q<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await client.query(sql, params)).rows as T[];
}

function mean(xs: number[]): number {
  return xs.length === 0 ? NaN : xs.reduce((a, b) => a + b, 0) / xs.length;
}
function sd(xs: number[]): number {
  if (xs.length < 2) return NaN;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}

/**
 * Expected count of each role per commander, through the SHIPPED derivation.
 *
 * Calls `deriveRoleTargets` — the same function the index build writes from — rather than
 * restating the probability sum, the front-face split or the classifier. Classification is
 * memoised inside it per distinct card, so this stays one pass over ~31,830 cards rather than
 * 892,185.
 */
async function deriveTargets(): Promise<Map<string, RoleTargetRow>> {
  const rows = await q<{
    commander_oracle_id: string; oracle_id: string; inclusion: number | null;
    type_line: string; oracle_text: string | null; keywords: string[] | null; layout: string;
  }>(`
    select csc.commander_oracle_id, csc.oracle_id, csc.inclusion,
           c.type_line, c.oracle_text, c.keywords, c.layout
    from commander_support_cards csc
    join cards c on c.oracle_id = csc.oracle_id
    -- THE SAME POPULATION THE WRITER USES, header join and all. This script's whole claim is
    -- that it reports what the index build would publish, and the writer filters to ok headers
    -- — the index loop leaves a degraded header's previous cards in place, so without this the
    -- script counts commanders the writer will never write and its cross-check is false. The
    -- same failure measure-gap-line.mts already carries a note about: a script that restates
    -- a rule instead of calling it drifts from it one release at a time. (No backticks in
    -- here: this comment is INSIDE a template literal and one would close it.)
    join commander_support cs on cs.commander_oracle_id = csc.commander_oracle_id
    where cs.synergy_state = 'ok'`);

  let distinct = 0;
  const targets = deriveRoleTargets(
    rows.map((r) => ({
      commanderOracleId: r.commander_oracle_id,
      oracleId: r.oracle_id,
      // Passed through NULL rather than coerced, as the writer does: a stored 0 is a
      // measurement of "never included" and a null is the index having stored nothing, and
      // only the second drops the commander from the derivation.
      inclusion: r.inclusion,
      typeLine: r.type_line,
      oracleText: r.oracle_text,
      keywords: r.keywords ?? [],
      layout: r.layout,
    })),
    { onClassify: () => { distinct += 1; } },
  );
  classifiedCount = distinct;
  return targets;
}

/** How many DISTINCT cards the last derivation classified, for the section-1 header. */
let classifiedCount = 0;

/** The per-card role map sections 3 and 4 read. The SAME classifier the derivation uses, via
 *  the same exported helper — not a second pass with its own rules. */
async function classifyCatalog(): Promise<Map<string, Role[]>> {
  const rows = await q<{
    oracle_id: string; type_line: string; oracle_text: string | null;
    keywords: string[] | null; layout: string;
  }>(`select oracle_id, type_line, oracle_text, keywords, layout from cards where commander_legal`);
  return classifyCards(rows.map((r) => ({
    oracleId: r.oracle_id, typeLine: r.type_line, oracleText: r.oracle_text,
    keywords: r.keywords ?? [], layout: r.layout,
  })));
}

async function main() {
  const [{ branch }] = await q<{ branch: string }>(`select current_database() as branch`);
  console.log(`\nmeasure-role-targets · database ${branch}`);

  const targets = await deriveTargets();
  const roleOf = await classifyCatalog();

  // 1 · the derivation
  console.log(`\n== 1 · the derivation ==   ${targets.size} commanders, ${classifiedCount} cards classified`);
  console.log(`${pad("", 10)}${num("mean", 8)}${num("median", 8)}${num("min", 8)}${num("max", 8)}${num("sd", 8)}${num("flat", 8)}`);
  for (const role of ROLES) {
    const xs = [...targets.values()].map((t) => t[role]).sort((a, b) => a - b);
    console.log(
      pad(role, 10) + num(f(mean(xs)), 8) + num(f(xs[Math.floor(xs.length / 2)]), 8) +
      num(f(xs[0]), 8) + num(f(xs[xs.length - 1]), 8) + num(f(sd(xs)), 8) +
      num(ROLE_TARGETS[role], 8));
  }
  const zeroWipes = [...targets.values()].filter((t) => t.wipes === 0).length;
  console.log(`\n  ${zeroWipes} commanders measure a wipes target of exactly 0, against a flat 3.`);
  console.log(`  That is the figure §2.5 cites for why these must not reach the scoring engine:`);
  console.log(`  roleCoverage divides by its target, and min(n,0)/0 is undefined.`);

  // 2 · what the coverage gap is made of
  const [cov] = await q<{
    covered_land: number; target_nonbasic: number; covered_nonland: number;
    target_nonland: number; ratio: number; ratio_sd: number;
  }>(`
    with per as (
      select csc.commander_oracle_id as cid,
        sum(csc.inclusion / 100.0) filter (where ${LAND_FRONT}) as cov_land,
        sum(csc.inclusion / 100.0) filter (where not (${LAND_FRONT})) as cov_nonland
      from commander_support_cards csc join cards c on c.oracle_id = csc.oracle_id
      group by 1)
    select avg(per.cov_land)::float as covered_land,
           avg(cs.avg_nonbasic)::float as target_nonbasic,
           avg(per.cov_nonland)::float as covered_nonland,
           avg(99 - cs.avg_land)::float as target_nonland,
           avg(per.cov_nonland / nullif(99 - cs.avg_land, 0))::float as ratio,
           stddev(per.cov_nonland / nullif(99 - cs.avg_land, 0))::float as ratio_sd
    from per join commander_support cs on cs.commander_oracle_id = per.cid
    -- THE SAME POPULATION AS SECTION 1 AND AS THE WRITER. A null check on avg_land alone keeps
    -- a degraded header, whose previous composition and previous cards both survive an index
    -- run that could not reach it — so after a partial run this section would report coverage
    -- over commanders the writer explicitly excludes, and the two halves of one script would
    -- describe different populations while reading as one cross-check.
    where cs.avg_land is not null and cs.synergy_state = 'ok'`);

  console.log(`\n== 2 · what the 56.9-of-99 gap is made of ==`);
  if (!Number.isFinite(cov?.ratio)) {
    console.log(`  CANNOT ANSWER HERE. Every figure in this section is taken over commanders`);
    console.log(`  carrying a composition, and this database has none: commander_support.avg_land`);
    console.log(`  is null on every row. Run db:build:index against a branch whose index post-dates`);
    console.log(`  the composition widening (#754), or point this at catalog-staging.`);
    console.log(`\n  Printing the conclusion anyway is the defect this guard exists to prevent.`);
  } else {
  console.log(`  nonbasic lands  covered ${f(cov.covered_land)}  against a target of ${f(cov.target_nonbasic)}`);
  console.log(`  non-land cards  covered ${f(cov.covered_nonland)}  against a target of ${f(cov.target_nonland)}`);
  console.log(`  non-land coverage ratio ${f(cov.ratio, 3)}  sd ${f(cov.ratio_sd, 3)}`);
  console.log(`\n  EDHREC's list covers the nonbasic lands almost exactly, so the missing cards are`);
  console.log(`  overwhelmingly BASICS, which carry no functional role at all. That is why the`);
  console.log(`  predecessor spec's objection is true and does not defeat this derivation.`);
  console.log(`\n  The ratio is NOT shipped as a scaling constant. Section 3 shows why.`);
  }

  // 3 · validation against real decks
  // HUMAN-BUILT DECKS ONLY, and the exclusion is load-bearing rather than tidy. A deck whose
  // every row is `auto` is an unedited planFill output — on staging that is `Test`, which reads
  // 5 creatures against a measured 24 and is the very deck this derivation exists to stop the
  // app producing. Validating the targets against it would be marking our own homework.
  //
  // Scoped to ONE account too: a mean absolute error pooled across accounts is a figure about
  // no one's decks, and the caption below claims a single builder.
  const deckRows = await q<{ deck_id: string; cid: string; oracle_id: string; quantity: number }>(`
    with owner as (select user_id from decks group by 1 order by count(*) desc limit 1)
    select d.id as deck_id, d.commander_oracle_id as cid, dc.oracle_id, dc.quantity
    from decks d join deck_cards dc on dc.deck_id = d.id
    where d.user_id = (select user_id from owner)
      and exists (select 1 from deck_cards e where e.deck_id = d.id and not e.auto)`);

  const have = new Map<string, { cid: string; counts: Record<RoleKey, number> }>();
  for (const row of deckRows) {
    let entry = have.get(row.deck_id);
    if (!entry) {
      entry = { cid: row.cid, counts: { ramp: 0, draw: 0, removal: 0, wipes: 0 } };
      have.set(row.deck_id, entry);
    }
    const roles = roleOf.get(row.oracle_id);
    if (!roles) continue;
    for (const role of ROLES) if (roles.includes(role)) entry.counts[role] += row.quantity;
  }

  console.log(`\n== 3 · validation ==   ${have.size} real decks, mean absolute error per role`);
  console.log(`  A HANDFUL OF DECKS BY ONE BUILDER IS NOT A SAMPLE OF DECKS. Read this as a smoke`);
  console.log(`  test that the derivation is not backwards, never as a validation of its figures.`);
  console.log(`\n${pad("", 10)}${num("derived", 10)}${num("scaled", 10)}${num("flat", 10)}${num("decks", 8)}`);
  for (const role of ROLES) {
    const errs: { derived: number; scaled: number; flat: number }[] = [];
    for (const entry of have.values()) {
      const target = targets.get(entry.cid);
      if (!target) continue;
      errs.push({
        derived: Math.abs(entry.counts[role] - target[role]),
        // NaN where section 2 could not derive a ratio; `mean` carries that through to the
        // column, which then reads as absent rather than as a figure.
        scaled: Math.abs(entry.counts[role] - target[role] / cov.ratio),
        flat: Math.abs(entry.counts[role] - ROLE_TARGETS[role]),
      });
    }
    console.log(
      pad(role, 10) + num(f(mean(errs.map((e) => e.derived)), 2), 10) +
      num(f(mean(errs.map((e) => e.scaled)), 2), 10) +
      num(f(mean(errs.map((e) => e.flat)), 2), 10) + num(errs.length, 8));
  }
  if (Number.isFinite(cov?.ratio)) {
    console.log(`\n  Read the two middle columns against each other. Where "derived" wins some roles`);
    console.log(`  and "scaled" wins others, the coverage ratio is not an earned correction and the`);
    console.log(`  number to ship is the one that was measured.`);
  } else {
    console.log(`\n  The "scaled" column is absent because section 2 could not derive a ratio.`);
  }
  if (have.size < 15) {
    console.log(`\n  ${have.size} DECKS IS TOO FEW TO CONCLUDE ANYTHING. On local-dev these are`);
    console.log(`  fixtures built to make probes deterministic, not decks anyone plays. The spec's`);
    console.log(`  figures were measured against catalog-staging and are thin even there.`);
  }

  // 4 · why these must not reach the scoring engine
  const roleIds = ROLES.map((role) =>
    [...roleOf].filter(([, r]) => r.includes(role)).map(([id]) => id));

  const [sat] = await q<{ commanders: number; all_four: number; wipe_short: number }>(`
    with owner as (
      select user_id from collection_items group by 1 order by count(*) desc limit 1),
    pool as (
      select distinct c.oracle_id, c.color_identity
      from collection_items ci join cards c on c.oracle_id = ci.oracle_id
      where c.commander_legal and ci.user_id = (select user_id from owner)),
    cmd as (
      -- The ok filter, for the same reason section 2 carries it: one script, one
      -- population, and the writer's.
      select c.oracle_id as cid, c.color_identity as ci from cards c
      join commander_support cs on cs.commander_oracle_id = c.oracle_id
      where cs.avg_land is not null and cs.synergy_state = 'ok'),
    -- LEFT join, so a commander whose identity the collection holds NO legal card for still
    -- reaches the count with four zeroes instead of being dropped. An inner join silently
    -- narrows the denominator to commanders the collection can build for, which is the
    -- population this section is trying to measure rather than a filter it may apply — and
    -- the narrower the collection, the more commanders vanish and the healthier the
    -- saturation figure reads.
    counted as (
      select cmd.cid,
        count(*) filter (where p.oracle_id = any($1::uuid[])) as n_ramp,
        count(*) filter (where p.oracle_id = any($2::uuid[])) as n_draw,
        count(*) filter (where p.oracle_id = any($3::uuid[])) as n_removal,
        count(*) filter (where p.oracle_id = any($4::uuid[])) as n_wipes
      from cmd left join pool p on p.color_identity <@ cmd.ci group by 1)
    select count(*)::int as commanders,
      count(*) filter (where n_ramp >= ${ROLE_TARGETS.ramp} and n_draw >= ${ROLE_TARGETS.draw}
        and n_removal >= ${ROLE_TARGETS.removal} and n_wipes >= ${ROLE_TARGETS.wipes})::int as all_four,
      count(*) filter (where n_wipes < ${ROLE_TARGETS.wipes})::int as wipe_short
    from counted`, roleIds);

  console.log(`\n== 4 · the scoring engine ==   against the largest collection in this database`);
  if (!sat || sat.commanders === 0) {
    console.log(`  CANNOT ANSWER HERE. No commander carries a composition, so the population this`);
    console.log(`  section scores over is empty. Same remedy as section 2.`);
    console.log(`\n  A saturation figure of "0 of 0" is not evidence that nothing saturates.`);
  } else {
  console.log(`  commanders saturating ALL FOUR flat targets: ${sat.all_four} of ${sat.commanders}` +
    ` (${f((sat.all_four / sat.commanders) * 100)}%)`);
  console.log(`  commanders short on wipes alone: ${sat.wipe_short}`);
  console.log(`\n  computeFit's roleCoverage is already nearly inert for a collection this size:`);
  console.log(`  that saturation figure IS the measurement, and it is measured against the FLAT`);
  console.log(`  targets, which is what score.ts reads today.`);
  console.log(`\n  WHAT THIS SECTION DOES NOT MEASURE, stated rather than implied: the effect of`);
  console.log(`  feeding per-commander targets into roleCoverage. That comparison needs the same`);
  console.log(`  count scored twice, and the spec's figures for it (mean fitRoles 24.97 -> 25.00,`);
  console.log(`  3,322 -> 3,379 perfect, 59 commanders moving by at most 2 points of 100) were`);
  console.log(`  taken by hand against catalog-staging and are NOT reproduced here.`);
  console.log(`\n  What this section does establish is the premise underneath them: the component`);
  console.log(`  is already saturated, and the ${zeroWipes} commanders measuring exactly zero wipes`);
  console.log(`  in section 1 would each divide by zero in min(n,t)/t. A ranking wants one`);
  console.log(`  yardstick across commanders; a deck reading wants accuracy for one.`);
  }

  // 5 · the orphan buckets
  const groups = await q<{
    grp: string; n: number; land: number; creature: number; artifact: number;
    instant: number; enchantment: number; basic: number; nonbasic: number;
  }>(`
    select case coalesce(array_length(c.color_identity, 1), 0)
             when 0 then 'colourless' when 4 then '4-colour' when 5 then '5-colour'
             else 'all others' end as grp,
           count(*)::int as n,
           avg(cs.avg_land)::float as land, avg(cs.avg_creature)::float as creature,
           avg(cs.avg_artifact)::float as artifact, avg(cs.avg_instant)::float as instant,
           avg(cs.avg_enchantment)::float as enchantment,
           avg(cs.avg_basic)::float as basic, avg(cs.avg_nonbasic)::float as nonbasic
    from cards c join commander_support cs on cs.commander_oracle_id = c.oracle_id
    where cs.avg_land is not null group by 1 order by n desc`);

  console.log(`\n== 5 · the orphan buckets ==   no composition fallback under the commander rung`);
  if (groups.length === 0) {
    console.log(`  CANNOT ANSWER HERE. No commander carries a composition, so there are no group`);
    console.log(`  averages to compare. Same remedy as section 2.`);
    console.log(`\n  This section's whole claim is that the three orphan groups differ from the`);
    console.log(`  average. Printing that over an empty table would assert it without measuring it.`);
    console.log(``);
    return;
  }
  console.log(`${pad("", 13)}${num("n", 6)}${num("land", 8)}${num("creature", 10)}${num("artifact", 10)}` +
    `${num("instant", 9)}${num("ench", 7)}${num("basic", 8)}${num("nonbasic", 10)}`);
  for (const g of groups) {
    console.log(pad(g.grp, 13) + num(g.n, 6) + num(f(g.land), 8) + num(f(g.creature), 10) +
      num(f(g.artifact), 10) + num(f(g.instant), 9) + num(f(g.enchantment), 7) +
      num(f(g.basic), 8) + num(f(g.nonbasic), 10));
  }
  const orphans = groups.filter((g) => g.grp !== "all others").reduce((n, g) => n + g.n, 0);
  console.log(`\n  ${orphans} commanders sit in a bucket clearing neither the exact-identity bar nor`);
  console.log(`  a colour-count one, so nothing resolves under their commander rung.`);
  console.log(`  A SINGLE GLOBAL ROW CANNOT SERVE THEM, and this table is the reason: colourless`);
  console.log(`  decks run far more artifacts than the average, and four- and five-colour decks run`);
  console.log(`  about half the basics. §2.4 publishes the three buckets below the bar instead,`);
  console.log(`  marked thin.`);

  console.log(``);
}

main()
  .then(async () => {
    await client.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(err);
    // The exit lives in its OWN handler rather than a `finally`: `process.exit` inside a
    // finally SWALLOWS the exception, which is a trap three probes here have been corrected
    // for, each one printing "all checks passed" over a section that never ran.
    await client.end().catch(() => {});
    process.exit(1);
  });
