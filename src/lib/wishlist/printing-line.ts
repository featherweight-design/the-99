/**
 * What the Printing line of card details' Wishlist box draws (wishlist printing handoff): the printing the line names,
 * the printing previewed from the strip when it is another one, and the any-printing price for the sold-out note. Pure
 * and client-safe: the modal reads its card's printings and price read, the box draws the result.
 */
import { cheapestLiveCents, type PrintingPrices } from "../cards/price-lookup";
import { formatCents, formatPriceFigure, priceState } from "../cards/price-fact";

type Named = { scryfallId?: string; setCode: string; collectorNumber: string; setName?: string | null; imageUri?: string | null };

export type WishlistPrintingView = {
  /** The card's name, for the press's accessible name. */
  cardName: string;
  /** How many printings the card has: the line is drawn at two or more. */
  count: number;
  /** The printing the line names: its label parts, art, figure (null when the feed gave none) and whether it is sold out. */
  wanted: { id: string; setCode: string; collectorNumber: string; imageUri: string | null; price: string | null; soldOut: boolean } | null;
  /** The printing on screen from the strip, when it is not the wanted one. */
  preview: { id: string; setCode: string; setName: string; collectorNumber: string } | null;
  /** The cheapest live figure for any printing, e.g. `$1.49`, or null. */
  anyPrice: string | null;
};

export function wishlistPrintingView(args: {
  cardName: string;
  printings: readonly Named[];
  wantedId: string | null;
  previewId: string | null;
  prices: PrintingPrices | null | undefined;
}): WishlistPrintingView {
  const { cardName, printings, wantedId, previewId, prices } = args;
  const byId = (id: string | null) => (id === null ? undefined : printings.find((p) => p.scryfallId === id));
  const w = byId(wantedId);
  let wanted: WishlistPrintingView["wanted"] = null;
  if (w && w.scryfallId) {
    const fact = prices?.byScryfallId[w.scryfallId] ?? null;
    const state = priceState(fact, prices?.newestAsOf ?? null);
    wanted = {
      id: w.scryfallId,
      setCode: w.setCode,
      collectorNumber: w.collectorNumber,
      imageUri: w.imageUri ?? null,
      price: fact ? formatPriceFigure(fact, state) : null,
      soldOut: state === "soldOut",
    };
  }
  const p = byId(previewId);
  const preview = p && p.scryfallId && p.scryfallId !== wantedId
    ? { id: p.scryfallId, setCode: p.setCode, setName: p.setName ?? p.setCode, collectorNumber: p.collectorNumber }
    : null;
  const cheapest = cheapestLiveCents(prices);
  return { cardName, count: printings.length, wanted, preview, anyPrice: cheapest === null ? null : formatCents(cheapest) };
}
