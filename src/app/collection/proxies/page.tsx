// /collection/proxies — what you're printing.
//
// Entered from /collection beside `By set`, and never a nav pillar of its own:
// it is a corner of the collection rather than a peer of it. Read-only by
// ruling, because a row belongs to several decks and the sheet's control is per
// deck — unmarking happens where the decision was made, via the deck links.

import { requireUserId } from "../../../lib/auth";
import { loadProxyList } from "../../../lib/decks/proxy-list";
import { userHasDecks } from "../../../lib/decks/proxy-list";
import { ProxyListView } from "../../../components/decks/proxy-list-view";
import { getCollectionStats } from "../../../lib/home/summary";

export default async function ProxiesPage() {
  const userId = await requireUserId();
  // The deck count decides WHICH empty state renders, and the collection figure
  // decides whether the subtitle carries its second clause — a reader with no
  // collection needs no reassurance about one they never made.
  // `userHasDecks`, not `listDecksWithStats`: that loader runs an aggregate and,
  // for a flippable deck, the user-wide claim and seniority query behind
  // `loadDeckBuyRows` — all of it discarded here for one boolean.
  const [rows, hasDecks, stats] = await Promise.all([
    loadProxyList(userId),
    userHasDecks(userId),
    getCollectionStats(userId),
  ]);

  return (
    <ProxyListView
      rows={rows}
      hasDecks={hasDecks}
      hasCollection={stats.totalCards > 0}
    />
  );
}
