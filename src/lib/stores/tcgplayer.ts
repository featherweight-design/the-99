import { dollarsToCents, type StorePriceRow } from "./rows";

/** TCGplayer's own product page. Built from the id, never Scryfall's `purchase_uris`, which carry Scryfall's partner tag. */
export function tcgplayerProductUrl(productId: number): string {
  return `https://www.tcgplayer.com/product/${productId}`;
}

function productId(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
}

/**
 * One Scryfall `default_cards` entry to its TCGplayer row, or null when it carries no TCGplayer price.
 *
 * Scryfall's `prices.usd`, `usd_foil` and `usd_etched` are TCGplayer's MARKET price (recent sales), not a
 * listing, so the row has no stock signal: every quantity is null, never 0. Etched printings have their own
 * TCGplayer product (`tcgplayer_etched_id`); every other finish shares the card's product page.
 */
export function tcgplayerRow(entry: Record<string, unknown>, asOf: Date): StorePriceRow | null {
  if (typeof entry.id !== "string") return null;
  const prices = (entry.prices ?? {}) as Record<string, unknown>;
  const priceCents = dollarsToCents(prices.usd);
  const priceCentsFoil = dollarsToCents(prices.usd_foil);
  const priceCentsEtched = dollarsToCents(prices.usd_etched);
  if (priceCents === null && priceCentsFoil === null && priceCentsEtched === null) return null;
  const product = productId(entry.tcgplayer_id);
  const etchedProduct = productId(entry.tcgplayer_etched_id);
  return {
    scryfallId: entry.id,
    store: "tcgplayer",
    priceCents, priceCentsFoil, priceCentsEtched,
    quantity: null, quantityFoil: null, quantityEtched: null,
    buyUrl: product === null ? null : tcgplayerProductUrl(product),
    buyUrlFoil: null,
    buyUrlEtched: etchedProduct === null ? null : tcgplayerProductUrl(etchedProduct),
    asOf,
  };
}
