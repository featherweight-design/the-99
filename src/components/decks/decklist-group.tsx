// Decklist Group — group header + card rows grid.
// Server-pure (no "use client" directive).
// §Decklist Group (design table).

import type { DeckDetailCard } from "../../lib/decks/read";
import { DecklistRow } from "./decklist-row";

interface DecklistGroupProps {
  deckId: string;
  label: string;
  cards: DeckDetailCard[];
  /** Optional note shown right-aligned on desktop (e.g. "37 recommended"). */
  note?: string;
}

export function DecklistGroup({ deckId, label, cards, note }: DecklistGroupProps) {
  const count = cards.reduce((sum, c) => sum + c.quantity, 0);

  return (
    <div className="mb-[16px] md:mb-[20px]">
      {/* Group header row
          Mobile:  flex, items-baseline, justify-between, mb-6px — no border
          Desktop: flex, items-baseline, gap-10px, mb-8px, border-b 1px #2A241D, pb-7px */}
      <div
        className="flex items-baseline justify-between mb-[6px] md:mb-[8px] md:pb-[7px] md:border-b md:border-[#2A241D]"
      >
        {/* Left cluster: label + count */}
        <div className="flex items-baseline gap-[0px] md:gap-[10px]">
          {/* Group label: mobile IBM Plex Sans 12.5px 600 | desktop Cinzel (font-display) 15px 600 */}
          <span
            className="font-sans md:font-display font-semibold text-[12.5px] md:text-[15px]"
            style={{ color: "#EDE6D8" }}
          >
            {label}
          </span>

          {/* Group count */}
          <span
            className="font-mono text-[10px] md:text-[11px]"
            style={{ color: "#8E8269" }}
          >
            {count}
          </span>
        </div>

        {/* Group note — desktop right-aligned, margin-left auto */}
        {note && (
          <span
            className="hidden md:block font-mono text-[10.5px]"
            style={{ color: "#6E6353", marginLeft: "auto" }}
          >
            {note}
          </span>
        )}
      </div>

      {/* Card rows grid: mobile flex column gap-3px | desktop 2-col grid gap-4px-20px */}
      <div
        className="flex flex-col gap-[3px] md:grid md:gap-y-[4px] md:gap-x-[20px]"
        style={{ gridTemplateColumns: "1fr 1fr" }}
      >
        {cards.flatMap((card) => {
          const rows = [
            <DecklistRow key={card.oracleId} deckId={deckId} card={card} />,
          ];
          // Basic lands with quantity > 1: render a "+N more" meta row
          if (card.quantity > 1) {
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
