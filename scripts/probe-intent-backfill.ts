// Proves migration 0078's backfill touches ONLY seeded rows (H35, ruling 3): the UPDATE that
// nulls an auto-written description must never touch a line the player actually typed. This
// runs on a real Postgres because the proof is about a WHERE clause and a real table, which no
// unit test here can assert — `run-store-constraint.test.ts`'s sibling pattern checks the
// migration file's TEXT, and this checks what running it DOES.
//
// Writes two fixture decks under a per-run user_id: one seeded (intent_seeded = true), one
// typed by the player (intent_seeded = false). Runs the migration's own UPDATE statement
// against them, then asserts the seeded row is nulled and the typed row is UNCHANGED. Deletes
// both in a `finally`.
//
// Point it at `local-dev` or a scratch Neon branch. NEVER production or staging.
//
//   pnpm tsx scripts/probe-intent-backfill.ts
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { requireEnv } from "./lib/env.mjs";
import { db } from "../src/db";
import { decks } from "../src/db/schema";
import { sql } from "drizzle-orm";

requireEnv(["DATABASE_URL"]);

const userId = randomUUID();
const seededId = randomUUID();
const typedId = randomUUID();
let failed = false;

function check(label: string, pass: boolean): void {
  console.log(`${pass ? "PASS" : "FAIL"}: ${label}`);
  if (!pass) failed = true;
}

async function main(): Promise<void> {
  await db.insert(decks).values([
    { id: seededId, userId, name: "Seeded fixture", commanderOracleId: FIXTURE_COMMANDER, intent: "Built around a commander, from the cards you own.", intentSeeded: true },
    { id: typedId, userId, name: "Typed fixture", commanderOracleId: FIXTURE_COMMANDER, intent: "A deck the player actually wrote.", intentSeeded: false },
  ]);

  // The migration's own statement, verbatim.
  await db.execute(sql`UPDATE "decks" SET "intent" = NULL WHERE "intent_seeded" = true`);

  const [seeded] = await db.select({ intent: decks.intent }).from(decks).where(eq(decks.id, seededId));
  const [typed] = await db.select({ intent: decks.intent }).from(decks).where(eq(decks.id, typedId));

  check("the seeded row's description is nulled", seeded?.intent === null);
  check("the player-typed row's description is UNCHANGED", typed?.intent === "A deck the player actually wrote.");
}

let FIXTURE_COMMANDER = "";

async function findFixtureCommander(): Promise<string> {
  const result = await db.execute<{ oracle_id: string }>(sql`select oracle_id from cards where commander_legal = true limit 1`);
  const row = result.rows[0];
  if (!row) throw new Error("no commander-legal card found to build the fixture decks around");
  return row.oracle_id;
}

(async () => {
  try {
    FIXTURE_COMMANDER = await findFixtureCommander();
    await main();
  } finally {
    await db.delete(decks).where(eq(decks.userId, userId));
  }
  console.log(failed ? "\nSome checks FAILED." : "\nAll checks passed.");
  if (failed) process.exitCode = 1;
})();
