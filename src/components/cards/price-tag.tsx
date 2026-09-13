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

import {
  formatCents,
  priceOf,
  priceState,
  provenanceForm,
  type PriceFact,
} from "../../lib/decks/price";
import { priceCopy } from "../../lib/copy/price";
import { setPageCopy } from "../../lib/copy/set-collections";

export function PriceTag({
  fact,
  newestAsOf,
  className,
  standalone = false,
}: {
  /** The feed's row for THIS printing, or null when it carried none. */
  fact: PriceFact | null;
  /** The newest `as_of` in the whole table — what liveness is measured against. */
  newestAsOf: Date | null;
  /** Positioning only. The tag owns its own ink, edge and padding at every call site. */
  className?: string;
  /**
   * True where nothing around the tag speaks its figure.
   *
   * The set grid's cell composes the figure into the button's own accessible
   * name, so a label here would say it twice. The card modal draws the tag on its
   * own, where a bare `$2.41` is what a screen reader would reach — a number with
   * no subject and no date. `priceCopy.aria` is the ratified sentence for that,
   * and this is the only place it is spoken per card.
   *
   * `provenanceForm` is called here rather than on the server, against this
   * repo's own instruction, for the one reason that instruction allows: this node
   * never server-renders. The modal's card arrives from a click-time fetch, so
   * there is no server render for a browser clock to disagree with.
   */
  standalone?: boolean;
}) {
  const state = priceState(fact, newestAsOf);
  const cents = fact ? priceOf(fact, state) : null;
  const base = "inline-block rounded-[4px] px-[5px] py-[2px] font-mono text-[10px]";

  // A standalone tag says its sentence through a sibling, never through an
  // `aria-label` on the visible span: this repo has already learned that one, at
  // `decks/buy-tag.tsx:127-133` — on a bare span the label lands on the generic
  // role and is discarded outright, and `role="img"` only rescued it by announcing
  // a run of text as a picture. The visual node goes `aria-hidden` and an `sr-only`
  // sibling carries the whole claim, qualifier and provenance together.
  const speak = (sentence: string, visual: React.ReactNode) => (
    <>
      <span aria-hidden="true">{visual}</span>
      <span className="sr-only">{sentence}</span>
    </>
  );

  if (cents === null) {
    // Three histories behind one tag: never carried, carried and sold out, and
    // carried with no usable figure. `priceState` returns `absent` for the first
    // and the third, and the presence of a row is what tells them apart.
    const label = state === "soldOut"
      ? setPageCopy.cellPrice.soldOut
      : fact
        ? setPageCopy.cellPrice.noFigure
        : setPageCopy.cellPrice.neverStocked;
    const visual = (
      <span
        className={className ? `${base} ${className}` : base}
        // The WORD takes `--fg-muted`; the EDGE keeps `--fg-locked`. Measured, not
        // assumed: `--fg-locked` on `--bg` runs 3.23:1 (phyrexia) to 3.49:1, which
        // clears the 3:1 non-text floor a dashed edge answers to and fails the 4.5:1
        // this 10px word does. `--fg-muted` runs 6.61 to 7.35 and clears everywhere;
        // `--fg-faint` was the handoff's suggestion and still fails two themes at
        // 4.12 and 4.29.
        style={{ color: "var(--fg-muted)", border: "1px dashed var(--fg-locked)" }}
        aria-label={standalone ? undefined : label}
      >
        {setPageCopy.cell.noStock}
      </span>
    );
    return standalone ? speak(label, visual) : visual;
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
  const visual = (
    <span
      className={className ? `${base} ${className}` : base}
      style={{ color: "var(--accent)", border: "1px solid var(--accent-dim)" }}
      aria-label={
        !standalone && qualifier
          ? setPageCopy.cell.qualifiedPriceAria(qualifier, money)
          : undefined
      }
    >
      {qualifier ? setPageCopy.cell.qualifiedPrice(qualifier, money) : money}
    </span>
  );
  if (!standalone) return visual;

  // The qualifier does not displace the provenance: a foil-only figure is still a
  // figure from a feed with a date on it, and saying only "available in foil only"
  // would drop the half of the sentence every other price carries. The finish rides
  // the figure into the same sentence instead.
  const figure = qualifier ? setPageCopy.cell.qualifiedPrice(qualifier, money) : money;
  const form = newestAsOf ? provenanceForm(newestAsOf, new Date()) : null;
  const sentence = form
    ? (form.behind
        ? priceCopy.aria.pricedBehind(figure, form.when)
        : priceCopy.aria.priced(figure, form.when))
    : figure;
  return speak(sentence, visual);
}
