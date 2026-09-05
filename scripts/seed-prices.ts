import "./lib/env.mjs";
import { seedPrices } from "../src/lib/manapool/seed-prices";

seedPrices()
  .then((r) => {
    console.log(
      `Priced ${r.upserted} printings as of ${r.asOf.toISOString()}; ` +
      `collapsed ${r.collapsedDuplicates} surplus duplicate rows, skipped ${r.skippedOrphan} orphan.`,
    );
    process.exit(0);
  })
  .catch((err) => { console.error(err); process.exit(1); });
