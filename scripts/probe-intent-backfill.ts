// Proves migration 0078's backfill touches ONLY seeded rows (H35, ruling 3): the UPDATE that
// nulls an auto-written description must never touch a line the player actually typed. This
// runs on a real Postgres because the proof is about a WHERE clause and a real table, which no
// unit test here can assert — `run-store-constraint.test.ts`'s sibling pattern checks the
// migration file's TEXT, and this checks what running it DOES.
//
// SOURCED FROM THE MIGRATION, not a hand-typed copy (pre-open review): the UPDATE statement is
// extracted from `drizzle/0078_deck_intent_240.sql` itself, so a later edit to that file's WHERE
// clause changes what this probe runs too, rather than leaving it to pass against a frozen copy
// that no longer matches what ships.
//
// EVERYTHING RUNS IN ONE TRANSACTION THAT ALWAYS ROLLS BACK (pre-open review): the fixtures, the
// migration's own UPDATE, and the assertions, so this never actually writes to the database it
// is pointed at — including any row the migration would otherwise touch beyond the two fixtures.
// A thrown sentinel after the checks forces the rollback whether they passed or failed.
//
// Point it at `local-dev` or a scratch Neon branch. Refuses production and staging by
// `neon.branch_id`, the `pull:staging` rule, even inside the transaction that will roll back —
// a refusal on the wrong database is a refusal, not a risk worth skipping.
//
//   pnpm tsx scripts/probe-intent-backfill.ts
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { requireEnv } from "./lib/env.mjs";
import { db } from "../src/db";
import { decks } from "../src/db/schema";

requireEnv(["DATABASE_URL"]);

const PRODUCTION = "br-noisy-violet-a6vw4ess";
const STAGING = "br-polished-pond-a6e63y0b";

const MIGRATION_PATH = "drizzle/0078_deck_intent_240.sql";

/** The migration's own UPDATE statement, verbatim — never retyped. */
function extractBackfillStatement(): string {
  const text = readFileSync(MIGRATION_PATH, "utf8");
  const match = /UPDATE\s+"decks"\s+SET\s+"intent"\s*=\s*NULL\s+WHERE\s+"intent_seeded"\s*=\s*true;/i.exec(text);
  if (!match) throw new Error(`${MIGRATION_PATH} no longer contains the backfill UPDATE this probe expects — update the probe's pattern`);
  return match[0].replace(/;$/, "");
}

const userId = randomUUID();
const seededId = randomUUID();
const typedId = randomUUID();
let failed = false;

function check(label: string, pass: boolean): void {
  console.log(`${pass ? "PASS" : "FAIL"}: ${label}`);
  if (!pass) failed = true;
}

/** Thrown after every check, inside the transaction, so it always rolls back. */
class DeliberateRollback extends Error {}

async function main(): Promise<void> {
  const backfillStatement = extractBackfillStatement();

  await db.transaction(async (tx) => {
    const branchResult = await tx.execute<{ id: string | null }>(
      sql`select current_setting('neon.branch_id', true) as id`,
    );
    const branchRows = Array.isArray(branchResult) ? branchResult : branchResult.rows;
    const branchId = branchRows[0]?.id ?? null;
    if (!branchId || branchId === PRODUCTION || branchId === STAGING || process.env.VERCEL_ENV === "production") {
      throw new Error(`refusing to run on ${branchId ?? "(unknown)"}: point DATABASE_URL at local-dev or a scratch branch`);
    }
    console.log(`branch ${branchId}`);

    const commanderResult = await tx.execute<{ oracle_id: string }>(sql`select oracle_id from cards where commander_legal = true limit 1`);
    const commander = (Array.isArray(commanderResult) ? commanderResult : commanderResult.rows)[0];
    if (!commander) throw new Error("no commander-legal card found to build the fixture decks around");

    await tx.insert(decks).values([
      { id: seededId, userId, name: "Seeded fixture", commanderOracleId: commander.oracle_id, intent: "Built around a commander, from the cards you own.", intentSeeded: true },
      { id: typedId, userId, name: "Typed fixture", commanderOracleId: commander.oracle_id, intent: "A deck the player actually wrote.", intentSeeded: false },
    ]);

    await tx.execute(sql.raw(backfillStatement));

    const [seeded] = await tx.select({ intent: decks.intent }).from(decks).where(eq(decks.id, seededId));
    const [typed] = await tx.select({ intent: decks.intent }).from(decks).where(eq(decks.id, typedId));

    check("the seeded row's description is nulled", seeded?.intent === null);
    check("the player-typed row's description is UNCHANGED", typed?.intent === "A deck the player actually wrote.");

    throw new DeliberateRollback();
  }).catch((err) => {
    if (!(err instanceof DeliberateRollback)) throw err;
  });
}

main().then(() => {
  console.log(failed ? "\nSome checks FAILED." : "\nAll checks passed. Nothing was committed (rolled back by design).");
  if (failed) process.exitCode = 1;
});
