// /decks — the deck list. This authenticates and loads; `DecksView` owns the
// filters, the order and the URL that carries both.
import { perfRoute } from "../../lib/perf/timing";
import { redirect } from "next/navigation";
import { requireUserId } from "../../lib/auth";
import { analysisTabEnabled } from "../../lib/decks/analysis-flag";
import { listDecksWithStats } from "../../lib/decks/read";
import { listFolders } from "../../lib/decks/folders";
import { loadShoppingRollup } from "../../lib/decks/shopping-rollup";
import { selectParamSuffix } from "../../lib/decks/selection-param";
import { DEFAULT_DECK_SORT } from "../../lib/decks/sort";
import { getCollectionStats } from "../../lib/home/summary";
import { getRankedList } from "../../lib/recs/ranked-list";
import { READY_COUNT } from "../../lib/recs/ready-to-build";
import { noticesEnabled } from "../../lib/notices/flag";
import { DecksView } from "../../components/decks/decks-view";

export default async function DecksPage({
  searchParams,
}: {
  searchParams: Promise<{ commander?: string; select?: string | string[] }>;
}) {
  // Ahead of auth, as it has always been: the redirect is a URL rewrite and
  // needs no user.
  const params = await searchParams;
  if (params.commander) {
    // The synergy picks ride along. `selectParamSuffix` is empty when nothing
    // uuid-shaped survives, so a build with no selection lands on exactly the
    // URL this page has always produced.
    redirect(
      `/decks/new?commander=${encodeURIComponent(params.commander)}` +
        selectParamSuffix(params.select),
    );
  }

  const userId = await requireUserId();
  // The tile's bracket chip reads each deck's last analyzed bracket. Off with the Analysis tab's
  // flag, because a chip that lands on a tab nobody can open is a promise the page cannot keep.
  const includeBracket = analysisTabEnabled();
  // `measure:load`'s spans (PERF_TIMING=1 only; a pass-through otherwise).
  const perf = perfRoute("/decks");
  const [decks, shopping, folders] = await Promise.all([
    // The sort has no default in the reader, so no caller's order can move
    // under it. The server hands back this order and the client re-sorts from
    // there without a request.
    // This is the one caller that draws the in-use-elsewhere clause, so it is
    // the one that pays for the availability read behind it.
    perf.timed("listDecks", () => listDecksWithStats(userId, DEFAULT_DECK_SORT, {
      includeInUseElsewhere: true,
      // This is the surface that draws `N proxies` and the covered status pill.
      includeProxyStats: true,
      // And the deck-state marks: the hollow plate for a deck with no version,
      // the pending edge for one whose draft has moved, and the change figure
      // in the detail row.
      includeDeckState: true,
      // The tile's wash IS the commander's art, so this surface pays for the
      // copy the player owns rather than drawing another printing's.
      includeCommanderArt: true,
      includeBracket,
      // And the tile's notice, behind the same flag: a notice qualifies an analysis the tab draws.
      includeNotice: includeBracket && noticesEnabled(),
    })),
    // The tile's To buy figure reads its copies and its cost from the same
    // roll-up, so the count and the price always cover the same cards.
    perf.timed("shoppingRollup", () => loadShoppingRollup(userId)),
    // The shelf line's own read, and it cannot be derived from the decks above:
    // a folder holding no decks has no deck row to be named by, and landing on
    // that empty shelf is the whole loop the create flow teaches.
    perf.timed("folders", () => listFolders(userId)),
  ]);

  // Only the zero state prints these two, and `getRankedList` recomputes the
  // whole score set on a cache miss — real work to do on a page that throws the
  // answer away as soon as the player owns one deck.
  const [ranked, stats] =
    decks.length === 0
      ? await Promise.all([
          perf.timed("rankedList", () => getRankedList(userId)),
          perf.timed("collectionStats", () => getCollectionStats(userId)),
        ])
      : [null, null];

  return (
    <DecksView
      decks={decks}
      folders={folders}
      shopping={shopping}
      // The same nine as Home's Ready to build, clamped by what actually
      // scored. Not a second threshold.
      buildable={Math.min(READY_COUNT, ranked?.items.length ?? 0)}
      // Copies owned, not distinct names: `1,284 cards` is what a player has.
      cards={stats?.totalCards ?? 0}
      // One clock for the whole page, read on the server. Every relative date
      // below agrees because they are all measured against this instant.
      now={new Date().toISOString()}
    />
  );
}
