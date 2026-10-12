// Fails when the built server carries its own copy of the Neon driver's Pool, which makes every
// `db.transaction` run its statements on different connections. Run it after `pnpm build`. See
// `scripts/lib/db-pool.mjs`.
import { bundledPools } from "./lib/db-pool.mjs";

const dir = ".next/server";
const found = await bundledPools(dir).catch((error) => {
  if (error?.code === "ENOENT") {
    console.error(`${dir} does not exist: run pnpm build first`);
    process.exit(2);
  }
  throw error;
});

if (found.length === 0) {
  console.log("no bundled Neon Pool in the built server: drizzle and the app share one driver copy");
  process.exit(0);
}
for (const path of found) console.error(`${path} bundles the Neon driver's Pool`);
console.error(`\n${found.length} chunk(s) bundle it. Keep "@neondatabase/serverless" in serverExternalPackages (next.config.ts).`);
process.exit(1);
