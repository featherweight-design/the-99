// Measures whether a "format staple" can be derived from `commander_support_cards`,
// which is the assumption §4A of the deck-analysis foundation spec rests on.
//
// READ-ONLY. Writes nothing, takes no locks, creates no fixture. Point it at
// `local-dev` or any branch you can read.
//
// The spec claims: a card with high inclusion across NEARLY EVERY commander is a
// format staple; a card with high inclusion under ONE commander is a synergy pick.
// That is a method, not a measurement, and this repo's own ruling (§2.4a, and
// `gap-slot.ts` before it) says a threshold has to be derived and defended against
// a named case rather than asserted. Five questions:
//
//   1 · BREADTH. For every card, in how many commanders' support lists does it
//       appear, and at what inclusion? If there is no knee between staple and
//       noise then "the floor" is a cut we would be inventing, and §4A needs
//       rewriting rather than citing.
//   2 · WHAT IS AT THE TOP. If the head of the curve is all lands, or all
//       colourless rocks, the floor says less than the method implies.
//   3 · WEIGHTING. The spec weights by `deck_count` so a commander with 31,481
//       decks outvotes one with 40. Does that actually move the list, or is it a
//       complication with no effect?
//   4 · CONDITIONING. Does Arcane Signet's inclusion really differ between
//       mono-coloured and multicoloured commanders? The colour-count axis was
//       chosen because that example suggested it, which is the weakest possible
//       reason to pick a data model.
//   5 · THE ROLE TARGETS. §4A.2 claims ramp/draw/removal/wipes AND THE LAND COUNT
//       can be sourced from this table. That is the claim most likely to be
//       false: `commander_support_cards` is a per-commander RECOMMENDATION list,
//       not a corpus of decklists, and if EDHREC drops basic lands from it then
//       no land target can come from here at all. Asked directly.
//
// Question 5 is the one that can invalidate a section rather than tune a number,
// so it prints its own evidence rather than a verdict.

import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const client = new Pool({ connectionString: DATABASE_URL });

const pct = (n: number, d: number) => (d === 0 ? "—" : `${((n / d) * 100).toFixed(1)}%`);
const row = (...cells: (string | number)[]) =>
  cells.map((c, i) => (i === 0 ? String(c).padEnd(38) : String(c).padStart(12))).join("");

async function q<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await client.query(sql, params)).rows as T[];
}

async function main() {

  const [{ commanders, ok, withCards }] = await q<{
    commanders: number; ok: number; withCards: number;
  }>(`
    select count(*)::int as commanders,
           count(*) filter (where synergy_state = 'ok')::int as ok,
           (select count(distinct commander_oracle_id)::int
              from commander_support_cards) as "withCards"
    from commander_support cs
  `);
  console.log(`\n== corpus ==`);
  console.log(`commanders on file        ${commanders}`);
  console.log(`  synergy_state = ok      ${ok}  (${pct(ok, commanders)})`);
  console.log(`  with any support cards  ${withCards}  (${pct(withCards, commanders)})`);

  const [{ pairs, distinctCards, nullIncl }] = await q<{
    pairs: number; distinctCards: number; nullIncl: number;
  }>(`
    select count(*)::int as pairs,
           count(distinct oracle_id)::int as "distinctCards",
           count(*) filter (where inclusion is null)::int as "nullIncl"
    from commander_support_cards
  `);
  console.log(`support rows              ${pairs}`);
  console.log(`  distinct cards          ${distinctCards}`);
  console.log(`  inclusion is null       ${nullIncl}  (${pct(nullIncl, pairs)})`);

  // ---- 1 · BREADTH -------------------------------------------------------
  // How many commanders each card is recommended for. A staple should sit far
  // out on this axis; a synergy pick should not. The question is whether the
  // two populations separate.
  console.log(`\n== 1 · breadth: commanders each card appears for ==`);
  const buckets = await q<{ band: string; cards: number; medIncl: number | null }>(`
    with breadth as (
      select oracle_id,
             count(*)::int as commanders,
             avg(inclusion) as avg_incl
      from commander_support_cards
      group by oracle_id
    )
    select case
             when commanders >= 2000 then 'i · 2000+'
             when commanders >= 1000 then 'h · 1000-1999'
             when commanders >=  500 then 'g ·  500-999'
             when commanders >=  250 then 'f ·  250-499'
             when commanders >=  100 then 'e ·  100-249'
             when commanders >=   50 then 'd ·   50-99'
             when commanders >=   10 then 'c ·   10-49'
             when commanders >=    2 then 'b ·    2-9'
             else                         'a ·    1'
           end as band,
           count(*)::int as cards,
           round(avg(avg_incl)::numeric, 3) as "medIncl"
    from breadth group by 1 order by 1 desc
  `);
  console.log(row("band (commanders recommending it)", "cards", "avg incl"));
  for (const b of buckets) console.log(row(b.band, b.cards, b.medIncl ?? "—"));

  // ---- 2 · WHAT IS AT THE TOP -------------------------------------------
  console.log(`\n== 2 · the head of the curve (top 30 by breadth) ==`);
  const head = await q<{
    name: string; commanders: number; avgIncl: number | null; typeLine: string; ci: string;
  }>(`
    select c.name,
           count(*)::int as commanders,
           round(avg(csc.inclusion)::numeric, 3) as "avgIncl",
           c.type_line as "typeLine",
           coalesce(array_to_string(c.color_identity, ''), 'C') as ci
    from commander_support_cards csc
    join cards c on c.oracle_id = csc.oracle_id
    group by c.oracle_id, c.name, c.type_line, c.color_identity
    order by commanders desc, "avgIncl" desc nulls last
    limit 30
  `);
  console.log(row("card", "commanders", "avg incl") + "   type / identity");
  for (const h of head) {
    console.log(
      row(h.name.slice(0, 37), h.commanders, h.avgIncl ?? "—") +
        `   ${h.typeLine.split("—")[0].trim().slice(0, 22)} [${h.ci || "C"}]`,
    );
  }

  // ---- 5 · THE LAND QUESTION, asked before the tuning questions ---------
  // If the support lists hold no lands, §4A.2's claim that a land target can be
  // sourced here is simply false and the section has to change.
  console.log(`\n== 5 · can role targets come from this table at all? ==`);
  const types = await q<{ bucket: string; cards: number; rows: number }>(`
    select case
             when c.type_line ilike 'basic land%'   then 'basic land'
             when c.type_line ilike '%land%'        then 'nonbasic land'
             when c.type_line ilike '%creature%'    then 'creature'
             when c.type_line ilike '%artifact%'    then 'artifact'
             when c.type_line ilike '%enchantment%' then 'enchantment'
             when c.type_line ilike '%instant%'     then 'instant'
             when c.type_line ilike '%sorcery%'     then 'sorcery'
             else 'other'
           end as bucket,
           count(distinct c.oracle_id)::int as cards,
           count(*)::int as rows
    from commander_support_cards csc
    join cards c on c.oracle_id = csc.oracle_id
    group by 1 order by rows desc
  `);
  console.log(row("type bucket", "cards", "support rows"));
  for (const t of types) console.log(row(t.bucket, t.cards, t.rows));

  const [{ maxIncl }] = await q<{ maxIncl: number | null }>(
    `select max(inclusion) as "maxIncl" from commander_support_cards`,
  );
  console.log(`
max inclusion value seen  ${maxIncl ?? "—"}   (the scale: 0-1 or 0-100)`);
  const [{ len }] = await q<{ len: number }>(`
    select round(avg(n)::numeric, 1)::float as len from (
      select count(*)::int as n from commander_support_cards group by commander_oracle_id
    ) t
  `);
  console.log(`avg support-list length   ${len}   (a 99-card deck is not what this is)`);

  // ---- 3 · WEIGHTING -----------------------------------------------------
  console.log(`\n== 3 · does deck_count weighting move the list? ==`);
  const weighted = await q<{ name: string; rank_u: number; rank_w: number }>(`
    with base as (
      select csc.oracle_id, c.name, csc.inclusion, coalesce(cs.deck_count, 1) as w
      from commander_support_cards csc
      join commander_support cs using (commander_oracle_id)
      join cards c on c.oracle_id = csc.oracle_id
      where csc.inclusion is not null
    ), agg as (
      select name,
             count(*)::int as breadth_u,
             sum(w)::bigint as breadth_w
      from base group by name
    )
    select name,
           rank() over (order by breadth_u desc) as rank_u,
           rank() over (order by breadth_w desc) as rank_w
    from agg order by rank_u limit 25
  `);
  let moved = 0;
  console.log(row("card", "unweighted", "weighted"));
  for (const w of weighted) {
    if (Math.abs(Number(w.rank_u) - Number(w.rank_w)) >= 3) moved++;
    console.log(row(w.name.slice(0, 37), w.rank_u, w.rank_w));
  }
  console.log(`\ncards moving 3+ places in the top 25: ${moved}`);

  // ---- 4 · CONDITIONING --------------------------------------------------
  console.log(`\n== 4 · colour count as a conditioning axis ==`);
  const cond = await q<{ name: string; colors: number; commanders: number; avgIncl: number | null }>(`
    select c.name,
           cardinality(cmd.color_identity)::int as colors,
           count(*)::int as commanders,
           round(avg(csc.inclusion)::numeric, 3) as "avgIncl"
    from commander_support_cards csc
    join commander_support cs using (commander_oracle_id)
    join cards cmd on cmd.oracle_id = cs.commander_oracle_id
    join cards c on c.oracle_id = csc.oracle_id
    where c.name in ('Arcane Signet','Sol Ring','Command Tower','Commander''s Sphere',
                     'Fellwar Stone','Exotic Orchard','Swiftfoot Boots','Chromatic Lantern')
    group by c.name, colors
    order by c.name, colors
  `);
  console.log(row("card / commander colours", "commanders", "avg incl"));
  let last = "";
  for (const r of cond) {
    if (r.name !== last) { console.log(`  ${r.name}`); last = r.name; }
    console.log(row(`    ${r.colors}-colour commanders`, r.commanders, r.avgIncl ?? "—"));
  }

  // ---- 6 · EXPECTED COMPOSITION -----------------------------------------
  // The decisive test for §4A.2. There are no decklists here, so a role TARGET
  // can only come from this table as an EXPECTED COUNT: if card c appears in x%
  // of a commander's decks, then sum(x)/100 over a role's cards is how many of
  // that role an average deck for that commander runs. If those sums land near a
  // real 99-card deck, the derivation is sound. If they do not, §4A.2 is wrong
  // and the land target has to come from somewhere else entirely.
  console.log(`\n== 6 · expected deck composition from summed inclusion ==`);
  const comp = await q<{ bucket: string; expected: number }>(`
    with per_commander as (
      select cs.commander_oracle_id,
             case
               when c.type_line ilike 'basic land%'   then 'basic land'
               when c.type_line ilike '%land%'        then 'nonbasic land'
               when c.type_line ilike '%creature%'    then 'creature'
               when c.type_line ilike '%artifact%'    then 'artifact'
               when c.type_line ilike '%enchantment%' then 'enchantment'
               when c.type_line ilike '%instant%'     then 'instant'
               when c.type_line ilike '%sorcery%'     then 'sorcery'
               else 'other'
             end as bucket,
             sum(csc.inclusion) / 100.0 as expected
      from commander_support_cards csc
      join commander_support cs using (commander_oracle_id)
      join cards c on c.oracle_id = csc.oracle_id
      group by cs.commander_oracle_id, 2
    )
    select bucket, round(avg(expected)::numeric, 1)::float as expected
    from per_commander group by bucket order by expected desc
  `);
  let total = 0;
  console.log(row("type bucket", "expected/deck"));
  for (const c2 of comp) { total += Number(c2.expected); console.log(row(c2.bucket, c2.expected)); }
  console.log(row("TOTAL", total.toFixed(1)) + "   <- a real deck is 99 + commander");

  await client.end();
  console.log("\ndone — read-only, nothing written.\n");
}

main().catch(async (err) => {
  // Never `process.exit` in a finally: it swallows the throw, and this repo has
  // written that bug three times (probe:score-lock, probe:payload, probe:commander-row).
  await client.end().catch(() => {});
  console.error(err);
  process.exitCode = 1;
});
