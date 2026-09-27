/**
 * A whole page's payload, cached for one reader and keyed on their data stamp (Performance PR 6).
 *
 * Home and `/decks` spend most of their time assembling figures from a dozen per-user tables.
 * Nothing they draw changes unless one of those tables does, and every one of them carries the
 * `user_data_touch` trigger, which moves the stamp at commit. So an entry keyed on the stamp is
 * correct for exactly as long as it is asked for, whatever wrote the change: an action, an
 * `after()`, the render path itself, or a job. `check:list-cache` fails when a page starts
 * reading a table the trigger is not on, and `probe:list-stamp` proves each trigger moves it.
 *
 * Also in the key, by way of `cacheForUser`: the catalog generation, which retires every entry
 * after an ingest. And here: the DEPLOYMENT, so a build that changes what a payload says for
 * unchanged rows never serves the previous build's entries.
 *
 * A `load` that returns `store: false` is served and not stored. That is how a degraded
 * ranking stays out of the cache: it recomputes on every visit by design, and a stored copy
 * would freeze it until the reader next writes something. A load during which any read fell
 * back (`soft-failure.ts`) is not stored either, for the same reason.
 */
import { changeCommanderEnabled } from "../commander-change/flag";
import { analysisTabEnabled } from "../decks/analysis-flag";
import { neverCutEnabled } from "../decks/never-cut-flag";
import { noticesEnabled } from "../notices/flag";
import { listCacheEnabled } from "./list-cache-flag";
import { cacheForUser } from "./user-lists";
import { decodePlain, encodePlain } from "./plain";
import { watchSoftFailures } from "./soft-failure";
import { userDataStamp } from "./user-data-stamp";

const DEPLOYMENT = process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "local";

/**
 * The switches that change what these loaders read or draw. A switch is read when the server
 * starts, so a deployment usually covers it; a local server restarted with a switch flipped is
 * the same "deployment" and needs them spelled out.
 */
function switches(): string {
  return [analysisTabEnabled(), noticesEnabled(), changeCommanderEnabled(), neverCutEnabled()]
    .map((on) => (on ? "1" : "0")).join("");
}

/** Carries a result out of the cached function without it being stored. */
class NotStored {
  constructor(readonly value: unknown) {}
}

export type PageLoad<T> = { value: T; store: boolean };

export async function cachePageForUser<T>(
  userId: string,
  page: string,
  key: string[],
  load: () => Promise<PageLoad<T>>,
): Promise<T> {
  // Switched off, the page runs exactly as it did before this cache: no stamp read, nothing stored.
  if (!listCacheEnabled()) return (await load()).value;
  const stamp = await userDataStamp(userId);
  // Without a stamp there is nothing to say an entry is still true, so nothing is cached.
  if (stamp === null) return (await load()).value;
  try {
    const text = await cacheForUser(userId, ["page", page, DEPLOYMENT, switches(), String(stamp), ...key], async () => {
      const { value: result, fellBack } = await watchSoftFailures(load);
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
