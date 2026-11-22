/**
 * The third mono line of a Wishlist tile (wishlist printing handoff): what a copy costs and the printing the line
 * names. `$24.50 ▮ SLD 2125` for a chosen printing, `$3.99` for any printing, `sold out ▮ SLD 2455` when the chosen
 * printing is out of stock. A line with no figure draws the printing alone; no figure and no printing draws no line
 * (price.ts: silence is a state). Pure and client-safe: the page builds it, the tile draws it.
 */
import { formatPriceFigure, priceState, type PriceFact } from "../cards/price-fact";
import { priceCopy } from "../copy/price";

export type WishlistTileLine = { price: string | null; printing: { setCode: string; collectorNumber: string } | null };

export function wishlistTileLine(
  tile: { price: PriceFact | null; printing: { setCode: string; collectorNumber: string } | null },
  newestAsOf: Date | null,
): WishlistTileLine | null {
  const state = priceState(tile.price, newestAsOf);
  const price = state === "soldOut" ? priceCopy.tag.soldOut : tile.price ? formatPriceFigure(tile.price, state) : null;
  const printing = tile.printing ? { setCode: tile.printing.setCode, collectorNumber: tile.printing.collectorNumber } : null;
  return price === null && printing === null ? null : { price, printing };
}
