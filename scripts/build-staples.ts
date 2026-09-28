// Derives `format_staples` and `identity_composition` from `commander_support_cards` and the
// widened `commander_support` composition columns.
//
// Read-only against its inputs; writes only its two output tables, and both in ONE
// transaction so a failed run leaves the previous floors standing rather than a half-written
// pair.
//
// IT PRINTS ITS WHOLE DERIVATION, and that is the point rather than a courtesy. Sub-project 2
// builds the fill, the top-off and the Add panel against these numbers, and the output is what
// anyone disputing them argues with — the breadth distribution, both sides of every cut
// boundary, the weighted-versus-unweighted delta, and the per-condition sizes. `measure-gap-
// line.mts` is the precedent: a threshold nobody can see the working for is an asserted
// constant with extra steps.
//
// First, and on its own line: src/db reads DATABASE_URL at module scope.
import { requireEnv } from "./lib/env.mjs";
requireEnv(["DATABASE_URL"]);
import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { recordBuild } from "../src/lib/catalog/builds";
import { formatStaples, identityComposition } from "../src/db/schema";
import {
  MIN_COMMANDERS_PER_CONDITION, THIN_COLOR_COUNTS, thinCondition,
} from "../src/lib/staples/condition";
// Imported, never restated: a literal here goes silently wrong the day the flat targets move,
// and this line's whole job is to sit beside the derived figures as their baseline.
import { ROLE_TARGETS } from "../src/lib/recs/roles";

/** The ratified cut (spec §4A.1, re-ratified on the identity axis 2026-09-19). */
const BREADTH = 0.5;
const INCLUSION = 20;

/** Chunked at the house limit; Postgres caps a statement at 65,535 parameters. */
const CHUNK = 500;

/**
 * The condition key IN SQL, matching `identityCondition` exactly.
 *
 * Two ways the obvious `coalesce(array_to_string(color_identity,''),'C')` is wrong, and both
 * were found by measuring rather than reading: it PRESERVES ARRAY ORDER, so it agrees with the
 * alphabetical helper only while the stored arrays happen to be sorted; and `array_to_string`
 * on an empty array returns `''`, NOT null, so the coalesce never fires and colourless
 * commanders key on an empty string instead of 'C'.
 */
const IDENTITY_KEY = `
  case when cardinality(cmd.color_identity) = 0 then 'C'
       else array_to_string(array(select unnest(cmd.color_identity) order by 1), '') end`;

/**
 * The COUNT fallback key, matching `countCondition` exactly.
 *
 * `count:0` is the colourless bucket and reads oddly beside `'C'`; both exist because the two
 * vocabularies answer different questions, and a commander is only ever looked up under one of
 * them — its exact identity if that bucket cleared the bar, otherwise its colour count.
 */
const COUNT_KEY = `'count:' || cardinality(cmd.color_identity)`;

/**
 * NO `synergy_state` FILTER, ANYWHERE, and that is deliberate rather than an omission.
 *
 * The ratified figures — 757 staples, mono-white 46 — came out of `measure-staples.mts` §6,
 * which filters on nothing. Adding a filter here re-derives a ratified number without
 * re-ratifying it, and the two agree only while every commander is `ok`: on the local-dev
 * index all 3,279 are, which is exactly why a filtered version reproduced the figures and
 * looked correct. After a partially degraded run they diverge, every bucket's denominator
 * shrinks, every breadth ratio rises, and the published floor silently grows past the cut.
 *
 * An `absent` commander is a real commander with no support cards. Counting it in the
 * denominator and never in the numerator DEPRESSES every ratio, which is the conservative
 * direction and the one the cut was defended at.
 */
const NO_STATE_FILTER = "";

const pad = (s: string | number, n: number) => String(s).padEnd(n);
const num = (s: string | number, n: number) => String(s).padStart(n);

async function q<T = Record<string, unknown>>(text: string): Promise<T[]> {
  return (await db.execute(sql.raw(text))).rows as T[];
}

type StapleRow = {
  condition: string; oracle_id: string; name: string; commanders: number;
  commander_total: number; avg_inclusion: number; weighted_rank: number;
};

/**
 * The floor for one KEY EXPRESSION — exact identity, or the colour-count fallback.
 *
 * One function for both, because two copies of a ratified cut drift a round at a time. The
 * only difference between the two passes is the key and which commanders they are allowed to
 * see, and both arrive as parameters.
 */
function floorsQuery(keyExpr: string, restrictTo: string) {
  return `
    with tot as (
      select ${keyExpr} as condition, count(*)::int as t
      from commander_support cs
      join cards cmd on cmd.oracle_id = cs.commander_oracle_id
      ${restrictTo}
      group by 1 having count(*) >= ${MIN_COMMANDERS_PER_CONDITION}
    ),
    per as (
      select ${keyExpr} as condition,
             cc.oracle_id, cc.name,
             count(*)::int as commanders,
             avg(csc.inclusion) as avg_inclusion,
             -- The weighted figure, for ORDER only. Membership below is unweighted.
             --
             -- TWO null policies, and they belong to different figures:
             --
             --   · coalesce(deck_count, 1) and NOT 0. A commander with no recorded deck
             --     count gets one vote rather than none, matching measure-staples.mts:205.
             --   · The FILTER, not a WHERE. A row with no inclusion figure carries no
             --     weight — but it must still COUNT toward breadth, because the ratified
             --     floors query (measure-staples.mts §6, the source of 757 and mono-white
             --     46) filters inclusion nowhere. An earlier fix put this in the WHERE
             --     and narrowed the denominator with it, which is the same class of drift
             --     it was fixing. It was invisible on this data — 0 of 859,794 rows have a
             --     null inclusion — so the figures were unchanged because the filter
             --     matched nothing, not because it was harmless.
             sum(coalesce(cs.deck_count, 1)) filter (where csc.inclusion is not null)
               ::numeric as weighted,
             -- Basic lands are excluded BY TYPE, never by threshold: they top the inclusion
             -- ranking at 95%, which is an artifact of appearing only for their own colour.
             cc.type_line ilike 'basic land%' as is_basic
      from commander_support_cards csc
      join commander_support cs using (commander_oracle_id)
      join cards cmd on cmd.oracle_id = cs.commander_oracle_id
      join cards cc on cc.oracle_id = csc.oracle_id
      ${restrictTo}
      group by 1, cc.oracle_id, cc.name, cc.type_line
    )
    select p.condition, p.oracle_id, p.name, p.commanders,
           t.t as commander_total,
           round(p.avg_inclusion::numeric, 1)::float as avg_inclusion,
           row_number() over (partition by p.condition order by p.weighted desc)::int as weighted_rank
    from per p join tot t using (condition)
    where p.commanders::numeric / t.t >= ${BREADTH}
      and p.avg_inclusion >= ${INCLUSION}
      and p.is_basic = false
    order by p.condition, weighted_rank`;
}

/** Composition averages for one key expression, over the commanders that carry one. */
/**
 * `having` is parameterised for the THIN branch alone, which inverts it. Everything else about
 * the three branches is identical, and a second copy of this 30-line query written to flip one
 * comparison is how the role columns and the type columns drift apart a release at a time.
 */
function compositionQuery(
  keyExpr: string,
  restrictTo: string,
  having = `count(*) >= ${MIN_COMMANDERS_PER_CONDITION}`,
) {
  const avg = (col: string) => `avg(cs.${col}) filter (where cs.avg_land is not null) as ${col}`;
  // THE ROLE COLUMNS CARRY THEIR OWN DENOMINATOR, and sharing `with_composition` would have
  // been a lie about them. `avg(cs.avg_ramp) filter (where cs.avg_land is not null)` skips a
  // null `avg_ramp` INSIDE the filter, so on a database whose commander rows predate the role
  // pass a bucket with 200 composition-carrying commanders and 10 role-carrying ones publishes
  // a mean over 10 while the row says 200. The two populations are genuinely different until
  // one index run has covered both, so the row states both.
  const avgRole = (col: string) => `avg(cs.${col}) filter (where cs.${col} is not null) as ${col}`;
  return `
    select ${keyExpr} as condition,
           count(*)::int as commanders,
           count(*) filter (where cs.avg_land is not null)::int as with_composition,
           ${["avg_land", "avg_basic", "avg_nonbasic", "avg_creature", "avg_instant",
              "avg_sorcery", "avg_artifact", "avg_enchantment", "avg_planeswalker",
              "avg_battle",
              // The `filter (where cs.avg_land is not null)` each of these carries is
              // load-bearing and must not become a `where`: that would narrow the `commanders`
              // denominator with it, which is the null-policy mistake this script's header
              // records making once already.
              ].map(avg).join(",\n           ")},
           -- The four FUNCTIONAL targets, on the same row as the ten type targets: a rung
           -- that delivered types with no roles beside them would put measured types next to
           -- flat roles on one deck, which is the disagreement §4A.6 names as the bug.
           -- Written as SQL comments rather than the TypeScript form, and that is not a
           -- style choice: this text is INSIDE the template and is sent to Postgres, which
           -- has no double-slash comment and fails the whole derivation on one. The comments
           -- above it sit inside an interpolation, so they are TypeScript and stay that way.
           ${["avg_ramp", "avg_draw", "avg_removal", "avg_wipes"]
              .map(avgRole).join(",\n           ")},
           count(*) filter (where cs.avg_ramp is not null)::int as with_roles
    from commander_support cs
    join cards cmd on cmd.oracle_id = cs.commander_oracle_id
    ${restrictTo}
    group by 1
    having ${having}
       and count(*) filter (where cs.avg_land is not null) > 0`;
}

/**
 * The three buckets that get a composition nobody else will serve.
 *
 * A commander is here when its EXACT identity is under the bar AND its colour-COUNT key is too
 * — colourless, four-colour and five-colour. Measured on staging 2026-09-20: 58, 16 and 60.
 *
 * THREE-COLOUR IS EXCLUDED, and that is the load-bearing half. Every one of the ten
 * three-colour identities is under the bar, so a branch that simply emitted "every bucket under
 * 100" would publish them — and the basis chain reads the identity rung BEFORE the count rung,
 * so each of those rows would SHADOW the ratified `count:3` row for the largest orphan group in
 * the table. A silent basis change, from a measured bucket to a below-bar one.
 *
 * Colourless is keyed by IDENTITY (`'C'`) and the other two by COUNT, because that is the key
 * each one's commanders actually look up: a colourless commander's identity key is `'C'` and
 * the chain finds it on the identity rung, while a four-colour commander's identity key is one
 * of five exact strings none of which is written, so it falls through to `count:4`.
 */
/** GENERATED FROM `thinCondition`, one arm per count, rather than hand-written beside it. The
 *  previous version shared only the count LIST and wrote the key mapping a second time in SQL,
 *  so changing the colourless arm in TypeScript would have left this branch writing the old key
 *  and the reader looking up one no row carries — silently, every time, for every such deck. */
const THIN_KEY = `
  case ${THIN_COLOR_COUNTS
    .map((n) => `when cardinality(cmd.color_identity) = ${n} then '${thinCondition(n)}'`)
    .join("\n       ")} end`;
/** The fallback restriction too, so this branch reads the SAME population `loadAverageCurves`
 *  computes its `count:N` curves over. Inert while no exact identity at these counts clears the
 *  bar — none does — but the moment one did, this row's type averages would cover commanders
 *  the identity rung already serves while its curve covered only those it does not, which is
 *  the mismatch that function's own header forbids. */
const thinOnly = (fallbackOnly: string) =>
  fallbackOnly
    ? `${fallbackOnly} and cardinality(cmd.color_identity) in (${THIN_COLOR_COUNTS.join(", ")})`
    : `where cardinality(cmd.color_identity) in (${THIN_COLOR_COUNTS.join(", ")})`;
const THIN_HAVING = `count(*) < ${MIN_COMMANDERS_PER_CONDITION}`;

/**
 * The mean curve per condition, over the commanders that carry one.
 *
 * The denominator is the number of commanders WITH a curve, per key — a commander whose
 * curve has no `"6"` entry contributes 0 to that bucket rather than being absent from it,
 * because an absence would raise the mean for every bucket a minority of decks use.
 */
async function loadAverageCurves(
  fallbackOnly: string,
): Promise<Map<string, Record<string, number>>> {
  // THE SAME POPULATION AS `compositionQuery`, per branch. The count branch must see only
  // the commanders an exact bucket cannot serve, exactly as the composition does — averaging
  // `count:3` over every three-colour commander INCLUDING those already served by their own
  // identity would put a curve beside targets computed from a different set of decks, on the
  // same row.
  const curveOnly = (restrictTo: string) =>
    restrictTo ? `${restrictTo} and cs.avg_curve is not null` : "where cs.avg_curve is not null";
  const rows = await q<{ condition: string; avg_curve: Record<string, number> | null }>(`
    select ${IDENTITY_KEY} as condition, cs.avg_curve
    from commander_support cs
    join cards cmd on cmd.oracle_id = cs.commander_oracle_id
    ${curveOnly(NO_STATE_FILTER)}
    union all
    select ${COUNT_KEY} as condition, cs.avg_curve
    from commander_support cs
    join cards cmd on cmd.oracle_id = cs.commander_oracle_id
    ${curveOnly(fallbackOnly)}`);

  const sums = new Map<string, { totals: Map<string, number>; n: number }>();
  for (const row of rows) {
    if (!row.avg_curve) continue;
    const entry = sums.get(row.condition) ?? { totals: new Map<string, number>(), n: 0 };
    for (const [key, value] of Object.entries(row.avg_curve)) {
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      entry.totals.set(key, (entry.totals.get(key) ?? 0) + value);
    }
    entry.n += 1;
    sums.set(row.condition, entry);
  }

  const out = new Map<string, Record<string, number>>();
  for (const [condition, { totals, n }] of sums) {
    if (n === 0) continue;
    out.set(
      condition,
      Object.fromEntries([...totals].map(([key, total]) => [key, total / n])),
    );
  }
  return out;
}

async function main() {
  // ---- the corpus ---------------------------------------------------------------------
  const [corpus] = await q<{ commanders: number; ok: number; withcomp: number }>(`
    select count(*)::int as commanders,
           count(*) filter (where synergy_state = 'ok')::int as ok,
           count(*) filter (where avg_land is not null)::int as withcomp
    from commander_support`);
  console.log(`\n== corpus ==`);
  console.log(`commanders on file        ${corpus.commanders}`);
  console.log(`  synergy_state = ok      ${corpus.ok}`);
  console.log(`  carrying a composition  ${corpus.withcomp}`);
  if (corpus.withcomp === 0) {
    console.log(`\n  NOTE: no commander carries a composition yet, so identity_composition`);
    console.log(`  will be empty. That is the state before the first WIDENED index run, and`);
    console.log(`  the profile falls to basis "none" until one happens. The floors below do`);
    console.log(`  not depend on it and are derived either way.`);
  }

  // ---- 1 · the exact-identity buckets that clear the sample bar -------------------------
  console.log(`\n== 1 · exact-identity buckets ==   (bar: ${MIN_COMMANDERS_PER_CONDITION} commanders)`);
  const buckets = await q<{ condition: string; n: number }>(`
    select ${IDENTITY_KEY} as condition, count(*)::int as n
    from commander_support cs
    join cards cmd on cmd.oracle_id = cs.commander_oracle_id
    group by 1 having count(*) >= ${MIN_COMMANDERS_PER_CONDITION}
    order by count(*) desc`);
  const covered = buckets.reduce((a, b) => a + b.n, 0);
  console.log(`  ${buckets.length} exact identities clear it, covering ${covered} of ${corpus.commanders}`);
  console.log(`  ${buckets.map((b) => `${b.condition}:${b.n}`).join("  ")}`);

  // ---- 2 · the count fallback, for everyone the exact buckets left behind ----------------
  //
  // WITHOUT THIS THE FOURTH RUNG OF THE BASIS CHAIN IS DEAD. `countCondition` is exported and
  // unit-tested, the profile's chain names `count`, and `identity_composition`'s own comment
  // says these tables exist for commanders an exact bucket cannot serve — but nothing derived
  // a `count:N` row, so every three-plus-colour and colourless commander looked up a key that
  // was never written and got no floor at all.
  //
  // Restricted to commanders NOT in a cleared exact bucket, deliberately. A count bucket that
  // also swept up every mono-white commander would be a second, worse answer for a commander
  // the exact floor already serves, and the chain takes the first hit — so the count row would
  // never be read for them, while its averages would be dragged by them.
  const clearedKeys = buckets.map((b) => `'${b.condition}'`);
  const FALLBACK_ONLY =
    clearedKeys.length > 0 ? `where (${IDENTITY_KEY}) not in (${clearedKeys.join(", ")})` : "";

  const countBuckets = await q<{ condition: string; n: number }>(`
    select ${COUNT_KEY} as condition, count(*)::int as n
    from commander_support cs
    join cards cmd on cmd.oracle_id = cs.commander_oracle_id
    ${FALLBACK_ONLY}
    group by 1 having count(*) >= ${MIN_COMMANDERS_PER_CONDITION}
    order by count(*) desc`);
  const leftOver = corpus.commanders - covered;
  const countCovered = countBuckets.reduce((a, b) => a + b.n, 0);
  console.log(`\n== 2 · the count fallback ==   (the ${leftOver} an exact bucket cannot serve)`);
  console.log(`  ${countBuckets.length} count buckets clear the bar, covering ${countCovered} of ${leftOver}`);
  console.log(`  ${countBuckets.map((b) => `${b.condition}:${b.n}`).join("  ") || "(none)"}`);
  if (countCovered < leftOver) {
    console.log(`  ${leftOver - countCovered} commanders clear NEITHER bar and have no floor at all.`);
    console.log(`  The profile reports basis "none" for them, which is the state the design`);
    console.log(`  draws — never a floor derived from a sample too small to defend.`);
  }

  // ---- 3 · the floors --------------------------------------------------------------------
  const exactRows = await q<StapleRow>(floorsQuery(IDENTITY_KEY, NO_STATE_FILTER));
  const countRows = await q<StapleRow>(floorsQuery(COUNT_KEY, FALLBACK_ONLY));
  const rows = [...exactRows, ...countRows];

  const byCondition = new Map<string, StapleRow[]>();
  for (const r of rows) {
    const list = byCondition.get(r.condition) ?? [];
    list.push(r);
    byCondition.set(r.condition, list);
  }
  console.log(`\n== 3 · the ratified floor ==   (breadth >= ${BREADTH}, inclusion >= ${INCLUSION}%)`);
  console.log(`  ${pad("condition", 10)}${num("commanders", 12)}${num("cards", 8)}`);
  for (const b of [...buckets, ...countBuckets]) {
    console.log(`  ${pad(b.condition, 10)}${num(b.n, 12)}${num((byCondition.get(b.condition) ?? []).length, 8)}`);
  }
  console.log(`  ${pad("TOTAL", 10)}${num("", 12)}${num(rows.length, 8)}`);

  // ---- 4 · the breadth distribution ------------------------------------------------------
  //
  // The header promises this and the weighted delta below, and an earlier version printed
  // neither — a claim to be the audit trail, over an output nobody could dispute a threshold
  // from. Both axes of the cut are shown against their own distribution, so a reader can see
  // whether 0.5 and 20 sit somewhere meaningful or in the middle of a flat run.
  console.log(`\n== 4 · where the cut falls in the distribution ==   (mono-white)`);
  const dist = await q<{ band: number; n: number }>(`
    with tot as (
      select count(*)::int as t from commander_support cs
      join cards cmd on cmd.oracle_id = cs.commander_oracle_id
      where cmd.color_identity = array['W']::text[]
    ),
    per as (
      select cc.oracle_id, count(*)::numeric as n, avg(csc.inclusion) as incl
      from commander_support_cards csc
      join commander_support cs using (commander_oracle_id)
      join cards cmd on cmd.oracle_id = cs.commander_oracle_id
      join cards cc on cc.oracle_id = csc.oracle_id
      where cmd.color_identity = array['W']::text[]
        and cc.type_line not ilike 'basic land%'
      group by cc.oracle_id
    )
    select width_bucket(p.n / t.t, 0, 1, 10)::int as band, count(*)::int as n
    from per p, tot t group by 1 order by 1`);
  console.log(`  breadth (share of this identity's commanders recommending the card)`);
  for (const d of dist) {
    const lo = (d.band - 1) * 10;
    const marker = lo === Math.floor((BREADTH * 100) / 10) * 10 ? "  <- the cut" : "";
    console.log(`    ${num(`${lo}-${lo + 10}%`, 9)}${num(d.n, 7)}${marker}`);
  }

  // ---- 5 · weighted versus unweighted, which is the other half of the claim ----------------
  //
  // MEMBERSHIP IS UNWEIGHTED and only the ORDER is weighted, so the two rankings disagree —
  // and how much they disagree is the figure that says whether that separation matters. A
  // large gap means the popular commanders in an identity want a visibly different order from
  // the identity as a whole; a small one means the distinction costs nothing.
  console.log(`\n== 5 · weighted vs unweighted order ==   (membership is unweighted; only rank is not)`);
  const order = await q<{ name: string; w: number; u: number }>(`
    with tot as (
      select count(*)::int as t from commander_support cs
      join cards cmd on cmd.oracle_id = cs.commander_oracle_id
      where cmd.color_identity = array['W']::text[]
    ),
    per as (
      select cc.name, count(*)::numeric as n, avg(csc.inclusion) as incl,
             sum(coalesce(cs.deck_count, 1))::numeric as weighted
      from commander_support_cards csc
      join commander_support cs using (commander_oracle_id)
      join cards cmd on cmd.oracle_id = cs.commander_oracle_id
      join cards cc on cc.oracle_id = csc.oracle_id
      where cmd.color_identity = array['W']::text[]
        and cc.type_line not ilike 'basic land%'
      group by cc.name
    )
    select p.name,
           row_number() over (order by p.weighted desc)::int as w,
           row_number() over (order by p.n desc, p.incl desc)::int as u
    from per p, tot t
    where p.n / t.t >= ${BREADTH} and p.incl >= ${INCLUSION}
    order by abs(row_number() over (order by p.weighted desc)
                 - row_number() over (order by p.n desc, p.incl desc)) desc
    limit 8`);
  console.log(`  ${pad("card", 34)}${num("weighted", 10)}${num("unweighted", 12)}${num("delta", 8)}`);
  for (const o of order) {
    console.log(`  ${pad(o.name, 34)}${num(o.w, 10)}${num(o.u, 12)}${num(o.w - o.u, 8)}`);
  }

  // ---- 6 · both sides of the boundary, which is what the cut is defended on ---------------
  console.log(`\n== 6 · the boundary, mono-white ==   (the cut is defended HERE, not on an aggregate)`);
  const boundary = await q<{ name: string; incl: number; inside: boolean }>(`
    with tot as (
      select count(*)::int as t from commander_support cs
      join cards cmd on cmd.oracle_id = cs.commander_oracle_id
      where cmd.color_identity = array['W']::text[]
    ),
    per as (
      select cc.name, count(*)::int as n, avg(csc.inclusion) as incl
      from commander_support_cards csc
      join commander_support cs using (commander_oracle_id)
      join cards cmd on cmd.oracle_id = cs.commander_oracle_id
      join cards cc on cc.oracle_id = csc.oracle_id
      where cmd.color_identity = array['W']::text[]
        and cc.type_line not ilike 'basic land%'
      group by cc.name
    )
    select name, round(incl::numeric,1)::float as incl, (incl >= ${INCLUSION}) as inside
    from per, tot
    where n::numeric / t >= ${BREADTH} and incl between ${INCLUSION} - 3 and ${INCLUSION} + 3
    order by incl desc`);
  for (const b of boundary) {
    console.log(`  ${b.inside ? "in " : "out"}  ${pad(b.name, 34)}${num(`${b.incl}%`, 8)}`);
  }

  // ---- 6b · the cut gap, per condition ----------------------------------------------------
  //
  // §6 above defends the cut on mono-white in detail. The header promises BOTH SIDES OF EVERY
  // boundary, and one identity is not every identity — a threshold can discriminate well in
  // the largest bucket and sit in dead space in the others, which is exactly the claim a
  // re-ratification has to test. One line per condition: the nearest card admitted and the
  // nearest refused, with the gap between them.
  console.log(`\n== 6b · the inclusion cut, per condition ==   (nearest in, nearest out)`);
  const gaps = await q<{
    condition: string; in_name: string | null; in_incl: number | null;
    out_name: string | null; out_incl: number | null;
  }>(`
    with per as (
      select ${IDENTITY_KEY} as condition, cc.name,
             count(*)::numeric as n, avg(csc.inclusion) as incl
      from commander_support_cards csc
      join commander_support cs using (commander_oracle_id)
      join cards cmd on cmd.oracle_id = cs.commander_oracle_id
      join cards cc on cc.oracle_id = csc.oracle_id
      where csc.inclusion is not null and cc.type_line not ilike 'basic land%'
      group by 1, cc.name
    ),
    tot as (
      select ${IDENTITY_KEY} as condition, count(*)::numeric as t
      from commander_support cs
      join cards cmd on cmd.oracle_id = cs.commander_oracle_id
      group by 1 having count(*) >= ${MIN_COMMANDERS_PER_CONDITION}
    ),
    -- Both sides read from the SAME breadth-qualified population, so the pair is two
    -- neighbours on one ranking rather than two answers to different questions.
    eligible as (
      select p.condition, p.name, p.incl
      from per p join tot t using (condition)
      where p.n / t.t >= ${BREADTH}
    ),
    ins as (
      -- distinct on rather than a filtered window: FILTER is for aggregates, and
      -- row_number() with a FILTER clause is a syntax error Postgres reports at the window.
      select distinct on (condition) condition, name, round(incl::numeric, 1)::float as incl
      from eligible where incl >= ${INCLUSION} order by condition, incl asc
    ),
    outs as (
      select distinct on (condition) condition, name, round(incl::numeric, 1)::float as incl
      from eligible where incl < ${INCLUSION} order by condition, incl desc
    )
    -- FULL join: a condition may have an admitted card and no refused neighbour, or the
    -- reverse, and dropping either would quietly shorten the table.
    select coalesce(i.condition, o.condition) as condition,
           i.name as in_name, i.incl as in_incl,
           o.name as out_name, o.incl as out_incl
    from ins i full join outs o on o.condition = i.condition
    order by 1`);
  console.log(`  ${pad("cond", 8)}${pad("nearest in", 34)}${pad("nearest out", 34)}${num("gap", 7)}`);
  for (const g of gaps) {
    const gap =
      g.in_incl !== null && g.out_incl !== null
        ? `${Math.round((g.in_incl - g.out_incl) * 10) / 10}`
        : "-";
    console.log(
      `  ${pad(g.condition, 8)}${pad(g.in_name ? `${g.in_name} (${g.in_incl}%)` : "-", 34)}` +
        `${pad(g.out_name ? `${g.out_name} (${g.out_incl}%)` : "-", 34)}${num(gap, 7)}`,
    );
  }

  // ---- 7 · publish -------------------------------------------------------------------------
  const stapleRows = rows.map((r) => ({
    oracleId: r.oracle_id,
    condition: r.condition,
    commanders: r.commanders,
    commanderTotal: r.commander_total,
    avgInclusion: r.avg_inclusion,
    weightedRank: r.weighted_rank,
  }));

  // THE CURVE, aggregated rather than discarded. `commander_support.avg_curve` is populated
  // by the widened index and `identity_composition` exposes the column, so hard-coding null
  // here would mean an identity or count fallback could never offer a curve target even
  // where every source commander has one — a column that exists and is always empty.
  //
  // Averaged in TypeScript rather than SQL: the keys are a small open set (EDHREC's own run
  // past 7) and a `jsonb_object_agg` over a lateral unnest is a great deal of SQL for a mean.
  // Folding to the app's buckets is NOT done here — `foldCurve` in `src/lib/profile/fit.ts`
  // owns that rule, and applying it twice in two places is how the two drift.
  const curves = await loadAverageCurves(FALLBACK_ONLY);

  type Comp = Record<string, number | string>;
  const thinComps = await q<Comp>(compositionQuery(THIN_KEY, thinOnly(FALLBACK_ONLY), THIN_HAVING));
  const comps: { row: Comp; thin: boolean }[] = [
    ...(await q<Comp>(compositionQuery(IDENTITY_KEY, NO_STATE_FILTER)))
      .map((row) => ({ row, thin: false })),
    ...(await q<Comp>(compositionQuery(COUNT_KEY, FALLBACK_ONLY)))
      .map((row) => ({ row, thin: false })),
    ...thinComps.map((row) => ({ row, thin: true })),
  ];

  // PRINTED SEPARATELY, never folded into the ratified list above. These figures rest on tens
  // of commanders rather than hundreds, and a reader scanning one table cannot tell which is
  // which — which is the same reason the column exists at all.
  console.log(`\n---- thin buckets (under ${MIN_COMMANDERS_PER_CONDITION}, served by nothing else) ----`);
  if (thinComps.length === 0) {
    console.log("  none — every bucket either clears the bar or is served by its colour count");
  }
  for (const t of thinComps) {
    console.log(`  ${String(t.condition).padEnd(9)} ${String(t.commanders).padStart(4)} commanders  ` +
      `land ${Number(t.avg_land).toFixed(1)}  creature ${Number(t.avg_creature).toFixed(1)}`);
  }

  const compRows = comps.map(({ row: c, thin }) => ({
    thin,
    condition: String(c.condition),
    commanders: Number(c.commanders),
    withComposition: Number(c.with_composition),
    avgLand: Number(c.avg_land), avgBasic: Number(c.avg_basic),
    avgNonbasic: Number(c.avg_nonbasic), avgCreature: Number(c.avg_creature),
    avgInstant: Number(c.avg_instant), avgSorcery: Number(c.avg_sorcery),
    avgArtifact: Number(c.avg_artifact), avgEnchantment: Number(c.avg_enchantment),
    avgPlaneswalker: Number(c.avg_planeswalker), avgBattle: Number(c.avg_battle),
    // `?? 0` rather than `Number(undefined)`: a commander row indexed before the role
    // derivation existed carries nulls, so the bucket's average over them is null too, and
    // NaN in a `real NOT NULL` column is a write that fails at the database rather than a
    // figure anybody can read. Zero is what the column defaults to and what the next run
    // overwrites.
    avgRamp: Number(c.avg_ramp ?? 0), avgDraw: Number(c.avg_draw ?? 0),
    avgRemoval: Number(c.avg_removal ?? 0), avgWipes: Number(c.avg_wipes ?? 0),
    withRoles: Number(c.with_roles ?? 0),
    avgCurve: curves.get(String(c.condition)) ?? null,
  }));

  // A derivation that produced nothing must not CLEAR the previous floors. An empty result is
  // either an empty index or a broken query, and neither is a reason to delete a good table.
  if (stapleRows.length === 0) {
    throw new Error(
      `\nbuild-staples REFUSED: the derivation produced no staples. The previous floors ` +
        `stand. An empty result means the commander index is empty or this query is broken; ` +
        `either way, publishing it would delete a good table behind a green job.`,
    );
  }

  await db.transaction(async (tx) => {
    await tx.delete(formatStaples);
    for (let i = 0; i < stapleRows.length; i += CHUNK) {
      await tx.insert(formatStaples).values(stapleRows.slice(i, i + CHUNK));
    }
    // THE SAME RULE AS ABOVE, applied to the other table — and it needs its own branch rather
    // than sharing the staples refusal, because an empty composition is a LEGITIMATE state.
    // No commander carries one until the first widened index run, so a hard refusal would
    // fail every run until then and take the floors down with it. What must never happen is
    // the clear: an upstream shape change that nulls every `avg_*` would otherwise delete
    // every stored composition, print "published 0" and exit 0, dropping the profile to
    // basis "none" for every deck behind a green job.
    if (compRows.length > 0) {
      await tx.delete(identityComposition);
      await tx.insert(identityComposition).values(compRows);
    }
  });

  console.log(`\npublished ${stapleRows.length} staple rows across ${byCondition.size} conditions`);
  if (compRows.length > 0) {
    console.log(`published ${compRows.length} identity composition rows`);
    // THE DERIVATION IS THE REVIEW, which is this script's own standing rule. Sub-project 2
    // builds the fill against these numbers, so the output is what anyone disputing them
    // argues with — a threshold nobody can see the working for is an asserted constant with
    // extra steps.
    console.log(
      `\n== role targets per condition ==   flat: ` +
      `ramp ${ROLE_TARGETS.ramp} · draw ${ROLE_TARGETS.draw} · ` +
      `removal ${ROLE_TARGETS.removal} · wipes ${ROLE_TARGETS.wipes}`,
    );
    console.log(
      `${pad("condition", 18)}${num("land", 7)}${num("creature", 10)}` +
      `${num("ramp", 7)}${num("draw", 7)}${num("removal", 9)}${num("wipes", 7)}`,
    );
    for (const c of compRows) {
      console.log(
        // MARKED, because this table mixes the two. The thin block above prints them apart,
        // but these rows land in one list with the ratified ones, and a reader scanning it
        // cannot otherwise tell a mean over 16 commanders from a mean over 800.
        pad(c.thin ? `${c.condition} (thin)` : c.condition, 18) +
        num(c.avgLand.toFixed(1), 7) + num(c.avgCreature.toFixed(1), 10) +
        num(c.avgRamp.toFixed(1), 7) + num(c.avgDraw.toFixed(1), 7) +
        num(c.avgRemoval.toFixed(1), 9) + num(c.avgWipes.toFixed(1), 7),
      );
    }
    const allZero = compRows.every(
      (c) => c.avgRamp === 0 && c.avgDraw === 0 && c.avgRemoval === 0 && c.avgWipes === 0,
    );
    if (allZero) {
      // NOT a refusal: it is the legitimate state of a database whose index predates the role
      // derivation, and the columns default to 0 for exactly that reason. But a table of
      // zeroes read as targets would tell every deck it wants no ramp, so it says which.
      console.log(
        `\n  EVERY role target is 0. That is the pre-derivation state — no commander row ` +
        `carries\n  avg_ramp yet — and NOT a measurement. Run db:build:index first; these ` +
        `columns are\n  overwritten by the next run.`,
      );
    }
  } else {
    console.log(
      `derived NO composition rows — the previous ones (if any) are left standing rather ` +
        `than cleared. See the note above if this is the pre-widened-index state.`,
    );
  }

  // The stamp: these are profile inputs, so a refresh must retire cached readers. Non-fatal,
  // as every other ingest's stamp is.
  const { stampCatalogRefresh } = await import("../src/lib/cache/stamp-catalog");
  await stampCatalogRefresh();
}

// Between its own ledger rows, as `db:build:index` is: this step runs after the index it derives
// from, so its row is the newest `index` row, and a refused or failed derivation leaves that
// newest row failed for a copy to refuse.
recordBuild(db, "index", main)
  .then(() => process.exit(0))
  .catch((err) => { console.error(err instanceof Error ? err.message : err); process.exit(1); });
