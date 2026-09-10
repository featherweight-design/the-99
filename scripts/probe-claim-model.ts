// The claim model's states, proved against a real Postgres by calling the real
// loadAvailability. A probe that re-declared the SQL would prove only that its
// copy is self-consistent.
//
// It writes a fixture under a per-run user_id and deletes it in a finally. No
// begin/rollback: loadAvailability goes through the src/db singleton, which is
// a different connection from the one this script opens, so a transaction held
// here would be invisible to the function under test.
//
// Run it against a scratch Neon branch or local dev — NEVER production.
//
// Run: `pnpm probe:claims`
// First, and on its own line: src/db reads DATABASE_URL at module scope, so the
// .env has to be loaded before the import below reaches it.
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";
import { loadAvailability } from "../src/lib/decks/availability-query";

neonConfig.webSocketConstructor = ws;

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-claim-${Date.now()}`;

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${actual}, expected ${expected}`);
};

// The card being fought over, and two legends to lead the decks. Read from the
// catalog rather than hard-coded: a fixed uuid rots the first time it moves.
// THREE DISTINCT IDS — a commander that is also the contested card claims twice
// against one owned copy and every figure below is wrong.
const pickCards = async () => {
  const { rows } = await fixture.execute<{ oracle_id: string }>(sql`
    select oracle_id from cards
    where type_line ~ 'Legendary Creature' and type_line !~ '\\mBasic\\M'
    order by oracle_id limit 2
  `);
  const { rows: [subject] } = await fixture.execute<{ oracle_id: string }>(sql`
    select oracle_id from cards
    where type_line !~ '\\mBasic\\M' and type_line !~ 'Legendary'
    order by oracle_id limit 1
  `);
  if (rows.length < 2 || !subject) throw new Error("catalog is empty — seed it first");
  return { cmdA: rows[0].oracle_id, cmdB: rows[1].oracle_id, card: subject.oracle_id };
};

// Wrapped in main() rather than run at top level: tsx transpiles this repo's
// scripts to CJS, where a top-level await is a build error.
async function main() {
const { cmdA, cmdB, card } = await pickCards();

// The vantage deck's free figure for the one contested copy.
const free = async (deckId: string) => {
  const availability = await loadAvailability(USER, {
    oracleIds: [card],
    excludeDeckId: deckId,
  });
  return availability.get(card)?.free ?? null;
};

try {
  await fixture.execute(sql`
    insert into collection_items (user_id, oracle_id, quantity, set_code)
    values (${USER}, ${card}, 1, 'probe')
  `);
  // `older` was REGISTERED first; `newer` actually sleeved the card. Under the
  // old created_at seniority older would win, which is the bug being fixed.
  const { rows: [older] } = await fixture.execute<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id, created_at)
    values (${USER}, 'Older deck', ${cmdA}, now() - interval '1 year') returning id
  `);
  const { rows: [newer] } = await fixture.execute<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id, created_at)
    values (${USER}, 'Newer deck', ${cmdB}, now()) returning id
  `);

  const commit = async (deckId: string, cmd: string, number: number, holds: boolean) => {
    const { rows: [v] } = await fixture.execute<{ id: string; committed_at: string }>(sql`
      insert into deck_versions
        (deck_id, number, committed_at, commander_oracle_id, commander_since)
      values (${deckId}, ${number}, now(), ${cmd}, now())
      returning id, committed_at
    `);
    if (holds) {
      await fixture.execute(sql`
        insert into deck_version_cards (version_id, oracle_id, quantity, since)
        values (${v.id}, ${card}, 1, ${v.committed_at})
      `);
    }
    return v.id;
  };

  // On a deck's own page `free` is a SURPLUS, not a count of copies in a box:
  // the vantage deck's own claim is subtracted alongside the senior ones. So 0
  // means "holds what it needs and no spare", and a NEGATIVE figure is the
  // shortfall — the number of copies this deck has to go and buy. Every
  // expected value below is read that way.

  // The newer deck sleeves the card; the older deck has not drafted it yet.
  await commit(newer.id, cmdB, 1, true);
  await fixture.execute(sql`
    insert into deck_cards (deck_id, oracle_id, quantity)
    values (${newer.id}, ${card}, 1)
  `);

  // 1. There is nothing for a draft add to take: the one copy is inside
  //    another deck's committed version.
  check("no free copy to add", await free(older.id), 0);

  // 2. A pending remove still claims: drop it from the newer deck's DRAFT
  //    while its version still lists it, and the copy stays spoken for.
  await fixture.execute(sql`delete from deck_cards where deck_id = ${newer.id}`);
  check("pending remove still claims", await free(older.id), 0);
  // …and it is still the newer deck's own claim, so its own page reads 0 free.
  check("the pending remove is still the holder's own claim", await free(newer.id), 0);

  // 3. THE HEADLINE. Between two sleeved versions the earlier `since` holds the
  //    card, whatever the decks' ages. The older deck drafts it and commits
  //    SECOND, so it is told to buy — a negative free — instead of quietly
  //    emptying the newer deck's box.
  await fixture.execute(sql`
    insert into deck_cards (deck_id, oracle_id, quantity)
    values (${older.id}, ${card}, 1)
  `);
  await commit(older.id, cmdA, 1, true);
  check("the later commit buys rather than taking the copy", await free(older.id), -1);

  // 4. An accepted pull settles it at once: the source commits a version
  //    without the card, and the asking deck stops being short.
  await commit(newer.id, cmdB, 2, false);
  check("the pull clears the shortfall", await free(older.id), 0);
  // …and the copy is now the older deck's, so the source has none spare.
  check("the source deck has no spare copy after the pull", await free(newer.id), 0);
} finally {
  // Ordered by dependency; deck_versions and deck_cards cascade off decks.
  await fixture.execute(sql`delete from decks where user_id = ${USER}`);
  await fixture.execute(sql`delete from collection_items where user_id = ${USER}`);
  await pool.end();
}

console.log(failures === 0 ? "\nAll six figures hold." : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
