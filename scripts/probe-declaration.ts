// The declaration's write path, proved against a real Postgres.
//
// WHAT ONLY A DATABASE CAN ANSWER HERE. The rule that decides what a commit carries is pure
// and unit-tested; what is not is whether the two new columns hold it, whether the check
// constraint refuses a bad write, and whether a version's copy stays put once the deck moves
// on. Those are facts about what the transaction wrote.
//
//   A DECLARATION IS COPIED INTO THE VERSION IT WAS MADE FOR. The ruling this round rests on:
//   the choice travels with the version, so nothing ever asks a player to change what they
//   said, because the old answer is history rather than a live claim.
//   AND ONLY WHEN THAT VERSION'S CARDS PERMIT IT. A player who declared cEDH and tuned the
//   deck down commits a version recording NO declaration rather than one its own cards
//   contradict — while the deck keeps its live answer, stated and not deleted.
//   THE VERSION'S COPY NEVER MOVES AFTERWARDS. Change the deck's declaration and the committed
//   version still reads what it read. This is the whole point of the column: without it a
//   version's answer would follow the deck and "Version 1: chose 4" would be a lie the moment
//   the player chose again.
//   THE CHECK CONSTRAINT REFUSES ANYTHING BUT 1-5 OR NULL, on both tables. A bad write is loud
//   rather than a bad read being defended against forever.
//   THE PERMITS SNAPSHOT IS STORED AND SORTED, so a version comparison is two column reads
//   rather than a second profile build — measured at 630ms median, 2.2s on the largest deck.
//
// WHAT IT DOES NOT PROVE, deliberately: the surface, and now also the ACTION.
//
// `declareBracket` exists as of the declaration write path, and this probe still cannot call it:
// a server action needs a request and a signed-in reader. So the action's refusal rules are
// asserted where a test can reach them — `declarationRefusal` is pure and unit-tested, and
// `declaration-actions.test.ts` covers the wiring — and this script proves the STORAGE those
// refusals protect, by writing the columns directly.
//
// There is still no READER to observe: nothing draws a declaration yet. This proves the storage the surface
// will stand on.
//
// It writes a fixture under a per-run `user_id` and deletes it in a `finally`. Point it at
// `local-dev` or a scratch Neon branch, NEVER production.
//
//   DATABASE_URL=<local-dev> pnpm probe:declaration
// First, and on its own line: the helper's import loads `.env`, and anything reading
// `DATABASE_URL` at module scope needs it already loaded. `scripts/lib/env.test.mts` enforces
// that no script under `scripts/` reaches a secret any other way.
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";

import { commitVersion } from "../src/lib/decks/versions";
// No signed-in reader here: every switch read takes the environment itself (`process.env`).

neonConfig.webSocketConstructor = ws;

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);

const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-declaration-${Date.now()}`;

let failures = 0;
/** Counts its own failures — a probe whose exit code disagrees with its output is worse than
 *  no probe, which this repository has learned three times. */
const check = (label: string, actual: unknown, expected: unknown) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${a}, expected ${e}`);
};
const fail = (label: string, why: string) => {
  failures += 1;
  console.log(`FAIL  ${label} — ${why}`);
};
const pass = (label: string, detail: string) => console.log(`PASS  ${label} — ${detail}`);

const rows = async <T>(text: ReturnType<typeof sql>): Promise<T[]> =>
  (await fixture.execute(text)).rows as T[];

async function makeDeck(name: string, commanderOracleId: string, cardIds: readonly string[]) {
  const [deck] = await rows<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id)
    values (${USER}, ${name}, ${commanderOracleId}::uuid)
    returning id`);
  for (const oracleId of cardIds) {
    await fixture.execute(sql`
      insert into deck_cards (deck_id, oracle_id, quantity)
      values (${deck.id}::uuid, ${oracleId}::uuid, 1) on conflict do nothing`);
  }
  return deck.id;
}

const declare = (deckId: string, bracket: number | null) =>
  fixture.execute(sql`
    update decks set declared_bracket = ${bracket} where id = ${deckId}::uuid`);

const versionRow = (deckId: string) =>
  rows<{ number: number; declared_bracket: number | null; permits: number[] | null }>(sql`
    select number, declared_bracket, permits from deck_versions
    where deck_id = ${deckId}::uuid order by number desc limit 1`);

async function run() {
  const catalog = await rows<{ oracle_id: string }>(sql`
    select oracle_id from cards where type_line ilike '%Legendary Creature%' limit 1`);
  const [legend] = catalog;
  if (!legend) return fail("a legend to lead the fixture", "the catalog is empty");
  const body = await rows<{ oracle_id: string }>(sql`
    select oracle_id from cards where type_line not ilike '%Land%' limit 5`);

  // 1 · A declaration inside the version's permits is carried into it.
  {
    const deckId = await makeDeck("probe declared", legend.oracle_id, body.map((c) => c.oracle_id));
    await declare(deckId, 2);
    await commitVersion(deckId, null, undefined, { declared: 2, permits: [1, 2] }, process.env);
    const [v] = await versionRow(deckId);
    check("a permitted declaration is carried into the version", v?.declared_bracket, 2);
    check("and the version stores what its cards permitted", v?.permits, [1, 2]);

    // 2 · THE COPY NEVER MOVES. The deck declares again; the committed version does not care.
    await declare(deckId, 1);
    const [again] = await versionRow(deckId);
    check("the version's copy does not follow the deck", again?.declared_bracket, 2);
    const [live] = await rows<{ declared_bracket: number }>(sql`
      select declared_bracket from decks where id = ${deckId}::uuid`);
    check("while the deck carries the new live answer", live?.declared_bracket, 1);
  }

  // 3 · A declaration the version's own cards do not permit is NOT carried.
  {
    const deckId = await makeDeck("probe drifted", legend.oracle_id, body.map((c) => c.oracle_id));
    await declare(deckId, 5);
    await commitVersion(deckId, null, undefined, { declared: 5, permits: [3] }, process.env);
    const [v] = await versionRow(deckId);
    check("a declaration outside the version's permits is not carried", v?.declared_bracket, null);
    const [live] = await rows<{ declared_bracket: number }>(sql`
      select declared_bracket from decks where id = ${deckId}::uuid`);
    // Stated, not deleted — the surface needs it to say the reading moved.
    check("and the deck keeps its live answer", live?.declared_bracket, 5);
  }

  // 4 · No snapshot: both columns stay null, which is where every older version already is.
  {
    const deckId = await makeDeck("probe nosnap", legend.oracle_id, body.map((c) => c.oracle_id));
    await declare(deckId, 3);
    await commitVersion(deckId, null, undefined, undefined, process.env);
    const [v] = await versionRow(deckId);
    check("no snapshot records no declaration", v?.declared_bracket, null);
    check("and no permits", v?.permits, null);
  }

  // 5 · The permits snapshot is SORTED at the write, so two ranges compare as arrays.
  {
    const deckId = await makeDeck("probe sorted", legend.oracle_id, body.map((c) => c.oracle_id));
    await commitVersion(deckId, null, undefined, { declared: null, permits: [5, 4] }, process.env);
    const [v] = await versionRow(deckId);
    check("permits are stored sorted", v?.permits, [4, 5]);
  }

  // 6 · The check constraint, on BOTH tables. A bad write is loud.
  for (const [table, stmt] of [
    ["decks", sql`update decks set declared_bracket = 6 where user_id = ${USER}`],
    [
      "deck_versions",
      sql`update deck_versions set declared_bracket = 0
          where deck_id in (select id from decks where user_id = ${USER})`,
    ],
  ] as const) {
    try {
      await fixture.execute(stmt);
      fail(`${table} refuses a bracket outside 1-5`, "the write succeeded");
    } catch {
      pass(`${table} refuses a bracket outside 1-5`, "rejected by the check constraint");
    }
  }
}

// No top-level await: the script is transformed to CJS. `probe-bracket.ts` chains for the
// same reason.
//
// The cleanup runs whether or not the checks threw, and the REPORT runs after it — and
// deliberately not inside the `finally`, because `process.exit` in a `finally` swallows the
// exception that got there. This repository has written that bug three times.
run()
  .catch((error) => {
    failures += 1;
    console.error("the run threw", error);
  })
  .finally(async () => {
    try {
      await fixture.execute(sql`delete from decks where user_id = ${USER}`);
      console.log(`\ncleaned up fixture user ${USER}`);
    } catch (error) {
      failures += 1;
      console.error("cleanup failed", error);
    }
    await pool.end();
    console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
    process.exitCode = failures === 0 ? 0 : 1;
  });
