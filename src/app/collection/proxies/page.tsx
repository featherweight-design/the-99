// /collection/proxies — what you're printing.
//
// Reached by its tab in the collection's place head, and never a nav pillar of its own:
// it is a corner of the collection rather than a peer of it. Read-only by
// ruling, because a row belongs to several decks and the sheet's control is per
// deck — unmarking happens where the decision was made, via the deck links.

import { requireUserId } from "../../../lib/auth";
import { loadProxyList } from "../../../lib/decks/proxy-list";
import { userHasDecks } from "../../../lib/decks/proxy-list";
import { ProxyListView } from "../../../components/decks/proxy-list-view";
import { getCollectionLastUpdated, getCollectionStats } from "../../../lib/home/summary";
import { CollectionPlaceHead } from "../../../components/collection/collection-place-head";

export default async function ProxiesPage() {
  const userId = await requireUserId();
  // The deck count decides WHICH empty state renders, and the collection figure
  // decides whether the subtitle carries its second clause — a reader with no
  // collection needs no reassurance about one they never made.
  // `userHasDecks`, not `listDecksWithStats`: that loader runs an aggregate and,
  // for a flippable deck, the user-wide claim and seniority query behind
  // `loadDeckBuyRows` — all of it discarded here for one boolean.
  const [list, hasDecks, stats, lastUpdated] = await Promise.all([
    loadProxyList(userId),
    userHasDecks(userId),
    getCollectionStats(userId),
    // The place head's stats line, the same on all three routes (collection surfaces E18).
    getCollectionLastUpdated(userId),
  ]);

  // The place head sits above the list's padded column so its strip lands where /collection's
  // does (E19).
  return (
    <div className="flex flex-col">
      <CollectionPlaceHead current="proxies" stats={stats} lastUpdated={lastUpdated} />
      <ProxyListView
        rows={list.rows}
        newestAsOf={list.newestAsOf}
        hasDecks={hasDecks}
        hasCollection={stats.totalCards > 0}
      />
    </div>
  );
}
