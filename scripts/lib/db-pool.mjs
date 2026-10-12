// Finds server chunks that carry their OWN copy of the Neon driver's Pool class.
//
// `db.transaction` (drizzle-orm/neon-serverless) checks out one connection only when
// `this.client instanceof Pool`, with `Pool` taken from ITS copy of @neondatabase/serverless. The app
// builds its pool in `src/db/index.ts` from the copy Turbopack bundles into the server chunks, so with
// both in play the check is false: no connection is checked out, `begin` and `commit` run on whatever
// pooled connection is free, and a connection goes back to the pool inside an open transaction with a
// frozen snapshot. `serverExternalPackages` in next.config.ts makes both load the one installed copy.
// A bundled `NeonPool` in `.next/server` means that setting stopped working.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const BUNDLED_POOL = "NeonPool";

/** Paths under `dir` (JS only, never source maps) whose text holds the driver's Pool class. */
export async function bundledPools(dir) {
  const found = [];
  const walk = async (d) => {
    for (const entry of await readdir(d, { withFileTypes: true })) {
      const path = join(d, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (/\.(c|m)?js$/.test(entry.name) && (await readFile(path, "utf8")).includes(BUNDLED_POOL)) found.push(path);
    }
  };
  await walk(dir);
  return found.sort();
}
