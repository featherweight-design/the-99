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

import { priceOf, priceState, formatCents, type PriceFact } from "../../lib/decks/price";
import { priceCopy } from "../../lib/copy/price";
import { setPageCopy } from "../../lib/copy/set-collections";
import type { Cell } from "../../lib/sets/completion";

// The cell is 116x162 on desktop and 108x151 on a phone, written as Tailwind breakpoints
// below rather than as constants here. That phone size is what puts three columns in
// 390px: three 116px cells plus two 10px gaps need 368px against a 358px content width, so
// the designed density was silently falling back to two columns.

function PriceTag({ fact, newestAsOf }: { fact: PriceFact | null; newestAsOf: Date | null }) {
  const state = priceState(fact, newestAsOf);
  const cents = fact ? priceOf(fact, state) : null;

  // `no stock` holds the slot's height rather than collapsing it, so a row of cells does
  // not go ragged where the feed has nothing.
  if (cents === null) {
    // `no stock` covers two histories and the accessible name must not merge them: a card
    // the feed has never carried was never for sale here, and a sold-out one was.
    // Three states behind one tag: never carried, carried and sold out, and carried with
    // no usable figure. `priceState` returns `absent` for the first and the third, and the
    // presence of a row is what tells them apart.
    const label = state === "soldOut"
      ? setPageCopy.cellPrice.soldOut
      : fact
        ? setPageCopy.cellPrice.noFigure
        : setPageCopy.cellPrice.neverStocked;
    return (
      <span
        className="inline-block rounded-[4px] px-[5px] py-[2px] font-mono text-[10px]"
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
      className="inline-block rounded-[4px] px-[5px] py-[2px] font-mono text-[10px]"
      style={{ color: "var(--accent)", border: "1px solid var(--accent-dim)" }}
      aria-label={qualifier ? setPageCopy.cell.qualifiedPriceAria(qualifier, money) : undefined}
    >
      {qualifier ? setPageCopy.cell.qualifiedPrice(qualifier, money) : money}
    </span>
  );
}

export function SetCell({
  cell,
  price = null,
  newestAsOf = null,
  onOpen,
}: {
  cell: Cell;
  price?: PriceFact | null;
  newestAsOf?: Date | null;
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
    // 214 cells would be a second selection mechanism and a 16px control inside a 116px
    // plate. Tapping opens the card modal, where the shipped printing picker already lives.
    <button
      type="button"
      onClick={() => onOpen?.(cell.oracleId)}
      aria-label={label}
      className="group flex w-[108px] flex-col text-left md:w-[116px]"
    >
      <span
        className="relative block h-[151px] w-[108px] overflow-hidden rounded-[6px]
                   md:h-[162px] md:w-[116px]"
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
          // eslint-disable-next-line @next/next/no-img-element -- Scryfall art is remote and unsized; next/image would need a loader per host for no gain at 116px
          <img
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
          // Rarity drops below md: the caption has room for two things, and rarity is a
          // filter you set rather than a fact you scan on a phone.
          <span className="hidden md:inline" style={{ color: "var(--fg-locked)" }}>
            · {cell.rarity.toLowerCase()}
          </span>
        ) : null}
      </span>

      {/* The name stays at full strength on a missing cell. It is the only thing in a
          dimmed cell a reader can match against memory. */}
      <span
        className="mt-[2px] block w-[108px] truncate text-[11px] md:w-[116px]"
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
