/**
 * A card's page at each store (store preference, design #3200, READINESS G3). Client-safe: card details and Home's feed
 * draw these.
 *
 * Every link is the store's own NAME SEARCH, the one URL each store has for "this card, any printing", as Mana Pool's
 * card grid is for Mana Pool. Built here from the name, never from Scryfall's `purchase_uris`, which carry Scryfall's
 * partner tag (READINESS errata (c): no affiliate links). Checked 2026-11-22: both search URLs answer 200 for
 * `Sol Ring`, and Card Kingdom's server-renders 12 results for it.
 */
import { manapoolCardUrl } from "../manapool/links";
import type { Store } from "./rows";

export function storeCardUrl(store: Store, name: string): string {
  const q = encodeURIComponent(name);
  switch (store) {
    case "manapool":
      return manapoolCardUrl(name);
    case "tcgplayer":
      return `https://www.tcgplayer.com/search/magic/product?productLineName=magic&q=${q}`;
    case "cardkingdom":
      return `https://www.cardkingdom.com/catalog/search?search=header&filter%5Bname%5D=${q}`;
  }
}
