// The deck-stats loader, proved against a real Postgres by calling the real
// loadDeckStats. The pure half is unit-tested; what only a database can answer
// is whether the loader assembles the right rows — that it refuses a deck it
// was asked about but the player does not own, that it folds in commanders
// which are not deck_cards rows, that a grouped game tally comes back as a
// record, and that a cost lands on the deck it belongs to.
//
// It writes a fixture under a per-run user_id and deletes it in a finally. No
// begin/rollback: loadDeckStats goes through the src/db singleton, which is a
// different connection from the one this script opens.
//
// Run it against a scratch Neon branch or local dev — NEVER production.
//
// Run: `pnpm probe:stats`
// First, and on its own line: src/db reads DATABASE_URL at module scope, so the
// .env has to be loaded before the import below reaches it.
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";
import { loadDeckStats, loadOneDeckStats } from "../src/lib/decks/stats-query";

neonConfig.webSocketConstructor = ws;

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-stats-${Date.now()}`;
const OTHER = `${USER}-other`;

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${actual}, expected ${expected}`);
};

type Card = { oracle_id: string; cmc: number; type_line: string; color_identity: string[] };

// Read from the catalog rather than hard-coded: a fixed uuid rots the first
// time it moves. Two legends lead the pair, and a non-land body and a land give
// the curve something to include and something to exclude.
const pickCards = async () => {
  const { rows: legends } = await fixture.execute<Card>(sql`
    select oracle_id, cmc, type_line, color_identity from cards
    where type_line ~ 'Legendary Creature' and cmc > 0
    order by oracle_id limit 2
  `);
  // NOT legendary: the two commanders above are picked from the legends, and a
  // body that came back as one of them would be inserted into deck_cards as
  // well as sitting in a commander column — every count below would then
  // describe a fixture other than the one this probe means to build.
  const { rows: bodies } = await fixture.execute<Card>(sql`
    select oracle_id, cmc, type_line, color_identity from cards
    where type_line ~ 'Creature' and type_line !~ 'Land'
      and type_line !~ 'Legendary' and cmc between 1 and 6
    order by oracle_id limit 1
  `);
  // NOT basic: `loadDeckBuyRows` excludes basics from every shopping surface,
  // so a basic here would leave the cost assertion below expecting copies the
  // roll-up deliberately never counts.
  const { rows: lands } = await fixture.execute<Card>(sql`
    select oracle_id, cmc, type_line, color_identity from cards
    where type_line ~ '\\mLand\\M' and type_line !~ 'Creature'
      and type_line !~ '\\mBasic\\M'
    order by oracle_id limit 1
  `);
  if (legends.length < 2 || !bodies[0] || !lands[0]) {
    throw new Error("catalog is empty — seed it first");
  }
  return { cmdA: legends[0], cmdB: legends[1], body: bodies[0], land: lands[0] };
};

const makeDeck = async (userId: string, name: string, commander: string, partner?: string) => {
  const { rows } = await fixture.execute<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id, partner_oracle_id)
    values (
      ${userId}, ${name}, ${commander}::uuid,
      ${partner ?? null}::uuid
    )
    returning id
  `);
  return rows[0].id;
};

const addCard = async (deckId: string, oracleId: string, quantity: number) =>
  fixture.execute(sql`
    insert into deck_cards (deck_id, oracle_id, quantity)
    values (${deckId}::uuid, ${oracleId}::uuid, ${quantity})
  `);

const logGame = async (deckId: string, userId: string, result: string) =>
  fixture.execute(sql`
    insert into deck_games (deck_id, user_id, result, pod_size)
    values (${deckId}::uuid, ${userId}, ${result}, 4)
  `);

// Wrapped in main() rather than run at top level: tsx transpiles this repo's
// scripts to CJS, where a top-level await is a build error.
async function main() {
  const { cmdA, cmdB, body, land } = await pickCards();

  const solo = await makeDeck(USER, `${USER} solo`, cmdA.oracle_id);
  const pair = await makeDeck(USER, `${USER} pair`, cmdA.oracle_id, cmdB.oracle_id);
  const foreign = await makeDeck(OTHER, `${OTHER} deck`, cmdA.oracle_id);

  await addCard(solo, body.oracle_id, 2);
  await addCard(solo, land.oracle_id, 7);

  // Three wins, one loss, one draw — grouped in Postgres, so the record proves
  // the grouped rows are expanded back into a tally correctly.
  for (const result of ["win", "win", "win", "loss", "draw"]) {
    await logGame(solo, USER, result);
  }

  const stats = await loadDeckStats({ env: process.env, userId: USER });
  check("both of this player's decks are answered for", stats.size, 2);
  check("another player's deck is not", stats.has(foreign), false);

  const one = stats.get(solo)!;
  check("the grouped game rows become a record", one.record.wins, 3);
  check("losses too", one.record.losses, 1);
  check("draws too", one.record.draws, 1);
  check("played is the whole tally", one.record.played, 5);

  // Two bodies, seven lands, one commander. The commander is not a deck_cards
  // row, so its appearance here is the whole point of the second read.
  check("lands are excluded from the curve", one.curve.lands, 7);
  check("the commander is counted in the curve", one.curve.copies, 3);
  check(
    "the commander lands in its own bucket",
    one.curve.buckets[Math.min(Math.round(cmdA.cmc), 7)].copies >= 1,
    true,
  );
  check("every card counts in the spread, lands included", one.colours.copies, 10);

  const two = stats.get(pair)!;
  check("an empty deck still gets an entry", two.curve.copies, 2);
  check("both commanders are counted", two.colours.copies, 2);
  check("a deck with no games has an empty record", two.record.played, 0);

  // The shared-reference trap: two gameless decks must not hand back one object.
  two.record.wins += 1;
  const reread = await loadDeckStats({ env: process.env, userId: USER, deckIds: [pair] });
  check("records are not shared between decks", reread.get(pair)!.record.wins, 0);

  check("loadOneDeckStats narrows to one deck", (await loadOneDeckStats(solo, USER, process.env))?.deckId, solo);
  check(
    "loadOneDeckStats refuses another player's deck",
    await loadOneDeckStats(foreign, USER, process.env),
    null,
  );
  check(
    "an unowned deck id yields no entry",
    (await loadDeckStats({ env: process.env, userId: USER, deckIds: [foreign] })).size,
    0,
  );
  check(
    "an empty deckIds list asks for nothing",
    (await loadDeckStats({ env: process.env, userId: USER, deckIds: [] })).size,
    0,
  );

  // `cost` is loadShoppingRollup's answer, narrowed to this deck. The fixture
  // owns no cards, so every non-basic copy in the list is one to buy — the two
  // bodies and the seven non-basic lands. Basics would be excluded, as they are
  // from every other shopping surface, which is why the land picked above is
  // deliberately not one.
  check("cost names every copy to buy", one.cost?.copies, 9);
  check("a deck holding nothing buys nothing", two.cost ?? null, null);
}

main()
  .catch((error) => {
    failures += 1;
    console.error(error);
  })
  .finally(async () => {
    await fixture.execute(sql`
      delete from deck_games where user_id in (${USER}, ${OTHER})
    `);
    await fixture.execute(sql`
      delete from deck_cards where deck_id in (
        select id from decks where user_id in (${USER}, ${OTHER})
      )
    `);
    await fixture.execute(sql`delete from decks where user_id in (${USER}, ${OTHER})`);
    await pool.end();
    console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
    process.exit(failures === 0 ? 0 : 1);
  });
