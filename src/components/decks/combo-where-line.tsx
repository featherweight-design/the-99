"use client";

// Where a combo's piece is for the reader: one decision, drawn by the deck page's list of combos one
// piece away (UI-1, its rows), the combo pushed inside it (UI-2, its plates) and card details' combo
// lines (UI-3), so the three cannot drift. Extracted from `combos-close-sheet.tsx`.

import Link from "next/link";

import type { CardComboWhere } from "../../lib/combos/near-combos";
import { combosCloseCopy } from "../../lib/copy/combos-close";
import { priceCopy } from "../../lib/copy/price";
import { formatCents } from "../../lib/decks/price";

const copy = combosCloseCopy.sheet;
const detailCopy = combosCloseCopy.detail;

/** A green dot for a card the reader owns; a hollow dashed ring for one to buy. */
export function Dot({ owned }: { owned: boolean }) {
  return owned ? (
    <span aria-hidden data-dot="owned" className="inline-block size-[8px] flex-none rounded-full bg-[color:var(--success)]" />
  ) : (
    <span aria-hidden data-dot="buy" className="inline-block size-[8px] flex-none rounded-full [border:1.5px_dashed_var(--fg-locked)]" />
  );
}

/**
 * Where the piece is: a line's where-line (`on="row"`), and the same decision under a combo's plate
 * (`on="plate"`). The plate is itself a press (it opens the card), so there the other deck's name is
 * words, not a link, and a spare is the plate's one word (`How-It-Works.dc.html`). `inDeck` is a piece
 * the deck in scope lists (card details, `Card-Details.dc.html` `.ok`), the same words on both.
 */
export function MissingPieceWhereLine({ where, on }: { where: CardComboWhere; on: "row" | "plate" }) {
  if (where.kind === "inDeck") {
    return (
      <>
        <Dot owned />
        <span className="text-[color:var(--success)]">{detailCopy.plate.inThisDeck}</span>
      </>
    );
  }
  if (where.kind === "spare") {
    return (
      <>
        <Dot owned />
        <span>{on === "row" ? copy.where.spare : detailCopy.plate.spare}</span>
      </>
    );
  }
  if (where.kind === "elsewhere") {
    // The decks arrive committed first (`holdingDecks`), so the first is the first committed one (G4).
    const [deck, ...rest] = where.decks;
    return (
      <>
        <Dot owned />
        {deck ? (
          // Shrinkable, and a long deck name (up to 120 characters) wraps inside the column rather
          // than painting over the next one; the +N stays after the name.
          <span className="min-w-0 [overflow-wrap:anywhere]">
            {copy.where.inDeck}{" "}
            {on === "plate" ? (
              // The combo's detail lists every deck holding a copy (G4); the row names the first.
              where.decks.map((d) => d.name).join(", ")
            ) : (
            // `.dlk`: card details' In your decks link, its hit reaching 44px tall past the 14px line.
            <Link
              href={`/decks/${deck.id}`}
              aria-label={copy.where.deckLinkAria(deck.name)}
              className="inline -my-[15px] py-[15px] leading-[14px] [overflow-wrap:anywhere] [box-decoration-break:clone] text-[color:var(--fg-body)] underline underline-offset-2 decoration-[color:var(--border-strong)] hover:decoration-current transition-colors"
            >
              {deck.name}
            </Link>
            )}
            {on === "row" && rest.length > 0 ? (
              <>{" "}<span className="text-[color:var(--fg-faint)]">{copy.where.more(rest.length)}</span></>
            ) : null}
          </span>
        ) : (
          <span>{copy.where.inAnotherDeck}</span>
        )}
      </>
    );
  }
  return (
    <>
      <Dot owned={false} />
      {where.cents !== null ? (
        // `.btag`: the buy tag's ink and figure (`formatCents`, as the shipped tag formats it).
        <span className="rounded-[4px] px-[5px] font-mono text-[10px] leading-[15px] text-[color:var(--warning)] [border:1px_solid_var(--accent-shadow)]">
          {formatCents(where.cents)}
          {where.qualifier ? ` ${where.qualifier}` : null}
        </span>
      ) : where.soldOut ? (
        // The buy tag's own word, for a card stocked before and not now. A card the feed has never
        // stocked gets nothing, as the buy tag leaves it (`priceCopy`: silence is a state).
        <span className="text-[color:var(--fg-muted)]">{priceCopy.tag.soldOut}</span>
      ) : null}
    </>
  );
}
