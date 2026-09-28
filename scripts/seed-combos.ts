import "./lib/env.mjs";
import { withCatalogIngestLock } from "../src/lib/catalog/ingest-lock";
import { ingestCombos } from "../src/lib/spellbook/seed";

// Under the `catalog-ingest` lock, like the other catalog ingests: `db:copy:combos` publishes the
// same three tables under it, so an ingest and a copy against one database never interleave.
withCatalogIngestLock(process.env.DATABASE_URL!, () => ingestCombos())
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
