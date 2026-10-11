// Fails when Home, `/decks` or `/decks/shopping` reads a per-user table the reader's data stamp does not cover.
//
// All three pages cache their whole payload keyed on `user_data_stamps.stamp`, and only the
// `user_data_touch` trigger moves it. A table the pages read without that trigger is a write
// that leaves them stale until the hour ceiling, with nothing to notice. The tables read are
// COMPUTED by following the pages' imports through their loaders, never listed by reading, and
// the triggers are read out of the migrations in the order they apply.
//
// Static: no server, no database. `pnpm probe:list-stamp` proves the triggers against a real one.
//
// Run: `pnpm check:list-cache`
import { listCacheProblems, tablesRead, triggeredTables, unrecordedCatches } from "./lib/list-cache-tables.mjs";

const { perUser, catalog } = tablesRead();
// Both halves of what keeps a cached page true: every write moves the stamp, and no payload
// built over a read that fell back is stored.
const problems = [...listCacheProblems(perUser, triggeredTables()), ...unrecordedCatches()];
for (const p of problems) console.error(p);
if (problems.length) {
  console.error(
    `\n${problems.length} problem(s). A missing trigger goes in a new migration (see the one that ` +
    "created user_data_stamps); a fallback calls recordSoftFailure() (src/lib/cache/soft-failure.ts).",
  );
  process.exit(1);
}
console.log(
  `Every one of the ${perUser.length} per-user tables Home, /decks and /decks/shopping read moves the reader's stamp, ` +
  "and every fallback on their path keeps its payload out of the cache. " +
  `The ${catalog.length} catalog tables they read are retired by the catalog generation instead: ` +
  `${catalog.map((t) => t.name).join(", ")}.`,
);
