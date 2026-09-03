import "./lib/env.mjs";
import { seedCards } from "../src/lib/scryfall/seed";

seedCards()
  .then(({ upserted, skipped }) => {
    console.log(`Seeded ${upserted} cards (${skipped} skipped).`);
    process.exit(0);
  })
  .catch((err) => { console.error(err); process.exit(1); });
