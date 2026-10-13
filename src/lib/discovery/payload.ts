// `/discover`'s cached payload, read by the page and by `/api/discovery-fields` through ONE loader.
//
// `unstable_cache` keys an entry on its key parts AND the function it wraps, so the page and the
// route reach the same entry only by calling the same function. The entry holds EVERY column for
// every row and is keyed on the sort and the reader's role basis (`discoveryKey`), never on the URL's
// search, colours or sets: the page cuts the draw columns down to its own first window after reading it
// (`cutToWindow`), so no request's window ever reaches an entry another request shares.
import { cacheForUser } from "../cache/user-lists";
import { encodeDiscovery } from "./encode";
import { discoveryKey, loadDiscoveryWithIds } from "./list";

/** `env` is the reader's resolved switches (`requestSwitchEnv`): the key and the load decide the role
 *  basis from the same one, so an entry is never filed under a basis it was not counted by. */
export function loadDiscoveryPayload(userId: string, sort: "fit" | "new", env: NodeJS.ProcessEnv = process.env) {
  return cacheForUser(userId, discoveryKey(sort, env), async () => {
    const { list, oracleIds } = await loadDiscoveryWithIds(userId, { sort }, env);
    return { encoded: encodeDiscovery(list), oracleIds };
  });
}
