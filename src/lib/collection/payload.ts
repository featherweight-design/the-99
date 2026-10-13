// `/collection`'s cached list, read by the page AND by `/api/collection-fields` (list payload plan,
// PR 4). One loader rather than two calls to `cacheForUser`, because the data cache keys an entry
// on the function it wraps as well as its key parts: two call sites would be two entries, and the
// fields route would build the whole list again instead of reading the one the page filed.
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

// THE FIELDS ROUTE MUST NOT REBUILD A FAILED LIST PER BATCH. A failed list is never stored under
// the page's key, so without this every withheld-fields batch (200 cards each, ~15 for a large
// collection) would rebuild the whole list and retry the failing price read. The failed list is
// filed for the current minute instead, and the fields route reads that first: the outage costs at
// most one rebuild a minute, while the page itself still asks again on every visit.
//
// ONE closure literal for the read and the write, because `unstable_cache` keys an entry on the
// function's source text as well as its key parts: with `cards` it files them, without it it
// throws, which stores nothing.
class NoFailedList extends Error {}

function failedList(userId: string, cards?: BrowseListCard[]): Promise<BrowseListCard[]> {
  const minute = String(Math.floor(Date.now() / 60_000));
  return cacheForUser(userId, ["browse-5-failed", minute], async () => {
    if (!cards) throw new NoFailedList();
    return cards;
  });
}

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
    await failedList(userId, error.cards);
    return { cards: error.cards, pricesFailed: true };
  }
}

/** The fields route's read: this minute's failed list when there is one, otherwise the page's. */
export async function loadCollectionListForFields(userId: string): Promise<CollectionList> {
  try {
    return { cards: await failedList(userId), pricesFailed: true };
  } catch (error) {
    if (!(error instanceof NoFailedList)) throw error;
    return loadCollectionList(userId);
  }
}
