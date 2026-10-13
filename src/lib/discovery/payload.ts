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

/**
 * `env` is the reader's resolved switches (`requestSwitchEnv`): the key and the load decide the role
 * basis from the same one, so an entry is never filed under a basis it was not counted by.
 *
 * The entry carries the basis it was COUNTED by (`basis`), which the page hands the view and the
 * fields route checks against the basis a batch asks for. A payload counted by the classifier only
 * because the label read failed is served and never filed (admin PR 6d-2): stored under the labels
 * key, it would be served as the labels' ranking until the ceiling.
 */
export function loadDiscoveryPayload(userId: string, sort: "fit" | "new", env: NodeJS.ProcessEnv) {
  return cacheForUser(
    userId,
    discoveryKey(sort, env),
    async () => {
      const { list, oracleIds, basis, fellBack } = await loadDiscoveryWithIds(userId, { sort }, env);
      return { encoded: encodeDiscovery(list), oracleIds, basis, fellBack };
    },
    { store: (payload) => !payload.fellBack },
  );
}
