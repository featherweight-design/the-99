"use client";

// The price tag, in one place.
//
// Promoted out of `sets/set-cell.tsx`, whose treatment this is, because the card
// modal now draws the same tag under the art (card-detail R2). Two surfaces, one
// definition — a second copy is where the two would drift, and the card detail
// handoff's own instruction is that the tag is borrowed rather than redefined.
//
// SILENCE IS A STATE. `null` from this component is not a failure to render: a
// figure the feed never carried is not free and not unknown, and a dash, a zero
// or a reserved empty slot would each be a claim the feed never made.
//
// `no stock` COVERS TWO HISTORIES and the accessible name keeps them apart — a
// printing the feed has never carried was never for sale here, and a sold-out one
// was. The word is the same because the shopper's question is the same.

import { formatCents, priceOf, priceState, type PriceFact } from "../../lib/decks/price";
import { priceCopy } from "../../lib/copy/price";
import { setPageCopy } from "../../lib/copy/set-collections";

export function PriceTag({
  fact,
  newestAsOf,
  className,
}: {
  /** The feed's row for THIS printing, or null when it carried none. */
  fact: PriceFact | null;
  /** The newest `as_of` in the whole table — what liveness is measured against. */
  newestAsOf: Date | null;
  /** Positioning only. The tag owns its own ink, edge and padding at every call site. */
  className?: string;
}) {
  const state = priceState(fact, newestAsOf);
  const cents = fact ? priceOf(fact, state) : null;
  const base = "inline-block rounded-[4px] px-[5px] py-[2px] font-mono text-[10px]";

  if (cents === null) {
    // Three histories behind one tag: never carried, carried and sold out, and
    // carried with no usable figure. `priceState` returns `absent` for the first
    // and the third, and the presence of a row is what tells them apart.
    const label = state === "soldOut"
      ? setPageCopy.cellPrice.soldOut
      : fact
        ? setPageCopy.cellPrice.noFigure
        : setPageCopy.cellPrice.neverStocked;
    return (
      <span
        className={className ? `${base} ${className}` : base}
        style={{ color: "var(--fg-locked)", border: "1px dashed var(--fg-locked)" }}
        aria-label={label}
      >
        {setPageCopy.cell.noStock}
      </span>
    );
  }

  const money = formatCents(cents);
  // `priceState` collapses foil-only and etched-only into `foilOnly`, so the WORD comes
  // from which column supplied the figure — the same rule the shipped buy tag applies in
  // `qualifierOf`. Calling an etched-only printing "foil" names a finish the reader cannot
  // buy.
  const qualifier = state === "foilOnly"
    ? (fact?.foilCents !== null && fact?.foilCents !== undefined
        ? priceCopy.tag.foil
        : priceCopy.tag.etched)
    : null;
  return (
    <span
      className={className ? `${base} ${className}` : base}
      style={{ color: "var(--accent)", border: "1px solid var(--accent-dim)" }}
      aria-label={qualifier ? setPageCopy.cell.qualifiedPriceAria(qualifier, money) : undefined}
    >
      {qualifier ? setPageCopy.cell.qualifiedPrice(qualifier, money) : money}
    </span>
  );
}
