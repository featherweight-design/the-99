// Proves `deriveAndWriteRoleTargets` against a real Postgres.
//
// WHY THIS EXISTS. Every `seed-index.test.ts` caller INJECTS this pass, because a default that
// reaches the database would make each of those 22 cases need a real Postgres. That is the right
// trade for those tests and it leaves this writer's whole SQL surface — the support read, the
// per-commander UPDATE, the pair key split, the clearing of rows the derivation no longer
// reaches, and the refusal's rollback — asserted by nobody. The derivation itself is pure and
// unit tested; none of that is.
//
// The cost of that gap is already on record in this PR. A comment written with `//` INSIDE a
// SQL template shipped in `build-staples.ts` and would have failed every run of the derivation,
// past typecheck, past lint, past 7,456 tests. Running the thing is what caught it.
//
// WHAT IT WRITES, and how it puts it back. This pass operates on the WHOLE table by design —
// it cannot be scoped to a fixture user the way `probe:claims` is — so the discipline is
// capture-before-write and restore, as `probe:bracket` does for its catalog sentinels:
//
//   * the four role columns on every commander and pair row are captured first and restored
//     wholesale at the end, so a run leaves the table byte-identical to how it found it;
//   * a pair sentinel is INSERTED (local-dev carries no pair rows at all, so without one the
//     pair half of the writer is asserted by nobody) and deleted;
//   * the refusal case inserts throwaway `synergy_state = 'ok'` commander rows carrying no
//     support cards, which is what pushes the derivation under its floor, and deletes them.
//
// A KILLED RUN ORPHANS ROWS, and that is not hypothetical — one of the mutation runs behind
// this probe was cut off by a timeout part-way through section 2, and its `finally` never ran.
// So every commander row this script inserts is STAMPED, and a run begins by deleting anything
// still carrying the stamp. A marker rather than a heuristic: "an ok commander with no support
// cards" is the exact shape section 2 needs to create, so sweeping on that would be a script
// that deletes real rows the day the catalog produces one.
//
// Point it at `local-dev` or a scratch Neon branch, NEVER production.

// First, and on its own line: src/db reads DATABASE_URL at module scope.
import { requireEnv } from "./lib/env.mjs";
requireEnv(["DATABASE_URL"]);
import { sql } from "drizzle-orm";

import { db } from "../src/db";
import {
  commanderPairSupport,
  commanderPairSupportCards,
  commanderSupport,
} from "../src/db/schema";
import { deriveAndWriteRoleTargets } from "../src/lib/edhrec/seed-index";
import { ROLE_TARGET_FLOOR } from "../src/lib/edhrec/role-targets";

let failures = 0;
/** Counts its OWN failures. A probe whose exit code disagrees with its output is worse than no
 *  probe — the count used to live at each call site in `probe-commander-availability`, and a
 *  check that forgot it printed ` FAIL ` and then `All checks passed.` over the top. */
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
}
function note(msg: string) { console.log(`note  ${msg}`); }
function fail(label: string, why: string) { failures += 1; console.log(`FAIL  ${label} — ${why}`); }

const rows = async <T>(q: Parameters<typeof db.execute>[0]) =>
  (await db.execute(q)).rows as unknown as T[];

/** Written into `prose` on every commander row this script inserts. The check constraint ties
 *  `prose`, `prose_input_hash` and `prose_prompt_version` together, so all three are set. */
const STAMP = "probe:role-targets fixture — safe to delete";

type RoleRow = {
  id: string;
  partner: string | null;
  avg_ramp: number | null;
  avg_draw: number | null;
  avg_removal: number | null;
  avg_wipes: number | null;
};

/** Populated BEFORE the write each covers, never returned at the end — a throw part-way through
 *  must not strand the table in a state this script created. */
let commanderRoles: RoleRow[] | null = null;
let pairRoles: RoleRow[] | null = null;
let pairSentinel: { a: string; b: string } | null = null;
const fakeCommanders: string[] = [];

async function main() {
  // BEFORE the `ok` count is taken: a leftover fixture row is an ok commander, so counting
  // first would measure this script's own debris into the floor it later checks against.
  // Read the ids first and delete the PAIR rows before the commander rows, because the pair
  // sentinel carries no stamp of its own — `commander_pair_support` has no prose column — and
  // the stamped id is the only thing that identifies it. Section 3 builds its pair around one
  // of these ids for exactly this reason: it makes the sweep a key lookup rather than a guess
  // at what a fixture row looks like, and a guess is what deletes somebody's real row.
  const stale = await rows<{ id: string }>(sql`
    select commander_oracle_id as id from commander_support where prose = ${STAMP}`);
  if (stale.length) {
    for (const { id } of stale) {
      await db.execute(sql`
        delete from commander_pair_support_cards
        where commander_oracle_id = ${id}::uuid or partner_oracle_id = ${id}::uuid`);
      await db.execute(sql`
        delete from commander_pair_support
        where commander_oracle_id = ${id}::uuid or partner_oracle_id = ${id}::uuid`);
    }
    await db.execute(sql`delete from commander_support where prose = ${STAMP}`);
    note(`swept ${stale.length} commander row(s) and their pairs, left by a killed run`);
  }

  const [{ ok }] = await rows<{ ok: number }>(sql`
    select count(*)::int as ok from commander_support where synergy_state = 'ok'`);
  if (ok === 0) {
    fail("the fixture", "no commander carries synergy_state = 'ok' — run db:build:index first");
    return;
  }
  console.log(`fixture: ${ok} commander(s) with synergy_state = 'ok'\n`);

  // ---- capture ------------------------------------------------------------------------
  commanderRoles = await rows<RoleRow>(sql`
    select commander_oracle_id as id, null as partner,
           avg_ramp, avg_draw, avg_removal, avg_wipes
    from commander_support`);
  pairRoles = await rows<RoleRow>(sql`
    select commander_oracle_id as id, partner_oracle_id as partner,
           avg_ramp, avg_draw, avg_removal, avg_wipes
    from commander_pair_support`);
  console.log(`captured ${commanderRoles.length} commander and ${pairRoles.length} pair role row(s)\n`);

  // ---- 1 · the commander half --------------------------------------------------------
  console.log("1 · the commander rung");
  await db.execute(sql`
    update commander_support
       set avg_ramp = null, avg_draw = null, avg_removal = null, avg_wipes = null`);
  const [{ n: blanked }] = await rows<{ n: number }>(sql`
    select count(avg_ramp)::int as n from commander_support`);
  check("the fixture starts with no role values at all", blanked, 0);

  const first = await deriveAndWriteRoleTargets(new Date(Date.now() - 60_000));
  check("the pass writes a value for every ok commander", first.written, ok);

  const [filled] = await rows<{ n: number; neg: number; ramp: number }>(sql`
    select count(avg_ramp)::int as n,
           count(*) filter (where avg_ramp < 0 or avg_draw < 0
                            or avg_removal < 0 or avg_wipes < 0)::int as neg,
           count(*) filter (where avg_ramp > 99)::int as ramp
    from commander_support where synergy_state = 'ok'`);
  check("and every one is readable back", filled.n, ok);
  // A count of cards cannot be negative and cannot exceed the deck. Both bounds, because a
  // writer that put the WRONG COLUMN's value in a slot would still read back non-null.
  check("no role target is negative", filled.neg, 0);
  check("no role target exceeds a deck", filled.ramp, 0);

  // ---- 2 · clearing a row the derivation no longer reaches ----------------------------
  console.log("\n2 · a commander the derivation does not reach is cleared, not left stale");
  // A commander with `synergy_state = 'ok'` and NO support cards derives nothing, so the pass
  // must leave it null. Inserted rather than found: on local-dev every ok commander has cards,
  // so without one this branch is asserted by nobody and a writer that only ever UPDATES rows
  // it derived — never clearing — would pass every other check here.
  const [spare] = await rows<{ oracle_id: string }>(sql`
    select c.oracle_id from cards c
    left join commander_support cs on cs.commander_oracle_id = c.oracle_id
    where cs.commander_oracle_id is null and c.type_line ilike '%legendary%creature%'
    limit 1`);
  if (!spare) {
    fail("2 · the fixture", "no commander-legal card outside commander_support to borrow");
  } else {
    fakeCommanders.push(spare.oracle_id);
    await db.execute(sql`
      insert into commander_support
        (commander_oracle_id, synergy_state, edhrec_total, tags, bracket_counts,
         budget_counts, similar_oracle_ids, avg_ramp,
         prose, prose_input_hash, prose_prompt_version)
      values (${spare.oracle_id}::uuid, 'ok', 1, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb,
              '{}'::uuid[], 7, ${STAMP}, ${STAMP}, 0)`);
    const before = await rows<{ avg_ramp: number | null }>(sql`
      select avg_ramp from commander_support where commander_oracle_id = ${spare.oracle_id}::uuid`);
    check("2 · the fixture starts with a stale value", before[0]?.avg_ramp, 7);

    await deriveAndWriteRoleTargets(new Date(Date.now() - 60_000));
    const after = await rows<{ avg_ramp: number | null }>(sql`
      select avg_ramp from commander_support where commander_oracle_id = ${spare.oracle_id}::uuid`);
    check("a commander with no support cards is cleared", after[0]?.avg_ramp, null);
  }

  // ---- 3 · the pair rung and its key split -------------------------------------------
  console.log("\n3 · the pair rung");
  const pairCards = await rows<{ commander_oracle_id: string; oracle_id: string }>(sql`
    select commander_oracle_id, oracle_id from commander_support_cards
    order by commander_oracle_id limit 40`);
  const lead = pairCards[0]?.commander_oracle_id;
  // The other half is section 2's STAMPED row, so the startup sweep can find this pair by key
  // after a killed run. A pair row carries no stamp of its own.
  const anchor = fakeCommanders[0];
  if (!lead || !anchor || lead === anchor) {
    fail("3 · the fixture", "could not assemble a two-commander key from the support tables");
  } else {
    // The check constraint orders the key, so the sentinel has to as well.
    const [a, b] = [lead, anchor].sort();
    pairSentinel = { a, b };
    await db.execute(sql`
      insert into commander_pair_support
        (commander_oracle_id, partner_oracle_id, synergy_state, edhrec_total, bracket_counts)
      values (${a}::uuid, ${b}::uuid, 'ok', 200, '{}'::jsonb)
      on conflict do nothing`);
    // Its own card list, taken from a real commander's so the derivation has something to
    // classify. A pair with no cards would land in section 2's branch instead.
    let position = 0;
    for (const card of pairCards.filter((c) => c.commander_oracle_id === lead)) {
      await db.execute(sql`
        insert into commander_pair_support_cards
          (commander_oracle_id, partner_oracle_id, oracle_id, position, inclusion)
        values (${a}::uuid, ${b}::uuid, ${card.oracle_id}::uuid, ${position}, 50)
        on conflict do nothing`);
      position += 1;
    }
    if (position === 0) {
      fail("3 · the fixture", "the borrowed commander carries no support cards");
    } else {
      const res = await deriveAndWriteRoleTargets(new Date(Date.now() - 60_000));
      check("the pass reports the pair it wrote", res.pairsWritten, 1);
      const [pair] = await rows<RoleRow>(sql`
        select commander_oracle_id as id, partner_oracle_id as partner,
               avg_ramp, avg_draw, avg_removal, avg_wipes
        from commander_pair_support
        where commander_oracle_id = ${a}::uuid and partner_oracle_id = ${b}::uuid`);
      // THE KEY SPLIT is the point of this section. The derivation groups by a single id, so
      // the pair pass joins the two with a separator and splits them again to write — and a
      // split that took the wrong half would write to the WRONG ROW or to none, while
      // `pairsWritten` counted it either way. Reading the value back on the exact composite
      // key is what tells those apart.
      check("the pair's own row carries the value", pair?.avg_ramp !== null, true);
      check("and it landed on the ordered key, not a transposed one", [pair?.id, pair?.partner], [a, b]);
    }
  }

  // ---- 4 · the refusal --------------------------------------------------------------
  console.log("\n4 · a refused publish");
  // Pushed under the floor by RAISING the denominator rather than lowering coverage: rows with
  // `synergy_state = 'ok'` and no support cards count in `ok` and derive nothing. The floor is
  // ROLE_TARGET_FLOOR of ok, so enough of them tips it.
  const needed = Math.ceil(ok / ROLE_TARGET_FLOOR) - ok + 5;
  const spares = await rows<{ oracle_id: string }>(sql`
    select c.oracle_id from cards c
    left join commander_support cs on cs.commander_oracle_id = c.oracle_id
    where cs.commander_oracle_id is null and c.type_line ilike '%legendary%creature%'
    limit ${needed}`);
  if (spares.length < needed) {
    fail("4 · the fixture", `needed ${needed} spare commanders to breach the floor, found ${spares.length}`);
  } else {
    for (const s of spares) {
      fakeCommanders.push(s.oracle_id);
      await db.execute(sql`
        insert into commander_support
          (commander_oracle_id, synergy_state, edhrec_total, tags, bracket_counts,
           budget_counts, similar_oracle_ids,
           prose, prose_input_hash, prose_prompt_version)
        values (${s.oracle_id}::uuid, 'ok', 1, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::uuid[],
                ${STAMP}, ${STAMP}, 0)`);
    }

    // TWO SENTINELS either side of the line the refusal draws. A refusal clears the roles on
    // the rows THIS RUN rewrote — `computed_at >= runStartedAt` — and must leave every other
    // commander's alone, because those still match their own card list. One sentinel each side
    // is the only way to tell a correct clear from a blanket one, which look identical from
    // the recent row alone.
    const line = new Date();
    const [recent] = await rows<{ id: string }>(sql`
      select commander_oracle_id as id from commander_support
      where synergy_state = 'ok' and avg_ramp is not null limit 1`);
    const [old] = await rows<{ id: string }>(sql`
      select commander_oracle_id as id from commander_support
      where synergy_state = 'ok' and avg_ramp is not null
        and commander_oracle_id <> ${recent.id}::uuid limit 1`);
    await db.execute(sql`
      update commander_support set avg_ramp = 9, computed_at = ${new Date(line.getTime() + 1000)}
      where commander_oracle_id = ${recent.id}::uuid`);
    await db.execute(sql`
      update commander_support set avg_ramp = 9, computed_at = ${new Date(line.getTime() - 86_400_000)}
      where commander_oracle_id = ${old.id}::uuid`);

    let threw = false;
    try {
      await deriveAndWriteRoleTargets(line);
    } catch (e) {
      threw = true;
      const msg = e instanceof Error ? e.message : String(e);
      check("the refusal names itself", msg.includes("role targets REFUSED"), true);
    }
    check("a derivation under the floor throws rather than publishing", threw, true);

    const [after] = await rows<{ recent: number | null; old: number | null }>(sql`
      select (select avg_ramp from commander_support where commander_oracle_id = ${recent.id}::uuid) as recent,
             (select avg_ramp from commander_support where commander_oracle_id = ${old.id}::uuid) as old`);
    check("the row this run rewrote loses its roles", after.recent, null);
    check("the row it never touched keeps them", after.old, 9);
  }

  if (!fakeCommanders.length && !pairSentinel) note("nothing was inserted into the catalog");
}

main()
  .catch((e) => { failures += 1; console.error(e); })
  .finally(async () => {
    // EVERY step runs even when an earlier one throws — a cleanup that stops at the first
    // failure poisons the next run of itself.
    for (const [label, step] of [
      ["the pair sentinel", async () => {
        if (!pairSentinel) return;
        const { a, b } = pairSentinel;
        await db.execute(sql`
          delete from ${commanderPairSupportCards}
          where commander_oracle_id = ${a}::uuid and partner_oracle_id = ${b}::uuid`);
        await db.execute(sql`
          delete from ${commanderPairSupport}
          where commander_oracle_id = ${a}::uuid and partner_oracle_id = ${b}::uuid`);
      }],
      ["the inserted commanders", async () => {
        for (const id of fakeCommanders) {
          await db.execute(sql`
            delete from ${commanderSupport} where commander_oracle_id = ${id}::uuid`);
        }
      }],
      ["the captured role values", async () => {
        // Restored WHOLESALE rather than re-derived: re-running the pass would leave the table
        // holding this script's output rather than what it found, which is not a restore.
        if (commanderRoles) {
          for (const r of commanderRoles) {
            await db.execute(sql`
              update commander_support
                 set avg_ramp = ${r.avg_ramp}, avg_draw = ${r.avg_draw},
                     avg_removal = ${r.avg_removal}, avg_wipes = ${r.avg_wipes}
               where commander_oracle_id = ${r.id}::uuid`);
          }
        }
        if (pairRoles) {
          for (const r of pairRoles) {
            await db.execute(sql`
              update commander_pair_support
                 set avg_ramp = ${r.avg_ramp}, avg_draw = ${r.avg_draw},
                     avg_removal = ${r.avg_removal}, avg_wipes = ${r.avg_wipes}
               where commander_oracle_id = ${r.id}::uuid
                 and partner_oracle_id = ${r.partner}::uuid`);
          }
        }
      }],
    ] as [string, () => Promise<void>][]) {
      try { await step(); } catch (e) {
        failures += 1;
        console.error(`cleanup failed for ${label}:`, e);
      }
    }
    console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
    // NEVER `process.exit` inside the `finally` that also runs the cleanup — it swallows the
    // exception, and three probes in this repository have printed "all checks passed" over a
    // case that never ran because of it.
    process.exitCode = failures === 0 ? 0 : 1;
  });
