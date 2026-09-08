// /decks — the deck list. This authenticates and loads; `DecksView` owns the
// filters, the order and the URL that carries both.
import { redirect } from "next/navigation";
import { requireUserId } from "../../lib/auth";
import { listDecksWithStats } from "../../lib/decks/read";
import { loadShoppingRollup } from "../../lib/decks/shopping-rollup";
import { selectParamSuffix } from "../../lib/decks/selection-param";
import { DEFAULT_DECK_SORT } from "../../lib/decks/sort";
import { getCollectionStats } from "../../lib/home/summary";
import { getRankedList } from "../../lib/recs/ranked-list";
import { READY_COUNT } from "../../lib/recs/ready-to-build";
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
  const [decks, shopping] = await Promise.all([
    // The sort has no default in the reader, so no caller's order can move
    // under it. The server hands back this order and the client re-sorts from
    // there without a request.
    listDecksWithStats(userId, DEFAULT_DECK_SORT),
    // The tile's To buy figure reads its copies and its cost from the same
    // roll-up, so the count and the price always cover the same cards.
    loadShoppingRollup(userId),
  ]);

  // Only the zero state prints these two, and `getRankedList` recomputes the
  // whole score set on a cache miss — real work to do on a page that throws the
  // answer away as soon as the player owns one deck.
  const [ranked, stats] =
    decks.length === 0
      ? await Promise.all([getRankedList(userId), getCollectionStats(userId)])
      : [null, null];

  return (
    <DecksView
      decks={decks}
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
