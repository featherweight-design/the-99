// `/collection`'s cached list, read by the page. `/api/collection-fields` no longer reads it: it
// reads only the ids a batch names (`loadBrowseCardsFor`), because a miss here rebuilds the whole
// collection and the client asks ~50 times a visit.
//
// The heaviest read on the page by an order of magnitude, which is why it is the one cached across
// visits. The key is history: since the deployment joined every `cacheForUser` key
// (`cache/deployment.ts`), a deploy retires the previous build's entry on its own; see the record
// kept beside the page's read of it.
//
// PRICES RIDE THIS ENTRY, and a price refresh retires it: `seed-prices` stamps
// `catalog_refreshes` after its commit (`stampCatalogRefresh`), and `cacheForUser` puts that
// catalog generation in every key, so the next read after a refresh is a miss. A list whose price
// read FAILED is served and never stored: the loader throws it past `unstable_cache`, which stores
// nothing for a throw, and it is caught here, so the next visit asks again rather than reading
// `Prices didn't load` until the catalog moves.
import { cacheForUser } from "../cache/user-lists";
import { type BrowseListCard } from "./browse";
import { loadBrowseCards } from "./browse-read";

class PricesUnread extends Error {
  constructor(readonly cards: BrowseListCard[]) {
    super("collection prices unread");
  }
}

export type CollectionList = { cards: BrowseListCard[]; pricesFailed: boolean };

export async function loadCollectionList(userId: string): Promise<CollectionList> {
  try {
    const cards = await cacheForUser(userId, ["browse-5"], async () => {
      const { cards, pricesFailed } = await loadBrowseCards(userId);
      if (pricesFailed) throw new PricesUnread(cards);
      return cards;
    });
    return { cards, pricesFailed: false };
  } catch (error) {
    if (!(error instanceof PricesUnread)) throw error;
    return { cards: error.cards, pricesFailed: true };
  }
}
