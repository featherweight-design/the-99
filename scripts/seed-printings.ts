import "dotenv/config";
import { seedPrintings } from "../src/lib/scryfall/seed-printings";

seedPrintings()
  .then((r) => {
    console.log(
      `Seeded ${r.upserted} printings (${r.representatives} representative); ` +
      `skipped ${r.skippedLayout} token/emblem, ${r.skippedReversible} reversible, ` +
      `${r.skippedOrphan} orphan.`,
    );
    process.exit(0);
  })
  .catch((err) => { console.error(err); process.exit(1); });
