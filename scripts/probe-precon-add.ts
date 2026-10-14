// ADDING A PRECON TO A COLLECTION (Hugh, 2026-10-13), proved against a real Postgres by calling the
// real `addPreconForUser`, `applyCollectionChange` (revert) and `preconAddedOn` on Multiverse Reforged.
//
// The line building is unit tested in `add.test.ts`; only a database can say the write lands every
// copy at its printing and finish, marks the tokens under the entry, and that Revert takes them back.
//
// Cases:
//   a  one add writes the box's 100 copies at their printings, Jace and Nissa as foil, as ONE History
//      entry whose source is `precon:MultiverseReforged_FRC`, keeping the tokens it read on that entry,
//      and marks them owned under it
//   b  a retry with the same action id writes nothing more and answers the same entry
//   c  `preconAddedOn` reads the add; it reads null again once the entry is reverted
//   d  a token the player already held by hand is left a hand mark, and is not counted as marked
//   e  a second add adds a second box of copies and marks no token (all already held)
//   f  reverting the FIRST add while the second stands keeps every token, now the second's
//   g  reverting that revert brings the first add's copies back, its tokens back to it, and reads as
//      added again
//   h  reverting the second, then the revert of the revert, clears every precon token, keeps the hand
//      mark, and leaves the collection empty
//
// Mutations, each run against it (file copied to the scratchpad, broken by an exact replace, run,
// restored by copying back), and each fails it:
//   - `syncPreconTokens` removed from the revert (`write.ts`): fails f, g and h.
//   - `standingIds` treating every reverted entry as gone (no chain): fails g.
//   - the foil split dropped (`preconAddLines` writing every copy non-foil): fails a.
//
// It writes under a per-run `user_id` and purges that account in a `finally`, so it fails closed:
// `PROBE_DB_BRANCH` must name the branch `DATABASE_URL` reports, and staging and production are refused
// by id. Point it at a scratch branch migrated to 0117, holding the precons ingested after 0116.
//
//   PROBE_DB_BRANCH=br-… pnpm probe:precon-add
import { requireEnv } from "./lib/env.mjs";
import { randomUUID } from "node:crypto";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";

import { addPreconForUser } from "../src/lib/precons/add";
import { preconAddedOn, preconSource } from "../src/lib/precons/added";
import { applyCollectionChange } from "../src/lib/collection/write";
import { markTokenOwned } from "../src/lib/tokens/ownership";
import { purgeAccount } from "../src/lib/account/purge";

const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
const PRODUCTION_BRANCH = "br-noisy-violet-a6vw4ess";
const FILE = "MultiverseReforged_FRC";

const { DATABASE_URL, PROBE_DB_BRANCH } = requireEnv(["DATABASE_URL", "PROBE_DB_BRANCH"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-precon-add-${Date.now()}`;
// A script has no signed-in reader: it decides switches from the environment, saying so.
const ENV = process.env;
let failures = 0;
// Set once the branch guard passes: cleanup writes, so it runs only against the branch the guard proved.
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

const copies = async () => {
  const [r] = await rows<{ total: number; foil: number }>(sql`
    select coalesce(sum(quantity), 0)::int as total, coalesce(sum(quantity) filter (where finish = 'foil'), 0)::int as foil
    from collection_items where user_id = ${USER}`);
  return r;
};
const owned = async () => rows<{ token: string; source: string; entry: string | null }>(sql`
  select t.name as token, o.source, o.entry_id::text as entry from token_ownership o
  join tokens t on t.oracle_id = o.token_oracle_id where o.user_id = ${USER} order by t.name`);

async function revert(entryId: string): Promise<string> {
  const id = randomUUID();
  const r = await applyCollectionChange(USER, { kind: "revert", entryId }, { id, env: ENV });
  if (r.status !== "applied") throw new Error(`revert refused: ${r.status}`);
  return id;
}
const preconRows = async () => (await owned()).filter((t) => t.source === "precon");

async function run() {
  const [{ branch }] = await rows<{ branch: string | null }>(sql`select current_setting('neon.branch_id', true) as branch`);
  if (!branch || branch !== PROBE_DB_BRANCH || branch === STAGING_BRANCH || branch === PRODUCTION_BRANCH) {
    throw new Error(`refusing to run against ${branch}: this probe writes a collection. Name the scratch branch DATABASE_URL reports as PROBE_DB_BRANCH.`);
  }
  console.log(`branch ${branch}`);
  guarded = true;

  // d's setup: the Soldier token already held by hand.
  const [soldier] = await rows<{ id: string }>(sql`
    select tp.token_oracle_id::text as id from precon_tokens pt join token_printings tp on tp.scryfall_id = pt.token_printing_id
    join tokens t on t.oracle_id = tp.token_oracle_id where pt.file_name = ${FILE} and t.name = 'Soldier'`);
  await markTokenOwned(USER, soldier.id);

  const first = randomUUID();
  const a = await addPreconForUser(USER, FILE, first, ENV, true);
  if (!a.ok) throw new Error(`add refused: ${a.reason}`);
  check("a · 100 copies, 2 of them foil", await copies(), { total: 100, foil: 2 });
  check("a · the add reports them", { copies: a.copies, foil: a.foil }, { copies: 100, foil: 2 });
  const foils = await rows<{ name: string }>(sql`
    select c.name from collection_items ci join cards c on c.oracle_id = ci.oracle_id
    where ci.user_id = ${USER} and ci.finish = 'foil' order by c.name`);
  check("a · Jace and Nissa are the foil copies", foils.map((f) => f.name), ["Jace, Multiverse Architect", "Nissa, Leyline Tamer"]);
  const printed = await rows<{ n: number }>(sql`
    select count(*)::int as n from collection_items ci join precon_cards pc on pc.oracle_id = ci.oracle_id and pc.scryfall_id = ci.scryfall_id
    where ci.user_id = ${USER} and pc.file_name = ${FILE}`);
  check("a · every holding names the box's own printing", printed[0].n > 0 && printed[0].n === (await rows<{ n: number }>(sql`
    select count(*)::int as n from collection_items where user_id = ${USER}`))[0].n, true);
  const entries = await rows<{ source: string; kind: string }>(sql`
    select source, kind from collection_history where user_id = ${USER} order by seq`);
  check("a · one History entry, an add, sourced to the precon", entries, [{ source: preconSource(FILE), kind: "add" }]);
  check("a · eight tokens marked (the ninth was held by hand)", a.tokens.marked, 8);
  const [kept] = await rows<{ n: number }>(sql`
    select jsonb_array_length(precon_tokens)::int as n from collection_history where id = ${first}::uuid`);
  check("a · the entry keeps all nine tokens it read, for its reverts to derive from", kept.n, 9);
  const tokensA = await owned();
  check("a · every marked token is the entry's", tokensA.filter((t) => t.source === "precon").every((t) => t.entry === first), true);
  check("d · the hand-marked Soldier stays a hand mark", tokensA.find((t) => t.token === "Soldier")?.source, "manual");
  check("d · and is not named as marked", a.tokens.names.includes("Soldier"), false);

  const retry = await addPreconForUser(USER, FILE, first, ENV, true);
  check("b · a retry answers the same entry", retry.ok && retry.entryId, first);
  check("b · and names the tokens the entry marked", retry.ok && [...retry.tokens.names].sort(), [...a.tokens.names].sort());
  check("b · eight of them", retry.ok && retry.tokens.marked, 8);
  check("b · and the same counts, read from the entry", retry.ok && { cards: retry.cards, copies: retry.copies, foil: retry.foil },
    { cards: a.cards, copies: 100, foil: 2 });
  const otherId = randomUUID();
  await applyCollectionChange(USER, { kind: "add", items: [{ oracleId: (await rows<{ id: string }>(sql`
    select oracle_id::text as id from precon_cards where file_name = ${FILE} limit 1`))[0].id, setCode: "", condition: null, quantity: 1 }] }, { id: otherId, env: ENV });
  const reused = await addPreconForUser(USER, FILE, otherId, ENV, false);
  check("b · an id another add already used is refused, not taken as this precon's", reused.ok, false);
  await revert(otherId);
  check("b · and writes nothing more", await copies(), { total: 100, foil: 2 });

  check("c · the add is read as added", (await preconAddedOn(USER, FILE)) !== null, true);

  const second = randomUUID();
  const e = await addPreconForUser(USER, FILE, second, ENV, false);
  check("e · a second add adds a second box", await copies(), { total: 200, foil: 4 });
  check("e · and marks no token", e.ok && e.tokens.marked, 0);

  const undoFirst = await revert(first);
  check("f · reverting the first while the second stands keeps its tokens", (await preconRows()).length, 8);
  check("f · now the second's", (await preconRows()).every((t) => t.entry === second), true);
  check("f · and one box of copies", await copies(), { total: 100, foil: 2 });

  const redoFirst = await revert(undoFirst);
  check("g · reverting that revert brings the first box back", await copies(), { total: 200, foil: 4 });
  check("g · and its tokens back to it", (await preconRows()).every((t) => t.entry === first) && (await preconRows()).length, 8);
  check("g · and reads as added", (await preconAddedOn(USER, FILE)) !== null, true);

  await revert(second);
  check("h · reverting the second leaves the first's tokens", (await preconRows()).length, 8);
  await revert(redoFirst);
  const left = await owned();
  check("h · undoing the first again clears every precon token", left.filter((t) => t.source === "precon").length, 0);
  check("h · and keeps the hand mark", left.map((t) => `${t.token}:${t.source}`), ["Soldier:manual"]);
  check("h · and empties the collection", await copies(), { total: 0, foil: 0 });
  check("c · a reverted add is not read as added", await preconAddedOn(USER, FILE), null);
}

run()
  .catch((err) => { failures += 1; console.error(err); })
  .finally(async () => {
    if (guarded) await purgeAccount(USER).catch((err) => { failures += 1; console.error("purge failed", err); });
    await pool.end();
    console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} failure(s).`);
    process.exit(failures === 0 ? 0 : 1);
  });
