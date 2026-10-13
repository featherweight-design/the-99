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
import { shoppingMarkBoughtEnabled } from "../../../lib/decks/mark-bought-flag";
import { requestSwitchEnv } from "../../../lib/switches/request";

export const metadata: Metadata = { title: allDecksCartCopy.title };

// A function outside the component: the render rules forbid reading the clock inline.
async function readNow() {
  return new Date();
}

export default async function AllDecksShoppingPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[]; deck?: string | string[] }>;
}) {
  // The reader first: the switch is theirs (`requestSwitchEnv`), resolved once for the whole render.
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!allDecksCartEnabled(env)) notFound();
  const params = await searchParams;
  // `?deck=<id>` is the tile's link (Q8): it lands by deck, on that deck. Anything else is ignored.
  // Lowercased: `isUuid` takes either case, and every deck id the cart holds is Postgres's lowercase.
  const deck = typeof params.deck === "string" && isUuid(params.deck) ? params.deck.toLowerCase() : null;
  const initialView = params.view === "deck" || deck ? "deck" : "card";
  // Cached per reader on the database's stamp, as `/decks` is, so a write anywhere retires it.
  // A cart whose prices could not be read is served and never stored: the next visit reads again.
  const cart = await cachePageForUser(userId, "cart", [], async (keyed) => {
    const value = await loadCart(userId, keyed);
    return { value, store: value.priced };
  }, env);
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
      buyEnabled={shoppingMarkBoughtEnabled(env)}
    />
  );
}
