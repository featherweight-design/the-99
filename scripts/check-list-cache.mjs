// Fails when Home or `/decks` reads a per-user table the reader's data stamp does not cover.
//
// Both pages cache their whole payload keyed on `user_data_stamps.stamp`, and only the
// `user_data_touch` trigger moves it. A table the pages read without that trigger is a write
// that leaves them stale until the hour ceiling, with nothing to notice. The tables read are
// COMPUTED by following the pages' imports through their loaders, never listed by reading, and
// the triggers are read out of the migrations in the order they apply.
//
// Static: no server, no database. `pnpm probe:list-stamp` proves the triggers against a real one.
//
// Run: `pnpm check:list-cache`
import { listCacheProblems, tablesRead, triggeredTables } from "./lib/list-cache-tables.mjs";

const { perUser, catalog } = tablesRead();
const problems = listCacheProblems(perUser, triggeredTables());
for (const p of problems) console.error(p);
if (problems.length) {
  console.error(`\n${problems.length} problem(s). Add the trigger in a new migration (see the one that created user_data_stamps).`);
  process.exit(1);
}
console.log(
  `Every one of the ${perUser.length} per-user tables Home and /decks read moves the reader's stamp. ` +
  `The ${catalog.length} catalog tables they read are retired by the catalog generation instead: ` +
  `${catalog.map((t) => t.name).join(", ")}.`,
);
