// probe:added-at: `collection_items.added_at` against a real Postgres (Date added, PR 1; plan
// `2026-10-15-collection-added-at.md`).
//
// What only a database can answer is what the writers LEAVE in the two columns. It proves:
//
//   1. THE FILE THAT FILLS AN EMPTY COLLECTION is dated inexact: every holding shares one date, and
//      `added_exact` is false on all of them (applyCollectionChange Replace and the legacy replaceCollection).
//   2. A HAND ADD of a new card is exact, and leaves the first file's dates alone.
//   3. A QUANTITY EDIT keeps the date.
//   4. A SECOND FILE (Replace) keeps every standing holding's date and stamps a NEW holding exact, because the
//      collection had content.
//   5. A REMOVAL AND A RE-ADD IS A NEW DATE; the REVERT of the removal puts the old date and its exactness back.
//   6. THE LEGACY REPLACE (import.ts) behaves as the ledger's does.
//   7. THE BACKFILL: a holding whose current ownership began with a hand entry takes that entry's time, exact; else
//      the first confirmed upload holding it, INEXACT always; a holding added, removed and not brought back by a
//      hand entry is not dated to its first life; a holding in none stays null; a second run changes nothing.
//
// It writes under a per-run user_id and deletes everything that id created in a `finally`. Refused on
// production and staging; point DATABASE_URL at local-dev or a scratch branch.
//
// Run: `pnpm probe:added-at`
import { requireEnv } from "./lib/env.mjs";
import { randomUUID } from "node:crypto";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { applyCollectionChange } from "../src/lib/collection/write";
import { replaceCollection } from "../src/lib/collection/import";
import { backfillAddedAt } from "../src/lib/collection/added-at-backfill";
// No signed-in reader here: every switch read takes the environment itself (`process.env`).

neonConfig.webSocketConstructor = ws;

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL, max: 4 });
const USER = `probe-added-at-${Date.now()}`;
const USER_LEGACY = `probe-added-at-legacy-${Date.now()}`;
const USER_BF = `probe-added-at-backfill-${Date.now()}`;
const PRODUCTION = "br-noisy-violet-a6vw4ess";
const STAGING = "br-polished-pond-a6e63y0b";

let failures = 0;
const check = (label: string, ok: boolean, detail: string) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — ${detail}`);
};

type Row = { added_at: Date | null; added_exact: boolean; quantity: number };
const rowOf = async (user: string, oracleId: string): Promise<Row | undefined> =>
  (await pool.query("select added_at, added_exact, quantity from collection_items where user_id = $1 and oracle_id = $2", [user, oracleId]))
    .rows[0] as Row | undefined;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const { branch } = (await pool.query("select current_setting('neon.branch_id', true) as branch")).rows[0] as { branch: string | null };
  if (!branch || branch === PRODUCTION || branch === STAGING) {
    throw new Error(`refusing branch ${branch ?? "(unknown)"}; point DATABASE_URL at local-dev or a scratch branch`);
  }
  const picked = (await pool.query(
    "select oracle_id, name from cards where type_line not like '%Basic%' order by oracle_id limit 7",
  )).rows as { oracle_id: string; name: string }[];
  if (picked.length < 6) throw new Error("the catalog holds fewer than seven cards");
  const [A, B, C, D, E, F, G] = picked.map((p) => p.oracle_id);
  const at = (oracleId: string) => ({ oracleId, setCode: "prb", collectorNumber: "1", finish: "nonfoil" as const });
  const item = (oracleId: string, quantity = 1) => ({ ...at(oracleId), condition: null, quantity });
  console.log(`branch ${branch} · fixture ${USER}`);

  try {
    // ---- 1. The file that fills an empty collection ----------------------------------------
    await applyCollectionChange(USER, { kind: "replace", items: [item(A), item(B)] }, { id: randomUUID(), env: process.env });
    const a1 = await rowOf(USER, A);
    const b1 = await rowOf(USER, B);
    check("the first file's holdings are dated, inexact, and share one date",
      !!a1?.added_at && !!b1?.added_at && a1.added_exact === false && b1.added_exact === false
        && a1.added_at.getTime() === b1.added_at.getTime(),
      `${a1?.added_at?.toISOString()} exact ${a1?.added_exact}; ${b1?.added_at?.toISOString()} exact ${b1?.added_exact}`);

    await sleep(30);
    // ---- 2. A hand add ---------------------------------------------------------------------
    await applyCollectionChange(USER, { kind: "add", items: [item(C)] }, { id: randomUUID(), env: process.env });
    const c1 = await rowOf(USER, C);
    const a2 = await rowOf(USER, A);
    check("a hand add is exact and later than the first file",
      c1?.added_exact === true && !!c1.added_at && !!a1?.added_at && c1.added_at > a1.added_at,
      `${c1?.added_at?.toISOString()} exact ${c1?.added_exact}`);
    check("a hand add leaves the first file's date alone", a2?.added_at?.getTime() === a1?.added_at?.getTime(), `${a2?.added_at?.toISOString()}`);

    // ---- 3. A quantity edit ----------------------------------------------------------------
    await applyCollectionChange(USER, { kind: "edit", rows: [{ ...at(C), quantity: 3, expected: 1 }] }, { id: randomUUID(), env: process.env });
    const c2 = await rowOf(USER, C);
    check("a quantity edit keeps the date and the exactness",
      c2?.quantity === 3 && c2.added_at?.getTime() === c1?.added_at?.getTime() && c2.added_exact === true,
      `${c2?.added_at?.toISOString()} qty ${c2?.quantity}`);

    await sleep(30);
    // ---- 4. A second file ------------------------------------------------------------------
    await applyCollectionChange(USER, { kind: "replace", items: [item(A), item(B), item(C, 3), item(D)] }, { id: randomUUID(), env: process.env });
    const a3 = await rowOf(USER, A);
    const c3 = await rowOf(USER, C);
    const d3 = await rowOf(USER, D);
    check("a second file keeps every standing holding's date",
      a3?.added_at?.getTime() === a1?.added_at?.getTime() && a3?.added_exact === false
        && c3?.added_at?.getTime() === c1?.added_at?.getTime() && c3?.added_exact === true,
      `A ${a3?.added_at?.toISOString()} exact ${a3?.added_exact}; C ${c3?.added_at?.toISOString()} exact ${c3?.added_exact}`);
    check("a second file's new holding is exact, because the collection had content",
      d3?.added_exact === true && !!d3.added_at && !!a1?.added_at && d3.added_at > a1.added_at,
      `${d3?.added_at?.toISOString()} exact ${d3?.added_exact}`);

    // ---- 5. Remove, re-add, revert ---------------------------------------------------------
    const removeId = randomUUID();
    await applyCollectionChange(USER, { kind: "edit", rows: [{ ...at(D), quantity: 0, expected: 1 }] }, { id: removeId, env: process.env });
    check("a removal deletes the row", (await rowOf(USER, D)) === undefined, "row gone");
    await sleep(30);
    await applyCollectionChange(USER, { kind: "add", items: [item(D)] }, { id: randomUUID(), env: process.env });
    const d4 = await rowOf(USER, D);
    check("a re-add is a new date", !!d4?.added_at && !!d3?.added_at && d4.added_at > d3.added_at && d4.added_exact === true,
      `${d3?.added_at?.toISOString()} then ${d4?.added_at?.toISOString()}`);
    // The revert of the REMOVAL: the re-add is in the way (the row exists), so remove it again first.
    await applyCollectionChange(USER, { kind: "edit", rows: [{ ...at(D), quantity: 0, expected: 1 }] }, { id: randomUUID(), env: process.env });
    const reverted = await applyCollectionChange(USER, { kind: "revert", entryId: removeId }, { id: randomUUID(), env: process.env });
    const d5 = await rowOf(USER, D);
    check("the revert of a removal puts the old date and exactness back",
      reverted.status === "applied" && d5?.added_at?.getTime() === d3?.added_at?.getTime() && d5?.added_exact === true,
      `${reverted.status}; ${d5?.added_at?.toISOString()} (was ${d3?.added_at?.toISOString()})`);

    // ---- 6. The legacy replace (src/lib/collection/import.ts) ------------------------------
    const legacy = (o: string) => ({ oracleId: o, setCode: "prb", collectorNumber: "1", finish: "nonfoil" as const, condition: null, quantity: 1, scryfallId: null });
    await replaceCollection(USER_LEGACY, [legacy(A), legacy(B)]);
    const l1 = await rowOf(USER_LEGACY, A);
    await sleep(30);
    await replaceCollection(USER_LEGACY, [legacy(A), legacy(B), legacy(C)]);
    const l2 = await rowOf(USER_LEGACY, A);
    const lc = await rowOf(USER_LEGACY, C);
    check("the legacy replace dates a first fill inexact, keeps standing dates, and stamps a later arrival exact",
      l1?.added_exact === false && l2?.added_at?.getTime() === l1?.added_at?.getTime() && lc?.added_exact === true,
      `A ${l1?.added_exact} then ${l2?.added_at?.toISOString()}; C exact ${lc?.added_exact}`);

    // ---- 7. The backfill -------------------------------------------------------------------
    const pend = (...ids: string[]) => JSON.stringify({ pendingItems: ids.map((o) => ({ oracleId: o, setCode: "prb", collectorNumber: "1", finish: "nonfoil", quantity: 1 })), unmatched: [], parseErrors: [], skippedByDesignCount: 0 });
    const day1 = "2026-09-02T12:00:00Z";
    const day2 = "2026-10-02T12:00:00Z";
    const day3 = "2026-10-12T12:00:00Z";
    const day4 = "2026-10-13T12:00:00Z";
    for (const [file, at, ids] of [["first.csv", day1, [A, B]], ["second.csv", day2, [A, B, C]]] as const) {
      await pool.query(
        `insert into csv_uploads (user_id, filename, row_count, unmatched_count, preview_payload, created_at, confirmed_at)
         values ($1, $2, $3, 0, $4::jsonb, $5, $5)`, [USER_BF, file, ids.length, pend(...ids), at]);
    }
    await pool.query(
      `insert into collection_history (id, user_id, created_at, kind, rows, raised, lowered)
       values ($1, $2, $3, 'add', $4::jsonb, 1, 0)`,
      [randomUUID(), USER_BF, day3, JSON.stringify([{ oracleId: D, setCode: "prb", collectorNumber: "1", finish: "nonfoil", name: "x", before: null, after: { quantity: 1, scryfallId: null, condition: null } }])]);
    const histRow = (o: string, before: unknown, after: unknown) => ({ oracleId: o, setCode: "prb", collectorNumber: "1", finish: "nonfoil", name: "x", before, after });
    const held = { quantity: 1, scryfallId: null, condition: null };
    await pool.query(
      `insert into collection_history (id, user_id, created_at, kind, rows, raised, lowered) values ($1, $2, $3, 'add', $4::jsonb, 1, 0)`,
      [randomUUID(), USER_BF, day3, JSON.stringify([histRow(F, null, held)])]);
    await pool.query(
      `insert into collection_history (id, user_id, created_at, kind, rows, raised, lowered) values ($1, $2, $3, 'edit', $4::jsonb, 0, 1)`,
      [randomUUID(), USER_BF, day4, JSON.stringify([histRow(F, held, null)])]);
    // G: hand-added between the two files, and the second file (no ledger entry, so a Replace by construction) does not
    // hold it: the add no longer proves the current ownership began there.
    await pool.query(
      `insert into collection_history (id, user_id, created_at, kind, rows, raised, lowered) values ($1, $2, '2026-09-15T12:00:00Z', 'add', $3::jsonb, 1, 0)`,
      [randomUUID(), USER_BF, JSON.stringify([histRow(G, null, held)])]);
    for (const o of [A, B, C, D, E, F, G]) {
      await pool.query("insert into collection_items (user_id, oracle_id, quantity, set_code, collector_number, finish) values ($1, $2, 1, 'prb', '1', 'nonfoil')", [USER_BF, o]);
    }
    // The stored instants, as the database reads them back (the column is a plain timestamp).
    const stored = async (table: string, col: string, where: string) =>
      ((await pool.query(`select ${col} as at from ${table} where ${where} order by ${col}`, [USER_BF])).rows as { at: Date }[]).map((r) => r.at.getTime());
    const [up1, up2] = await stored("csv_uploads", "confirmed_at", "user_id = $1");
    const [led] = await stored("collection_history", "created_at", `user_id = $1 and rows::text like '%${D}%'`);
    const dry = await backfillAddedAt(pool, { userId: USER_BF, dryRun: true });
    check("a dry run counts and writes nothing", dry.undated === 7 && dry.dated === 4 && (await rowOf(USER_BF, A))?.added_at === null,
      JSON.stringify(dry));
    const done = await backfillAddedAt(pool, { userId: USER_BF });
    const [bA, bC, bD, bE, bF, bG] = await Promise.all([A, C, D, E, F, G].map((o) => rowOf(USER_BF, o)));
    check("the first file's holdings are dated to it, inexact", bA?.added_at?.getTime() === up1 && bA.added_exact === false, `${bA?.added_at?.toISOString()} exact ${bA?.added_exact}`);
    check("a holding a later file brought is dated to it, inexact (a snapshot says there by then, not when)", bC?.added_at?.getTime() === up2 && bC.added_exact === false, `${bC?.added_at?.toISOString()} exact ${bC?.added_exact}`);
    check("a holding only the ledger knows is dated to its entry, exact", bD?.added_at?.getTime() === led && bD.added_exact === true, `${bD?.added_at?.toISOString()} exact ${bD?.added_exact}`);
    check("a holding in neither stays unknown", bE?.added_at === null && bE.added_exact === false && done.dated === 4, JSON.stringify(done));
    check("a holding added, then removed, is not dated to its first life", bF?.added_at === null, `${bF?.added_at?.toISOString()}`);
    check("a hand add before a Replace-capable upload that does not hold it is not trusted", bG?.added_at === null, `${bG?.added_at?.toISOString()}`);
    const again = await backfillAddedAt(pool, { userId: USER_BF });
    check("a second run changes nothing", again.dated === 0, JSON.stringify(again));
  } finally {
    for (const user of [USER, USER_LEGACY, USER_BF]) {
      // One statement for the ledger: its two self-references are checked at the statement's end.
      await pool.query("delete from collection_history where user_id = $1", [user]);
      await pool.query("delete from csv_uploads where user_id = $1", [user]);
      await pool.query("delete from collection_items where user_id = $1", [user]);
      await pool.query("delete from commander_scores where user_id = $1", [user]);
      await pool.query("delete from user_data_stamps where user_id = $1", [user]);
    }
  }
}

main()
  .catch((error) => {
    failures += 1;
    console.error(error);
  })
  .finally(async () => {
    await pool.end();
    console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
    process.exit(failures === 0 ? 0 : 1);
  });
