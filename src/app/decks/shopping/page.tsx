// /decks/shopping — Shopping for all decks (handoff `design_handoff_the99_all_decks_cart`). This
// authenticates and loads; `CartView` owns the selections, which are a view for this visit only and
// never a write (lock 8).

import type { Metadata } from "next";
import { requireUserId } from "../../../lib/auth";
import { cachePageForUser } from "../../../lib/cache/page-cache";
import { allDecksCartCopy } from "../../../lib/copy/all-decks-cart";
import { loadCart } from "../../../lib/decks/cart-read";
import { provenanceForm } from "../../../lib/decks/price";
import { isUuid } from "../../../lib/uuid";
import { CartView } from "../../../components/decks/cart/cart-view";
import { parseQuery } from "../../../lib/decks/cart-sort";
import { requestSwitchEnv } from "../../../lib/switches/request";
import { hasFriend } from "../../../lib/social/has-friend";

export const metadata: Metadata = { title: allDecksCartCopy.title };

// A function outside the component: the render rules forbid reading the clock inline.
async function readNow() {
  return new Date();
}

export default async function AllDecksShoppingPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[]; deck?: string | string[]; q?: string | string[]; sort?: string | string[]; friend?: string | string[]; owned?: string | string[] }>;
}) {
  // The reader first: their switches (`requestSwitchEnv`), resolved once for the whole render.
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  const params = await searchParams;
  // `?deck=<id>` is the tile's link (Q8): it lands by deck, on that deck. Anything else is ignored.
  // Lowercased: `isUuid` takes either case, and every deck id the cart holds is Postgres's lowercase.
  const deck = typeof params.deck === "string" && isUuid(params.deck) ? params.deck.toLowerCase() : null;
  // `?view=friend` is By friend (spare requests PR 3c). Any other value is By card.
  const friendView = params.view === "friend";
  const initialView = params.view === "deck" || deck ? "deck" : friendView ? "friend" : "card";
  // Cached per reader on the database's stamp, as `/decks` is, so a write anywhere retires it.
  // A cart whose prices could not be read is served and never stored: the next visit reads again.
  const cart = await cachePageForUser(userId, "cart", [], async () => {
    const value = await loadCart(userId);
    return { value, store: value.priced };
  }, env);
  // Whether the reader has a friend decides By friend's empty block (v2 Empty-One B or C) and whether the spares read
  // is made at all (addendum R3 §4: no friend, no spare key, column, clause or toast). Read per request AFTER the cart
  // (`PER_REQUEST_READS`; `check:list-cache` refuses a use before the load, where it could reach the payload), so the
  // cached payload carries no friend data and its key no friend stamp. One row at most, on the viewer's own link rows.
  // A failed read counts as having a friend: the page never tells a reader they have none on a guess, and the spares
  // route answers under its own grant.
  const friends = await hasFriend(userId).catch(() => /* not a fallback: read after the cached load, never stored */ true);
  // The provenance line is built here, once, as PriceStrip's caller builds it: the locale and the
  // clock are the server's, so the client never re-derives a date that could hydrate differently.
  const newest = cart.newestAsOf ? new Date(cart.newestAsOf) : null;
  const provenance = newest ? provenanceForm(newest, await readNow()) : null;
  return (
    <CartView
      cart={cart}
      provenance={provenance}
      initialView={initialView}
      focusDeckId={deck}
      // `?q` and `?sort` (v2 G3): the search for every view, and the sort of the view the page opens on.
      initialQuery={typeof params.q === "string" ? parseQuery(params.q) : ""}
      initialSort={typeof params.sort === "string" ? params.sort : null}
      initialFriend={typeof params.friend === "string" ? params.friend : null}
      initialOwned={typeof params.owned === "string" ? params.owned : null}
      hasFriends={friends}
    />
  );
}
