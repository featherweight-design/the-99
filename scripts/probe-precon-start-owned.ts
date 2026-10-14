// STARTING A PRECON YOU OWN (Hugh, 2026-10-14), proved against a real Postgres by calling the real
// `startPreconOwned`, `loadDeckBuyRows` and `applyCollectionChange` (revert), on Hugh's own overlap:
// two older decks both list Arcane Signet, Command Tower, Sol Ring and Swords to Plowshares and hold
// none of them, then Multiverse Reforged (one of each) is started with "I own this precon".
//
// Cases:
//   a  one start writes the box, the deck (committed v1) and one History entry, linked to each other
//   b  the new deck owes nothing: every copy the box brought is its own
//   c  the older decks stay short of the four cards: they never take the box's copies
//   d  History's "Went to" for each of the four names the new deck alone
//   e  the four are reserved to the new deck, a copy each
//   f  a retry under the same action id lands on the same deck and writes nothing more
//   g  an action id another add already used is refused
//   h  reverting the add releases the reservations, and the older decks are still short
//
// Mutations, each run against it and each failing it:
//   - the reservation insert dropped from `startPreconOwned`: fails b, c, d and e.
//   - `releasePreconReservations` dropped from the revert (`write.ts`): fails h.
//
// It writes under a per-run `user_id` and purges that account in a `finally`, after the branch guard:
// `PROBE_DB_BRANCH` must name the branch `DATABASE_URL` reports, and staging and production are refused by id.
// Point it at a scratch branch migrated to 0118, holding precons ingested after 0116.
//
//   PROBE_DB_BRANCH=br-… pnpm probe:precon-start-owned
import { requireEnv } from "./lib/env.mjs";
import { randomUUID } from "node:crypto";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";

import { startPreconDeck } from "../src/lib/precons/start";
import { startPreconOwned } from "../src/lib/precons/start-owned";
import { applyCollectionChange } from "../src/lib/collection/write";
import { loadDeckBuyRows } from "../src/lib/decks/availability-query";
import { purgeAccount } from "../src/lib/account/purge";

const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
const PRODUCTION_BRANCH = "br-noisy-violet-a6vw4ess";
const FILE = "MultiverseReforged_FRC";
const FOUR = ["Arcane Signet", "Command Tower", "Sol Ring", "Swords to Plowshares"];

const { DATABASE_URL, PROBE_DB_BRANCH } = requireEnv(["DATABASE_URL", "PROBE_DB_BRANCH"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-precon-start-owned-${Date.now()}`;
// A script has no signed-in reader: it decides switches from the environment, saying so.
const ENV = process.env;
let failures = 0;
let guarded = false;

function check(label: string, actual: unknown, expected: unknown): boolean {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${ok ? "" : `: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`}`);
  if (!ok) failures += 1;
  return ok;
}
async function rows<T>(q: ReturnType<typeof sql>): Promise<T[]> {
  return (await fixture.execute(q)).rows as T[];
}

async function run() {
  const [{ branch }] = await rows<{ branch: string | null }>(sql`select current_setting('neon.branch_id', true) as branch`);
  if (!branch || branch !== PROBE_DB_BRANCH || branch === STAGING_BRANCH || branch === PRODUCTION_BRANCH) {
    throw new Error(`refusing to run against ${branch}: this probe writes a collection. Name the scratch branch DATABASE_URL reports as PROBE_DB_BRANCH.`);
  }
  console.log(`branch ${branch}`);
  guarded = true;

  const four = new Map((await rows<{ id: string; name: string }>(sql`
    select oracle_id::text id, name from cards where name in (${sql.join(FOUR.map((n) => sql`${n}`), sql`, `)})`)).map((r) => [r.id, r.name]));
  const owes = async (deckId: string) => (await loadDeckBuyRows(USER, [deckId], undefined, ENV))
    .filter((r) => r.deckId === deckId && four.has(r.oracleId)).map((r) => four.get(r.oracleId)).sort();

  // The older decks: committed first, so seniority favors them, and holding none of the four.
  const thorin = await startPreconDeck(USER, "AbzanArmor_TDC", "Older A", ENV);
  const gishath = await startPreconDeck(USER, "AvengersAssemble_MSC", "Older B", ENV);
  check("setup · the older decks are short of all four", [await owes(thorin), await owes(gishath)], [FOUR, FOUR]);

  const actionId = randomUUID();
  const started = await startPreconOwned(USER, FILE, "Multiverse Reforged", actionId, ENV, true);
  if (!started.ok) throw new Error(`start refused: ${started.reason}`);
  const deckId = started.deckId;
  const [linked] = await rows<{ entry: string | null; versions: number }>(sql`
    select precon_add_entry_id::text entry, (select count(*)::int from deck_versions where deck_id = ${deckId}::uuid) versions
    from decks where id = ${deckId}::uuid`);
  check("a · the deck is linked to the add and committed as v1", linked, { entry: actionId, versions: 1 });
  const [copies] = await rows<{ n: number }>(sql`select coalesce(sum(quantity), 0)::int n from collection_items where user_id = ${USER}`);
  check("a · the box's 100 copies are in the collection", copies.n, 100);

  const allOwed = (await loadDeckBuyRows(USER, [deckId], undefined, ENV)).filter((r) => r.deckId === deckId);
  check("b · the new deck owes nothing", allOwed.length, 0);
  check("c · the older decks are still short of all four", [await owes(thorin), await owes(gishath)], [FOUR, FOUR]);

  const [entry] = await rows<{ rows: { oracleId: string; wentTo?: { decks: { deckId: string }[] } }[] }>(sql`
    select rows from collection_history where id = ${actionId}::uuid`);
  const went = entry.rows.filter((r) => four.has(r.oracleId) && r.wentTo)
    .map((r) => [four.get(r.oracleId), r.wentTo!.decks.map((d) => d.deckId)] as const).sort();
  check("d · History's Went to names the new deck alone, for each of the four",
    went, FOUR.map((n) => [n, [deckId]]));

  const reserved = await rows<{ name: string; copies: number }>(sql`
    select c.name, ca.copies from card_assignments ca join cards c on c.oracle_id = ca.oracle_id
    where ca.user_id = ${USER} and ca.deck_id = ${deckId}::uuid and c.name in (${sql.join(FOUR.map((n) => sql`${n}`), sql`, `)}) order by c.name`);
  check("e · the four are reserved to the new deck, a copy each", reserved, FOUR.map((name) => ({ name, copies: 1 })));

  const retry = await startPreconOwned(USER, FILE, "Multiverse Reforged", actionId, ENV, true);
  check("f · a retry lands on the same deck", retry.ok && retry.deckId, deckId);
  const [after] = await rows<{ decks: number; copies: number }>(sql`
    select (select count(*)::int from decks where user_id = ${USER}) decks,
           (select coalesce(sum(quantity), 0)::int from collection_items where user_id = ${USER}) copies`);
  check("f · and writes nothing more", after, { decks: 3, copies: 100 });

  const otherId = randomUUID();
  // A card none of the decks lists, so this add moves nobody's shortfall.
  const [stranger] = await rows<{ id: string }>(sql`
    select c.oracle_id::text id from cards c where c.name = 'Storm Crow'`);
  await applyCollectionChange(USER, { kind: "add", items: [{ oracleId: stranger.id, setCode: "", condition: null, quantity: 1 }] }, { id: otherId, env: ENV });
  const reused = await startPreconOwned(USER, FILE, "Again", otherId, ENV, true);
  check("g · an id another add already used is refused", reused.ok, false);

  // The revert takes copies a deck holds, so it warns first, and the reader confirms, as History's Undo does.
  const revertId = randomUUID();
  const warned = await applyCollectionChange(USER, { kind: "revert", entryId: actionId }, { id: revertId, env: ENV });
  const revert = warned.status === "wouldShort"
    ? await applyCollectionChange(USER, { kind: "revert", entryId: actionId }, { id: revertId, env: ENV, confirmShort: warned.decks })
    : warned;
  check("h · reverting the add applies, once its short warning is confirmed", revert.status, "applied");
  const [left] = await rows<{ n: number }>(sql`select count(*)::int n from card_assignments where user_id = ${USER} and deck_id = ${deckId}::uuid`);
  check("h · and releases the new deck's reservations", left.n, 0);
  check("h · the older decks are still short of all four", [await owes(thorin), await owes(gishath)], [FOUR, FOUR]);
}

run()
  .catch((err) => { failures += 1; console.error(err); })
  .finally(async () => {
    if (guarded) await purgeAccount(USER).catch((err) => { failures += 1; console.error("purge failed", err); });
    await pool.end();
    console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} failure(s).`);
    process.exit(failures === 0 ? 0 : 1);
  });
