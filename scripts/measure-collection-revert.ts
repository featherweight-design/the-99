// measure:collection-revert — what the ledger's deck check costs on a real collection.
//
// The deck check reads committed claims for every card a change LOWERS, before and after the
// write, inside the write's own transaction (plan `2026-10-09-collection-write-path.md`,
// Decision 5). Its worst case is reverting a large Replace that RAISED most of the collection:
// the revert lowers every one of those rows, so both claim reads span the whole collection.
// This times that case on the busiest account, before any UI waits on it:
//
//   1. a Replace raising every row by one (the entry a revert will undo), applied;
//   2. that revert as a dry run (the confirmation's preview), median of 3;
//   3. the claim read alone over the same cards, median of 3, to split the check from the write;
//   4. the revert applied, with the warning the dry run named;
//   5. what a one-card edit costs the next Commanders visit: every write clears the player's
//      `commander_scores` (plan Decision 4), so the next ranked list recomputes from scratch.
//      Timed as `recommendCommanders`, the compute that recompute runs, median of 3.
//
// It WRITES the account's collection, so it runs only on a scratch branch: refused on production
// and staging by `neon.branch_id`. Make one from staging (`pull:staging` is not needed: a branch
// of staging already holds the real collection and decks) and point DATABASE_URL at it.
//
// Run: `pnpm measure:collection-revert`
import { requireEnv } from "./lib/env.mjs";
import { randomUUID } from "node:crypto";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { applyCollectionChange } from "../src/lib/collection/write";
import { loadAvailability } from "../src/lib/decks/availability-query";
import type { PendingItem } from "../src/lib/collection/pending";
import { recommendCommanders } from "../src/lib/recs/recommend";
// No signed-in reader here: every switch read takes the environment itself (`process.env`).

neonConfig.webSocketConstructor = ws;

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL, max: 2 });
const PRODUCTION = "br-noisy-violet-a6vw4ess";
const STAGING = "br-polished-pond-a6e63y0b";

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const timed = async <T>(f: () => Promise<T>): Promise<[T, number]> => {
  const t = performance.now();
  const out = await f();
  return [out, performance.now() - t];
};

async function main() {
  const { branch } = (await pool.query("select current_setting('neon.branch_id', true) as branch")).rows[0];
  if (!branch || branch === PRODUCTION || branch === STAGING) {
    throw new Error(`refusing branch ${branch ?? "(unknown)"}: this writes; point DATABASE_URL at a scratch branch`);
  }
  const { user_id: userId } = (await pool.query(
    "select user_id from collection_items group by user_id order by count(*) desc limit 1",
  )).rows[0];
  const items: PendingItem[] = (await pool.query(
    `select oracle_id, set_code, collector_number, finish, scryfall_id, condition, quantity
       from collection_items where user_id = $1`, [userId],
  )).rows.map((r) => ({
    oracleId: r.oracle_id, setCode: r.set_code, collectorNumber: r.collector_number,
    finish: r.finish, scryfallId: r.scryfall_id, condition: r.condition, quantity: r.quantity + 1,
  }));
  const decks = (await pool.query(
    "select count(*)::int as n from deck_versions v join decks d on d.id = v.deck_id where d.user_id = $1", [userId],
  )).rows[0].n;
  console.log(`branch ${branch} · ${items.length} collection rows · ${decks} committed versions`);

  // Everything below writes the account. The `finally` puts its collection back exactly as it was
  // and drops the ledger entries this run made, so a rerun measures the same staging-derived
  // fixture rather than one this script has already moved. Scores are a cache: the next read
  // recomputes them.
  const original = (await pool.query("select * from collection_items where user_id = $1", [userId])).rows;
  const { seq: seqBefore } = (await pool.query(
    "select coalesce(max(seq), 0) as seq from collection_history where user_id = $1", [userId],
  )).rows[0];
  try {
    const replaceId = randomUUID();
    const [replaced, replaceMs] = await timed(() =>
      applyCollectionChange(userId, { kind: "replace", items }, { id: replaceId, env: process.env }));
    if (replaced.status !== "applied") throw new Error(`replace: ${replaced.status}`);
    console.log(`TIME  Replace raising ${replaced.entry.raised} rows, applied: ${replaceMs.toFixed(0)}ms`);

    const dry: number[] = [];
    let shown: Awaited<ReturnType<typeof applyCollectionChange>> | null = null;
    for (let i = 0; i < 3; i++) {
      const [r, ms] = await timed(() =>
        applyCollectionChange(userId, { kind: "revert", entryId: replaceId }, { id: randomUUID(), dryRun: true, env: process.env }));
      shown = r;
      dry.push(ms);
    }
    if (shown?.status !== "preview") throw new Error(`revert preview: ${shown?.status}`);
    const lowered = [...new Set(shown.rows.filter((r) => (r.after?.quantity ?? 0) < (r.before?.quantity ?? 0)).map((r) => r.oracleId))];
    console.log(`TIME  revert dry run (lowers ${shown.lowered} rows, ${lowered.length} cards; names ${shown.decks.length} short deck-cards): median ${median(dry).toFixed(0)}ms of ${dry.map((x) => x.toFixed(0)).join(", ")}`);

    const reads: number[] = [];
    for (let i = 0; i < 3; i++) reads.push((await timed(() => loadAvailability(userId, { oracleIds: lowered, env: process.env })))[1]);
    console.log(`TIME  one claim read over those ${lowered.length} cards: median ${median(reads).toFixed(0)}ms of ${reads.map((x) => x.toFixed(0)).join(", ")} (the check makes two)`);

    const [reverted, revertMs] = await timed(() => applyCollectionChange(
      userId, { kind: "revert", entryId: replaceId }, { id: randomUUID(), confirmShort: shown.status === "preview" ? shown.decks : [], env: process.env },
    ));
    console.log(`TIME  revert applied: ${revertMs.toFixed(0)}ms (${reverted.status})`);

    const one = items[0];
    const [edited, editMs] = await timed(() => applyCollectionChange(
      userId, { kind: "edit", rows: [{ ...one, collectorNumber: one.collectorNumber ?? "", finish: one.finish ?? "nonfoil", quantity: one.quantity + 1 }] },
      { id: randomUUID(), env: process.env },
    ));
    const scores = (await pool.query("select count(*)::int as n from commander_scores where user_id = $1", [userId])).rows[0].n;
    console.log(`TIME  one-card edit: ${editMs.toFixed(0)}ms (${edited.status}); scores left after it: ${scores}`);
    const recompute: number[] = [];
    for (let i = 0; i < 3; i++) recompute.push((await timed(() => recommendCommanders(userId, process.env)))[1]);
    console.log(`TIME  the recompute the next Commanders visit pays: median ${median(recompute).toFixed(0)}ms of ${recompute.map((x) => x.toFixed(0)).join(", ")}`);
  } finally {
    const c = await pool.connect();
    try {
      await c.query("begin");
      await c.query("delete from collection_items where user_id = $1", [userId]);
      // One statement: the rows read back above, as the table's own record type.
      await c.query(
        "insert into collection_items select * from jsonb_populate_recordset(null::collection_items, $1::jsonb)",
        [JSON.stringify(original)],
      );
      // One statement: the entries' references to each other are checked at its end.
      await c.query("delete from collection_history where user_id = $1 and seq > $2", [userId, seqBefore]);
      await c.query("delete from commander_scores where user_id = $1", [userId]);
      await c.query("commit");
      console.log(`restored ${original.length} rows`);
    } catch (error) {
      await c.query("rollback");
      throw error;
    } finally {
      c.release();
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
