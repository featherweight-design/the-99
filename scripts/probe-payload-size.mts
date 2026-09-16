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
import { loadCommanderRankings } from "../src/lib/commanders/rankings";

neonConfig.webSocketConstructor = ws;

const CEILING_BYTES = 2_000_000;
/**
 * 80% of the ceiling, leaving room for a larger collection than any here and for
 * the sentences still to be generated.
 *
 * NO MEASURED FIGURE IS QUOTED HERE ON PURPOSE. This comment held 1.184 MB from
 * when the probe measured one chosen account, and kept holding it after the
 * probe changed to measure every account and enforce the worst — which is
 * 1.448 MB, a third less headroom than the stale number implied. A constant's
 * doc that quotes a result goes stale the moment the measurement moves, and it
 * goes stale silently. The run prints the figure; read it there.
 */
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
    // EVERY ACCOUNT, because no collection figure bounds either payload and two
    // attempts to find one were both wrong. Raw `collection_items` was wrong
    // because both payloads are built from `loadCollectionPool`, which filters
    // `commander_legal`. The legal pool was wrong too, and more interestingly:
    // `/discover` EXCLUDES owned and built commanders, so a bigger collection
    // yields FEWER rows, not more — the relationship is inverse, and the
    // owned lane's row count is the commanders a reader owns and has not built,
    // which tracks neither figure.
    //
    // So the subject is not chosen. Every account is measured and the worst per
    // lane is what the budget is enforced against. There are two accounts here
    // and this is a probe, not a request path; when that stops being cheap the
    // honest fix is to sample deliberately and SAY so, not to pick a proxy and
    // hope it correlates.
    const { rows: accounts } = await fixture.execute<{ user_id: string; n: number }>(sql`
      select ci.user_id, count(distinct ci.oracle_id)::int as n
        from collection_items ci
        join cards c on c.oracle_id = ci.oracle_id and c.commander_legal
       group by ci.user_id
       order by n desc
    `);
    if (accounts.length === 0) throw new Error("no collection in this database — seed one first");
    console.log(`measuring ${accounts.length} account(s), worst per lane\n`);

    for (const sort of ["fit", "new"] as const) {
      let worst = { bytes: 0, plain: 0, rows: 0, prose: 0 };
      // TRACKED SEPARATELY FROM THE BYTE WINNER. The two need not be the same
      // account, and reading the ratio off `worst` meant a smaller payload with
      // a poor ratio passed unmeasured — the ratio guard was enforced for one
      // account while claiming to cover every one.
      let worstRatio = 0;
      let leastRows = Number.POSITIVE_INFINITY;
      for (const account of accounts) {
        const list = await loadDiscovery(account.user_id, { sort });
        const plain = Buffer.byteLength(JSON.stringify(list));
        const bytes = Buffer.byteLength(JSON.stringify(encodeDiscovery(list)));
        worstRatio = Math.max(worstRatio, bytes / plain);
        leastRows = Math.min(leastRows, list.items.length);
        if (bytes > worst.bytes) {
          worst = {
            bytes,
            plain,
            rows: list.items.length,
            prose: list.items.filter((i) => i.prose).length,
          };
        }
      }
      const pct = ((worst.bytes / CEILING_BYTES) * 100).toFixed(1);

      console.log(
        `${sort}: worst of ${accounts.length} — ${worst.rows} rows · ${worst.prose} with a ` +
          `sentence · encoded ${(worst.bytes / 1e6).toFixed(3)} MB of the ` +
          `${(worst.plain / 1e6).toFixed(3)} MB plain form`,
      );
      check(
        `${sort} is inside the budget`,
        worst.bytes <= BUDGET_BYTES,
        `${(worst.bytes / 1e6).toFixed(3)} MB, ${pct}% of the 2 MB ceiling ` +
          `(budget ${(BUDGET_BYTES / 1e6).toFixed(1)} MB)`,
      );
      // The dictionary and the positional rows are the whole point of the
      // encoder. A payload that stopped compressing would still fit the budget
      // today and would be one collection away from not fitting, so the RATIO
      // is asserted rather than only the total.
      check(
        `${sort} still compresses, on every account`,
        worstRatio < 0.6,
        `worst ratio ${(worstRatio * 100).toFixed(1)}% of plain (want under 60%)`,
      );
      // An empty list would pass every byte assertion above while proving
      // nothing, and this route has had an empty-payload regression before.
      // Read off the LEAST rows of any account, for the same reason the ratio is:
      // the byte winner is by definition not the empty one.
      check(`${sort} returned rows for every account`, leastRows > 0, `fewest ${leastRows} rows`);
    }

    // THE OWNED LANE IS CACHED THROUGH THE SAME DATA CACHE and now carries the
    // same sentence, so guarding only `/discover` would be a one-sided sweep by
    // construction. It is the smaller list — every row is a commander the
    // reader owns — which is a reason to expect it to pass, not a reason not to
    // measure it. It ships unencoded, so there is no compression ratio to
    // assert; the total is the whole reading.
    let worstOwned = { bytes: 0, rows: 0, prose: 0 };
    for (const account of accounts) {
      const rankings = await loadCommanderRankings(account.user_id);
      const bytes = Buffer.byteLength(JSON.stringify(rankings));
      if (bytes > worstOwned.bytes) {
        worstOwned = {
          bytes,
          rows: rankings.items.length,
          prose: rankings.items.filter((i) => i.prose).length,
        };
      }
    }
    console.log(
      `\ncommanders: worst of ${accounts.length} — ${worstOwned.rows} rows · ` +
        `${worstOwned.prose} with a sentence · ${(worstOwned.bytes / 1e6).toFixed(3)} MB`,
    );
    check(
      "the owned lane is inside the budget",
      worstOwned.bytes <= BUDGET_BYTES,
      `${(worstOwned.bytes / 1e6).toFixed(3)} MB, ` +
        `${((worstOwned.bytes / CEILING_BYTES) * 100).toFixed(1)}% of the 2 MB ceiling`,
    );
    check("the owned lane returned rows", worstOwned.rows > 0, `${worstOwned.rows} rows`);
  } catch (err) {
    // A `process.exit` in the `finally` below swallows whatever threw: the
    // `finally` runs first, sees `failures === 0`, prints "all checks passed"
    // and exits 0 before `main().catch` is ever reached. So a database with no
    // `collection_items` rows — the throw at the top of this function — would
    // have reported a clean run having measured nothing.
    //
    // THE SAME TRAP AGENTS.md ALREADY RECORDS against `probe:score-lock`,
    // reintroduced here in the same session that documented it. Fixing an
    // instance is not fixing the class.
    failures += 1;
    console.error("\nthrew:", err);
  } finally {
    await pool.end();
    console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
    process.exit(failures === 0 ? 0 : 1);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
