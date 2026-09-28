import "./lib/env.mjs";
import { withCatalogIngestLock } from "../src/lib/catalog/ingest-lock";
import { seedCards } from "../src/lib/scryfall/seed";

// Held for the whole ingest, so a catalog copy can never publish between this run's check and
// its writes, or mid-run (plan `2026-09-28-card-data-replicate.md`, §3 item 8).
withCatalogIngestLock(process.env.DATABASE_URL!, () => seedCards())
  .then(({ upserted, skipped }) => {
    console.log(`Seeded ${upserted} cards (${skipped} skipped).`);
    process.exit(0);
  })
  .catch((err) => { console.error(err); process.exit(1); });
