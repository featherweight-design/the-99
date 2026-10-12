// `pnpm db:seed:precons`: replaces `precons` and `precon_cards` from MTGJSON's Commander decks
// (plan `2026-10-11-commander-precons.md`, PR 1). Reads the `Catalog refresh` artifact when
// CATALOG_FETCH_DIR is set, the network otherwise. Exits non-zero, publishing nothing, when a floor
// refuses the feed (`planPrecons`); exits 0 with a warning, writing nothing, when this database has
// not been migrated to the precon tables yet, so a refresh that outruns a deploy stays green.
import "./lib/env.mjs";
import { withCatalogIngestLock } from "../src/lib/catalog/ingest-lock";
import { loadPreconFeed } from "../src/lib/precons/feed";
import { ingestPrecons, preconTablesExist } from "../src/lib/precons/ingest";

async function main(): Promise<number> {
  if (!(await preconTablesExist())) {
    console.warn("SKIPPED: this database has no precon tables yet (the precon migration is not applied). Nothing ingested.");
    return 0;
  }
  const feed = await loadPreconFeed();
  // Held for the whole publish, so a catalog copy never interleaves with it.
  const { published, plan } = await withCatalogIngestLock(process.env.DATABASE_URL!, () => ingestPrecons(feed));
  const r = plan.report;
  console.log(
    `${r.kept} of ${r.listed} Commander precons (${r.twins} twins), ${r.copies} copies; ` +
    `${r.unmappedCopies} not in the catalog, ${r.printingsMissing} with no catalog printing.`,
  );
  for (const d of r.dropped) console.log(`dropped ${d}`);
  if (!published) {
    console.error(`REFUSED, nothing published:\n  ${plan.refusals.join("\n  ")}`);
    return 2;
  }
  return 0;
}

main().then((code) => process.exit(code), (err) => { console.error(err); process.exit(1); });
