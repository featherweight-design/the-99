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

// A DAY, NOT THE HOUR. Every input of this list is already named by the key (the user, the catalog
// generation, the deployment) or dropped by the tag (`revalidateUserLists`, on every upload, keep,
// release, deck write and printing pick), so the ceiling backstops only a tag call somebody missed.
// At an hour, a reader who comes back after lunch found the entry gone and paid the whole rebuild
// (about 1.3 s at 3,000 cards); the audience is a handful of readers, so that was most visits.
const LIST_CEILING_SECONDS = 24 * 60 * 60;

export async function loadCollectionList(userId: string): Promise<CollectionList> {
  try {
    // Set only when the loader ran, which is what a miss is: the data cache never calls it on a hit.
    let rebuilt: number | null = null;
    const cards = await cacheForUser(
      userId,
      ["browse-5"],
      async () => {
        const started = performance.now();
        const { cards, pricesFailed } = await loadBrowseCards(userId);
        rebuilt = Math.round(performance.now() - started);
        if (pricesFailed) throw new PricesUnread(cards);
        return cards;
      },
      { ceilingSeconds: LIST_CEILING_SECONDS },
    );
    // A miss is the only line, with no id or count in it: the fields route reads this list once per
    // batch, so a line per read would be ~15 hits a visit. Production logs count misses and a visit
    // with none was served from the cache.
    if (rebuilt !== null) console.log(`[collection] list rebuilt ${rebuilt}ms`);
    return { cards, pricesFailed: false };
  } catch (error) {
    if (!(error instanceof PricesUnread)) throw error;
    return { cards: error.cards, pricesFailed: true };
  }
}
