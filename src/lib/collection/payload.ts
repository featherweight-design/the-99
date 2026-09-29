// `/collection`'s cached list, read by the page AND by `/api/collection-fields` (list payload plan,
// PR 4). One loader rather than two calls to `cacheForUser`, because the data cache keys an entry
// on the function it wraps as well as its key parts: two call sites would be two entries, and the
// fields route would build the whole list again instead of reading the one the page filed.
//
// The heaviest read on the page by an order of magnitude, which is why it is the one cached across
// visits. The key is history: since the deployment joined every `cacheForUser` key
// (`cache/deployment.ts`), a deploy retires the previous build's entry on its own; see the record
// kept beside the page's read of it.
import { cacheForUser } from "../cache/user-lists";
import { loadBrowseCards } from "./browse";

export function loadCollectionList(userId: string) {
  return cacheForUser(userId, ["browse-5"], () => loadBrowseCards(userId));
}
