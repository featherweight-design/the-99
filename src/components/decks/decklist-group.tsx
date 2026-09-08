// Decklist Group — group header + card rows grid.
// Server-pure (no "use client" directive).
// §Decklist Group (design table).

import type { DeckDetailCard } from "../../lib/decks/grouping";
import { DeckCardTile } from "./deck-card-tile";
import type { DeckView } from "./group-toggle";
import { DecklistGroupHeader } from "./decklist-group-header";
import { DecklistRow } from "./decklist-row";

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
  /** The card in this group whose slot is spent, if any (#185). */
  spentOracleId?: string;
  /** The whole decklist in display order, for the detail modal's Prev/Next. */
  siblings?: string[];
  /** Optional note shown right-aligned on desktop (e.g. "37 recommended"). */
  note?: string;
  /** The newest `as_of` in `printing_prices`; each row's liveness comparison. */
  newestAsOf?: Date | null;
}

export function DecklistGroup({
  deckId,
  label,
  cards,
  view = "list",
  spentOracleId,
  siblings,
  note,
  newestAsOf = null,
}: DecklistGroupProps) {
  // The count does not wait for the undo: a spent slot is a receipt, not a
  // pending state, and a group that held its figure would be lying about its
  // own size.
  const count = cards.reduce(
    (sum, c) => sum + (c.oracleId === spentOracleId ? 0 : c.quantity),
    0,
  );
  // Auto tally: how many cards in this group still carry the auto flag. Spent
  // cards are excluded for the same reason as the count — the slot is already
  // gone from the player's perspective.
  const autoCount = cards.reduce(
    (sum, c) => sum + (c.oracleId !== spentOracleId && c.auto ? c.quantity : 0),
    0,
  );

  return (
    <div className="mb-[16px] md:mb-[20px]">
      <DecklistGroupHeader label={label} count={count} note={note} autoCount={autoCount} />

      {view === "card" ? (
        /* `auto-fill minmax(132px, …)` rather than a fixed 5-up: the add panel
           is 340–346px and opens over this pane, so a column count fixed to the
           closed width would either overflow or leave a gutter when it does.
           The phone stays 2-up, where a third column puts the card name below
           legibility. */
        <ul className="grid grid-cols-2 gap-[12px] md:grid-cols-[repeat(auto-fill,minmax(132px,1fr))] md:gap-[20px]">
          {cards.map((card) => (
            <DeckCardTile
              key={card.oracleId}
              deckId={deckId}
              card={card}
              spent={card.oracleId === spentOracleId}
              siblings={siblings}
            />
          ))}
        </ul>
      ) : (
        /* Card rows grid: mobile flex column gap-3px | desktop 2-col grid gap-4px-20px */
        <div
          className="flex flex-col gap-[3px] md:grid md:gap-y-[4px] md:gap-x-[20px]"
          style={{ gridTemplateColumns: "1fr 1fr" }}
        >
          {cards.map((card) => (
            <DecklistRow
              key={card.oracleId}
              deckId={deckId}
              card={card}
              spent={card.oracleId === spentOracleId}
              siblings={siblings}
              newestAsOf={newestAsOf}
            />
          ))}
        </div>
      )}
    </div>
  );
}
