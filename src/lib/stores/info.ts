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

/**
 * The text a paste page reads: one `1 Name` line per card, the quantity first. Both pages (TCGplayer's Mass Entry and
 * Card Kingdom's Deck Builder) error on a card named `Front // Back`, as Hugh measured on staging 2026-11-23, so a
 * two-faced or split card is listed by its front face alone.
 */
export function pasteListText(lines: readonly { name: string; quantity: number }[]): string {
  // Two cards that share a front face would otherwise paste as two lines of one name; one line, summed, is unambiguous.
  const byFace = new Map<string, number>();
  for (const l of lines) {
    const face = l.name.split(" // ")[0];
    byFace.set(face, (byFace.get(face) ?? 0) + l.quantity);
  }
  return [...byFace].map(([face, quantity]) => `${quantity} ${face}`).join("\n");
}

/** Settings' Store section's id: the anchor Change store lands on (`/settings#settings-store`), which washes it. */
export const STORE_SETTINGS_ID = "settings-store";
export const STORE_SETTINGS_HREF = `/settings#${STORE_SETTINGS_ID}`;
