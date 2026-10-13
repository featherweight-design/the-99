/**
 * A whole page's payload, cached for one reader and keyed on their data stamp (Performance PR 6).
 *
 * Home, `/decks` and `/decks/shopping` spend most of their time assembling figures from a dozen per-user tables.
 * Nothing they draw changes unless one of those tables does, and every one of them carries the
 * `user_data_touch` trigger, which moves the stamp at commit. So an entry keyed on the stamp is
 * correct for exactly as long as it is asked for, whatever wrote the change: an action, an
 * `after()`, the render path itself, or a job. `check:list-cache` fails when a page starts
 * reading a table the trigger is not on, and `probe:list-stamp` proves each trigger moves it.
 *
 * Also in the key, by way of `cacheForUser`: the catalog generation, which retires every entry
 * after an ingest, and the DEPLOYMENT, so a build that changes what a payload says for
 * unchanged rows never serves the previous build's entries.
 *
 * A `load` that returns `store: false` is served and not stored. That is how a degraded
 * ranking stays out of the cache: it recomputes on every visit by design, and a stored copy
 * would freeze it until the reader next writes something. A load during which any read fell
 * back (`soft-failure.ts`) is not stored either, for the same reason.
 */
import { switchBits } from "../switches/resolve";
import { requestSwitchEnv } from "../switches/request";
import { listCacheEnabled } from "./list-cache-flag";
import { cacheForUser } from "./user-lists";
import { decodePlain, encodePlain } from "./plain";
import { watchSoftFailures } from "./soft-failure";
import { userDataStamp } from "./user-data-stamp";

/**
 * The reader's RESOLVED switches, every one of them, as bits (brief, locked rule 6). An override
 * changes no stamp, so it is the key that retires a cached page when an admin flips a switch for
 * this reader, their group or the whole app; a redeploy that flips a variable moves it too. Every
 * switch rather than a hand-picked few, so a loader that starts reading another one is covered.
 */
const switches = (env: NodeJS.ProcessEnv): string => switchBits(env);

/** Carries a result out of the cached function without it being stored. */
class NotStored {
  constructor(readonly value: unknown) {}
}

export type PageLoad<T> = { value: T; store: boolean };

/**
 * `load` is handed the env the key was built from, and must decide every switch from it: only then
 * is the key the whole story. Not yet true of every read a load reaches: the claim model in
 * `availability-query` takes `env` (admin adoption 6e), but some of its callers outside `lib/decks`
 * do not pass it yet and so read `NEVER_CUT_ENABLED` and `CHANGE_COMMANDER_ENABLED` from the
 * environment (adoption 6f; nothing writes an override before the Switches page, which follows
 * adoption). A page that also decides switches OUTSIDE the cached load
 * resolves once (`requestSwitchEnv`) and passes that env as `env`, so the key, the loader and the
 * rest of the render read one snapshot; without it, the reader's switches are resolved here.
 */
export async function cachePageForUser<T>(
  userId: string,
  page: string,
  key: string[],
  load: (env: NodeJS.ProcessEnv) => Promise<PageLoad<T>>,
  env?: NodeJS.ProcessEnv,
): Promise<T> {
  const resolved = env ?? await requestSwitchEnv(userId);
  const run = () => load(resolved);
  // Switched off, the page runs exactly as it did before this cache: no stamp read, nothing stored.
  if (!listCacheEnabled(resolved)) return (await run()).value;
  const stamp = await userDataStamp(userId);
  // Without a stamp there is nothing to say an entry is still true, so nothing is cached.
  if (stamp === null) return (await run()).value;
  try {
    const text = await cacheForUser(userId, ["page", page, switches(resolved), String(stamp), ...key], async () => {
      const { value: result, fellBack } = await watchSoftFailures(run);
      // Thrown rather than returned: the data cache stores whatever the function returns.
      if (!result.store || fellBack) throw new NotStored(result.value);
      return encodePlain(result.value);
    });
    return decodePlain<T>(text);
  } catch (error) {
    // not a fallback: a result carried out unstored, or the load's own error rethrown.
    if (error instanceof NotStored) return error.value as T;
    throw error;
  }
}
