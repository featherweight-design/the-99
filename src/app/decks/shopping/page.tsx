// /decks/shopping — Shopping for all decks (handoff `design_handoff_the99_all_decks_cart`). This
// authenticates and loads; `CartView` owns the selections, which are a view for this visit only and
// never a write (lock 8).

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUserId } from "../../../lib/auth";
import { cachePageForUser } from "../../../lib/cache/page-cache";
import { allDecksCartCopy } from "../../../lib/copy/all-decks-cart";
import { allDecksCartEnabled } from "../../../lib/decks/all-decks-cart-flag";
import { loadCart } from "../../../lib/decks/cart-read";
import { provenanceForm } from "../../../lib/decks/price";
import { isUuid } from "../../../lib/uuid";
import { CartView } from "../../../components/decks/cart/cart-view";
import { parseQuery } from "../../../lib/decks/cart-sort";
import { shoppingMarkBoughtEnabled } from "../../../lib/decks/mark-bought-flag";
import { requestSwitchEnv } from "../../../lib/switches/request";
import { socialFriendsEnabled, spareRequestsEnabled } from "../../../lib/social/flag";
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
  // The reader first: the switch is theirs (`requestSwitchEnv`), resolved once for the whole render.
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!allDecksCartEnabled(env)) notFound();
  const params = await searchParams;
  // `?deck=<id>` is the tile's link (Q8): it lands by deck, on that deck. Anything else is ignored.
  // Lowercased: `isUuid` takes either case, and every deck id the cart holds is Postgres's lowercase.
  const deck = typeof params.deck === "string" && isUuid(params.deck) ? params.deck.toLowerCase() : null;
  // `?view=friend` is By friend (spare requests PR 3c), a view only with spare requests on for the reader (which needs
  // friends on): off, it is By card. Any other value is By card too.
  const byFriend = socialFriendsEnabled(env) && spareRequestsEnabled(env);
  const friendView = params.view === "friend" && byFriend;
  const initialView = params.view === "deck" || deck ? "deck" : friendView ? "friend" : "card";
  // Cached per reader on the database's stamp, as `/decks` is, so a write anywhere retires it.
  // A cart whose prices could not be read is served and never stored: the next visit reads again.
  const cart = await cachePageForUser(userId, "cart", [], async (keyed) => {
    const value = await loadCart(userId, keyed);
    return { value, store: value.priced };
  }, env);
  // Whether the reader has a friend decides By friend's empty block (v2 Empty-One B or C) and, with friends' spares on,
  // whether the spares read is made at all (addendum R3 §4: no friend, no spare key, column, clause or toast). Read per
  // request beside the cart (`PER_REQUEST_READS`) and only where friends' spares are on, so the cached payload carries
  // no friend data and its key no friend stamp. One row at most, on the viewer's own link rows.
  const friends = socialFriendsEnabled(env) ? await hasFriend(userId) : true;
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
      buyEnabled={shoppingMarkBoughtEnabled(env)}
      // Friends' spares on the lines (Social R2 PR B): read after the page from the uncached route, so no key changes.
      socialFriends={socialFriendsEnabled(env)}
      // Ask in the lines' spares modal (spare requests PR 3b), re-checked by every action on the server.
      spareAsks={spareRequestsEnabled(env)}
      hasFriends={friends}
    />
  );
}
