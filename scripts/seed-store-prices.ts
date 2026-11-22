import "./lib/env.mjs";
import { withCatalogIngestLock } from "../src/lib/catalog/ingest-lock";
import type { OtherStore } from "../src/lib/stores/rows";
import {
  loadCardKingdomRows, loadTcgplayerRows, storeTablesExist, writeStoreRows, type StoreLoad,
} from "../src/lib/stores/seed-store-prices";

/**
 * TCGplayer's and Card Kingdom's prices (store preference plan, 2026-11-22). `--store=tcgplayer|cardkingdom` runs one;
 * no flag runs both. Each store is its own transaction and its own failure: a Card Kingdom outage leaves TCGplayer's
 * rows written (and Card Kingdom's yesterday's, behind its liveness mark), and the run still exits non-zero so the
 * failure is seen.
 */
const LOADERS: Record<OtherStore, () => Promise<StoreLoad>> = {
  tcgplayer: loadTcgplayerRows,
  cardkingdom: loadCardKingdomRows,
};

function isStore(value: string): value is OtherStore {
  return Object.hasOwn(LOADERS, value);
}

const arg = process.argv.find((a) => a.startsWith("--store="))?.slice("--store=".length);
if (arg !== undefined && !isStore(arg)) {
  console.error(`--store must be ${Object.keys(LOADERS).join(" or ")}, not ${arg}`);
  process.exit(2);
}
const stores: OtherStore[] = arg === undefined ? (Object.keys(LOADERS) as OtherStore[]) : [arg];

async function main(): Promise<number> {
  if (!(await storeTablesExist())) {
    console.log("Store prices not refreshed: this database has not applied the store-prices migration yet.");
    return 0;
  }
  let failed = 0;
  for (const store of stores) {
    try {
      // The download and parse (minutes, for Scryfall's stream) happen before the lock: only the lookup and the
      // writes hold it, so a catalog copy never publishes between them and no other ingest waits on a network read.
      const load = await LOADERS[store]();
      const r = await withCatalogIngestLock(process.env.DATABASE_URL!, () => writeStoreRows(store, load));
      console.log(
        `${store}: priced ${r.upserted} printings and ${r.tokenUpserted} token printings as of ${r.asOf.toISOString()}; ` +
        `held back ${r.heldBack} older than the stored row; ` +
        `skipped ${r.skipped} source rows with nothing usable, ${r.skippedOrphan} for printings not in our catalog; ` +
        `collapsed ${r.collapsed} duplicate SKUs.`,
      );
    } catch (error) {
      failed++;
      console.error(`${store}: not refreshed this run (its last rows stand):`, error);
    }
  }
  return failed;
}

main()
  .then((failed) => process.exit(failed > 0 ? 1 : 0))
  .catch((err) => { console.error(err); process.exit(1); });
