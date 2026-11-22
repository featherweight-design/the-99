/**
 * The token a saved copy of the collection's draw fields is good for.
 *
 * The browser keeps the fields it fetched for the withheld cards (`ui/saved-fields`), filed under
 * this token. A repeat visit that is handed the SAME token knows nothing the fields depend on has
 * moved, and draws from the copy instead of asking `/api/collection-fields` again.
 *
 * It is the page cache's own key, so it is true for the same reasons (`cache/page-cache.ts`): the
 * reader's data stamp, which the database moves at commit for every write that can change a field
 * (an import, a scan, an edit, a printing pick, a deck write); the catalog generation; the
 * deployment, so a build that changes a field's shape never meets the last build's copy; and the
 * reader's resolved switches.
 *
 * Opaque by construction: a hash, so the browser holds no Clerk id and no stamp, and the user id
 * is in it so one reader's copy can never match another's on a shared device.
 *
 * `null` means no copy is to be kept or used: the switch is off (`LIST_CACHE_ENABLED`, which turns
 * every stamp read off with it) or the stamp cannot be read. The page then behaves as it did
 * before the copy existed.
 */
import { createHash } from "node:crypto";

import { catalogGeneration } from "../cache/catalog-generation";
import { DEPLOYMENT_ID } from "../cache/deployment";
import { listCacheEnabled } from "../cache/list-cache-flag";
import { userDataStamp } from "../cache/user-data-stamp";
import { switchBits } from "../flags/resolve";

export function tokenFor(parts: { userId: string; stamp: number; generation: string; deployment: string; switches: string }): string {
  const { userId, stamp, generation, deployment, switches } = parts;
  return createHash("sha256").update(JSON.stringify([userId, stamp, generation, deployment, switches])).digest("base64url").slice(0, 32);
}

export async function savedListToken(userId: string, env: NodeJS.ProcessEnv): Promise<string | null> {
  if (!listCacheEnabled(env)) return null;
  const stamp = await userDataStamp(userId);
  if (stamp === null) return null;
  const generation = await catalogGeneration();
  return tokenFor({ userId, stamp, generation, deployment: DEPLOYMENT_ID, switches: switchBits(env) });
}
