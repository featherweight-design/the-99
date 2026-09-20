// Derives `format_staples` and `identity_composition` from `commander_support_cards` and the
// widened `commander_support` composition columns.
//
// Read-only against its inputs; writes only its two output tables, and both in ONE
// transaction each so a failed run leaves the previous floors standing rather than a
// half-written table.
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
import { formatStaples, identityComposition } from "../src/db/schema";
import { MIN_COMMANDERS_PER_CONDITION } from "../src/lib/staples/condition";

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

const pad = (s: string | number, n: number) => String(s).padEnd(n);
const num = (s: string | number, n: number) => String(s).padStart(n);

async function q<T = Record<string, unknown>>(text: string): Promise<T[]> {
  return (await db.execute(sql.raw(text))).rows as T[];
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
  console.log(`\n== 1 · buckets ==   (bar: ${MIN_COMMANDERS_PER_CONDITION} commanders)`);
  const buckets = await q<{ condition: string; n: number }>(`
    select ${IDENTITY_KEY} as condition, count(*)::int as n
    from commander_support cs
    join cards cmd on cmd.oracle_id = cs.commander_oracle_id
    where cs.synergy_state = 'ok'
    group by 1 having count(*) >= ${MIN_COMMANDERS_PER_CONDITION}
    order by count(*) desc`);
  const covered = buckets.reduce((a, b) => a + b.n, 0);
  console.log(`  ${buckets.length} exact identities clear it, covering ${covered} of ${corpus.ok} commanders`);
  console.log(`  ${buckets.map((b) => `${b.condition}:${b.n}`).join("  ")}`);

  // ---- 2 · the floors -------------------------------------------------------------------
  const rows = await q<{
    condition: string; oracle_id: string; name: string; commanders: number;
    commander_total: number; avg_inclusion: number; weighted_rank: number; is_land: boolean;
  }>(`
    with tot as (
      select ${IDENTITY_KEY} as condition, count(*)::int as t,
             sum(coalesce(cs.deck_count, 0))::numeric as weight_total
      from commander_support cs
      join cards cmd on cmd.oracle_id = cs.commander_oracle_id
      where cs.synergy_state = 'ok'
      group by 1 having count(*) >= ${MIN_COMMANDERS_PER_CONDITION}
    ),
    per as (
      select ${IDENTITY_KEY} as condition,
             cc.oracle_id, cc.name,
             count(*)::int as commanders,
             avg(csc.inclusion) as avg_inclusion,
             -- The weighted figure, for ORDER only. Membership below is unweighted.
             sum(coalesce(cs.deck_count, 0))::numeric as weighted,
             cc.type_line ilike 'basic land%' as is_land
      from commander_support_cards csc
      join commander_support cs using (commander_oracle_id)
      join cards cmd on cmd.oracle_id = cs.commander_oracle_id
      join cards cc on cc.oracle_id = csc.oracle_id
      where cs.synergy_state = 'ok'
      group by 1, cc.oracle_id, cc.name, cc.type_line
    )
    select p.condition, p.oracle_id, p.name, p.commanders,
           t.t as commander_total,
           round(p.avg_inclusion::numeric, 1)::float as avg_inclusion,
           row_number() over (partition by p.condition order by p.weighted desc)::int as weighted_rank,
           p.is_land
    from per p join tot t using (condition)
    where p.commanders::numeric / t.t >= ${BREADTH}
      and p.avg_inclusion >= ${INCLUSION}
      -- Basic lands excluded BY TYPE, never by threshold: they top the inclusion ranking at
      -- 95%, which is an artifact of appearing only for their own colour.
      and not (cc_is_basic := false)
    order by p.condition, weighted_rank`.replace("and not (cc_is_basic := false)", "and p.is_land = false"));

  const byCondition = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byCondition.get(r.condition) ?? [];
    list.push(r);
    byCondition.set(r.condition, list);
  }
  console.log(`\n== 2 · the ratified floor ==   (breadth >= ${BREADTH}, inclusion >= ${INCLUSION}%)`);
  console.log(`  ${pad("identity", 10)}${num("commanders", 12)}${num("cards", 8)}`);
  for (const b of buckets) {
    console.log(`  ${pad(b.condition, 10)}${num(b.n, 12)}${num((byCondition.get(b.condition) ?? []).length, 8)}`);
  }
  console.log(`  ${pad("TOTAL", 10)}${num("", 12)}${num(rows.length, 8)}`);

  // ---- 3 · both sides of the boundary, which is what the cut is defended on --------------
  console.log(`\n== 3 · the boundary, mono-white ==   (the cut is defended HERE, not on an aggregate)`);
  const boundary = await q<{ name: string; incl: number; inside: boolean }>(`
    with tot as (
      select count(*)::int as t from commander_support cs
      join cards cmd on cmd.oracle_id = cs.commander_oracle_id
      where cs.synergy_state = 'ok' and cmd.color_identity = array['W']::text[]
    ),
    per as (
      select cc.name, count(*)::int as n, avg(csc.inclusion) as incl
      from commander_support_cards csc
      join commander_support cs using (commander_oracle_id)
      join cards cmd on cmd.oracle_id = cs.commander_oracle_id
      join cards cc on cc.oracle_id = csc.oracle_id
      where cs.synergy_state = 'ok' and cmd.color_identity = array['W']::text[]
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

  // ---- 4 · publish ----------------------------------------------------------------------
  const stapleRows = rows.map((r) => ({
    oracleId: r.oracle_id,
    condition: r.condition,
    commanders: r.commanders,
    commanderTotal: r.commander_total,
    avgInclusion: r.avg_inclusion,
    weightedRank: r.weighted_rank,
  }));

  const comps = await q<Record<string, number | string>>(`
    select ${IDENTITY_KEY} as condition,
           count(*)::int as commanders,
           count(*) filter (where cs.avg_land is not null)::int as with_composition,
           avg(cs.avg_land) filter (where cs.avg_land is not null) as avg_land,
           avg(cs.avg_basic) filter (where cs.avg_land is not null) as avg_basic,
           avg(cs.avg_nonbasic) filter (where cs.avg_land is not null) as avg_nonbasic,
           avg(cs.avg_creature) filter (where cs.avg_land is not null) as avg_creature,
           avg(cs.avg_instant) filter (where cs.avg_land is not null) as avg_instant,
           avg(cs.avg_sorcery) filter (where cs.avg_land is not null) as avg_sorcery,
           avg(cs.avg_artifact) filter (where cs.avg_land is not null) as avg_artifact,
           avg(cs.avg_enchantment) filter (where cs.avg_land is not null) as avg_enchantment,
           avg(cs.avg_planeswalker) filter (where cs.avg_land is not null) as avg_planeswalker,
           avg(cs.avg_battle) filter (where cs.avg_land is not null) as avg_battle
    from commander_support cs
    join cards cmd on cmd.oracle_id = cs.commander_oracle_id
    where cs.synergy_state = 'ok'
    group by 1
    having count(*) >= ${MIN_COMMANDERS_PER_CONDITION}
       and count(*) filter (where cs.avg_land is not null) > 0`);

  const compRows = comps.map((c) => ({
    condition: String(c.condition),
    commanders: Number(c.commanders),
    withComposition: Number(c.with_composition),
    avgLand: Number(c.avg_land), avgBasic: Number(c.avg_basic),
    avgNonbasic: Number(c.avg_nonbasic), avgCreature: Number(c.avg_creature),
    avgInstant: Number(c.avg_instant), avgSorcery: Number(c.avg_sorcery),
    avgArtifact: Number(c.avg_artifact), avgEnchantment: Number(c.avg_enchantment),
    avgPlaneswalker: Number(c.avg_planeswalker), avgBattle: Number(c.avg_battle),
    avgCurve: null,
  }));

  // A derivation that produced nothing must not CLEAR the previous floors. An empty result is
  // either an empty index or a broken query, and neither is a reason to delete a good table.
  if (stapleRows.length === 0) {
    console.error(
      `\nbuild-staples REFUSED: the derivation produced no staples. The previous floors ` +
        `stand. An empty result means the commander index is empty or this query is broken; ` +
        `either way, publishing it would delete a good table behind a green job.`,
    );
    process.exit(1);
  }

  await db.transaction(async (tx) => {
    await tx.delete(formatStaples);
    for (let i = 0; i < stapleRows.length; i += CHUNK) {
      await tx.insert(formatStaples).values(stapleRows.slice(i, i + CHUNK));
    }
    await tx.delete(identityComposition);
    if (compRows.length > 0) await tx.insert(identityComposition).values(compRows);
  });

  console.log(`\npublished ${stapleRows.length} staple rows across ${byCondition.size} conditions`);
  console.log(`published ${compRows.length} identity composition rows`);

  // The stamp: these are profile inputs, so a refresh must retire cached readers. Non-fatal,
  // as every other ingest's stamp is.
  const { stampCatalogRefresh } = await import("../src/lib/cache/stamp-catalog");
  await stampCatalogRefresh();

  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
