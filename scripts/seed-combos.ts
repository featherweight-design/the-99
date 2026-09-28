import "./lib/env.mjs";
import { db } from "../src/db";
import { recordBuild } from "../src/lib/catalog/builds";
import { withCatalogIngestLock } from "../src/lib/catalog/ingest-lock";
import { ingestCombos } from "../src/lib/spellbook/seed";

// Under the `catalog-ingest` lock, like the other catalog ingests: `db:copy:combos` publishes the
// same three tables under it, so an ingest and a copy against one database never interleave.
// And between its own ledger rows (`recordBuild`): every run, scheduled or by hand, is recorded,
// so one that dies between the flags and the variants leaves a newest row a copy refuses.
withCatalogIngestLock(process.env.DATABASE_URL!, () =>
  recordBuild(db, "combos", () => ingestCombos(), (r) =>
    `${r.variants.kept} variants, ${r.variants.cards} membership rows, ${r.flags.rows} flag rows`))
  .then((r) => {
    console.log(
      `\ncombos: ${r.variants.kept} variants, ${r.variants.cards} membership rows, ` +
        `${r.flags.rows} flag rows.`,
    );
    process.exit(0);
  })
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
