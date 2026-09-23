// The stored deck analysis, proved against a real Postgres.
//
// WHAT ONLY A DATABASE CAN ANSWER HERE. The hook's peek and the action's refusals are unit
// tested with this module mocked out; what those tests cannot reach is whether the row is
// written, whether each of the three stamps actually retires it, and whether deleting the deck
// takes the row with it. Those are facts about SQL.
//
//   A PRESS STORES WHAT IT COMPUTED, and the next read returns it without computing.
//   AN EDIT RETIRES IT. The fingerprint is over the deck's own cards and commanders, so a card
//   added after the press makes the stored row describe a deck that no longer exists.
//   A CATALOG REFRESH RETIRES IT. The generation stamp moved; the row was built against another.
//   A WEEK RETIRES IT. The combo and commander indexes refresh without a stamp this row can see.
//   ANOTHER READER CANNOT READ IT. The head read is scoped by `user_id`, and so is the row.
//   A SECOND PRESS REPLACES THE ROW rather than adding one, and moves `computed_at`.
//   DELETING THE DECK DELETES THE ROW — the foreign key's cascade.
//   THE CHECK CONSTRAINT REFUSES permits outside 1-5.
//
// Four mutations were run against it. Dropping the fingerprint, the week or the catalog comparison
// each fails its own check. Dropping the row's `user_id` clause fails NOTHING, and that is the
// shape rather than a gap: the head read is scoped by `user_id` and returns null for another
// reader before the row is ever asked for, so the clause on the row is a second guard behind it.
//
// It calls the REAL `readStoredProfile` and `computeAndStoreProfile`, with the uncached readers
// beneath their request-time wrappers injected, since `unstable_cache` raises outside a request.
//
// It writes a fixture under a per-run `user_id` and deletes it in a `finally`. Point it at
// `local-dev` or a scratch Neon branch, NEVER production.
//
//   pnpm probe:profile-store
// First, and on its own line: the helper's import loads `.env`, and anything reading
// `DATABASE_URL` at module scope needs it already loaded.
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";

import { readCatalogGeneration } from "../src/lib/cache/catalog-generation";
import { loadDeckProfile } from "../src/lib/profile/load";
import {
  computeAndStoreProfile,
  readStoredProfile,
  type StoredProfileDeps,
} from "../src/lib/profile/stored";

neonConfig.webSocketConstructor = ws;

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);

const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-profile-store-${Date.now()}`;

let failures = 0;
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

const rows = async <T>(text: ReturnType<typeof sql>): Promise<T[]> =>
  (await fixture.execute(text)).rows as T[];

/** Counts every compute the module asked for, so "read without computing" is observable. */
let computes = 0;
let generation: string | null = null;
const deps: StoredProfileDeps = {
  generation: async () => generation ?? readCatalogGeneration(),
  compute: async (deckId, userId) => {
    computes += 1;
    return loadDeckProfile(deckId, userId);
  },
};

const storedRow = (deckId: string) =>
  rows<{ n: number; permits: number[]; fresh: boolean }>(sql`
    select count(*) over ()::int as n, permits,
      computed_at > now() - interval '1 hour' as fresh
    from deck_profiles where deck_id = ${deckId}::uuid`);

async function run() {
  const [legend] = await rows<{ oracle_id: string }>(sql`
    select oracle_id from cards where type_line ilike '%Legendary Creature%'
    order by oracle_id limit 1`);
  if (!legend) return fail("a legend to lead the fixture", "the catalog is empty");
  const body = await rows<{ oracle_id: string }>(sql`
    select oracle_id from cards where type_line not ilike '%Land%'
      and oracle_id <> ${legend.oracle_id}::uuid
    order by oracle_id limit 6`);
  if (body.length < 6) return fail("six cards for the fixture", `found ${body.length}`);

  const [deck] = await rows<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id)
    values (${USER}, 'probe profile store', ${legend.oracle_id}::uuid) returning id`);
  for (const card of body.slice(0, 5)) {
    await fixture.execute(sql`
      insert into deck_cards (deck_id, oracle_id, quantity)
      values (${deck.id}::uuid, ${card.oracle_id}::uuid, 1)`);
  }

  // 1 · Nothing stored yet: a read finds nothing and computes nothing.
  check("a deck never analyzed reads as absent", await readStoredProfile(deck.id, USER, deps), null);
  check("and the read computed nothing", computes, 0);

  // 2 · A press stores, and the next read returns it without computing.
  const pressed = await computeAndStoreProfile(deck.id, USER, deps);
  if (!pressed) return fail("the press", "computed no profile for the fixture deck");
  check("the press computed once", computes, 1);
  const [first] = await storedRow(deck.id);
  check("the press wrote one row", first?.n, 1);
  const read = await readStoredProfile(deck.id, USER, deps);
  check("the next read returns what the press stored", read?.fingerprint, pressed.fingerprint);
  check("and computed nothing to do it", computes, 1);
  check("the permits are stored sorted and in range",
    first ? first.permits.every((p, i, a) => p >= 1 && p <= 5 && (i === 0 || a[i - 1] < p)) : false, true);

  // 3 · Another reader cannot read it.
  check("another reader reads it as absent", await readStoredProfile(deck.id, `${USER}-other`, deps), null);

  // 4 · A catalog refresh retires it.
  generation = "probe-another-catalog";
  check("a moved catalog generation retires the row", await readStoredProfile(deck.id, USER, deps), null);
  generation = null;
  check("and the current generation still reads it",
    (await readStoredProfile(deck.id, USER, deps))?.fingerprint, pressed.fingerprint);

  // 5 · A week retires it.
  await fixture.execute(sql`
    update deck_profiles set computed_at = now() - interval '8 days' where deck_id = ${deck.id}::uuid`);
  check("a row older than the week is not shown", await readStoredProfile(deck.id, USER, deps), null);
  await fixture.execute(sql`
    update deck_profiles set computed_at = now() - interval '6 days' where deck_id = ${deck.id}::uuid`);
  check("a row inside the week still is",
    (await readStoredProfile(deck.id, USER, deps))?.fingerprint, pressed.fingerprint);

  // 6 · A second press replaces the row and moves its stamp.
  await computeAndStoreProfile(deck.id, USER, deps);
  const [second] = await storedRow(deck.id);
  check("a second press leaves one row", second?.n, 1);
  check("and moves computed_at off the aged stamp",
    second?.fresh, true);

  // 7 · An edit retires it.
  await fixture.execute(sql`
    insert into deck_cards (deck_id, oracle_id, quantity)
    values (${deck.id}::uuid, ${body[5].oracle_id}::uuid, 1)`);
  check("a card added after the press retires the row", await readStoredProfile(deck.id, USER, deps), null);

  // 7b · A result that no longer describes the deck is not stored. Two presses from two tabs can
  // finish out of order; the deck is edited between this build and its write, as the older press
  // would see it, and the row must keep what it held.
  {
    const [before] = await rows<{ fingerprint: string }>(sql`
      select fingerprint from deck_profiles where deck_id = ${deck.id}::uuid`);
    const late: StoredProfileDeps = {
      generation: deps.generation,
      compute: async (id, user) => {
        const built = await loadDeckProfile(id, user);
        await fixture.execute(sql`delete from deck_cards where deck_id = ${deck.id}::uuid
          and oracle_id = ${body[0].oracle_id}::uuid`);
        return built;
      },
    };
    await computeAndStoreProfile(deck.id, USER, late);
    const [after] = await rows<{ fingerprint: string }>(sql`
      select fingerprint from deck_profiles where deck_id = ${deck.id}::uuid`);
    check("a result overtaken by an edit is not written over the row", after?.fingerprint, before?.fingerprint);
  }

  // 8 · The check constraint.
  try {
    await fixture.execute(sql`
      update deck_profiles set permits = array[0, 6] where deck_id = ${deck.id}::uuid`);
    fail("the permits check constraint", "a permits array of [0, 6] was accepted");
  } catch {
    check("the permits check constraint refuses [0, 6]", true, true);
  }

  // 9 · Deleting the deck deletes the row.
  await fixture.execute(sql`delete from decks where id = ${deck.id}::uuid`);
  check("deleting the deck deletes its stored analysis", (await storedRow(deck.id)).length, 0);
}

async function main() {
  let thrown: unknown = null;
  try {
    await run();
  } catch (error) {
    thrown = error;
  } finally {
    await fixture.execute(sql`delete from decks where user_id = ${USER}`);
    await pool.end();
  }
  // Reported AFTER the `finally`, never from inside it: an exit there swallows the throw and
  // prints a pass over a case that never ran.
  if (thrown) {
    console.error(thrown);
    process.exit(1);
  }
  console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
  process.exit(failures ? 1 : 0);
}

void main();
