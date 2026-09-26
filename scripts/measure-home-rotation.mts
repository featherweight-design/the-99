// How many different commanders Home's Ready to build shows over 14 days, before and after the
// novelty rotation (Hugh, 2026-09-27: "I've seen the same few rotate in and out over the last
// couple of weeks").
//
// READ-ONLY. Every read runs inside one `read only` transaction, and it writes, locks and creates
// nothing. So it may be pointed at staging, which is where the figure means something: the
// ranking and the played themes are Hugh's there and a fixture's anywhere else (AGENTS.md,
// "measure against staging").
//
// It runs the real code on both sides: the shipped `readySlice` and the real `unplayedCountsSql`
// that Home runs. "Before" is the old rotation, which was the top NINE walked by the plain
// shuffle. It is reproduced by handing `readySlice` the top nine and no novelty map, which is
// exactly what the old set was.
//
//   MEASURE_TARGET_URL=<staging url> MEASURE_USER_ID=user_… pnpm tsx scripts/measure-home-rotation.mts
//
// MEASURE_TARGET_URL rather than DATABASE_URL, because scripts/lib/env.mjs overrides DATABASE_URL
// from the worktree's .env and a prefix on the command line would be silently discarded.
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";
import { unplayedCountsSql } from "../src/lib/recs/home-novelty";
import { readySlice, READY_SHOWN } from "../src/lib/recs/ready-to-build";

const { MEASURE_TARGET_URL, MEASURE_USER_ID } = requireEnv(["MEASURE_TARGET_URL", "MEASURE_USER_ID"]);
neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: MEASURE_TARGET_URL });
const target = drizzle(pool);
const DAYS = 14;
const START = Date.UTC(2026, 8, 27);

type Ranked = { oracleId: string; slug: string; rankScore: number };

async function main() {
  const { ranked, unplayed } = await target.transaction(
    async (tx) => {
      // The ranked list as `getRankedList` hands it to Home: the reader's stored scores, built
      // commanders out, in `rank_score desc, oracle_id` order.
      const { rows } = await tx.execute<Ranked>(sql`
        select s.oracle_id as "oracleId", s.slug, s.rank_score as "rankScore"
        from commander_scores s
        where s.user_id = ${MEASURE_USER_ID}
          and not exists (
            select 1 from decks bd
            where bd.user_id = ${MEASURE_USER_ID}
              and (bd.commander_oracle_id = s.oracle_id or bd.partner_oracle_id = s.oracle_id)
          )
        order by s.rank_score desc, s.oracle_id
      `);
      const counts = await tx.execute<{ oracleId: string; unplayed: number }>(unplayedCountsSql(MEASURE_USER_ID));
      return { ranked: rows, unplayed: new Map(counts.rows.map((r) => [r.oracleId, r.unplayed])) };
    },
    { accessMode: "read only" },
  );
  if (ranked.length === 0) throw new Error(`${MEASURE_USER_ID} has no stored scores: nothing to measure.`);

  const tour = (items: Ranked[], map: Map<string, number> | null) => {
    const seen = new Map<string, number>();
    const days: string[] = [];
    let set = 0;
    let floor: number | null = null;
    for (let d = 0; d < DAYS; d += 1) {
      const slice = readySlice(items, { userId: MEASURE_USER_ID, now: new Date(START + d * 86_400_000), unplayed: map });
      set = slice.moreCount + READY_SHOWN;
      floor = slice.floor;
      days.push(slice.shown.map((c) => `${c.slug} (${Math.round(c.rankScore)}, ${map?.get(c.oracleId) ?? 0} new)`).join(" + "));
      for (const c of slice.shown) seen.set(c.slug, (seen.get(c.slug) ?? 0) + 1);
    }
    return { seen, days, set, floor };
  };

  const before = tour(ranked.slice(0, 9), null);
  const after = tour(ranked, unplayed);
  const spread = (seen: Map<string, number>) => {
    const counts = [...seen.values()];
    return `${Math.min(...counts)}–${Math.max(...counts)}`;
  };

  console.log(`account ${MEASURE_USER_ID}: ${ranked.length} unbuilt commanders ranked; ${unplayed.size} carry a novelty count`);
  console.log(`rank 1 scores ${Math.round(ranked[0].rankScore)}, the set's floor ${after.floor}\n`);
  console.log(`| | Set | Distinct over ${DAYS} days | Times each is shown |`);
  console.log(`|---|---|---|---|`);
  console.log(`| Before (top 9, plain shuffle) | ${before.set} | **${before.seen.size}** | ${spread(before.seen)} |`);
  console.log(`| After (two weeks deep, leaning on the new) | ${after.set} | **${after.seen.size}** | ${spread(after.seen)} |`);
  console.log(`\nAfter, day by day:`);
  after.days.forEach((d, i) => console.log(`  day ${String(i + 1).padStart(2)}: ${d}`));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
