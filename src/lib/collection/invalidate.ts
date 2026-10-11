import { revalidatePath } from "next/cache";
import { revalidateUserLists } from "../cache/user-lists";

/**
 * Every route that renders a figure read out of `collection_items`.
 *
 * A collection replace changes all of them at once, so the confirm has to invalidate all of
 * them. This list was assembled by reading and it was wrong three review rounds running, each
 * round naming a route the previous one had missed — so it is now a CHECKED list:
 * `pnpm check:collection-routes` walks every `page.tsx`, follows its imports, and fails when
 * what it finds disagrees with what is written here. Adding a route that reads the collection
 * therefore breaks CI until it is named here.
 *
 * `dynamic` is not decoration. `revalidatePath` needs its second argument for a route with a
 * `[param]` in it, and silently does nothing without one — which is exactly how a missing
 * invalidation hides.
 *
 * The literal list lives in `src/` rather than being computed, because computing it means
 * walking the filesystem, and a server action must not do that. The check is what keeps the
 * literal honest.
 */
export type CollectionRoute = { path: string; dynamic: boolean };

export const COLLECTION_ROUTES: CollectionRoute[] = [
  { path: "/", dynamic: false },
  // /about renders NOTHING out of the collection. It is here because
  // `check:collection-routes` answers by import reachability — the page reads
  // `user_prefs` through `db/schema`, and `collectionItems` is declared in that
  // same module — so the checker cannot tell the two apart without being taught
  // to look inside a barrel it deliberately treats as opaque.
  //
  // Listed rather than exempted, and the check left alone: it was wrong three
  // review rounds running when it was a hand-written list, and its conservative
  // answer costs one pointless revalidation of a static reference page. Making
  // it cleverer to spare that is the trade in the wrong direction.
  { path: "/about", dynamic: false },
  { path: "/collection", dynamic: false },
  // Reads `getCollectionStats` for the current card count the replace flow quotes back.
  { path: "/collection/replace", dynamic: false },
  // The receipt for one import. Its money sections are frozen, but its contested rows are read
  // live against the claim model — so a later replace changes what an older receipt says about
  // who is short, and a cached one would keep answering for a collection that is gone.
  { path: "/collection/replace/summary/[uploadId]", dynamic: true },
  // Reads `getCollectionStats` twice over: for the subtitle's second clause and
  // for whether that clause renders at all. A replace changes both.
  { path: "/collection/proxies", dynamic: false },
  // The ledger's own list: every collection write adds an entry to it.
  { path: "/collection/history", dynamic: false },
  { path: "/collection/sets", dynamic: false },
  { path: "/collection/sets/[code]", dynamic: true },
  { path: "/commanders", dynamic: false },
  { path: "/commanders/[slug]", dynamic: true },
  { path: "/decks", dynamic: false },
  { path: "/decks/[id]", dynamic: true },
  { path: "/decks/[id]/changes", dynamic: true },
  // `getDeckDetail`'s rows carry an `owned` flag per card.
  { path: "/decks/[id]/import", dynamic: true },
  { path: "/decks/import", dynamic: false },
  // The commander picker lists the legends the player owns.
  { path: "/decks/new", dynamic: false },
  // Help me choose ranks and badges commanders by what the player owns.
  { path: "/decks/new/choose", dynamic: false },
  { path: "/decks/shopping", dynamic: false },
  { path: "/discover", dynamic: false },
];

/**
 * Retires every cached reading of `userId`'s collection: the per-user list payloads and every
 * route above. One definition, because every collection write calls it after it commits — the
 * upload's confirm and each ledger action — and a copy per caller drifts a route at a time.
 *
 * The second argument is load-bearing for a `[param]` route: without it `revalidatePath`
 * silently does nothing, which is how a missing invalidation hides.
 */
export function invalidateCollectionReaders(userId: string): void {
  revalidateUserLists(userId);
  for (const route of COLLECTION_ROUTES) {
    if (route.dynamic) revalidatePath(route.path, "page");
    else revalidatePath(route.path);
  }
}
