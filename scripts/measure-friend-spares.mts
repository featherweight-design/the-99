// Times what `loadFriendSpares` costs per granting friend (plan `boards/plan-social-foundation-2026-10-12.md`,
// PR 2): the grant read once, then the friend's own claim model narrowed to the viewer's asked cards, once
// per friend. Read-only. `MEASURE_FRIEND_USER_ID` names an account whose real collection stands in for a
// friend's (Hugh's, on a staging copy); `MEASURE_ASKED` sets how many asked cards (default 60).
//
//   MEASURE_FRIEND_USER_ID=user_… pnpm measure:friend-spares
import "./lib/env.mjs";

async function main() {
  const friend = process.env.MEASURE_FRIEND_USER_ID;
  if (!friend) throw new Error("measure:friend-spares: set MEASURE_FRIEND_USER_ID");
  const askedCount = Number(process.env.MEASURE_ASKED ?? 60);
  const { db } = await import("../src/db");
  const { sql } = await import("drizzle-orm");
  const { loadAvailability } = await import("../src/lib/decks/availability-query");
  const { CLAIM_MODELS_AT_ONCE, spareGrantorsQuery } = await import("../src/lib/social/spares");
  const { rows } = await db.execute<{ o: string }>(sql`
    select distinct oracle_id as o from collection_items where user_id = ${friend} order by oracle_id limit ${askedCount}`);
  const asked = rows.map((r) => r.o);
  const time = async (fn: () => Promise<unknown>, runs = 9) => {
    const ms: number[] = [];
    for (let i = 0; i < runs; i++) {
      const t = performance.now();
      await fn();
      ms.push(performance.now() - t);
    }
    ms.sort((a, b) => a - b);
    return { median: Math.round(ms[Math.floor(runs / 2)]), min: Math.round(ms[0]), max: Math.round(ms[runs - 1]) };
  };
  const model = await time(() => loadAvailability(friend, { oracleIds: asked }));
  const grants = await time(() => spareGrantorsQuery(friend));
  console.log(`asked cards: ${asked.length}`);
  console.log(`claim model per friend: median ${model.median}ms (min ${model.min}, max ${model.max})`);
  console.log(`grant read: median ${grants.median}ms`);
  // The shipped flow: a grant read, then per friend one read-only repeatable-read transaction holding the
  // grant check and the claim model, at most CLAIM_MODELS_AT_ONCE at a time.
  for (const n of [1, 3, 6, 10]) {
    const flow = await time(async () => {
      await spareGrantorsQuery(friend);
      // A viewer with no grants: each transaction re-reads the grants and stops, so time the grant check
      // and the model inside one snapshot directly, as claimModelsFor runs them for a granting friend.
      await Promise.all(Array.from({ length: Math.min(CLAIM_MODELS_AT_ONCE, n) }, async (_, w) => {
        for (let i = w; i < n; i += CLAIM_MODELS_AT_ONCE) {
          await db.transaction(async (tx) => {
            await spareGrantorsQuery(friend, tx);
            await loadAvailability(friend, { oracleIds: asked }, tx);
          }, { isolationLevel: "repeatable read", accessMode: "read only" });
        }
      }));
    }, 5);
    console.log(`${n} granting friend(s), ${CLAIM_MODELS_AT_ONCE} models at a time, each with its grant check in one snapshot: median ${flow.median}ms`);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
