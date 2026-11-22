/**
 * How a wishlist line names the printing it wants (wishlist printing handoff): the set code in capitals and the
 * collector number, `SLD 2125`. Pure and client-safe: the tile, the card window, the feed line and the push body
 * all draw this one string. (The collection chip's `C21 · #263` is the collection's own label, a different surface.)
 */
export function wishlistPrintingLabel(p: { setCode: string; collectorNumber: string }): string {
  return `${p.setCode.toUpperCase()} ${p.collectorNumber}`;
}
