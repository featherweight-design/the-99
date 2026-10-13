"use client";

// One cell of the set grid.
//
// THE DIM IS ON THE ART, NEVER ON THE TYPE. That is the whole separation from "disabled":
// a disabled control in this app dims its label and stops responding, while a missing cell
// keeps its name at --fg-body, carries a live price, and opens the same modal an owned cell
// does. It is absent, not inert.
//
// Missing is carried by three signals in three channels, because a state carried by one
// fails somebody: tone (the art at .28), structure (a dashed edge) and content (a price
// tag an owned cell does not have).
//
// The dashed edge takes --fg-locked and NOT --border-dashed. Measured against
// --surface-sunken, --border-dashed runs 1.46:1 (Oil Haze) to 1.97:1 (Canopy) and fails
// the 3:1 non-text floor in all six themes; --fg-locked clears at 3.16 to 3.44:1. The
// general rule is worth keeping: a dashed line that carries state takes a foreground
// token, not a border token.
//
// Owned and missing geometry is IDENTICAL, so the grid never reflows when a filter flips.

import { formatCents, priceOf, priceState, type PriceFact } from "../../lib/decks/price";
import { priceCopy } from "../../lib/copy/price";
import { setPageCopy } from "../../lib/copy/set-collections";
import { PriceTag } from "../cards/price-tag";
import type { Cell } from "../../lib/sets/completion";
import { FadingImg } from "../ui/hydrated-art";

// The cell carries NO width or height literal, at any width (addendum R2 §27). The grid
// track sets the width and `aspect-ratio: 63/88` sets the height, which makes the
// identical-geometry constraint the grid depends on true by construction rather than by two
// pairs of breakpointed literals somebody has to keep in step. It also means the one grid
// declaration is the whole density: change the track minimum and every cell follows.

export function SetCell({
  cell,
  price = null,
  newestAsOf,
  onOpen,
}: {
  cell: Cell;
  price?: PriceFact | null;
  /**
   * The newest `as_of` in the price table, for measuring a row's liveness.
   *
   * REQUIRED, with no default. A component that does not receive it reads every
   * live price as `absent`, and here that draws `no stock` — this cell's tag is
   * `PriceTag`, not `BuyTag`, so the failure reads as a printing nobody carries
   * rather than as a missing figure. Wrong in a more convincing way than a blank
   * would be, and just as silent. The same omission shipped once elsewhere: the
   * commander page threaded this to one of two synergy panels, every desktop row
   * lost its figure, the phone was correct, and every component test passed.
   *
   * Pass `null` explicitly where there is no price feed to measure against. The
   * point is that the caller states it.
   */
  newestAsOf: Date | null;
  onOpen?: (oracleId: string) => void;
}) {
  const num = cell.collectorNumber;
  // An explicit aria-label on the button REPLACES everything its descendants would have
  // contributed, so the price tag's own labels — sold out, never stocked, foil only — and
  // the two marks were announced to nobody. They are built into the name instead.
  const state = priceState(price, newestAsOf);
  const cents = price ? priceOf(price, state) : null;
  const money = cents === null ? undefined : formatCents(cents);
  const qualifiers = [
    cell.owned && cell.foilOnly ? setPageCopy.cell.foilAria : null,
    cell.owned && cell.byName ? setPageCopy.unpinned.aria(cell.name) : null,
    !cell.owned && state === "soldOut" ? setPageCopy.cellPrice.soldOut : null,
    !cell.owned && state === "absent"
      ? (price ? setPageCopy.cellPrice.noFigure : setPageCopy.cellPrice.neverStocked)
      : null,
    // `priceState` calls etched-only availability `foilOnly` too, and the visible tag says
    // so; the name must not omit what the tag shows.
    !cell.owned && cents !== null && state === "foilOnly"
      ? setPageCopy.cell.qualifiedPriceAria(
          price?.foilCents !== null && price?.foilCents !== undefined
            ? priceCopy.tag.foil
            : priceCopy.tag.etched,
          money as string,
        )
      : null,
  ].filter(Boolean) as string[];
  // The base name carries the amount, and the foil/etched qualifier carries it again —
  // "$5.00 … Available in foil only, $5.00". The qualifier says both, so the base drops it.
  const foilQualified = !cell.owned && cents !== null && state === "foilOnly";
  const label = [
    setPageCopy.cell.aria(cell.name, num, cell.owned, foilQualified ? undefined : money),
    ...qualifiers,
  ].join(". ");

  return (
    // The cell is the only target. No control sits inside it at any width — a checkbox on
    // 214 cells would be a second selection mechanism and a 16px control inside a ~150px
    // plate. Tapping opens the card modal, where the shipped printing picker already lives.
    <button
      type="button"
      onClick={() => onOpen?.(cell.oracleId)}
      aria-label={label}
      className="group flex w-full min-w-0 flex-col text-left"
    >
      <span
        className="relative block aspect-[63/88] w-full overflow-hidden rounded-[6px]"
        style={{
          background: "var(--surface-sunken)",
          // Identical geometry either way: only the border STYLE and colour differ, so a
          // filter flip never moves a cell.
          border: cell.owned
            ? "1px solid var(--border)"
            : "1px dashed var(--fg-locked)",
        }}
      >
        {cell.imageUriSmall ? (
          <FadingImg
            src={cell.imageUriSmall}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
            style={cell.owned
              ? { opacity: 1 }
              : { opacity: 0.28, filter: "saturate(.55)" }}
          />
        ) : null}

        {/* ◆ FOIL, and only when the holding really is foil-only. */}
        {cell.owned && cell.foilOnly ? (
          <span
            className="absolute right-[4px] bottom-[4px] rounded-[3px] px-[3px] py-[1px]
                       font-mono text-[9px]"
            style={{ background: "rgb(0 0 0 / 0.68)", color: "var(--fg-body)" }}
            aria-hidden
          >
            {setPageCopy.cell.foil}
          </span>
        ) : null}

        {/* The unset half of printing_picker's filled `Your pick` diamond. It can only
            land on a FILLED cell — a missing one was never matched to anything — so the
            three carriers of "missing" are untouched and this occupies an empty channel. */}
        {cell.owned && cell.byName ? (
          <span
            className="absolute left-[4px] bottom-[4px] flex items-center gap-[3px]
                       rounded-[3px] px-[3px] py-[1px] font-mono text-[9px]"
            style={{ background: "rgb(0 0 0 / 0.68)", color: "var(--fg-body)" }}
            aria-hidden
          >
            <span
              className="inline-block rotate-45"
              style={{ width: 7, height: 7, border: "1px solid var(--accent)" }}
            />
            {setPageCopy.unpinned.mark}
          </span>
        ) : null}
      </span>

      <span className="mt-[6px] flex items-baseline gap-[5px] font-mono text-[10px]">
        <span style={{ color: cell.owned ? "var(--fg-muted)" : "var(--fg-body)" }}>{num}</span>
        {cell.rarity ? (
          // One caption format at every width (addendum R2 §27). The phone cell is ~114px
          // since it took `/collection`'s 3-up tracks, and `326 · mythic` still fits in it.
          <span style={{ color: "var(--fg-locked)" }}>
            · {cell.rarity.toLowerCase()}
          </span>
        ) : null}
      </span>

      {/* The name stays at full strength on a missing cell. It is the only thing in a
          dimmed cell a reader can match against memory. */}
      <span
        className="mt-[2px] block w-full truncate text-[11px]"
        style={{ color: "var(--fg-body)" }}
      >
        {cell.name}
      </span>

      {/* Content is the third carrier: a price tag is a thing only a missing cell has. */}
      {cell.owned ? null : (
        <span className="mt-[4px] block">
          <PriceTag fact={price} newestAsOf={newestAsOf} />
        </span>
      )}
    </button>
  );
}
