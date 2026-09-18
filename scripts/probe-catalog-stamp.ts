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
import { generationKey } from "../src/lib/cache/catalog-generation";
import { stampCatalogRefresh } from "../src/lib/cache/stamp-catalog";

let failures = 0;
function check(label: string, ok: boolean, detail: string) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  if (!ok) failures += 1;
}

const millisOf = async (): Promise<string | null> => {
  const [row] = await db
    .select({
      millis: sql<string | null>`(extract(epoch from ${catalogRefreshes.refreshedAt}) * 1000)::bigint`,
    })
    .from(catalogRefreshes);
  return row?.millis ?? null;
};

async function run() {
  await stampCatalogRefresh();
  const first = await millisOf();
  check("a stamp lands", first !== null, `generation ${generationKey(first)}`);

  // A second apart, because the column's resolution is what a reader compares.
  await new Promise((r) => setTimeout(r, 1_100));
  await stampCatalogRefresh();
  const second = await millisOf();

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(catalogRefreshes);
  check("two stamps leave one row", count === 1, `${count} row(s)`);
  check(
    "the generation moves",
    first !== null && second !== null && Number(second) > Number(first),
    `${generationKey(first)} → ${generationKey(second)}`,
  );
  // The reader's own translation, over the value the writer stored: a key that did not
  // change is a cache that was never retired.
  check(
    "the key changes with it",
    generationKey(first) !== generationKey(second),
    `${generationKey(first)} vs ${generationKey(second)}`,
  );

  let refused = false;
  try {
    await db.execute(
      sql`insert into ${catalogRefreshes} (id, refreshed_at) values (${CATALOG_ROW_ID + 1}, now())`,
    );
    await db.execute(sql`delete from ${catalogRefreshes} where id = ${CATALOG_ROW_ID + 1}`);
  } catch {
    refused = true;
  }
  check("a second row is refused", refused, "check constraint on the canonical id");

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

run().catch((err) => { console.error(err); process.exit(1); });
