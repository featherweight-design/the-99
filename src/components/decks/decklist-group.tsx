// Decklist Group — group header + card rows grid.
// Server-pure (no "use client" directive).
// §Decklist Group (design table).

import type { DeckDetailCard } from "../../lib/decks/grouping";
import { shouldShowMetaRow } from "../../lib/decks/grouping";
import { DecklistGroupHeader } from "./decklist-group-header";
import { DecklistRow } from "./decklist-row";

interface DecklistGroupProps {
  deckId: string;
  label: string;
  cards: DeckDetailCard[];
  /** The whole decklist in display order, for the detail modal's Prev/Next. */
  siblings?: string[];
  /** Optional note shown right-aligned on desktop (e.g. "37 recommended"). */
  note?: string;
}

export function DecklistGroup({ deckId, label, cards, siblings, note }: DecklistGroupProps) {
  const count = cards.reduce((sum, c) => sum + c.quantity, 0);

  return (
    <div className="mb-[16px] md:mb-[20px]">
      <DecklistGroupHeader label={label} count={count} note={note} />

      {/* Card rows grid: mobile flex column gap-3px | desktop 2-col grid gap-4px-20px */}
      <div
        className="flex flex-col gap-[3px] md:grid md:gap-y-[4px] md:gap-x-[20px]"
        style={{ gridTemplateColumns: "1fr 1fr" }}
      >
        {cards.flatMap((card) => {
          const rows = [
            <DecklistRow key={card.oracleId} deckId={deckId} card={card} siblings={siblings} />,
          ];
          // Basic lands with quantity > 1: render a "+N more" meta row
          if (shouldShowMetaRow(card)) {
            rows.push(
              <DecklistRow
                key={`${card.oracleId}-meta`}
                deckId={deckId}
                card={card}
                isMeta
                metaLabel={`+${card.quantity - 1} more`}
              />,
            );
          }
          return rows;
        })}
      </div>
    </div>
  );
}
