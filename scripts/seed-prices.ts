import "./lib/env.mjs";
import { withCatalogIngestLock } from "../src/lib/catalog/ingest-lock";
import { seedPrices } from "../src/lib/manapool/seed-prices";

// Held for the whole ingest, so a catalog copy can never publish between this run's check and
// its writes, or mid-run (plan `2026-09-28-card-data-replicate.md`, §3 item 8).
withCatalogIngestLock(process.env.DATABASE_URL!, () => seedPrices())
  .then((r) => {
    console.log(
      `Priced ${r.upserted} printings and ${r.tokenUpserted} token printings as of ${r.asOf.toISOString()}; ` +
      `collapsed ${r.collapsedDuplicates} surplus duplicate rows, ` +
      `skipped ${r.skippedOrphan} priced for printings not in our catalog.`,
    );
    // A refused token step fails the run AFTER the card prices were written: the card half is intact,
    // and somebody has to find out the token half did not move.
    if (r.tokenRefusal) { process.stderr.write(`\n${r.tokenRefusal}\n`, () => process.exit(1)); return; }
    process.exit(0);
  })
  .catch((err) => { console.error(err); process.exit(1); });
