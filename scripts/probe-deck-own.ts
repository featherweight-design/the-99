// AN IMPORT'S "I OWN THESE CARDS" (no-collection entry plan, PR 1), proved against a real Postgres by calling the real
// `buildDeckImport`, `readDeckOwnLines`, `importDeckOwned`, `listHistory` and `applyCollectionChange` (revert): the
// steps `importDeck` takes with the box ticked, minus the request.
//
// Cases:
//   a  one add writes the deck (its lines and its unresolved line) and the copies, as one History entry
//   b  every line the list names is added at the deck's count, at the printing the list named where it named one and
//      the card's default printing where it did not, the commander included and the unresolved line adding nothing;
//      a card the player already held gains a copy
//   c  History lists it as a Deck add titled `Added from <deck>`, by the deck's CURRENT name
//   d  a retry under the same action id lands on the same deck and writes nothing more; an id another add used is
//      refused
//   e  a deck write that fails inside the add (a commander the catalog lacks) leaves neither the deck nor the cards,
//      nor an entry
//   f  reverting the add takes back exactly its copies (the held card back to one) and leaves the deck standing
//
// Mutations to run against it on its first run, each of which should fail it (not yet run: the probe was written
// without a database):
//   - the commander lines dropped from `deckOwnLines`: fails b.
//   - the deck written outside the add's transaction (`importDeckOwned`'s `inside` moved to after the add): fails e.
//   - the source left off the add: fails c and d.
//
// It writes under a per-run `user_id` and purges that account in a `finally`, after the branch guard:
// `PROBE_DB_BRANCH` must name the branch `DATABASE_URL` reports, and staging and production are refused by id. Point
// it at a scratch branch made from local-dev, migrated to 0127.
//
//   PROBE_DB_BRANCH=br-… pnpm probe:deck-own
import { requireEnv } from "./lib/env.mjs";
import { randomUUID } from "node:crypto";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";

import { loadMatchInputs } from "../src/lib/collection/import";
import { listHistory } from "../src/lib/collection/history";
import { historyKindOf } from "../src/lib/collection/history-kind";
import { entryTitle } from "../src/lib/collection/history-view";
import { applyCollectionChange } from "../src/lib/collection/write";
import { buildDeckImport } from "../src/lib/decks/import";
import { importDeckOwned, readDeckOwnLines } from "../src/lib/decks/import-own";
import { purgeAccount } from "../src/lib/account/purge";

const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
const PRODUCTION_BRANCH = "br-noisy-violet-a6vw4ess";
const LIST = [
  "Commander",
  "1 Atraxa, Praetors' Voice",
  "",
  "Deck",
  "1 Sol Ring (C21) 263",
  "1 Arcane Signet",
  "10 Forest",
  "1 Not A Card The Catalog Holds",
].join("\n");

const { DATABASE_URL, PROBE_DB_BRANCH } = requireEnv(["DATABASE_URL", "PROBE_DB_BRANCH"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-deck-own-${Date.now()}`;
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
const counts = async () => (await rows<{ decks: number; copies: number; entries: number }>(sql`
  select (select count(*)::int from decks where user_id = ${USER}) decks,
         (select coalesce(sum(quantity), 0)::int from collection_items where user_id = ${USER}) copies,
         (select count(*)::int from collection_history where user_id = ${USER}) entries`))[0];

async function run() {
  const [{ branch }] = await rows<{ branch: string | null }>(sql`select current_setting('neon.branch_id', true) as branch`);
  if (!branch || branch !== PROBE_DB_BRANCH || branch === STAGING_BRANCH || branch === PRODUCTION_BRANCH) {
    throw new Error(`refusing to run against ${branch}: this probe writes a collection. Name the scratch branch DATABASE_URL reports as PROBE_DB_BRANCH.`);
  }
  console.log(`branch ${branch}`);
  guarded = true;

  const ids = new Map((await rows<{ id: string; name: string }>(sql`
    select oracle_id::text id, name from cards
    where name in ('Atraxa, Praetors'' Voice', 'Sol Ring', 'Arcane Signet', 'Forest')`)).map((r) => [r.name, r.id]));
  const SOL = ids.get("Sol Ring")!;
  // The player already holds one Sol Ring, at no printing: the add gives a second copy, at the list's.
  await applyCollectionChange(USER, { kind: "add", items: [{ oracleId: SOL, setCode: "", condition: null, quantity: 1 }] }, { id: randomUUID(), env: ENV });

  const { catalog, indexes } = await loadMatchInputs([], { detailed: true });
  const imported = buildDeckImport({ text: LIST, catalog, indexes });
  const commander = imported.declaredCommander!.oracleId;
  const deck = {
    userId: USER,
    name: "Probe deck",
    commanderOracleId: commander,
    partnerOracleId: null,
    cards: imported.cards.filter((c) => c.oracleId !== commander).map((c) => ({ oracleId: c.oracleId, quantity: c.quantity })),
    unresolved: imported.unresolved,
    printings: [],
  };
  const items = await readDeckOwnLines({ cards: deck.cards, commanderOracleIds: [commander], picks: [], named: imported.printings });

  const actionId = randomUUID();
  const owned = await importDeckOwned(USER, deck, items, actionId, ENV);
  if (!owned.ok) throw new Error("the add was refused");
  const deckId = owned.deckId;
  const [made] = await rows<{ cards: number; unresolved: number }>(sql`
    select (select coalesce(sum(quantity), 0)::int from deck_cards where deck_id = ${deckId}::uuid) cards,
           (select count(*)::int from deck_unresolved_rows where deck_id = ${deckId}::uuid) unresolved`);
  check("a · the deck holds its 12 lines and its one unresolved line", made, { cards: 12, unresolved: 1 });
  check("a · one deck, the 13 new copies beside the held one, and two entries", await counts(), { decks: 1, copies: 14, entries: 2 });

  const held = await rows<{ name: string; set: string; cn: string; quantity: number }>(sql`
    select c.name, ci.set_code set, ci.collector_number cn, ci.quantity
    from collection_items ci join cards c on c.oracle_id = ci.oracle_id
    where ci.user_id = ${USER} order by c.name, ci.set_code`);
  check("b · every line at its count and printing, the commander included, the unresolved line adding nothing", held, [
    { name: "Arcane Signet", set: "", cn: "", quantity: 1 },
    { name: "Atraxa, Praetors' Voice", set: "", cn: "", quantity: 1 },
    { name: "Forest", set: "", cn: "", quantity: 10 },
    { name: "Sol Ring", set: "", cn: "", quantity: 1 },
    { name: "Sol Ring", set: "c21", cn: "263", quantity: 1 },
  ]);

  const titleOf = async () => {
    const { entries } = await listHistory(USER);
    const e = entries.find((x) => x.id === actionId)!;
    return [historyKindOf(e), entryTitle(e, new Map(entries.map((x) => [x.id, x])), new Date(0)), e.source];
  };
  check("c · History lists a Deck add titled by the deck", await titleOf(), ["deckAdd", "Added from Probe deck", `deck:${deckId}`]);
  await rows(sql`update decks set name = 'Renamed deck' where id = ${deckId}::uuid`);
  check("c · and by the deck's current name after a rename", (await titleOf())[1], "Added from Renamed deck");

  const retry = await importDeckOwned(USER, deck, items, actionId, ENV);
  check("d · a retry lands on the same deck", retry.ok && retry.deckId, deckId);
  check("d · and writes nothing more", await counts(), { decks: 1, copies: 14, entries: 2 });
  const otherId = randomUUID();
  await applyCollectionChange(USER, { kind: "add", items: [{ oracleId: SOL, setCode: "", condition: null, quantity: 1 }] }, { id: otherId, env: ENV });
  check("d · an id another add already used is refused", (await importDeckOwned(USER, deck, items, otherId, ENV)).ok, false);

  // A deck the catalog cannot hold (its commander names no card): the deck write fails inside the add.
  const before = await counts();
  const failId = randomUUID();
  const failed = await importDeckOwned(USER, { ...deck, commanderOracleId: randomUUID() }, items, failId, ENV)
    .then(() => "applied", () => "threw");
  check("e · a deck write that fails inside the add fails it", failed, "threw");
  check("e · and leaves neither the deck nor the cards, nor an entry", await counts(), before);

  const revertId = randomUUID();
  const warned = await applyCollectionChange(USER, { kind: "revert", entryId: actionId }, { id: revertId, env: ENV });
  const revert = warned.status === "wouldShort"
    ? await applyCollectionChange(USER, { kind: "revert", entryId: actionId }, { id: revertId, env: ENV, confirmShort: warned.decks })
    : warned;
  check("f · reverting the add applies", revert.status, "applied");
  const left = await rows<{ name: string; quantity: number }>(sql`
    select c.name, sum(ci.quantity)::int quantity from collection_items ci join cards c on c.oracle_id = ci.oracle_id
    where ci.user_id = ${USER} and ci.quantity > 0 group by c.name order by c.name`);
  check("f · and takes back exactly its copies: the held Sol Rings stay", left, [{ name: "Sol Ring", quantity: 2 }]);
  check("f · the deck stands", (await counts()).decks, 1);
}

run()
  .catch((err) => { failures += 1; console.error(err); })
  .finally(async () => {
    if (guarded) await purgeAccount(USER).catch((err) => { failures += 1; console.error("purge failed", err); });
    await pool.end();
    console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} failure(s).`);
    process.exit(failures === 0 ? 0 : 1);
  });
