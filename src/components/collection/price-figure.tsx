// The figure that leads a row's type line or a tile's sub-line while `/collection` is sorted by
// price (design table `collection-price.md`). One component for both, so the four cases (a
// figure, a figure with its suffix, `no stock`, silence) are drawn by one definition.
//
// `--fg`, not `--accent`: the handoff's accent ink measured 4.25 to 4.46:1 in two themes at this
// size (README open item 1, ruled `--fg`). It sits in a line that truncates, so it never shrinks
// (`flex:none`) and the text after it gives way instead.

import { readCardPrice } from "../../lib/collection/copy-price";
import { collectionPriceCopy } from "../../lib/copy/collection-price";
import { priceCopy } from "../../lib/copy/price";
import { setPageCopy } from "../../lib/copy/set-collections";
import { formatCents } from "../../lib/decks/price";

/** Null for silence: the caller draws its line exactly as it would on any other sort. */
export function PriceFigure({ code, className }: { code: number | undefined; className: string }) {
  const price = readCardPrice(code);
  if (price === null) return null;
  if ("none" in price) {
    return (
      <span aria-hidden className={`flex-none tabular-nums ${className}`} style={{ color: "var(--fg-muted)" }}>
        {setPageCopy.cell.noStock}
      </span>
    );
  }
  // `max` takes the one suffix slot when a cheaper copy exists; the finish is then spoken only.
  const suffix = price.mixed ? collectionPriceCopy.maxSuffix : price.finish ? priceCopy.tag[price.finish] : null;
  return (
    <span aria-hidden className={`flex-none tabular-nums ${className}`} style={{ color: "var(--fg)" }}>
      {formatCents(price.cents)}
      {suffix ? <span className="font-normal" style={{ color: "var(--fg-muted)" }}>{` ${suffix}`}</span> : null}
    </span>
  );
}

/** The clause the row or tile name gains, last, while sorted by price. Null for silence. */
export function priceSpoken(code: number | undefined): string | null {
  const price = readCardPrice(code);
  if (price === null) return null;
  if ("none" in price) return setPageCopy.cellPrice[price.none];
  const figure = price.finish ? `${formatCents(price.cents)} ${priceCopy.tag[price.finish]}` : formatCents(price.cents);
  return price.mixed ? collectionPriceCopy.aria.mixed(figure) : collectionPriceCopy.aria.priced(figure);
}
