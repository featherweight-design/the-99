// Decklist Group — group header + card rows grid.
// Server-pure (no "use client" directive).
// §Decklist Group (design table).

import type { ReactNode } from "react";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { DeckCardTile } from "./deck-card-tile";
import { ReadOnlyCardTile } from "./read-only-card-tile";
import type { DeckView } from "./group-toggle";
import { DecklistGroupHeader } from "./decklist-group-header";
import { DecklistRow } from "./decklist-row";
import type { Sibling } from "../cards/card-detail-provider";

/** Module-scoped so an unspecified `spentOracleIds` doesn't allocate a fresh `Set` every render. */
const EMPTY_SPENT_IDS: ReadonlySet<string> = new Set();

interface DecklistGroupProps {
  deckId: string;
  label: string;
  cards: DeckDetailCard[];
  /**
   * Which shell the cards take. The view changes the unit, never the grouping:
   * the same groups in the same order under the same headers, so the well is a
   * way of reading the list rather than a second list.
   */
  view?: DeckView;
  /** The cards in this group whose slots are spent (#185; H29 lets several stand at once). */
  spentOracleIds?: ReadonlySet<string>;
  /** The whole decklist in display order, for the detail modal's Prev/Next. */
  siblings?: readonly Sibling[];
  /** Optional note shown right-aligned on desktop (e.g. "37 recommended"). */
  note?: string;
  /** Passed straight to the header — the draft note is brass, others quiet. */
  noteColor?: string;
  /**
   * The newest `as_of` in the price table, for measuring a row's liveness.
   *
   * REQUIRED, with no default. A component that does not receive it reads every
   * live price as `absent` and draws a bare `buy` with no figure — a wrong price
   * rather than a missing prop, and silent. That shipped once: the commander
   * page threaded it to one of two synergy panels and every desktop row lost its
   * figure, while the phone was correct and every component test passed.
   *
   * Pass `null` explicitly where there is no price feed to measure against. The
   * point is that the caller states it.
   */
  newestAsOf: Date | null;
  /** Every row read-only (a precon's list): see `DecklistRow`'s `readOnly`. In card view, every
   *  tile is `ReadOnlyCardTile`, which calls no deck hook. */
  readOnly?: boolean;
  /** Drawn under the rows, inside the group's own spacing (a precon's basic lands line). */
  footer?: ReactNode;
  /** Copies the footer lists and the count includes (that line's basics). */
  footerCount?: number;
  /** Card view only: tiles drawn at the end of the group's own grid, after its cards (a precon's
   *  basic lands, one tile per name, at the foot of Lands). */
  cardTail?: ReactNode;
}

export function DecklistGroup({
  deckId,
  label,
  cards,
  view = "list",
  spentOracleIds = EMPTY_SPENT_IDS,
  siblings,
  note,
  noteColor,
  newestAsOf,
  readOnly = false,
  footer = null,
  footerCount = 0,
  cardTail = null,
}: DecklistGroupProps) {
  // The count does not wait for the undo: a spent slot is a receipt, not a
  // pending state, and a group that held its figure would be lying about its
  // own size. Every standing receipt in this group is excluded, not just one.
  const count = cards.reduce(
    (sum, c) => sum + (spentOracleIds.has(c.oracleId) ? 0 : c.quantity),
    footerCount,
  );
  // Auto tally: how many cards in this group still carry the auto flag. Spent
  // cards are excluded for the same reason as the count — each spent slot is
  // already gone from the player's perspective.
  const autoCount = cards.reduce(
    (sum, c) => sum + (!spentOracleIds.has(c.oracleId) && c.auto ? c.quantity : 0),
    0,
  );

  return (
    <div className="mb-[16px] md:mb-[20px]">
      <DecklistGroupHeader
        label={label}
        count={count}
        note={note}
        noteColor={noteColor}
        autoCount={autoCount}
      />

      {view === "card" ? (
        /* The SAME declaration `/collection`'s grid takes: one tile floor, and
           the column count falls out of whatever width the pane has. Six at the
           1300px reference width, where this pane's ancestor pays `md:px-[26px]`
           and leaves 1186px — six tracks of 181px.

           The floor used to be 132px, and the stated reason was that a 340–346px
           Add panel opened over this pane, so a fixed count would overflow or
           gutter the moment it did. That panel is gone: `BuilderShell` renders
           `QuickAddBar` as a full-width sticky bottom dock. The grid still wants
           `auto-fill`, for the ordinary reason — a floor is what holds a tile
           size across widths — but not for that one.

           The phone stays an explicit 2-up. At 390px the track is narrower than
           one floor plus a gap, so auto-fill there collapses to a single column,
           and a third column puts the card name below legibility anyway. */
        <ul className="grid grid-cols-2 gap-[12px] md:grid-cols-[repeat(auto-fill,minmax(178px,1fr))] md:gap-[20px]">
          {cards.map((card) => readOnly ? (
            <ReadOnlyCardTile key={card.oracleId} card={card} siblings={siblings} />
          ) : (
            <DeckCardTile
              key={card.oracleId}
              deckId={deckId}
              card={card}
              spent={spentOracleIds.has(card.oracleId)}
              siblings={siblings}
            />
          ))}
          {cardTail}
        </ul>
      ) : (
        /* Card rows grid: mobile flex column gap-3px | desktop 2-col grid gap-4px-20px */
        <div
          className="flex flex-col gap-[3px] md:grid md:gap-y-[4px] md:gap-x-[20px]"
          // `minmax(0, 1fr)`, never a bare `1fr`: a bare track never shrinks below its widest row's
          // min-content, so one row with a long run of fixed pieces pushed the page sideways.
          style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}
        >
          {cards.map((card) => (
            <DecklistRow
              key={card.oracleId}
              deckId={deckId}
              card={card}
              spent={spentOracleIds.has(card.oracleId)}
              siblings={siblings}
              newestAsOf={newestAsOf}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
      {footer}
    </div>
  );
}
