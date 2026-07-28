import "dotenv/config";
import { seedSets } from "../src/lib/scryfall/seed-sets";

seedSets()
  .then(({ upserted }) => {
    console.log(`Seeded ${upserted} sets.`);
    process.exit(0);
  })
  .catch((err) => { console.error(err); process.exit(1); });
