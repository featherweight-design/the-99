/**
 * Every address the public pages link to, in one place. Plain strings: a public page's exits are plain `<a>` links (plan,
 * follow-up B's facts), and nothing here reads a visitor.
 */

/** Scryfall's search, the top bar's hand-off where a search box would be (README call 5). */
export const SCRYFALL_SEARCH = "https://scryfall.com/search";

/** One printing on Scryfall: both fields are the catalog's own (`PublicPrinting`). */
export function scryfallPrintingUrl(setCode: string, collectorNumber: string): string {
  return `https://scryfall.com/card/${encodeURIComponent(setCode.toLowerCase())}/${encodeURIComponent(collectorNumber)}`;
}

/** Every printing of a card on Scryfall, by its exact name: where `More on Scryfall` goes once the chips hit their cap. */
export function scryfallPrintsUrl(name: string): string {
  return `https://scryfall.com/search?unique=prints&q=${encodeURIComponent(`!"${name}"`)}`;
}

/**
 * The card's own Scryfall page, for `Rulings, prices and every printing on Scryfall`: the page of the card's own printing
 * (its `scryfall_id`) when the read holds it, else the exact-name search.
 */
export function scryfallCardUrl(name: string, representative: { setCode: string; collectorNumber: string } | undefined): string {
  return representative ? scryfallPrintingUrl(representative.setCode, representative.collectorNumber) : `https://scryfall.com/search?q=${encodeURIComponent(`!"${name}"`)}`;
}

/** The public pages' own addresses. */
export const cardPagePath = (slug: string) => `/card/${slug}`;
export const commanderPagePath = (slug: string) => `/commander/${slug}`;

/** Clerk's hosted sign-in, reached through the proxy (`src/proxy.ts` answers this path), never the auth library here. */
export const SIGN_IN_PATH = "/sign-in";
