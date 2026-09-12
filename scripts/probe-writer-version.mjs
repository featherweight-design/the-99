// Proves the writer-version stamp against a real Postgres.
//
// `commander_scores` is a cache whose rows are rebuilt from the collection, and
// the one thing a reader has to be able to tell is which WRITER produced a set:
// a set written before built commanders were scored has rows deleted out of it,
// and is otherwise indistinguishable from a whole one. The column's DEFAULT
// catches an old deployment's inserts. The trigger in 0027 catches what the
// default cannot — its UPDATEs, which is how an upsert from a rollback or from a
// compute in flight at cutover would leave a truncated set marked current.
//
// No unit test can reach a trigger, so this is the only proof it behaves.
// Writes under a per-run user id and deletes it in a `finally`; point it at
// local-dev or a scratch branch, never production.
//
//   node scripts/probe-writer-version.mjs
import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { requireEnv } from "./lib/env.mjs";

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const sql = neon(DATABASE_URL);
// A UUID, not the pid: two runs in separate containers commonly share pid 1, and
// this fixture's `finally` deletes every row under its own user id. A collision
// would have one run delete the other's rows mid-assertion.
const USER = `probe-writer-version-${randomUUID()}`;

const findings = [];
const note = (line) => {
  findings.push(line);
  console.log(line);
};
const check = (label, got, want) =>
  note(got === want ? `  ok   ${label}: ${got}` : `  FAIL ${label}: ${got}, expected ${want}`);

const version = async () => {
  const rows = await sql`select writer_version from commander_scores where user_id = ${USER}`;
  return rows.length === 1 ? rows[0].writer_version : `${rows.length} rows`;
};

try {
  const [card] = await sql`select oracle_id from cards limit 1`;
  if (!card) throw new Error("catalog is empty — seed it first");

  // A writer that announces itself. `set_config(..., true)` is transaction-local,
  // so this mirrors exactly what `persistScores` does inside its transaction.
  await sql.transaction([
    sql`select set_config('app.writer_version', '2', true)`,
    sql`insert into commander_scores
        (user_id, oracle_id, slug, score, rank_score, fit_pool, fit_roles, fit_synergy,
         synergy_state, receipts, color_pool_size, role_counts, writer_version)
        values (${USER}, ${card.oracle_id}, 'probe', 50, 50, 10, 10, 10, 'ok', '', 100,
                '{"ramp":0,"draw":0,"removal":0,"wipes":0}'::jsonb, 2)`,
  ]);
  note("a writer that announces version 2");
  check("insert keeps its version", await version(), 2);

  // The same writer, upserting onto the row it already wrote.
  await sql.transaction([
    sql`select set_config('app.writer_version', '2', true)`,
    sql`update commander_scores set score = 51 where user_id = ${USER}`,
  ]);
  check("its own update keeps it", await version(), 2);

  // An older deployment: no announcement, and an upsert whose SET list does not
  // name the column — which is exactly what the pre-0025 `persistScores` emits.
  await sql`update commander_scores set score = 52 where user_id = ${USER}`;
  note("a writer that announces nothing");
  check("its update marks the row stale", await version(), 1);

  // And its insert, which omits the column entirely.
  await sql`delete from commander_scores where user_id = ${USER}`;
  await sql`insert into commander_scores
      (user_id, oracle_id, slug, score, rank_score, fit_pool, fit_roles, fit_synergy,
       synergy_state, receipts, color_pool_size, role_counts)
      values (${USER}, ${card.oracle_id}, 'probe', 50, 50, 10, 10, 10, 'ok', '', 100,
              '{"ramp":0,"draw":0,"removal":0,"wipes":0}'::jsonb)`;
  check("its insert lands stale", await version(), 1);

  // The setting must not leak past its transaction: a later statement on the same
  // pooled connection has to look like a writer that said nothing.
  await sql`update commander_scores set score = 53 where user_id = ${USER}`;
  check("the announcement does not outlive its transaction", await version(), 1);
} finally {
  await sql`delete from commander_scores where user_id = ${USER}`;
}

const fails = findings.filter((f) => f.includes("FAIL"));
console.log(`\n${fails.length} failures.`);
if (fails.length) process.exitCode = 1;
