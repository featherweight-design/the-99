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
import { cutToWindow, decodeDiscovery, encodeDiscovery } from "../src/lib/discovery/encode";
import { discoveryRows } from "../src/lib/discovery/window";
import { REVEAL_STEP } from "../src/lib/commanders/reveal-step";
import { loadCommanderRankings } from "../src/lib/commanders/rankings";
import { loadBrowseCards } from "../src/lib/collection/browse";
import { encodeCollection } from "../src/lib/collection/list-wire";
import { loadAvailability } from "../src/lib/decks/availability-query";
import { gzipSync } from "node:zlib";

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

/**
 * `/collection`'s SHIPPED list, the encoded wire, as raw JSON. Not the cache's ceiling (the
 * cached entry is the unencoded list, held to BUDGET_BYTES above) but what the reader's
 * connection pays for, which is the list payload plan's subject
 * (plans/2026-09-28-list-payload-shrink.md, PR 2). Set a little over the worst account measured
 * when it landed, so a field added back to every card fails here rather than on a phone. The run
 * prints the figure; read it there.
 */
const COLLECTION_WIRE_BUDGET_BYTES = 1_250_000;

/**
 * `/discover`'s SHIPPED payload for a URL with no search, colour or set: every row's list columns,
 * and the draw columns for the first 25 only (list payload plan, PR 3). The cached entry above
 * holds every column and answers to the ceiling; this is what a reader's connection pays for, set
 * a little over the worst account measured when it landed. The run prints the figure.
 */
const DISCOVER_SHIPPED_BUDGET_BYTES = 300_000;

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);

/**
 * Refuses to measure a payload assembled from a failed read.
 *
 * The receipts, the free ranking and every price figure are dropped on a soft
 * failure, all of which make the serialised result SMALLER — so a degraded
 * response is the one payload guaranteed to fit a budget it should not have
 * been judged against.
 */
function assertHealthy(what: string, priceOk: boolean, availOk: boolean): void {
  if (priceOk && availOk) return;
  const lost = [!priceOk && "the price read", !availOk && "the availability read"]
    .filter(Boolean)
    .join(" and ");
  throw new Error(
    `${what} came back degraded — ${lost} failed, so the payload is smaller than ` +
      "the one this budget guards. Fix the read and run again rather than trusting the figure.",
  );
}

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
    // EVERY user with a collection row, and no legality filter on the ACCOUNT
    // SET. A third wrong subject, and the sharpest: an account holding only
    // non-commander-legal cards has an EMPTY legal pool, so `loadCandidates([])`
    // excludes nothing and ranks the whole index — potentially the largest
    // payload there is. Joining `commander_legal` here dropped exactly that
    // account from the scan.
    //
    // The count is kept for the log alone. It has been the wrong basis for
    // choosing a subject three times over, which is why nothing is chosen any
    // more.
    const { rows: accounts } = await fixture.execute<{ user_id: string; n: number }>(sql`
      select ci.user_id,
             count(distinct ci.oracle_id) filter (
               where exists (
                 select 1 from cards c
                  where c.oracle_id = ci.oracle_id and c.commander_legal
               )
             )::int as n
        from collection_items ci
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
      let worstShipped = 0;
      for (const account of accounts) {
        const list = await loadDiscovery(account.user_id, { sort });
        // A DEGRADED PAYLOAD IS A SMALLER PAYLOAD, so measuring one certifies
        // the budget from the wrong number. Both lanes now return `priceOk` /
        // `availOk` instead of throwing — the change this PR made two rounds
        // ago — so a failed read quietly removes figures from every row and the
        // guard passes on a payload it was never meant to measure. Rejected
        // rather than retried: a probe that silently retries hides a failing
        // dependency, and this script's whole job is to not hide things.
        assertHealthy(`${sort} for one account`, list.priceOk, list.availOk);
        const plain = Buffer.byteLength(JSON.stringify(list));
        const encoded = encodeDiscovery(list);
        const bytes = Buffer.byteLength(JSON.stringify(encoded));
        // The page's own cut, for the default URL of this sort: no search, colour or set.
        const order = sort === "new" ? "new" : "bestfit";
        const first = discoveryRows(decodeDiscovery(encoded).items, { q: "", colors: [], match: "contains", order, printedIn: [] }, null)
          .slice(0, REVEAL_STEP);
        worstShipped = Math.max(worstShipped, Buffer.byteLength(JSON.stringify(cutToWindow(encoded, new Set(first.map((r) => r.slug))))));
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
        `${sort}'s shipped first window is inside its budget`,
        worstShipped <= DISCOVER_SHIPPED_BUDGET_BYTES,
        `${(worstShipped / 1e6).toFixed(3)} MB against ${(DISCOVER_SHIPPED_BUDGET_BYTES / 1e6).toFixed(3)} MB`,
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
      // AT LEAST ONE account with rows, never every account. An empty result is
      // a supported production state — `/commanders` draws its no-candidates
      // state, and the `new` sort can legitimately exclude every candidate at
      // the novelty floor — so requiring rows everywhere fails the probe on
      // valid data. A round-3 fix over-corrected from "the byte winner" to
      // "every account" and swapped one wrong reading for another.
      //
      // What this still has to catch is the run that measured NOTHING: every
      // byte assertion above passes over an empty list.
      check(
        `${sort} measured a non-empty payload somewhere`,
        worst.rows > 0,
        `largest ${worst.rows} rows, smallest ${leastRows}`,
      );
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
      // AVAILABILITY ONLY. The owned lane reads no prices — every commander on
      // it is owned, and §7.4 row 5 unmounts the slot — so there is no
      // `priceOk` to check and passing `true` would be asserting a constant.
      assertHealthy("the owned lane for one account", true, rankings.availOk);
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
      "the owned lane measured a non-empty payload somewhere",
      worstOwned.rows > 0,
      `${worstOwned.rows} rows`,
    );
    check(
      "the owned lane is inside the budget",
      worstOwned.bytes <= BUDGET_BYTES,
      `${(worstOwned.bytes / 1e6).toFixed(3)} MB, ` +
        `${((worstOwned.bytes / CEILING_BYTES) * 100).toFixed(1)}% of the 2 MB ceiling`,
    );

    // /COLLECTION, the other list the plan measured. Two figures per account: the cache entry
    // (the unencoded list `cacheForUser` stores, against the ceiling) and the wire the page ships.
    let worstEntry = { bytes: 0, cards: 0 };
    let worstWire = { bytes: 0, gzip: 0, cards: 0 };
    for (const account of accounts) {
      const list = await loadBrowseCards(account.user_id);
      const availability = await loadAvailability(account.user_id);
      const entry = Buffer.byteLength(JSON.stringify(list));
      const wireText = JSON.stringify(encodeCollection(list, availability));
      const wire = Buffer.byteLength(wireText);
      if (entry > worstEntry.bytes) worstEntry = { bytes: entry, cards: list.length };
      if (wire > worstWire.bytes) worstWire = { bytes: wire, gzip: gzipSync(wireText, { level: 9 }).length, cards: list.length };
    }
    console.log(
      `\ncollection: worst of ${accounts.length} — ${worstWire.cards} cards · wire ` +
        `${(worstWire.bytes / 1e6).toFixed(3)} MB (${(worstWire.gzip / 1e3).toFixed(1)} KB gzipped) · ` +
        `cache entry ${(worstEntry.bytes / 1e6).toFixed(3)} MB`,
    );
    check(
      "the collection measured a non-empty list somewhere",
      worstWire.cards > 0,
      `${worstWire.cards} cards`,
    );
    check(
      "the collection's cache entry is inside the budget",
      worstEntry.bytes <= BUDGET_BYTES,
      `${(worstEntry.bytes / 1e6).toFixed(3)} MB, ` +
        `${((worstEntry.bytes / CEILING_BYTES) * 100).toFixed(1)}% of the 2 MB ceiling`,
    );
    check(
      "the collection's shipped wire is inside its budget",
      worstWire.bytes <= COLLECTION_WIRE_BUDGET_BYTES,
      `${(worstWire.bytes / 1e6).toFixed(3)} MB against ${(COLLECTION_WIRE_BUDGET_BYTES / 1e6).toFixed(3)} MB`,
    );

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
