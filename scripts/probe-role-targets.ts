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
//     support cards, which is what pushes the derivation under its floor, and deletes them;
//   * the publish and the refusal now clear `commander_scores` WHOLESALE, for every user, as
//     the shipped pass does. That is not put back: a cleared score is recomputed on the next
//     load. A score planted under a per-run user is what the clear is read against.
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
/**
 * The pair sentinel's PROVENANCE marker, in the one free-form column that table has.
 *
 * `commander_pair_support` carries no prose column, so the commander side's stamp has nowhere
 * to go here. An earlier version used `edhrec_total = 200`, which is not provenance at all: a
 * real pair can legitimately have that total, so a stranded fixture whose endpoint later became
 * a real commander could take a real pair and its cards with it. `bracket_counts` is written by
 * the real writer from EDHREC's own buckets and can never hold this key — and if the real
 * writer ever rewrites the row, the marker is gone and the sweep correctly leaves it alone.
 */
const PAIR_PROVENANCE = { "probe:role-targets": 1 };

/** A pass that replaced no support list owns no row, so a refusal inside it clears nothing.
 *  Every section but the refusal one derives without having written, which is exactly this. */
const OWNS_NOTHING = { commanders: [] as string[], pairs: [] as [string, string][] };

type RoleRow = {
  id: string;
  partner: string | null;
  avg_ramp: number | null;
  avg_draw: number | null;
  avg_removal: number | null;
  avg_wipes: number | null;
  // The label pass clears and rewrites these four with `avg_*`, so the restore covers all eight.
  label_ramp: number | null;
  label_draw: number | null;
  label_removal: number | null;
  label_wipes: number | null;
};

/** Populated BEFORE the write each covers, never returned at the end — a throw part-way through
 *  must not strand the table in a state this script created. */
let commanderRoles: RoleRow[] | null = null;
let pairRoles: RoleRow[] | null = null;
let pairSentinel: { a: string; b: string } | null = null;
const fakeCommanders: string[] = [];

// A STORED SCORE, so the clear has something to delete. Under a per-run user, which the
// `finally` removes if a clear did not; any commander id serves, since only its deletion is read.
const SCORE_USER = `probe-role-targets-${process.pid}-${Date.now()}`;
async function plantScore() {
  await db.execute(sql`
    insert into commander_scores
      (user_id, oracle_id, slug, score, rank_score, fit_pool, fit_roles, fit_synergy,
       synergy_state, receipts, color_pool_size, role_counts)
    select ${SCORE_USER}, commander_oracle_id, 'probe-role-targets', 50, 50, 0, 0, 0, 'ok', '', 1,
           '{"ramp":0,"draw":0,"removal":0,"wipes":0}'::jsonb
      from commander_support order by commander_oracle_id limit 1`);
}
async function scoreCount() {
  const [{ n }] = await rows<{ n: number }>(sql`
    select count(*)::int as n from commander_scores where user_id = ${SCORE_USER}`);
  return n;
}

async function main() {
  // BEFORE the `ok` count is taken: a leftover fixture row is an ok commander, so counting
  // first would measure this script's own debris into the floor it later checks against.
  // Read the ids first and delete the PAIR rows before the commander rows, because the pair
  // sentinel carries no stamp of its own — `commander_pair_support` has no prose column — and
  // the stamped id is the only thing that identifies it. Section 3 builds its pair around one
  // of these ids for exactly this reason: it makes the sweep a key lookup rather than a guess
  // at what a fixture row looks like, and a guess is what deletes somebody's real row.
  // THE STAMP ALONE IS NOT ENOUGH, and the reason is that the id under it is a REAL CARD's.
  // A killed run leaves the marker behind; nothing in the index upsert clears `prose`, so if a
  // later catalog or index run makes that card a genuine commander the stamp is still sitting
  // on a row that is now somebody's data. The sweep therefore also requires the row to still
  // LOOK like what this script inserts — the sentinel total, no deck count, and no support
  // cards — so a row that has become real is left alone and simply loses its marker's meaning
  // rather than its contents. Stamp for intent, shape for currency; neither on its own.
  // The shape is the columns a real index row always fills and this script never does —
  // `tags`, `deck_count`, `rank`. Deliberately NOT "has no support cards": section 2b's
  // fixture carries some on purpose, so that clause would leave exactly the row a killed run
  // is most likely to strand.
  const stale = await rows<{ id: string }>(sql`
    select cs.commander_oracle_id as id from commander_support cs
    where cs.prose = ${STAMP}
      and cs.deck_count is null and cs.rank is null and cs.tags = '[]'::jsonb`);
  if (stale.length) {
    for (const { id } of stale) {
      // Scoped to the sentinel's own shape as well as the stamped id. A real pair row could
      // legitimately name this card once it becomes a commander, and deleting by id alone
      // would take it and its cards with it.
      await db.execute(sql`
        delete from commander_pair_support_cards c
        where (c.commander_oracle_id = ${id}::uuid or c.partner_oracle_id = ${id}::uuid)
          and exists (select 1 from commander_pair_support p
                       where p.commander_oracle_id = c.commander_oracle_id
                         and p.partner_oracle_id = c.partner_oracle_id
                         and p.bracket_counts = ${JSON.stringify(PAIR_PROVENANCE)}::jsonb)`);
      await db.execute(sql`
        delete from commander_pair_support
        where (commander_oracle_id = ${id}::uuid or partner_oracle_id = ${id}::uuid)
          and bracket_counts = ${JSON.stringify(PAIR_PROVENANCE)}::jsonb`);
    }
    for (const { id } of stale) {
      await db.execute(sql`
        delete from commander_support_cards where commander_oracle_id = ${id}::uuid`);
      await db.execute(sql`
        delete from commander_support where commander_oracle_id = ${id}::uuid`);
    }
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
           avg_ramp, avg_draw, avg_removal, avg_wipes,
           label_ramp, label_draw, label_removal, label_wipes
    from commander_support`);
  pairRoles = await rows<RoleRow>(sql`
    select commander_oracle_id as id, partner_oracle_id as partner,
           avg_ramp, avg_draw, avg_removal, avg_wipes,
           label_ramp, label_draw, label_removal, label_wipes
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

  await plantScore();
  const first = await deriveAndWriteRoleTargets(OWNS_NOTHING);
  check("the pass writes a value for every ok commander", first.written, ok);
  check("the publish clears the stored scores in its own transaction", await scoreCount(), 0);

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

    await deriveAndWriteRoleTargets(OWNS_NOTHING);
    const after = await rows<{ avg_ramp: number | null }>(sql`
      select avg_ramp from commander_support where commander_oracle_id = ${spare.oracle_id}::uuid`);
    check("a commander with no support cards is cleared", after[0]?.avg_ramp, null);
  }

  // Read once and shared by 2b and 3: both need real support cards to borrow, and reading the
  // table twice after 2b has written to it would give them different sets.
  const pairCardSource = await rows<{ commander_oracle_id: string; oracle_id: string }>(sql`
    select commander_oracle_id, oracle_id from commander_support_cards
    order by commander_oracle_id limit 40`);

  // ---- 2b · a header that is not `ok` is not derived for ------------------------------
  console.log("\n2b · a non-ok header carrying cards gets no roles");
  // The derivation reads `commander_support_cards`, and the index loop leaves a degraded
  // header AND its previous cards in place — so without a restriction those stale commanders
  // count toward a floor whose denominator is `ok` alone, and a run reaching well under 90% of
  // the current `ok` commanders passes it. Unreachable on any database today (every row on
  // staging and local-dev is `ok`, and `degraded` is never written), so the state has to be
  // BUILT or this rule is asserted by nobody.
  const [spare2] = await rows<{ oracle_id: string }>(sql`
    select c.oracle_id from cards c
    left join commander_support cs on cs.commander_oracle_id = c.oracle_id
    where cs.commander_oracle_id is null and c.type_line ilike '%legendary%creature%'
    limit 1`);
  const donor = pairCardSource[0];
  if (!spare2 || !donor) {
    fail("2b · the fixture", "no spare commander, or no support cards to borrow");
  } else {
    fakeCommanders.push(spare2.oracle_id);
    // `absent` rather than `degraded` only because the check constraint ties `edhrec_total` to
    // `ok`; what is under test is "not ok", and both states take the same branch.
    await db.execute(sql`
      insert into commander_support
        (commander_oracle_id, synergy_state, edhrec_total, tags, bracket_counts,
         budget_counts, similar_oracle_ids, avg_ramp,
         prose, prose_input_hash, prose_prompt_version)
      values (${spare2.oracle_id}::uuid, 'absent', null, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb,
              '{}'::uuid[], 7, ${STAMP}, ${STAMP}, 0)`);
    let placed = 0;
    for (const card of pairCardSource.slice(0, 20)) {
      await db.execute(sql`
        insert into commander_support_cards (commander_oracle_id, oracle_id, inclusion)
        values (${spare2.oracle_id}::uuid, ${card.oracle_id}::uuid, 60)
        on conflict do nothing`);
      placed += 1;
    }
    check("2b · the fixture carries support cards", placed > 0, true);
    const before = await rows<{ n: number }>(sql`
      select count(*)::int as n from commander_support_cards
      where commander_oracle_id = ${spare2.oracle_id}::uuid`);
    check("and they are readable", (before[0]?.n ?? 0) > 0, true);

    const res2 = await deriveAndWriteRoleTargets(OWNS_NOTHING);
    const [after2] = await rows<{ avg_ramp: number | null }>(sql`
      select avg_ramp from commander_support where commander_oracle_id = ${spare2.oracle_id}::uuid`);
    // Its cards would classify perfectly well — the point is that its HEADER excludes it.
    check("a non-ok header gets no roles despite its cards", after2?.avg_ramp, null);
    // And it is not counted into the floor's numerator either, which is the half that lets a
    // thin run pass. `ok` has not changed, so a correct numerator still equals it.
    check("and does not inflate the derived count", res2.written, ok);
    await db.execute(sql`
      delete from commander_support_cards where commander_oracle_id = ${spare2.oracle_id}::uuid`);
  }

  // ---- 3 · the pair rung and its key split -------------------------------------------
  console.log("\n3 · the pair rung");
  const pairCards = pairCardSource;
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
    // REGISTERED ONLY IF THIS RUN INSERTED IT. `on conflict do nothing` is silent about which
    // happened, and the cleanup below deletes the pair and every one of its cards — so on a
    // database that already held this pair, an unconditional registration would delete real
    // rows and then report a clean cleanup.
    const inserted = await rows<{ id: string }>(sql`
      insert into commander_pair_support
        (commander_oracle_id, partner_oracle_id, synergy_state, edhrec_total, bracket_counts)
      values (${a}::uuid, ${b}::uuid, 'ok', 200, ${JSON.stringify(PAIR_PROVENANCE)}::jsonb)
      on conflict do nothing
      returning commander_oracle_id as id`);
    if (inserted.length === 0) {
      // The handle is dropped rather than kept: the row belongs to somebody else, and the
      // cleanup's whole job is to remove only what this run created.
      pairSentinel = null;
      fail("3 · the fixture",
        "the chosen pair key already exists — this probe will not write to, or delete, a pair it did not create");
    } else {
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
      const res = await deriveAndWriteRoleTargets(OWNS_NOTHING);
      check("the pass reports the pair it wrote", res.pairsWritten, 1);
      const [pair] = await rows<RoleRow>(sql`
        select commander_oracle_id as id, partner_oracle_id as partner,
               avg_ramp, avg_draw, avg_removal, avg_wipes,
               label_ramp, label_draw, label_removal, label_wipes
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

    // TWO SENTINELS, one OWNED by the simulated run and one not. A refusal clears the roles on
    // exactly the rows that run replaced and must leave every other commander's alone, because
    // those still match their own card list. One sentinel on the owned side alone cannot tell
    // a correct clear from a blanket one — they look identical from there.
    //
    // Ownership is the ID LIST the run carries, not a timestamp. The earlier version stamped
    // `computed_at` either side of a line and scoped the clear to it, which looks like the same
    // test and is weaker: a time range also covers a CONCURRENT build's rows, and this check
    // would have passed while a refusal wiped that build's freshly derived roles.
    const [owned] = await rows<{ id: string }>(sql`
      select commander_oracle_id as id from commander_support
      where synergy_state = 'ok' and avg_ramp is not null limit 1`);
    const [other] = await rows<{ id: string }>(sql`
      select commander_oracle_id as id from commander_support
      where synergy_state = 'ok' and avg_ramp is not null
        and commander_oracle_id <> ${owned.id}::uuid limit 1`);
    await db.execute(sql`
      update commander_support set avg_ramp = 9
      where commander_oracle_id in (${owned.id}::uuid, ${other.id}::uuid)`);

    await plantScore();
    let threw = false;
    try {
      await deriveAndWriteRoleTargets({ commanders: [owned.id], pairs: [] });
    } catch (e) {
      threw = true;
      const msg = e instanceof Error ? e.message : String(e);
      check("the refusal names itself", msg.includes("role targets REFUSED"), true);
    }
    check("a derivation under the floor throws rather than publishing", threw, true);

    const [after] = await rows<{ owned: number | null; other: number | null }>(sql`
      select (select avg_ramp from commander_support where commander_oracle_id = ${owned.id}::uuid) as owned,
             (select avg_ramp from commander_support where commander_oracle_id = ${other.id}::uuid) as other`);
    check("the row this run rewrote loses its roles", after.owned, null);
    check("the row it never touched keeps them", after.other, 9);
    check("the refusal clears the stored scores with the roles it nulled", await scoreCount(), 0);
  }

  if (!fakeCommanders.length && !pairSentinel) note("nothing was inserted into the catalog");
}

main()
  .catch((e) => { failures += 1; console.error(e); })
  .finally(async () => {
    // EVERY step runs even when an earlier one throws — a cleanup that stops at the first
    // failure poisons the next run of itself.
    for (const [label, step] of [
      ["the planted score", async () => {
        await db.execute(sql`delete from commander_scores where user_id = ${SCORE_USER}`);
      }],
      ["the pair sentinel", async () => {
        if (!pairSentinel) return;
        const { a, b } = pairSentinel;
        // SCOPED TO THE SENTINEL'S SHAPE as well as its key. The handle is populated before
        // the insert, as every handle here is, so a throw part-way through is still covered —
        // but that means it can name a key this run did not end up creating, and this delete
        // takes a pair and every one of its cards.
        await db.execute(sql`
          delete from ${commanderPairSupportCards} c
          where c.commander_oracle_id = ${a}::uuid and c.partner_oracle_id = ${b}::uuid
            and exists (select 1 from ${commanderPairSupport} p
                         where p.commander_oracle_id = ${a}::uuid
                           and p.partner_oracle_id = ${b}::uuid
                           and p.bracket_counts = ${JSON.stringify(PAIR_PROVENANCE)}::jsonb)`);
        await db.execute(sql`
          delete from ${commanderPairSupport}
          where commander_oracle_id = ${a}::uuid and partner_oracle_id = ${b}::uuid
            and bracket_counts = ${JSON.stringify(PAIR_PROVENANCE)}::jsonb`);
      }],
      ["the inserted commanders", async () => {
        // SCOPED TO THE FIXTURE SHAPE, exactly as the startup sweep is. That sweep already
        // concedes a stamped id can become a real commander; nothing makes the window between
        // this run's insert and its `finally` special, and an unconditional delete here would
        // take the real header and its support cards with it.
        for (const id of fakeCommanders) {
          const [mine] = await rows<{ id: string }>(sql`
            select commander_oracle_id as id from ${commanderSupport}
            where commander_oracle_id = ${id}::uuid and prose = ${STAMP}
              and deck_count is null and rank is null and tags = '[]'::jsonb`);
          if (!mine) continue;
          await db.execute(sql`
            delete from commander_support_cards where commander_oracle_id = ${id}::uuid`);
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
                     avg_removal = ${r.avg_removal}, avg_wipes = ${r.avg_wipes},
                     label_ramp = ${r.label_ramp}, label_draw = ${r.label_draw},
                     label_removal = ${r.label_removal}, label_wipes = ${r.label_wipes}
               where commander_oracle_id = ${r.id}::uuid`);
          }
        }
        if (pairRoles) {
          for (const r of pairRoles) {
            await db.execute(sql`
              update commander_pair_support
                 set avg_ramp = ${r.avg_ramp}, avg_draw = ${r.avg_draw},
                     avg_removal = ${r.avg_removal}, avg_wipes = ${r.avg_wipes},
                     label_ramp = ${r.label_ramp}, label_draw = ${r.label_draw},
                     label_removal = ${r.label_removal}, label_wipes = ${r.label_wipes}
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
