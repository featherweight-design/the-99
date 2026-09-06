// BuyTag — the one place the word `buy` and its colour are declared.
//
// The decklist row and the suggestion tile both mark an unowned card with it.
// Only the plate differs: the row's tag sits on a solid row, the tile's sits on
// card art, where a flat wash disappears into a bright frame.

import { addPanelCopy } from "../../lib/copy/decks-builder";
import { priceCopy } from "../../lib/copy/price";
import {
  formatCents,
  priceOf,
  priceState,
  type PriceFact,
  type PriceState,
  type ProvenanceForm,
} from "../../lib/decks/price";

type BuyTagVariant = "row" | "tile";

const PLATE: Record<BuyTagVariant, React.CSSProperties> = {
  row: { background: "color-mix(in oklab, var(--warning) 13%, transparent)" },
  tile: {
    // The scrim holds the warning text off the card art, so it has to be the
    // canvas colour rather than a fixed near-black — a theme with a lighter
    // canvas wants a lighter scrim, or the tag reads as a hole punched in the
    // art.
    //
    // 92%, not 82%, and UNCONDITIONALLY — not gated on whether a figure
    // renders. A scrim that changed with what is written on it would be a
    // primitive deciding how to look from its own content.
    background: "color-mix(in oklab, var(--bg) 92%, transparent)",
    boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--warning) 50%, transparent)",
  },
};

const PLACEMENT: Record<BuyTagVariant, string> = {
  row: "flex-none text-[9px] md:text-[9.5px]",
  // Above the art and deaf to the pointer: the tag overlaps the card-detail
  // button it sits beside, and a corner of the art must stay clickable.
  tile: "absolute z-10 right-[6px] top-[6px] text-[9px] pointer-events-none",
};

/** The figure's ink differs by plate: the row sits on a surface, the tile on art. */
const FIGURE_INK: Record<BuyTagVariant, string> = {
  row: "var(--fg-body)",
  tile: "var(--fg)",
};

/**
 * `foil` / `etched` name which printing the figure belongs to, so the figure is
 * incomplete without it — the spoken sentence carries it too, not just the
 * drawn tail.
 */
function qualifierOf(fact: PriceFact, state: PriceState): string | null {
  if (state !== "foilOnly") return null;
  return fact.foilCents !== null ? priceCopy.tag.foil : priceCopy.tag.etched;
}

/**
 * The tail's two spans. `soldOut` takes the figure's own ink and the figure's
 * own slot — it is the same class of fact, told apart by being a word where the
 * others are a number. `absent` returns null: silence is the state, and a dash
 * or a zero would be a claim the feed never made.
 */
function Tail({
  fact,
  state,
  variant,
  reserveSlot,
  silent,
}: {
  fact: PriceFact;
  state: PriceState;
  variant: BuyTagVariant;
  reserveSlot: boolean;
  /** True where the tag already speaks the price in its own sentence. */
  silent: boolean;
}) {
  if (state === "absent") return null;

  const cents = priceOf(fact, state);
  const qualifier = qualifierOf(fact, state);

  return (
    <span aria-hidden={silent ? "true" : undefined}>
      <span aria-hidden="true" style={{ color: "var(--border-strong)" }}>
        {" · "}
      </span>
      {/* The 58px slot is the Shopping list's, not the tag's own: under `All`
          the figure hugs. Right-aligned so a column of figures lines up on the
          decimal point rather than on the word before it. */}
      <span
        style={{
          color: FIGURE_INK[variant],
          ...(reserveSlot
            ? { display: "inline-block", minWidth: 58, textAlign: "right" as const }
            : null),
        }}
      >
        {cents === null ? priceCopy.tag.soldOut : formatCents(cents)}
        {qualifier ? (
          <span style={{ color: "var(--fg-faint)" }}>{` ${qualifier}`}</span>
        ) : null}
      </span>
    </span>
  );
}

// A labelled tag swaps the word for the sentence rather than carrying an
// `aria-label`: on a bare span the label lands on the generic role and is
// discarded outright, and `role="img"` rescued it only by announcing a run of
// text as an image. The row passes no label, because there the word already
// sits in the row's own reading order.
export function BuyTag({
  variant,
  label,
  price,
  newestAsOf = null,
  provenance = null,
  reserveSlot = false,
}: {
  variant: BuyTagVariant;
  label?: string;
  price?: PriceFact | null;
  /** Liveness is one comparison against the table's newest row, not a clock. */
  newestAsOf?: Date | null;
  /** Server-built; only the labelled (tile) variant speaks it. */
  provenance?: ProvenanceForm | null;
  /** Shopping reserves the figure a 58px slot so the column aligns. */
  reserveSlot?: boolean;
}) {
  const state = priceState(price, newestAsOf);
  const cents = price ? priceOf(price, state) : null;

  // One utterance per price. A priced tile appends the figure and its
  // provenance to the shipped ownership sentence rather than adding a second
  // one; every other state leaves that sentence exactly as it shipped.
  const speaksPrice = Boolean(label) && cents !== null && provenance !== null;
  const qualifier = price ? qualifierOf(price, state) : null;
  const spokenFigure =
    cents === null ? null : qualifier ? `${formatCents(cents)} ${qualifier}` : formatCents(cents);
  const spoken =
    speaksPrice && provenance && spokenFigure
      ? `${label}. ${
          provenance.behind
            ? priceCopy.aria.pricedBehind(spokenFigure, provenance.when)
            : priceCopy.aria.priced(spokenFigure, provenance.when)
        }`
      : label;

  return (
    <span
      className={`font-mono rounded-[4px] px-[5px] py-[1px] ${PLACEMENT[variant]}`}
      style={{ color: "var(--warning)", ...PLATE[variant] }}
    >
      {spoken ? (
        <>
          <span aria-hidden="true">{addPanelCopy.unowned.tag}</span>
          <span className="sr-only">{spoken}</span>
        </>
      ) : (
        addPanelCopy.unowned.tag
      )}
      {price ? (
        <Tail
          fact={price}
          state={state}
          variant={variant}
          reserveSlot={reserveSlot}
          // Hidden only where the sentence above already carries the figure.
          // `sold out` is never in that sentence, so it stays readable.
          silent={speaksPrice}
        />
      ) : null}
    </span>
  );
}
