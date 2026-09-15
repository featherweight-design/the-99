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

neonConfig.webSocketConstructor = ws;

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

const userId = process.argv[2];
const clean = process.argv.includes("--clean");
if (!userId) throw new Error("usage: pnpm seed:summary <userId> [--clean]");

// Fixed ids, so a re-run replaces its own fixture rather than accumulating receipts, and the
// inventory can name the URL without reading anything back.
const UPLOAD_ID = "5ea50000-0000-4000-8000-00000000f1ce";
const DECK_A = "5ea50000-0000-4000-8000-00000000dec1";
const DECK_B = "5ea50000-0000-4000-8000-00000000dec2";
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
      version: 1,
      totalBefore: 2731,
      totalAfter: 2733,
      arrived: 3,
      left: 1,
      issues: { unmatched: 2, parseErrors: 1 },
      cleared: [{ deckId: DECK_A, oracleId: cleared.oracle_id, copies: 1 }],
      still: [
        { deckId: DECK_B, oracleId: still.oracle_id, owed: 1, reason: { kind: "partly", arrived: 1, wanted: 2 } },
        { deckId: DECK_A, oracleId: contested.oracle_id, owed: 1, reason: { kind: "gone" } },
      ],
      contested: [{ oracleId: contested.oracle_id, arrived: 1 }],
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

    console.log(`/collection/replace/summary/${UPLOAD_ID}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
