// Proves `/discover`'s stored owned-support counts against a real database (speed plan, 2026-10-12):
// that the stored path answers exactly what the live aggregate answers, that a hit reads the store
// rather than recomputing, and that a different owned set recomputes rather than serving the old
// counts. The unit tests prove the key; only a database proves the query.
//
// It WRITES (the reader's `owned_support_counts` and `owned_support_stamps` rows), so it fails closed:
// `PROBE_DB_BRANCH` must name the Neon branch `DATABASE_URL` reports, and staging and production are
// refused by id. Run it on a scratch branch of staging after `pnpm db:migrate`, then delete the branch.
//
//   PROBE_DB_BRANCH=br-… PROBE_USER_ID=<clerk id with a collection> pnpm probe:owned-support
import "./lib/env.mjs";

const PROTECTED = new Set(["br-polished-pond-a6e63y0b", "br-noisy-violet-a6vw4ess"]);

let failed = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
};

async function main() {
  const named = process.env.PROBE_DB_BRANCH;
  const userId = process.env.PROBE_USER_ID;
  if (!named || !userId) throw new Error("probe:owned-support: set PROBE_DB_BRANCH and PROBE_USER_ID");
  if (PROTECTED.has(named)) throw new Error(`probe:owned-support: ${named} is staging or production; it writes`);
  const { db } = await import("../src/db");
  const { sql } = await import("drizzle-orm");
  const { rows } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
  if (rows[0]?.b !== named) throw new Error(`probe:owned-support: database reports ${rows[0]?.b}, not ${named}`);

  const { loadCandidates } = await import("../src/lib/discovery/candidates");
  const owned = (
    await db.execute<{ oracle_id: string }>(
      sql`select distinct oracle_id from collection_items where user_id = ${userId}`,
    )
  ).rows.map((r) => r.oracle_id);
  check("the account holds a collection", owned.length > 0, `${owned.length} owned ids`);

  const clear = async () => {
    await db.execute(sql`delete from owned_support_stamps where user_id = ${userId}`);
    await db.execute(sql`delete from owned_support_counts where user_id = ${userId}`);
  };
  try {
    await clear();
    type Row = Awaited<ReturnType<typeof loadCandidates>>[number];
    const key = (r: Row) => `${r.oracleId}|${r.ownedSupport}`;
    const sameAs = (want: Row[], got: Row[]) => {
      const w = new Set(want.map(key));
      return got.length === want.length && got.every((r) => w.has(key(r)));
    };
    const timed = async (f: () => Promise<Row[]>) => {
      const t = Date.now();
      const r = await f();
      return { r, ms: Date.now() - t };
    };

    // Passing the same ids as the ranked pool takes the live aggregate: the reference answer.
    const live = await timed(() => loadCandidates(userId, owned, owned));
    const miss = await timed(() => loadCandidates(userId, owned));
    const stampedAt = async () =>
      (await db.execute<{ t: string }>(sql`select computed_at::text t from owned_support_stamps where user_id = ${userId}`))
        .rows[0]?.t ?? null;
    const afterMiss = await stampedAt();
    const hit = await timed(() => loadCandidates(userId, owned));
    check("a hit reads the store rather than recomputing", afterMiss !== null && (await stampedAt()) === afterMiss);
    const stored = (
      await db.execute<{ n: number }>(sql`select count(*)::int n from owned_support_counts where user_id = ${userId}`)
    ).rows[0].n;
    const indexed = (await db.execute<{ n: number }>(sql`select count(*)::int n from commander_support`)).rows[0].n;
    check("a miss answers what the live aggregate answers", sameAs(live.r, miss.r), `${miss.r.length} rows`);
    check("a hit answers what the live aggregate answers", sameAs(live.r, hit.r));
    check("the store holds every commander with owned support, not only today's candidates", stored > live.r.length && stored <= indexed, `${stored} of ${indexed}`);
    console.log(`     timings: live ${live.ms}ms, miss ${miss.ms}ms, hit ${hit.ms}ms`);

    // A stamp whose index build is not the one the reading statement sees is not served, even under
    // a matching key: the stored counts are corrupted first, so serving them would show.
    await db.execute(sql`update owned_support_counts set owned_support = owned_support + 1000 where user_id = ${userId}`);
    await db.execute(sql`update owned_support_stamps set support_millis = -1 where user_id = ${userId}`);
    const moved = await loadCandidates(userId, owned);
    check("a stamp from another index build falls back to the live aggregate", sameAs(live.r, moved));
    await clear();
    await loadCandidates(userId, owned);

    // A smaller owned set is a different key: it must replace the stored counts for `owned`, never
    // serve them. The store is rebuilt for `owned` first, so this is a key mismatch, not an empty miss.
    const stampKey = async () =>
      (await db.execute<{ k: string }>(sql`select key k from owned_support_stamps where user_id = ${userId}`)).rows[0]?.k ?? null;
    const keyBefore = await stampKey();
    const fewer = owned.slice(0, Math.ceil(owned.length / 3));
    const liveFewer = await loadCandidates(userId, fewer, fewer);
    const storedFewer = await loadCandidates(userId, fewer);
    check("a changed owned set answers what the live aggregate answers", sameAs(liveFewer, storedFewer));
    const keyAfter = await stampKey();
    check("a changed owned set replaces the stored counts", keyBefore !== null && keyAfter !== null && keyAfter !== keyBefore);
  } finally {
    // A failed check or a throw still leaves the probe account as it found it.
    await clear();
  }
  console.log(failed === 0 ? "\nAll checks passed." : `\n${failed} check(s) failed.`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
