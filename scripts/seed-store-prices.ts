import "./lib/env.mjs";
import { withCatalogIngestLock } from "../src/lib/catalog/ingest-lock";
import { seedCardKingdomPrices, seedTcgplayerPrices, type SeedStoreResult } from "../src/lib/stores/seed-store-prices";

/**
 * TCGplayer's and Card Kingdom's prices (store preference plan, 2026-11-22). `--store=tcgplayer|cardkingdom` runs one;
 * no flag runs both. Each store is its own transaction and its own failure: a Card Kingdom outage leaves TCGplayer's
 * rows written (and Card Kingdom's yesterday's, behind its liveness mark), and the run still exits non-zero so the
 * failure is seen.
 */
const arg = process.argv.find((a) => a.startsWith("--store="))?.slice("--store=".length);
if (arg !== undefined && arg !== "tcgplayer" && arg !== "cardkingdom") {
  console.error(`--store must be tcgplayer or cardkingdom, not ${arg}`);
  process.exit(2);
}
const runs: [string, () => Promise<SeedStoreResult>][] = [
  ["tcgplayer", seedTcgplayerPrices],
  ["cardkingdom", seedCardKingdomPrices],
].filter(([store]) => arg === undefined || store === arg) as [string, () => Promise<SeedStoreResult>][];

// Held for the whole run, so a catalog copy never publishes between a store's lookup and its writes.
withCatalogIngestLock(process.env.DATABASE_URL!, async () => {
  let failed = 0;
  for (const [store, run] of runs) {
    try {
      const r = await run();
      console.log(
        `${store}: priced ${r.upserted} printings and ${r.tokenUpserted} token printings as of ${r.asOf.toISOString()}; ` +
        `skipped ${r.skipped} source rows with nothing usable, ${r.skippedOrphan} for printings not in our catalog; ` +
        `collapsed ${r.collapsed} duplicate SKUs.`,
      );
    } catch (error) {
      failed++;
      console.error(`${store}: not refreshed this run (its last rows stand):`, error);
    }
  }
  return failed;
})
  .then((failed) => process.exit(failed > 0 ? 1 : 0))
  .catch((err) => { console.error(err); process.exit(1); });
