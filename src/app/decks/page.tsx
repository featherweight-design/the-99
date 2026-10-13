// /decks — the deck list. This authenticates and loads; `DecksView` owns the
// filters, the order and the URL that carries both.
import { perfRoute } from "../../lib/perf/timing";
import { redirect } from "next/navigation";
import { requireUserId } from "../../lib/auth";
import { analysisTabEnabled } from "../../lib/decks/analysis-flag";
import { allDecksCartEnabled } from "../../lib/decks/all-decks-cart-flag";
import { preconsEnabled } from "../../lib/precons/flag";
import { readPreconSummary } from "../../lib/precons/summary";
import { listDecksWithStats } from "../../lib/decks/read";
import { listFolders } from "../../lib/decks/folders";
import { loadShoppingRollup } from "../../lib/decks/shopping-rollup";
import { selectParamSuffix } from "../../lib/decks/selection-param";
import { DEFAULT_DECK_SORT } from "../../lib/decks/sort";
import { getCollectionStats } from "../../lib/home/summary";
import { cachePageForUser } from "../../lib/cache/page-cache";
import { getRankedList } from "../../lib/recs/ranked-list";
import { buildableCount } from "../../lib/recs/buildable";
import { noticesEnabled } from "../../lib/notices/flag";
import { DecksView } from "../../components/decks/decks-view";
import { cookies } from "next/headers";
import { lineupEnabled } from "../../lib/decks/lineup-flag";
import { readLineupCached } from "../../lib/lineup/cached";
import { requestSwitchEnv } from "../../lib/switches/request";
import { DECKS_STATS_OPEN_COOKIE } from "../../components/ui/view-cookie";


export default async function DecksPage({
  searchParams,
}: {
  searchParams: Promise<{ commander?: string; select?: string | string[]; view?: string | string[] }>;
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
  // The reader's resolved switches, once for the whole render: every switch below, the cached
  // payload's key and its load all decide from this one env.
  const env = await requestSwitchEnv(userId);
  // Stats on /decks (`LINEUP_ENABLED`): off, no switch, no read, and `?view` is ignored. On, the page draws
  // Stats for `?view=stats` alone and reads the Stats payload only then. A bare /decks is always Tiles: the
  // view is no longer remembered (Hugh, 2026-10-13), so a returning reader is never opened on Stats. It is
  // its own cache entry, so Tiles pays nothing for it.
  const statsOn = lineupEnabled(env);
  // Only the Stats cards' fold memory is read from here.
  const jar = statsOn ? await cookies() : null;
  const askedView = Array.isArray(params.view) ? params.view[0] : params.view;
  const view = statsOn && askedView === "stats" ? "stats" : "tiles";
  const lineupData = view === "stats"
    ? readLineupCached(userId, env)
    : null;
  // The tile's bracket chip reads each deck's last analyzed bracket. Off with the Analysis tab's
  // flag, because a chip that lands on a tab nobody can open is a promise the page cannot keep.
  const includeBracket = analysisTabEnabled(env);
  // `measure:load`'s spans (PERF_TIMING=1 only; a pass-through otherwise).
  const perf = perfRoute("/decks");
  // The whole payload is cached for this reader, keyed on their data stamp: see page-cache.ts
  // for why that is correct after any write, from anywhere.
  // The precons line's meta is catalog data, the same for every reader, so it is read beside the
  // cached payload rather than inside it; a failed read keeps the line and drops the meta.
  const preconSummary = preconsEnabled(env) ? readPreconSummary() : null;
  const data = await cachePageForUser(userId, "decks", [], async (env) => {
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
        includeNotice: includeBracket && noticesEnabled(env),
        // The env the load is handed, which is the one the entry is keyed on.
        env,
      })),
      // The tile's To buy figure reads its copies and its cost from the same
      // roll-up, so the count and the price always cover the same cards.
      perf.timed("shoppingRollup", () => loadShoppingRollup(userId, undefined, env)),
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
            perf.timed("rankedList", () => getRankedList(userId, env)),
            perf.timed("collectionStats", () => getCollectionStats(userId)),
          ])
        : [null, null];

    return {
      value: {
        decks, folders, shopping,
        // The true count, from the one definition (Hugh, 2026-09-28): the old cap of nine
        // understated every real collection. 0 draws no line.
        buildable: buildableCount(ranked) ?? 0,
        // Copies owned, not distinct names: `1,284 cards` is what a player has.
        cards: stats?.totalCards ?? 0,
      },
      // A degraded ranking recomputes on every visit by design; a stored one would freeze it.
      store: !ranked?.degraded,
    };
  }, env);

  return (
    <DecksView
      decks={data.decks}
      folders={data.folders}
      shopping={data.shopping}
      cartEnabled={allDecksCartEnabled(env)}
      precons={preconSummary ? { summary: await preconSummary } : null}
      buildable={data.buildable}
      cards={data.cards}
      // One clock for the whole page, read on the server. Every relative date
      // below agrees because they are all measured against this instant.
      now={new Date().toISOString()}
      lineup={statsOn ? {
        data: lineupData ? await lineupData : null,
        view,
        foldServer: jar?.get(DECKS_STATS_OPEN_COOKIE)?.value ?? null,
      } : null}
    />
  );
}
