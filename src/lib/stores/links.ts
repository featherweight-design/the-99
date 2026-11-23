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

/**
 * The layouts whose stores list the card under its whole `A // B` name. Every other two-named layout (transform, modal
 * DFC, adventure, flip) is listed under its front face: Card Kingdom's search finds nothing for `Delver of Secrets //
 * Insectile Aberration` or `Bonecrusher Giant // Stomp`, and finds `Fire // Ice` by its whole name (measured
 * 2026-11-22).
 */
const WHOLE_NAME_LAYOUTS: ReadonlySet<string> = new Set(["split", "aftermath"]);

/** The name a store's search finds the card by: the front face of a two-faced card, else the whole name. */
export function storeSearchName(name: string, layout?: string | null): string {
  const at = name.indexOf(" // ");
  return at > 0 && !(layout && WHOLE_NAME_LAYOUTS.has(layout)) ? name.slice(0, at) : name;
}

/** `layout` is the card's Scryfall layout, which decides the name another store searches (`storeSearchName`). */
export function storeCardUrl(store: Store, name: string, layout?: string | null): string {
  const q = encodeURIComponent(storeSearchName(name, layout));
  switch (store) {
    case "manapool":
      return manapoolCardUrl(name);
    case "tcgplayer":
      return `https://www.tcgplayer.com/search/magic/product?productLineName=magic&q=${q}`;
    case "cardkingdom":
      return `https://www.cardkingdom.com/catalog/search?search=header&filter%5Bname%5D=${q}`;
  }
}
