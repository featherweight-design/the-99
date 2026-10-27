// A failed Help me choose create's retry fills as Help me choose, proved against a real Postgres.
//
// The case: Help me choose answered with no budget, no bracket and no build-around card, under
// "Any cards". Every gated answer column is null, so before `decks.answer_asked` the retry
// (`fillDeck`) read the deck back as started some other way and filled the plain build, which
// leaves out what "Any cards" buys from the commander's best-played list.
//
// Each check reads the deck back from the database rather than trusting what was written:
//   THE WRITE: the empty deck a failed create leaves (the create's own `answerColumnsFor`) stores
//   `answer_asked` true, with every gated answer null.
//   THE READ-BACK: `retryAnswersOf` over that row (what `fillDeck` calls) returns the answers the
//   create handed the plan, not null.
//   THE FILL: the plan from the retry's answers is the create's plan, and differs from the plain
//   build, which is what the retry filled before (or the check has measured nothing).
//
// It writes ONE deck row and deletes it. It runs on a scratch branch only (`assertScratchBranch`),
// named by `PROBE_DB_URL`. No model is called.
//
//   PROBE_DB_URL=<scratch> pnpm probe:hmc-retry-answers
import { requireEnv } from "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";
import { eq, sql } from "drizzle-orm";

requireEnv(["PROBE_DB_URL"]);
// After the env import, which overrides DATABASE_URL from `.env`; the client is loaded dynamically
// below so it reads this value.
process.env.DATABASE_URL = process.env.PROBE_DB_URL;

const USER = process.env.PROBE_USER_ID ?? "user_3GjLj0ERZEQ7EeycFp57vRdQPub";
const COMMANDER = process.env.PROBE_COMMANDER ?? "Atraxa, Praetors' Voice";

let failures = 0;
const check = (label: string, ok: boolean, detail: string) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — ${detail}`);
};

async function main() {
  const { db } = await import("../src/db");
  const { decks } = await import("../src/db/schema");
  const { buildFillPlan } = await import("../src/lib/decks/fill-plan");
  const { answerColumnsFor, retryAnswersOf, validateCreateAnswers } = await import("../src/lib/intake/answers");

  const { rows: [branch] } = await db.execute<{ id: string | null }>(sql`select current_setting('neon.branch_id', true) as id`);
  assertScratchBranch(branch?.id ?? null, "probe:hmc-retry-answers");

  const { rows: [cmd] } = await db.execute<{ oracle_id: string; name: string; color_identity: string[]; mana_cost: string | null }>(sql`
    select oracle_id, name, color_identity, mana_cost from cards where name = ${COMMANDER}`);
  if (!cmd) throw new Error(`no commander named ${COMMANDER}`);
  const commanders = [{ oracleId: cmd.oracle_id, name: cmd.name, colorIdentity: cmd.color_identity, manaCost: cmd.mana_cost ?? null }];

  // What `createDeck` validates and stores for this ask, and what it hands the plan.
  const asked = validateCreateAnswers({ themes: ["Counters"], cardOracleId: null, budgetDollars: null, bracket: null, bracketBuys: false });
  const columns = answerColumnsFor(asked, null);
  const createAnswers = { budgetCents: null, bracket: asked.bracket, cardOracleId: null, bracketBuys: asked.bracketBuys };

  // The empty-deck fallback's own write (`createDeck`'s catch).
  const [deck] = await db.insert(decks)
    .values({ userId: USER, name: "probe:hmc-retry-answers", commanderOracleId: cmd.oracle_id, partnerOracleId: null, filled: false, ...columns })
    .returning({ id: decks.id });
  try {
    const { rows: [raw] } = await db.execute<{ answer_asked: boolean; answer_budget_cents: number | null; answer_bracket: number | null; answer_card_oracle_id: string | null }>(sql`
      select answer_asked, answer_budget_cents, answer_bracket, answer_card_oracle_id from decks where id = ${deck.id}`);
    check("the failed create stores the marker", raw?.answer_asked === true
      && raw.answer_budget_cents === null && raw.answer_bracket === null && raw.answer_card_oracle_id === null,
    `answer_asked=${raw?.answer_asked}, budget=${raw?.answer_budget_cents}, bracket=${raw?.answer_bracket}, card=${raw?.answer_card_oracle_id}`);

    const [row] = await db.select().from(decks).where(eq(decks.id, deck.id));
    const retry = retryAnswersOf(row);
    check("the retry reads the answers back", retry !== null
      && retry.budgetCents === null && retry.bracket === null && retry.cardOracleId === null && retry.bracketBuys === false,
    JSON.stringify(retry));

    const ids = (p: { rows: { oracleId: string; quantity: number }[] }) =>
      p.rows.map((r) => `${r.oracleId}x${r.quantity}`).sort().join(",");
    // Owned is read from the collection by this script, not from the plan.
    const { rows: held } = await db.execute<{ oracle_id: string }>(sql`
      select distinct oracle_id from collection_items where user_id = ${USER}`);
    const owned = new Set(held.map((r) => r.oracle_id));
    const unowned = (p: { rows: { oracleId: string }[] }) => p.rows.filter((r) => !owned.has(r.oracleId)).length;
    const only = (a: { rows: { oracleId: string }[] }, b: { rows: { oracleId: string }[] }) => {
      const other = new Set(b.rows.map((r) => r.oracleId));
      return a.rows.filter((r) => !other.has(r.oracleId)).length;
    };
    const created = await buildFillPlan(USER, commanders, new Set(), { selected: [], answers: createAnswers, env: process.env });
    const retried = await buildFillPlan(USER, commanders, new Set(), { selected: [], ...(retry ? { answers: retry } : {}), env: process.env });
    const plain = await buildFillPlan(USER, commanders, new Set(), { selected: [], env: process.env });
    check("the retry fills as the create did", ids(retried) === ids(created),
      `${retried.rows.length} rows retried, ${created.rows.length} created, ${unowned(retried)} unowned in the retry`);
    check("and not as the plain build the retry used to fill", ids(retried) !== ids(plain),
      `${only(retried, plain)} cards only in the retry, ${only(plain, retried)} only in the plain build; `
      + `${unowned(retried)} unowned with the answers, ${unowned(plain)} in the plain build`);
  } finally {
    await db.delete(decks).where(eq(decks.id, deck.id));
  }
  console.log(failures === 0 ? "\nall checks pass" : `\n${failures} check(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
