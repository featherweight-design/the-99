/**
 * What the app says and links for each store (store preference, design #3200, `copy strings.ts`'s store list).
 * Client-safe: no database, so a client component draws from it.
 *
 * `figure` is what a store's price IS: a `listing` is one copy's asking price, a `market` figure an average of recent
 * sales (TCGplayer's), which carries the accuracy note. `cart` is whether one link fills a cart with a whole list;
 * a store without one gets the copy-and-paste row instead (call 6), pointed at its `paste` page.
 */
import type { Store } from "./rows";

export type StoreInfo = {
  id: Store;
  name: string;
  figure: "listing" | "market";
  cart: boolean;
  /** The store's own page that takes a pasted list, and its URL. Absent on a store with a cart link. */
  paste?: { name: string; url: string };
};

/**
 * Every paste page's address, in one place so a fix is one line. NOT a prefill: neither page is sent the list, and
 * neither store is marked `cart` (orchestrator ruling, 2026-11-22). Hugh checks both in a browser before his override
 * is flipped; READINESS G3 drafted the names and URLs.
 */
export const PASTE_URLS = {
  tcgplayer: "https://www.tcgplayer.com/massentry",
  cardkingdom: "https://www.cardkingdom.com/builder",
} as const;

export const STORE_INFO: Readonly<Record<Store, StoreInfo>> = {
  manapool: { id: "manapool", name: "Mana Pool", figure: "listing", cart: true },
  tcgplayer: { id: "tcgplayer", name: "TCGplayer", figure: "market", cart: false, paste: { name: "Mass Entry", url: PASTE_URLS.tcgplayer } },
  cardkingdom: { id: "cardkingdom", name: "Card Kingdom", figure: "listing", cart: false, paste: { name: "Deck Builder", url: PASTE_URLS.cardkingdom } },
};

/** The text a paste page reads: one `1 Name` line per card, the quantity first. */
export function pasteListText(lines: readonly { name: string; quantity: number }[]): string {
  return lines.map((l) => `${l.quantity} ${l.name}`).join("\n");
}
