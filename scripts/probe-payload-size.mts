// The /discover payload against the data-cache ceiling.
//
// `cacheForUser` stores its entry in Next's data cache, whose per-entry limit is
// 2 MB. AN ENTRY OVER IT IS NOT AN ERROR — it is refused with a warning and
// never stored, so the loader runs on every request AND pays to serialise its
// result first. Slower than not caching at all, silently, on the one route
// whose whole reason for being cached is that it costs 1.1-1.6s to assemble.
//
// That is why this is a probe and not a unit test: the number that matters is
// the real payload for a real collection, and the failure mode it guards is a
// warning nobody reads. A synthetic row cannot tell you how long this player's
// commanders' sentences are.
//
// BUDGET, not ceiling. Failing at 2 MB would fail on the deploy that breaks it,
// which is too late — the cache silently stops working and the route gets
// slower. The budget leaves room for a larger collection than any here and for
// the sentences still to be generated, and a run over it is a scope
// conversation rather than a bug: something has to come off the row.
//
// Makes no writes. Point it at local-dev or any branch with a real collection.
//
//   pnpm probe:payload
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";
import { loadDiscovery } from "../src/lib/discovery/list";
import { encodeDiscovery } from "../src/lib/discovery/encode";

neonConfig.webSocketConstructor = ws;

const CEILING_BYTES = 2_000_000;
/** 80% of the ceiling. Measured at 1.184 MB (59.2%) on the largest collection
    here, with the six fields PR 4 removes still present. */
const BUDGET_BYTES = 1_600_000;

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);

let failures = 0;
const check = (label: string, ok: boolean, detail: string) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — ${detail}`);
};

async function main() {
  try {
    // The LARGEST collection, because the payload scales with it and the
    // smallest one would report a comfortable figure for every build.
    const { rows } = await fixture.execute<{ user_id: string; n: number }>(sql`
      select user_id, count(distinct oracle_id)::int as n
        from collection_items group by user_id order by n desc limit 1
    `);
    const subject = rows[0];
    if (!subject) throw new Error("no collection in this database — seed one first");
    console.log(`largest collection: ${subject.n} distinct cards\n`);

    for (const sort of ["fit", "new"] as const) {
      const list = await loadDiscovery(subject.user_id, { sort });
      const encoded = encodeDiscovery(list);
      const bytes = Buffer.byteLength(JSON.stringify(encoded));
      const plain = Buffer.byteLength(JSON.stringify(list));
      const withProse = list.items.filter((i) => i.prose).length;
      const pct = ((bytes / CEILING_BYTES) * 100).toFixed(1);

      console.log(
        `${sort}: ${list.items.length} rows · ${withProse} with a sentence · ` +
          `encoded ${(bytes / 1e6).toFixed(3)} MB of the ${(plain / 1e6).toFixed(3)} MB plain form`,
      );
      check(
        `${sort} is inside the budget`,
        bytes <= BUDGET_BYTES,
        `${(bytes / 1e6).toFixed(3)} MB, ${pct}% of the 2 MB ceiling ` +
          `(budget ${(BUDGET_BYTES / 1e6).toFixed(1)} MB)`,
      );
      // The dictionary and the positional rows are the whole point of the
      // encoder. A payload that stopped compressing would still fit the budget
      // today and would be one collection away from not fitting, so the RATIO
      // is asserted rather than only the total.
      check(
        `${sort} still compresses`,
        bytes < plain * 0.6,
        `${((bytes / plain) * 100).toFixed(1)}% of plain (want under 60%)`,
      );
      // An empty list would pass every byte assertion above while proving
      // nothing, and this route has had an empty-payload regression before.
      check(`${sort} returned rows`, list.items.length > 0, `${list.items.length} rows`);
    }
  } finally {
    await pool.end();
    console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
    process.exit(failures === 0 ? 0 : 1);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
