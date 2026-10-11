// Builds one confirmed import receipt, so the summary route can be photographed.
//
// WHY A SEEDER RATHER THAN AN INVENTORY STEP. The contact sheet loads URLs; it cannot make a
// collection replace happen, and `/collection/replace/summary/[uploadId]` needs a CONFIRMED
// upload carrying a `summary_payload`. Reaching it by actually importing a CSV would replace
// the account's whole collection, which is not a thing a screenshot run may do.
//
// WHY IT SEEDS DECKS TOO. The contested section only renders where committed demand exceeds
// supply, and the headless probe account has no committed deck at all — see the local-dev note
// in memory. Run against it with no fixture, the section is empty and the photograph shows a
// working feature as a missing one.
//
// Point it at `local-dev` or a scratch branch, NEVER production. It writes under the user id it
// is given, and `--clean` removes exactly what it wrote.
//
//   pnpm seed:summary <userId>            # prints the URL to photograph
//   pnpm seed:summary <userId> --clean
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";
import { createHash } from "node:crypto";

neonConfig.webSocketConstructor = ws;

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

const userId = process.argv[2];
const clean = process.argv.includes("--clean");
if (!userId) throw new Error("usage: pnpm seed:summary <userId> [--clean]");

/**
 * Ids derived FROM THE USER, so a re-run replaces its own fixture rather than accumulating
 * receipts and two accounts on one database do not collide.
 *
 * Fixed ids were the first version and they cannot work: these are primary keys, so they are
 * global to the database however carefully the DELETEs are scoped — the second account's insert
 * would simply fail on the first account's row. Derived ids give every account its own, and the
 * run prints the URL, so nothing has to be read back.
 */
const digest = createHash("sha256").update(userId).digest("hex");
const fixtureId = (suffix: string) =>
  [digest.slice(0, 8), digest.slice(8, 12), `4${digest.slice(13, 16)}`,
   `8${digest.slice(17, 20)}`, `${digest.slice(20, 26)}${suffix}`].join("-");
const UPLOAD_ID = fixtureId("f1cef0");
const DECK_A = fixtureId("dec001");
const DECK_B = fixtureId("dec002");
const FIXTURE_NAME = "Summary fixture";

async function main() {
  try {
    if (clean) {
      await db.execute(sql`
        delete from csv_uploads where id = ${UPLOAD_ID} and user_id = ${userId}
      `);
      await db.execute(sql`
        delete from decks where id in (${DECK_A}, ${DECK_B}) and user_id = ${userId}
      `);
      console.log("fixture removed");
      return;
    }

    // THE CONTESTED CARD IS CHOSEN BY OWNERSHIP, and that is the whole fixture. Two committed
    // decks claim one copy each, so the card has to be one this account owns exactly ONE of —
    // otherwise `hard <= owned`, the contention is not real, the loader correctly drops the row
    // and the photograph shows a working feature as a missing section. The first version of this
    // seeder took the first legend in the catalog and did exactly that.
    const { rows: [contested] } = await db.execute<{ oracle_id: string; name: string }>(sql`
      select c.oracle_id, c.name
      from cards c
      join collection_items ci on ci.oracle_id = c.oracle_id and ci.user_id = ${userId}
      where c.type_line ~ 'Legendary Creature' and c.type_line !~ '\\mBasic\\M'
      group by c.oracle_id, c.name
      having sum(ci.quantity) = 1
      order by c.oracle_id
      limit 1
    `);
    if (!contested) {
      throw new Error("no single-copy legend in this account's collection — contention cannot be staged");
    }

    // Three more for the money sections and the decks' commander. They only have to be real and
    // distinct from the contested card; nothing is asserted about what the account owns of them.
    const { rows: cards } = await db.execute<{ oracle_id: string; name: string }>(sql`
      select oracle_id, name from cards
      where type_line !~ '\\mBasic\\M' and type_line ~ 'Legendary Creature'
        and oracle_id <> ${contested.oracle_id}
      order by oracle_id limit 3
    `);
    if (cards.length < 3) throw new Error("catalog is empty — seed it first");
    const [cleared, still, commander] = cards;

    // Scoped to this user, both here and in --clean. The ids are fixed so a re-run replaces its
    // own fixture, but two accounts on one local database share those ids — an unscoped delete
    // would take the other account's receipt with it, which is not what "removes exactly what it
    // wrote" means.
    await db.execute(sql`
      delete from csv_uploads where id = ${UPLOAD_ID} and user_id = ${userId}
    `);
    await db.execute(sql`
      delete from decks where id in (${DECK_A}, ${DECK_B}) and user_id = ${userId}
    `);

    // Two committed decks that both list the contested card, so the live claim read finds real
    // contention. `since` is stated a month apart: the queue order IS the explanation of the
    // default, so two identical stamps would photograph a row that cannot be read.
    for (const [deckId, name, ago] of [
      [DECK_A, `${FIXTURE_NAME} — first`, 60],
      [DECK_B, `${FIXTURE_NAME} — second`, 20],
    ] as const) {
      await db.execute(sql`
        insert into decks (id, user_id, name, commander_oracle_id)
        values (${deckId}, ${userId}, ${name}, ${commander.oracle_id})
      `);
      const { rows: [v] } = await db.execute<{ id: string }>(sql`
        insert into deck_versions (deck_id, number, committed_at, commander_oracle_id, commander_since)
        values (${deckId}, 1, now() - (${ago} * interval '1 day'), ${commander.oracle_id},
                now() - (${ago} * interval '1 day'))
        returning id
      `);
      await db.execute(sql`
        insert into deck_version_cards (version_id, oracle_id, quantity, since)
        values (${v.id}, ${contested.oracle_id}, 1, now() - (${ago} * interval '1 day'))
      `);
      await db.execute(sql`
        insert into deck_cards (deck_id, oracle_id, quantity)
        values (${deckId}, ${contested.oracle_id}, 1)
      `);
    }

    // The payload a real confirm would have written. Its money sections are frozen by design, so
    // stating them here is exactly what the route reads in production — no code path is skipped
    // except the diff that produced them, which `pnpm probe:arrivals` covers.
    const summary = {
      // The CURRENT payload shape. A v1 fixture would exercise the reader's legacy fallback
      // (`ownedBefore ?? 0`) rather than the shape production writes, so the contact sheet would
      // photograph a path no import takes.
      version: 3,
      totalBefore: 2731,
      totalAfter: 2733,
      arrived: 3,
      left: 1,
      issues: { unmatched: 2, parseErrors: 1 },
      // No committed deck went short: this fixture photographs an import that only added.
      nowShort: [],
      cleared: [
        { deckId: DECK_A, oracleId: cleared.oracle_id, copies: 1 },
        // THE CONTESTED CARD, CLEARED FOR THE SENIOR DECK — the state a real import produces and
        // the fixture did not: seniority hands the arrival to one deck, so that deck's buy row
        // clears while the chooser below is still asking which deck gets it. `withoutUndecided`
        // takes this row back out at the read; without it the fixture photographs a receipt that
        // contradicts its own chooser, which is what the first real walkthrough found.
        { deckId: DECK_A, oracleId: contested.oracle_id, copies: 1 },
      ],
      still: [
        { deckId: DECK_B, oracleId: still.oracle_id, owed: 1, reason: { kind: "partly", arrived: 1, wanted: 2 } },
        // DECK_B, not DECK_A. `diffBuyRows` keys on deck-and-card and its branches are mutually
        // exclusive, so no import can report the same pair as both cleared and still owed — a
        // fixture that did would photograph a payload the real diff cannot produce. The state a
        // real import DOES produce is this: seniority clears the card for one deck while the
        // other stays short of it, which is the pair the chooser below is deciding between.
        { deckId: DECK_B, oracleId: contested.oracle_id, owed: 1, reason: { kind: "gone" } },
      ],
      // One copy owned and none before it: this fixture's contested card is chosen by owning
      // exactly one, and that one is the arrival.
      contested: [{ oracleId: contested.oracle_id, arrived: 1, ownedBefore: 0 }],
      names: {
        cards: {
          [cleared.oracle_id]: cleared.name,
          [still.oracle_id]: still.name,
          [contested.oracle_id]: contested.name,
        },
        decks: { [DECK_A]: `${FIXTURE_NAME} — first`, [DECK_B]: `${FIXTURE_NAME} — second` },
      },
    };

    await db.execute(sql`
      insert into csv_uploads
        (id, user_id, filename, row_count, unmatched_count, preview_payload, confirmed_at, summary_payload)
      values (${UPLOAD_ID}, ${userId}, 'summary-fixture.csv', 2736, 2,
        ${JSON.stringify({
          pendingItems: [],
          unmatched: [
            { name: "Lightning Bolt (misspelled)", setCode: "LEA", line: 12, quantity: 1 },
            { name: "Not A Card", setCode: "XXX", line: 48, quantity: 2 },
          ],
          parseErrors: [{ line: 91, reason: "could not read quantity" }],
          skippedByDesignCount: 3,
        })}::jsonb,
        now(), ${JSON.stringify(summary)}::jsonb)
    `);

    // A DRAFT CHANGE ON THE CONTESTED CARD, so `/decks/[id]/changes` has a row for the chooser to
    // hang under. The claim model reads VERSIONS, so raising the draft's count changes what the
    // page shows without touching the contention the row is about.
    await db.execute(sql`
      update deck_cards set quantity = 2 where deck_id = ${DECK_A} and oracle_id = ${contested.oracle_id}
    `);

    console.log(`/collection/replace/summary/${UPLOAD_ID}`);
    console.log(`/decks/${DECK_A}/changes`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
