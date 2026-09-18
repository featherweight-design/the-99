// The write half of the catalog generation, against a real Postgres.
//
// `cacheForUser`'s key is unit-tested with the generation mocked, which proves the reader
// and nothing about the writer: a broken `ON CONFLICT`, a wrong column mapping or a lost
// single-row invariant would pass the whole suite while every catalog refresh left readers
// on stale lists for the hour ceiling — the exact failure #705 exists to end, silently
// reintroduced. Three facts only a database can answer:
//
//   ONE ROW. Two stamps upsert rather than accumulate, and the constraint refuses any id
//   but the canonical one, so "the current generation" cannot become a question with two
//   answers.
//   IT MOVES. The second stamp's value is greater than the first's, which is what makes a
//   cache key change.
//   THE READ AGREES. The epoch the query computes matches the row that was written — the
//   step where a zoneless timestamp would otherwise pick up the host's clock.
//
// Writes one row to a table with exactly one row, so it cannot be scoped to a fixture user
// the way the other probes are: it leaves the stamp set to now, which is what any ingest
// would have done. Point it at `local-dev` or a scratch branch, never production.
//
//   pnpm probe:catalog-stamp
import "./lib/env.mjs";
import { sql } from "drizzle-orm";

import { db } from "../src/db";
import { catalogRefreshes, CATALOG_ROW_ID } from "../src/db/schema";
import { readCatalogGeneration } from "../src/lib/cache/catalog-generation";
import { stampCatalogRefresh } from "../src/lib/cache/stamp-catalog";

let failures = 0;
function check(label: string, ok: boolean, detail: string) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  if (!ok) failures += 1;
}

// THE PRODUCTION READER, not a copy of its query. `catalogGeneration` wraps this in
// `unstable_cache`, which raises an invariant outside a request, so the uncached half is
// exported for exactly this: a probe that re-wrote the epoch expression would drift from the
// reader by one clause and both halves would go on passing.
async function run() {
  await stampCatalogRefresh();
  const first = await readCatalogGeneration();
  check("a stamp lands", first !== "0", `generation ${first}`);

  // A second apart, because the column's resolution is what a reader compares.
  await new Promise((r) => setTimeout(r, 1_100));
  await stampCatalogRefresh();
  const second = await readCatalogGeneration();

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(catalogRefreshes);
  check("two stamps leave one row", count === 1, `${count} row(s)`);
  // A key that did not change is a cache that was never retired, so this is the figure the
  // whole design turns on — read through the reader that composes it in production.
  check(
    "the generation moves",
    Number(second) > Number(first),
    `${first} → ${second}`,
  );

  // THE CONSTRAINT BY NAME, not by any error at all. A bare catch here would take a
  // permission error, a dropped connection or a typo in the statement for proof that the
  // schema forbids a second row — a green check over an untested constraint.
  let refusal = "no error at all";
  try {
    await db.execute(
      sql`insert into ${catalogRefreshes} (id, refreshed_at) values (${CATALOG_ROW_ID + 1}, now())`,
    );
  } catch (error) {
    // The SQLSTATE and the constraint name live on the CAUSE, not on the error drizzle
    // throws: it wraps the driver's error in one carrying `query` and `params` only, so
    // reading `code` off the top level finds undefined and every real refusal reads as "a
    // different failure". Checked against the driver rather than assumed.
    const wrapper = error as { cause?: unknown; message?: string };
    const e = (wrapper.cause ?? error) as { code?: string; constraint?: string; message?: string };
    const message = e.message ?? wrapper.message ?? String(error);
    refusal = e.code === "23514" && e.constraint === "catalog_refreshes_single_row_check"
      ? "ok"
      : `a different failure: ${e.code ?? "?"} ${message.slice(0, 80)}`;
  }
  check(
    "a second row is refused by the single-row check",
    refusal === "ok",
    refusal === "ok" ? "23514 catalog_refreshes_single_row_check" : refusal,
  );
  // Separate from the assertion above, and unconditional: an insert that slipped past the
  // constraint must not be left behind for the next run to read as the canonical row.
  await db.execute(sql`delete from ${catalogRefreshes} where id <> ${CATALOG_ROW_ID}`);

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

run().catch((err) => { console.error(err); process.exit(1); });
