// Proves `SCORE_INDEX_LOCK` against a real Postgres.
//
// `commander_scores` is a cache rebuilt from the collection and scored against
// the commander index, and a rebuild of that index invalidates every synergy
// figure in it. Two halves keep it honest: the index build deletes the table,
// and `persistScores` re-reads `max(commander_support.computed_at)` inside its
// own transaction and abandons a write whose fingerprint has moved.
//
// NEITHER HALF IS SUFFICIENT AND THE COMPARISON ALONE IS NOT EITHER. A read
// proves the index had not moved at the instant it ran, not at COMMIT: the
// clear can land in the gap between that check and the inserts, and the
// pre-rebuild rows it was supposed to delete survive it. What closes that is an
// advisory lock — taken shared by the writer, exclusive by the clear.
//
// A lock is invisible in every value these functions return, so the unit tests
// can only read back the statements a stubbed transaction executed. That says
// the right text was issued; it cannot say the lock was taken on the same
// connection as the delete, or held across it, or that it blocks anything at
// all. Those are facts about what two real connections did to each other, which
// is what this script is for.
//
// IT SYNCHRONISES ON `pg_locks`, NEVER ON A SLEEP. A fixed delay cannot
// establish that the side under test has reached its lock, and a delay that
// expires early does not fail — it passes, having measured nothing. See
// `waitForLockWaiter`.
//
// WHICH SIDE IS REAL DIFFERS BY CASE, deliberately. Case 1 needs a writer that
// holds its transaction open across the clear, and `persistScores` commits on
// its own, so that side is the SQL it issues while the CLEAR is the real
// function. Case 3 is the mirror: the real `persistScores`, against a rebuilder
// whose lock and support write are raw SQL. Between them each lock is proved
// through the code that ships it — removing the exclusive one fails both of
// case 1's checks, removing the shared one fails case 3's.
//
// Writes under a per-run user id and one additive `commander_support` row, and
// deletes both in a `finally`. Point it at local-dev or a scratch Neon branch,
// NEVER production — the clear under test deletes `commander_scores` WHOLESALE,
// for every user in the database it is given.
//
//   pnpm probe:score-lock
import { randomUUID } from "node:crypto";
// .env has to be loaded before the import below reaches it.
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";
import { collectionGeneration, indexGeneration, persistScores, SCORE_INDEX_LOCK } from "../src/lib/recs/store";
import { buildCommanderIndex } from "../src/lib/edhrec/seed-index";
import type { RankedCommander } from "../src/lib/recs/recommend";

neonConfig.webSocketConstructor = ws;

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-score-lock-${randomUUID()}`;

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${actual}, expected ${expected}`);
};
const note = (line: string) => console.log(`\n${line}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Blocks until someone is WAITING on `SCORE_INDEX_LOCK`, read out of `pg_locks`.
 *
 * A FIXED SLEEP CANNOT ESTABLISH THIS, and that is a false-green rather than
 * flakiness. Case 1 sleeps and then asserts the sentinel survives: if the build
 * has not yet reached the lock, the sentinel is present for a trivial reason —
 * so the check passes WITH THE EXCLUSIVE LOCK REMOVED, and the zero-row check
 * after it passes too, because the clear still runs once the writer commits.
 * Case 3 has the mirror hole: if `persistScores` has not reached its lock query,
 * the rebuilder commits first and the writer reads the new generation unaided,
 * passing without the shared lock ever mattering. Both mutations do fail today,
 * on this machine, which is exactly the kind of evidence a sleep gives you.
 *
 * An advisory lock taken as `pg_advisory_xact_lock(bigint)` is reported with the
 * key split across two 32-bit halves — `classid` high, `objid` low, `objsubid`
 * 1 — so the halves are recomputed here from the same `hashtextextended` call
 * the application makes rather than being hardcoded.
 *
 * A TIMEOUT THROWS. Falling back to "carry on anyway" would reinstate the hole
 * this replaces, with extra steps.
 */
const WAITER_TIMEOUT_MS = 20_000;
const waitForLockWaiter = async (label: string): Promise<void> => {
  const started = Date.now();
  for (;;) {
    const { rows } = await fixture.execute<{ waiters: number }>(sql`
      with k as (select hashtextextended(${SCORE_INDEX_LOCK}, 0) as key)
      select count(l.pid)::int as waiters
        from k
        left join pg_locks l
          on l.locktype = 'advisory'
         and l.objsubid = 1
         and not l.granted
         and l.classid = ((k.key >> 32) & 4294967295)::oid
         and l.objid = (k.key & 4294967295)::oid
    `);
    if ((rows[0]?.waiters ?? 0) > 0) return;
    if (Date.now() - started > WAITER_TIMEOUT_MS) {
      throw new Error(
        `${label}: nothing ever waited on the index lock within ` +
          `${WAITER_TIMEOUT_MS}ms. Either the side under test takes no lock, or ` +
          `it failed before reaching one — both are findings, not timing.`,
      );
    }
    await sleep(100);
  }
};

const scoreRows = async () => {
  const { rows } = await fixture.execute<{ n: number }>(
    sql`select count(*)::int as n from commander_scores where user_id = ${USER}`,
  );
  return rows[0]?.n ?? 0;
};
// The guard's OWN reading, never a restatement of it: the fingerprint is the whole index
// token since the fit score reads role targets, and a probe that re-derived it from
// `max(computed_at)` would test a guard the app no longer runs.
const indexGen = () => indexGeneration();

// A ROLLBACK BEFORE EVERY RELEASE. A client handed back to the pool while its
// transaction is aborted stays broken, and the next caller to draw it — here,
// the `finally`'s own cleanup — fails with `25P02` and leaves the fixture
// behind. Cost one run's cleanup to a missing `::uuid[]` cast.
const release = async (client: { query: (q: string) => Promise<unknown>; release: () => void }) => {
  await client.query("rollback").catch(() => {});
  client.release();
};

const insertScore = (
  client: { query: (q: string, v: unknown[]) => Promise<unknown> },
  oracleId: string,
  slug: string,
) =>
  client.query(
    `insert into commander_scores
       (user_id, oracle_id, slug, score, rank_score, fit_pool, fit_roles, fit_synergy,
        synergy_state, receipts, color_pool_size, role_counts)
     values ($1, $2, $3, 50, 50, 0, 0, 0, 'ok', '', 1,
             '{"ramp":0,"draw":0,"removal":0,"wipes":0}'::jsonb)`,
    [USER, oracleId, slug],
  );

// The one commander the injected build "rebuilds". Nothing is fetched and
// nothing is written — `write` is a no-op — because what is under test is the
// clear the loop reaches afterwards, not the loop.
const buildWithRealClear = (oracleId: string, name: string) =>
  buildCommanderIndex({
    // The role pass is injected empty for the same reason the pair pass is: this probe is
    // about the LOCK. Letting the default run would load the whole
    // `commander_support_cards` x `cards` join and UPDATE every `commander_support` row on
    // each call, and on a partially seeded scratch branch it aborts with `role targets
    // REFUSED` for a reason that has nothing to do with what is under test.
    deriveRoleTargets: async () => ({ written: 0, pairsWritten: 0, zeroWipes: 0, labelFingerprint: null, labelCoverage: 0 }),
    // The pair pass, injected empty and for the same reason. Its default now sweeps every
    // legal partner pair — about 1,700 — so leaving it in place would send each of them to
    // live EDHREC with no delay and write every page into `commander_pair_support`.
    loadPairs: async () => [],
    loadCommanders: async () => [
      { oracleId, name, colorIdentity: [], typeLine: "Legendary Creature", oracleText: "" },
    ],
    loadNameIndex: async () => [],
    fetch: async () => ({
      data: {
        topCards: ["Sol Ring"],
        inclusionByName: {},
        synergyByName: {},
        tags: [],
        bracketCounts: {},
        budgetCounts: {},
        similarNames: [],
        deckCount: 1000,
        rank: 5,
        saltScore: 1.2, composition: null, manaCurve: null,
      },
      unreachable: false,
    }),
    write: async () => {},
    delayMs: 0,
  });

let supportFixture: string | null = null;

// A `main()` rather than top-level await: tsx compiles these scripts to CJS,
// which has none. Same shape as `probe-draft-state.ts`.
async function main() {
try {
  const { rows: cardRows } = await fixture.execute<{ oracle_id: string; name: string }>(sql`
    select oracle_id, name from cards
    where oracle_id not in (select commander_oracle_id from commander_support)
    limit 3
  `);
  if (cardRows.length < 3) throw new Error("need three cards outside commander_support — seed first");
  // Three distinct cards: the sentinel and the in-flight row would collide on
  // `(user_id, oracle_id)` if they shared one, and the support fixture must be a
  // row `commander_support` does not already hold.
  const [subject, other, support] = cardRows;

  const ranked = (oracleId: string): RankedCommander => ({
    oracleId,
    name: "probe",
    colorIdentity: [],
    imageUri: null,
    artCropUri: null,
    typeLine: "Legendary Creature",
    oracleText: "",
    manaCost: null,
    colorPoolSize: 1,
    edhrecOwnedCount: 0,
    edhrecTotal: 1,
    roleCounts: { ramp: 0, draw: 0, removal: 0, wipes: 0 },
    roleGaps: [],
    roleCards: { ramp: [], draw: [], removal: [], wipes: [] },
    overlapOwned: [],
    overlapOwnedIds: [],
    fitPool: 0,
    fitRoles: 0,
    fitSynergy: 0,
    score: 0,
    measurableTotal: 1,
    rankScore: 0,
    slug: "probe",
    synergyState: "ok",
  });

  // ── 1 · the clear waits for an in-flight score write ───────────────────
  //
  // The writer holds the shared key and has inserted but not committed. The
  // clear wants the exclusive key, so it cannot run until the rows it is
  // supposed to delete exist.
  //
  // WHAT PROVES THE CLEAR IS BLOCKED IS A COMMITTED SENTINEL, not the writer's
  // own row. A first version read the count while the writer held the lock and
  // expected to see its insert: that read runs on another connection, which
  // cannot see an uncommitted row whether or not anything is blocked, so it
  // reported 0 on a working build. The sentinel is committed before the race
  // starts, so it is visible to every connection — and an unblocked clear would
  // already have deleted it.
  note("1 · a clear racing an in-flight score write");
  // On the pool itself, so it autocommits and every connection can see it.
  await insertScore(pool, subject.oracle_id, "sentinel");
  const writer = await pool.connect();
  try {
    await writer.query("begin");
    await writer.query("select pg_advisory_xact_lock_shared(hashtextextended($1, 0))", [
      SCORE_INDEX_LOCK,
    ]);
    await insertScore(writer, other.oracle_id, "in-flight");

    // Deliberately not awaited: it blocks on the exclusive key, and the writer
    // has to commit while it waits or there is no race to observe.
    const building = buildWithRealClear(subject.oracle_id, subject.name);
    await waitForLockWaiter("the clear");
    check("a committed row survives while the writer holds the lock", await scoreRows(), 1);

    await writer.query("commit");
    await building;
    // Both rows gone: the clear waited until the in-flight one existed, which is
    // the whole property — a pre-rebuild row does not outlive the rebuild.
    check("…and the clear takes both once the writer commits", await scoreRows(), 0);
  } finally {
    await release(writer);
  }

  // ── 2 · the same interleaving with no lock on the writer ───────────────
  //
  // THE COUNTERFACTUAL, and the reason case 1 measures anything. Unlocked, the
  // clear runs immediately, sees nothing — the insert is uncommitted and
  // invisible to it — and the writer's pre-rebuild row commits AFTER the delete
  // and survives the rebuild indefinitely, marked `writer_version`-current and
  // indistinguishable from a fresh set.
  note("2 · the interleaving the lock closes");
  const unlocked = await pool.connect();
  try {
    await unlocked.query("begin");
    await insertScore(unlocked, subject.oracle_id, "in-flight");
    await buildWithRealClear(subject.oracle_id, subject.name);
    await unlocked.query("commit");
    check("a pre-rebuild row survives a clear it did not wait for", await scoreRows(), 1);
  } finally {
    await release(unlocked);
  }
  await fixture.execute(sql`delete from commander_scores where user_id = ${USER}`);

  // ── 3 · the writer abandons an index that moved while it waited ────────
  //
  // The other direction, and the half the lock exists to make reachable. The
  // rebuild holds the exclusive key and commits a support row stamped later
  // than anything else in the table; `persistScores`, holding a fingerprint
  // captured before that, blocks on the shared key and re-reads afterwards.
  // Without the lock it would read the OLD maximum, match, and write.
  note("3 · a score write whose index moved while it waited");
  const captured = await indexGen();
  const rebuilder = await pool.connect();
  try {
    await rebuilder.query("begin");
    await rebuilder.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [
      SCORE_INDEX_LOCK,
    ]);
    supportFixture = support.oracle_id;
    // `edhrec_total` is non-null iff `synergy_state` is 'ok'
    // (commander_support_total_null_check), and `computed_at` is stamped an hour
    // ahead so it is the table's maximum whatever else the index holds.
    await rebuilder.query(
      `insert into commander_support
         (commander_oracle_id, synergy_state, edhrec_total, tags, bracket_counts,
          budget_counts, similar_oracle_ids, computed_at)
       values ($1, 'ok', 1, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::uuid[],
               now() + interval '1 hour')`,
      [support.oracle_id],
    );

    const writing = persistScores(USER, [ranked(subject.oracle_id)], await collectionGeneration(USER), captured);
    await waitForLockWaiter("the score write");
    await rebuilder.query("commit");
    await writing;
    check("the write is abandoned", await scoreRows(), 0);
  } finally {
    await release(rebuilder);
  }

  // And the same call against the fingerprint the index now carries does write,
  // so case 3 is measuring the comparison rather than a writer that never
  // writes at all.
  await persistScores(USER, [ranked(subject.oracle_id)], await collectionGeneration(USER), await indexGen());
  check("the same write lands against the current fingerprint", await scoreRows(), 1);
} catch (err) {
  // A `process.exit` in the `finally` below swallows whatever threw — the first
  // version of this script reported "all checks passed" over a case that never
  // ran a single check, because the exception reached the exit before it
  // reached `main().catch`. Anything thrown is a failed run, loudly.
  failures += 1;
  console.error("\nthrew:", err);
} finally {
  await fixture.execute(sql`delete from commander_scores where user_id = ${USER}`);
  if (supportFixture) {
    await fixture.execute(
      sql`delete from commander_support where commander_oracle_id = ${supportFixture}`,
    );
  }
  await pool.end();
  console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
}
}

main().catch((err) => { console.error(err); process.exit(1); });
