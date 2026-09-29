import "./lib/env.mjs";
import { stampCatalogRefresh } from "../src/lib/cache/stamp-catalog";

// Stamps the catalog generation on its own, which retires every cached `cacheForUser` payload.
// The Commander index workflow runs this when its build step did not succeed: a step killed by
// its timeout never reaches the script's own stamp, and it has still written part of an index
// and may have cleared every reader's scores. Non-fatal, as every stamp is.
stampCatalogRefresh().then(() => process.exit(0));
