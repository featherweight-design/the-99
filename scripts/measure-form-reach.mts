// The form heads-up's one read (bracket reach PR 3c), sized: the bytes `formReachData` sends for one
// account, split into its halves. READ-ONLY. `MEASURE_USER_ID` picks the account, default the one
// holding the most distinct cards on the database `DATABASE_URL` names.
import { sql } from "drizzle-orm";
import { requireEnv } from "./lib/env.mjs";

requireEnv(["DATABASE_URL"]);

async function main() {
  const { db } = await import("../src/db");
  const { loadOwnedMovers, loadBuyableGameChangers } = await import("../src/lib/intake/form-reach-load");
  const userId = process.env.MEASURE_USER_ID ?? ((await db.execute(sql`
    select user_id from collection_items group by user_id order by count(distinct oracle_id) desc limit 1
  `)).rows[0] as { user_id: string }).user_id;
  const [cards, buyable] = await Promise.all([loadOwnedMovers(userId, process.env), loadBuyableGameChangers()]);
  const bytes = (v: unknown) => Buffer.byteLength(JSON.stringify(v));
  const reaches = cards.reduce((n, c) => n + c.reaches.length, 0);
  const edges = cards.reduce((n, c) => n + c.combos.length, 0);
  console.log(`movers ${cards.length} (searchers ${cards.filter((c) => c.searches).length}, combo edges ${edges}, reach pairs ${reaches})`);
  console.log(`collection half ${bytes(cards)} B · buying half ${bytes(buyable)} B (${buyable.length} Game Changers) · total ${bytes({ cards, buyable })} B`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
