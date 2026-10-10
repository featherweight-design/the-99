// The shared ancestor of the three routes that take the place strip — `/collection`,
// `/collection/sets` and `/collection/proxies` — and NOTHING else. `/collection/replace` and
// `/collection/sets/[code]` are plain siblings outside this group, so this layout never
// reaches them (`collection-place-head.tsx`'s own header explains the route-group shape and
// why a bare `collection/layout.tsx` could not do this without also wrapping them).
//
// A layout does not remount across a client-side navigation between its own children — only
// the page below it swaps — which is the whole fix: the strip used to be mounted fresh inside
// each of the three pages, with no shared ancestor below the app root to keep it alive, so
// every tab press tore it down and rebuilt it. Reported by Hugh as "pressing Sets reloads the
// whole page."
//
// `getCollectionStats` is wrapped in React's `cache()`, so this fetch and each page's own
// (still needed for ITS OWN logic — the empty-state branch, `cardCount`, `hasCollection`)
// dedupe to one query per request; nothing is fetched twice.

import { requireUserId } from "../../../lib/auth";
import { collectionEditEnabled } from "../../../lib/collection/edit-flag";
import { getCollectionLastUpdated, getCollectionStats } from "../../../lib/home/summary";
import { formatLastUpdated } from "../../../lib/collection/browse";
import { CollectionPlaceHead } from "../../../components/collection/collection-place-head";
import { CollectionContentScope } from "../../../components/collection/collection-content-scope";

export default async function CollectionListLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await requireUserId();
  const [stats, lastUpdated] = await Promise.all([
    getCollectionStats(userId),
    getCollectionLastUpdated(userId),
  ]);
  // Formatted here rather than handed down as a raw `Date`: the head is a Client Component
  // and would otherwise recompute the label against the browser's clock and timezone on
  // hydration, which can disagree with what this server render produced.
  const lastUpdatedLabel = lastUpdated ? formatLastUpdated(lastUpdated) : null;
  return (
    <>
      <CollectionPlaceHead stats={stats} lastUpdatedLabel={lastUpdatedLabel} editEnabled={collectionEditEnabled()} />
      <CollectionContentScope>{children}</CollectionContentScope>
    </>
  );
}
