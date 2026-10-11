// BuyTag — the one place the word `buy` and its colour are declared.
//
// The decklist row and the suggestion tile both mark an unowned card with it.
// Only the plate differs: the row's tag sits on a solid row, the tile's sits on
// card art, where a flat wash disappears into a bright frame.

import { useId, type ReactNode } from "react";
import { CARD_TILE_SLOT_BOX } from "../ui/card-tile-caption";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { gotItCopy } from "../../lib/copy/i-got-it";
import { priceCopy } from "../../lib/copy/price";
import {
  formatCents,
  formatPriceFigure,
  priceOf,
  priceQualifier,
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
  tile: "absolute z-10 top-[6px] text-[9px] pointer-events-none",
};

/**
 * Which top corner the tile variant takes. Two tile surfaces disagree because
 * their other corner is already spoken for: the Consider tile has no quantity
 * badge and puts the tag right, the deck card tile draws `×N` there and puts
 * the tag left, where it lines up with the availability chip it stands in for.
 */
const TILE_CORNER = { right: "right-[6px]", left: "left-[6px]" } as const;

/**
 * The reserved figure column, in px. Design table row 1.20 drew 58; the widest
 * thing that can land in the slot is `sold out` — 8 characters of IBM Plex Mono
 * at the row's 9.5px, and Plex Mono's advance is 0.6em, so 8 x 5.7 = 45.6px.
 * The remaining 12px was dead air between the word and the figure, which is the
 * whole of what the tag was too wide by. A four-figure price still bends the
 * column rather than truncating: this is a min-width.
 */
const FIGURE_SLOT = 46;

/** The figure's ink differs by plate: the row sits on a surface, the tile on art. */
const FIGURE_INK: Record<BuyTagVariant, string> = {
  row: "var(--fg-body)",
  tile: "var(--fg)",
};

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
  pending = false,
}: {
  fact: PriceFact | null;
  state: PriceState;
  variant: BuyTagVariant;
  reserveSlot: boolean | "lg";
  /** True where the tag already speaks the price in its own sentence. */
  silent: boolean;
  /**
   * I got it's write is in flight: the slot reads `adding…` in place of the figure, in the
   * slot `sold out` already sizes, so the tag keeps its width on the Shopping column (A8). Drawn
   * on a bare `buy` too, which has no slot of its own otherwise.
   */
  pending?: boolean;
}) {
  if (!pending && (state === "absent" || fact === null)) return null;

  const cents = fact && !pending ? priceOf(fact, state) : null;
  const qualifier = fact && !pending ? priceQualifier(fact, state) : null;

  return (
    <span aria-hidden={silent ? "true" : undefined}>
      {/* The separator is padding, not characters. ` · ` spelled with literal
          spaces costs three mono advances (~17px at 9.5px); the same dot with
          3px either side costs ~12px and draws identically. The word and the
          figure belong to one tag and were reading as two. */}
      <span
        aria-hidden="true"
        style={{ color: "var(--border-strong)", padding: "0 3px" }}
      >
        ·
      </span>
      {/* The slot is the Shopping list's, not the tag's own: under `All` the
          figure hugs. Right-aligned so a column of figures lines up on the
          decimal point rather than on the word before it.
          FIGURE_SLOT is what that column actually needs — see the constant. */}
      <span
        // `lg` reserves the slot from 1024px up only. Below it the Shopping row is two lines and
        // every pixel goes to the name, so the figure hugs the word (Hugh, 2026-09-26).
        className={reserveSlot === "lg" ? "lg:inline-block lg:min-w-[46px] lg:text-right" : undefined}
        style={{
          color: pending ? "var(--fg-muted)" : FIGURE_INK[variant],
          ...(reserveSlot === true
            ? { display: "inline-block", minWidth: FIGURE_SLOT, textAlign: "right" as const }
            : null),
        }}
      >
        {pending ? gotItCopy.row.pending : cents === null ? priceCopy.tag.soldOut : formatCents(cents)}
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
// text as an image. An unowned row passes no label, because there the word
// already sits in the row's own reading order and says all there is to say. A
// contested row does pass one: the plate reads `buy` on a card the player
// owns, and only the sentence says which copy is being bought.
/** The over-limit ring, from the handoff: 60% of --warning, inset, 1px. */
export const OVER_LIMIT_RING = "inset 0 0 0 1px color-mix(in oklab, var(--warning) 60%, transparent)";

/**
 * I got it (R2 call 1): the Shopping row's tag becomes the button that opens the confirm. `open`
 * holds the hover wash while the confirm is up (A7), `pending` reads `adding…` while the write is
 * in flight (A8), and `disabled` is another write for this card in flight (A9). Neither of the last
 * two accepts a press.
 */
export type BuyTagPressState = "rest" | "open" | "pending" | "disabled";

export type BuyTagPress = {
  onPress: () => void;
  state: BuyTagPressState;
  /** The card's name, for the accessible name `gotItCopy.row.tagAria` (audit errata 1). */
  cardName: string;
  /**
   * Drawn under the plate below `lg` and inside the button, so the stack is one target (finding 5:
   * `buy` over `over $X`). From `lg` the row draws `over $X` inline instead.
   */
  under?: ReactNode;
};

/**
 * Only the wash moves (R2 call 1): 13% at rest, 24% on hover or while the confirm is open, 30%
 * pressed. The same plate, word, slot and ring as the inert tag, so at rest it is main's tag.
 */
const WASH = {
  rest: "bg-[color-mix(in_oklab,var(--warning)_13%,transparent)] group-hover/buy:bg-[color-mix(in_oklab,var(--warning)_24%,transparent)] group-active/buy:bg-[color-mix(in_oklab,var(--warning)_30%,transparent)]",
  open: "bg-[color-mix(in_oklab,var(--warning)_24%,transparent)]",
  idle: "bg-[color-mix(in_oklab,var(--warning)_13%,transparent)]",
} as const;

export function BuyTag({
  variant,
  label,
  price,
  newestAsOf = null,
  provenance = null,
  reserveSlot = false,
  density = "full",
  overLimit = false,
  plate = true,
  corner = "right",
  press,
}: {
  variant: BuyTagVariant;
  label?: string;
  price?: PriceFact | null;
  /** Liveness is one comparison against the table's newest row, not a clock. */
  newestAsOf?: Date | null;
  /** Server-built; only the labelled (tile) variant speaks it. */
  provenance?: ProvenanceForm | null;
  /**
   * Shopping reserves the figure a `FIGURE_SLOT`-wide slot so the column aligns. `"lg"` reserves
   * it from 1024px up only (the class spells `FIGURE_SLOT`'s 46px, since a class cannot read it).
   */
  reserveSlot?: boolean | "lg";
  /**
   * `collapsed` draws a LIVE price's figure (with its foil/etched qualifier, where the fact
   * carries one) in the same box, ink, radius and position — the All tab is a list being
   * scanned, not a bill being read, so the word drops but the figure that distinguishes a
   * card from its neighbours does not. Only a card with no live price (sold out, or no price
   * at all) draws the bare `$` glyph. Nothing is dropped from the reading order either way:
   * the drawn content becomes the tag's accessible name unchanged, so the word and the figure
   * are still spoken in full, formatted by the one Tail that formats them everywhere.
   */
  density?: "full" | "collapsed";
  /**
   * Over the deck's Shopping limit (swap tools, ruling 4): the plate gains a --warning inset ring,
   * and nothing else about it changes. No new token.
   */
  overLimit?: boolean;
  /**
   * Tile variant only. `false` drops the scrim, the inset ring and the absolute
   * positioning, leaving the glyph in the shared caption box.
   *
   * The containment boundary for the caption's geometry: `variant="tile"` is
   * also `suggestion-tile.tsx`'s and `top-off-list.tsx`'s, neither of which this
   * design drew, so the box must not be pushed into `PLACEMENT.tile`.
   */
  plate?: boolean;
  /** Tile variant only — see TILE_CORNER. */
  corner?: keyof typeof TILE_CORNER;
  /**
   * I got it: the row tag renders as a `<button>` ONLY with this, which only Shopping passes, at
   * `density="full"`, with the feature on. Absent, the tag is the plain span it always was.
   */
  press?: BuyTagPress;
}) {
  const state = priceState(price, newestAsOf);
  const cents = price ? priceOf(price, state) : null;

  // One utterance per price. A priced tile appends the figure and its
  // provenance to the shipped ownership sentence rather than adding a second
  // one; every other state leaves that sentence exactly as it shipped.
  const speaksPrice = Boolean(label) && cents !== null && provenance !== null;
  const spokenFigure = price ? formatPriceFigure(price, state) : null;
  const spoken =
    speaksPrice && provenance && spokenFigure
      ? `${label}. ${
          provenance.behind
            ? priceCopy.aria.pricedBehind(spokenFigure, provenance.when)
            : priceCopy.aria.priced(spokenFigure, provenance.when)
        }`
      : label;

  // One word on every plate. The Shopping list used to swap in `2nd copy` on a
  // contested row; the group it sits under is headed `Spoken for` and the
  // marker beside it reads `short N`, which said the same thing twice. The
  // sentence a reader hears still says which copy this is — see `label`.
  const word = addPanelCopy.unowned.tag;

  const content = (
    <>
      {spoken ? (
        <>
          <span aria-hidden="true">{word}</span>
          <span className="sr-only">{spoken}</span>
        </>
      ) : (
        word
      )}
      {price || press?.state === "pending" ? (
        <Tail
          fact={price ?? null}
          state={state}
          variant={variant}
          reserveSlot={reserveSlot}
          // Hidden only where the sentence above already carries the figure.
          // `sold out` is never in that sentence, so it stays readable.
          silent={speaksPrice}
          pending={press?.state === "pending"}
        />
      ) : null}
    </>
  );

  // The caption draws its own plate, so the tag drops its scrim and takes the
  // box the availability chip and the proxy mark also take there.
  const captionBox = variant === "tile" && !plate;

  if (press && variant === "row" && density === "full") {
    return <PressableTag press={press} overLimit={overLimit}>{content}</PressableTag>;
  }

  return (
    <span
      className={`${
        captionBox
          ? CARD_TILE_SLOT_BOX
          : `font-mono rounded-[4px] px-[5px] py-[1px] ${PLACEMENT[variant]} ${
              variant === "tile" ? TILE_CORNER[corner] : ""
            }`
      }`}
      style={{
        color: "var(--warning)",
        ...(captionBox ? {} : PLATE[variant]),
        ...(overLimit ? { boxShadow: OVER_LIMIT_RING } : {}),
      }}
    >
      {density === "collapsed" ? (
        <>
          {/* A LIVE price draws its figure here — the collapsed slot's whole point is to fit
              in the tile's caption line, and a bare `$` beside a real price is visually
              identical to a sold-out or unpriced card (c5 against c6). `spokenFigure`, not a
              raw `formatCents(cents)`: a foil-only or etched-only fact's bare amount implies a
              normal-printing price, which `price.ts` guards against by folding the qualifier
              into the figure (Copilot round 4, medium). Only the no-live-price branch keeps the
              glyph, which stands for the word rather than saying it, so it is drawn and never
              spoken. */}
          {spokenFigure !== null ? (
            <span aria-hidden="true">{spokenFigure}</span>
          ) : (
            <span aria-hidden="true">$</span>
          )}
          <span className="sr-only">{content}</span>
        </>
      ) : (
        content
      )}
    </span>
  );
}

/**
 * The row tag as I got it's button. Its own component so the ids it mints are only asked for where
 * a Shopping row draws it: the inert tag is also drawn by server-rendered figures.
 */
function PressableTag({ press, overLimit, children }: { press: BuyTagPress; overLimit: boolean; children: ReactNode }) {
  const descriptionId = useId();
  const underId = useId();
  const { state: pressState, onPress, cardName, under } = press;
  const live = pressState === "rest" || pressState === "open";
  return (
    // The button is the stack: below `lg` an invisible 44px box centred on it is the hit area,
    // whatever the stack's own height (a plain plate is about 16px, one with `over $X` about 32px),
    // and it moves nothing on the row. From `lg` the button is the plate alone.
    <button
      type="button"
      aria-label={gotItCopy.row.tagAria(cardName)}
      // The tag's shipped sentence (and `over $X`, which the name now hides) is the description.
      aria-describedby={under ? `${descriptionId} ${underId}` : descriptionId}
      aria-haspopup="dialog"
      aria-expanded={pressState === "open" || pressState === "pending"}
      aria-busy={pressState === "pending" || undefined}
      // Not the native attribute: a disabled button drops focus to the body, and pending is drawn
      // while focus is in the confirm. Neither pending nor disabled accepts a press.
      aria-disabled={!live || undefined}
      onClick={(e) => {
        // The row opens the card's details on a press; this press is the tag's own.
        e.stopPropagation();
        if (pressState === "rest") onPress();
      }}
      // The ring is the plate's, not the button's: below lg the button is the whole 44px stack.
      className={`group/buy relative flex flex-none flex-col items-end gap-[2px] border-0 bg-transparent p-0 font-[inherit] focus-visible:outline-none before:absolute before:inset-x-0 before:top-1/2 before:h-[44px] before:-translate-y-1/2 before:content-[''] lg:before:hidden ${
        live ? "cursor-pointer" : "cursor-default"
      }`}
    >
      <span
        id={descriptionId}
        className={`font-mono rounded-[4px] px-[5px] py-[1px] ${PLACEMENT.row} group-focus-visible/buy:outline-2 group-focus-visible/buy:outline-offset-2 group-focus-visible/buy:[outline-style:solid] group-focus-visible/buy:outline-[color:var(--accent)] ${
          pressState === "rest" ? WASH.rest : pressState === "open" ? WASH.open : WASH.idle
        }`}
        style={{
          color: "var(--warning)",
          ...(overLimit ? { boxShadow: OVER_LIMIT_RING } : {}),
          ...(pressState === "disabled" ? { opacity: 0.45 } : pressState === "pending" ? { opacity: 0.75 } : {}),
        }}
      >
        {children}
      </span>
      {under ? (
        <span id={underId} className="block lg:hidden font-mono text-[10px] leading-none whitespace-nowrap" style={{ color: "var(--warning)" }}>
          {under}
        </span>
      ) : null}
    </button>
  );
}
