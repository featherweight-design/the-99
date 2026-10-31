// Times what `loadFriendSpares` costs per granting friend (plan `boards/plan-social-foundation-2026-10-12.md`,
// PR 2): the grant read once, then the friend's own claim model narrowed to the viewer's asked cards, once
// per friend. Read-only. `MEASURE_FRIEND_USER_ID` names an account whose real collection stands in for a
// friend's (Hugh's, on a staging copy); `MEASURE_ASKED` sets how many asked cards (default 60).
//
//   MEASURE_FRIEND_USER_ID=user_… pnpm measure:friend-spares
//
// FITS MODE (discovery plan R2·3, R2 gap 3): `MEASURE_FITS=1` times what About's Try it would pay for Friends' spares,
// `loadFriendSpares` once over the UNION of every deck's missing cards with no cap, and `loadToolFits` for every deck
// tool, for the account with the most decks among those holding a friend (named by `MEASURE_VIEWER_ID` instead, if
// set). The account is never printed. READ-ONLY and refusing: it runs against `MEASURE_TARGET_URL` (not
// `DATABASE_URL`, which `env.mjs` overrides from `.env`) on the branch's direct host, every connection is set `read
// only` before its first statement, every statement is checked before it is sent and anything but a read stops the
// run, and `MEASURE_TARGET_BRANCH` must equal the `neon.branch_id` the database reports.
//
//   MEASURE_FITS=1 MEASURE_TARGET_URL=<staging> MEASURE_TARGET_BRANCH=br-… pnpm measure:friend-spares
import "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { isReadStatement } from "./lib/read-statement";
// No signed-in reader here: every switch read takes the environment itself (`process.env`).

async function fits() {
  const url = process.env.MEASURE_TARGET_URL;
  const branch = process.env.MEASURE_TARGET_BRANCH;
  if (!url || !branch) throw new Error("measure:friend-spares (fits): set MEASURE_TARGET_URL and MEASURE_TARGET_BRANCH");
  const direct = new URL(url);
  direct.hostname = direct.hostname.replace("-pooler.", ".");
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: direct.toString() });
  pool.on("connect", (client: { query: (...a: unknown[]) => unknown }) => {
    const send = client.query.bind(client) as (...a: unknown[]) => unknown;
    // Queued first on the connection, so it runs before any statement the code under measure sends.
    void send("set session characteristics as transaction read only");
    (client as unknown as { query: (...a: unknown[]) => unknown }).query = (...a: unknown[]) => {
      const q = a[0] as string | { text?: string };
      const text = typeof q === "string" ? q : q?.text ?? "";
      if (!isReadStatement(text)) throw new Error(`refusing a statement that is not a read: ${text.slice(0, 40)}`);
      return send(...a);
    };
  });
  // `src/db` keeps its pool on `globalThis` (one per process): this one, so every read the measured code makes goes
  // through the guard above. Set before `src/db` is imported.
  (globalThis as { __the99Pool?: Pool }).__the99Pool = pool;
  process.env.DATABASE_URL = direct.toString();
  const { db } = await import("../src/db");
  const { sql } = await import("drizzle-orm");
  const ro = await db.execute<{ ro: string; id: string }>(sql`select current_setting('transaction_read_only') as ro, current_setting('neon.branch_id', true) as id`);
  if (ro.rows[0]?.ro !== "on") throw new Error("the connection is not read-only; stopping before any read");
  if (ro.rows[0]?.id !== branch) throw new Error("MEASURE_TARGET_BRANCH is not the branch this database reports; stopping");
  const named = process.env.MEASURE_VIEWER_ID;
  const busiest = await db.execute<{ id: string; decks: number; friends: number }>(sql`
    select d.user_id as id, count(*)::int as decks,
      (select count(distinct f.friend_user_id)::int from friend_links f where f.user_id = d.user_id) as friends
    from decks d
    where ${named ?? null}::text is null or d.user_id = ${named ?? null}
    group by d.user_id
    having exists (select 1 from friend_links f where f.user_id = d.user_id)
    order by count(*) desc, d.user_id limit 1`);
  const viewer = busiest.rows[0];
  if (!viewer) throw new Error("no account with a friend");
  const { loadDeckBuyRows } = await import("../src/lib/decks/availability-query");
  const { loadFriendSpares } = await import("../src/lib/social/spares");
  const { DECK_TOOLS, loadToolFits } = await import("../src/lib/discovery/fits");
  const rows = await loadDeckBuyRows(viewer.id);
  const union = [...new Set(rows.map((r) => r.oracleId))];
  const time = async (fn: () => Promise<unknown>, runs = 9) => {
    const ms: number[] = [];
    for (let i = 0; i < runs; i++) {
      const t = performance.now();
      await fn();
      ms.push(performance.now() - t);
    }
    ms.sort((a, b) => a - b);
    return `median ${Math.round(ms[Math.floor(runs / 2)])}ms (${Math.round(ms[0])} to ${Math.round(ms[runs - 1])}, ${runs} runs)`;
  };
  console.log(`branch ${branch}, read-only · the ${named ? "named account" : "busiest account with a friend"}: ${viewer.decks} decks, ${viewer.friends} friend(s), ${union.length} missing cards across them`);
  const spares = await loadFriendSpares(viewer.id, union);
  console.log(`spared cards among them: ${spares.filter((x) => x.spare > 0).length}`);
  console.log(`loadFriendSpares over the union, no cap: ${await time(() => loadFriendSpares(viewer.id, union))}`);
  console.log(`loadToolFits, Friends' spares alone: ${await time(() => loadToolFits(viewer.id, ["friend-spares"]))}`);
  console.log(`loadToolFits, every deck tool: ${await time(() => loadToolFits(viewer.id, DECK_TOOLS))}`);
  await pool.end();
}

async function main() {
  if (process.env.MEASURE_FITS === "1") return fits().then(() => process.exit(0));
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
  // The shipped flow: a grant read, then per friend one repeatable-read transaction holding the
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
          }, { isolationLevel: "repeatable read" });
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
