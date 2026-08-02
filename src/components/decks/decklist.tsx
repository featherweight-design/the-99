"use client";

// Decklist — group toggle toolbar + grouped card rows.
// Owns filter/grouping render; filter and grouping come as props from BuilderShell.
// §Decklist Group Toggle, §Decklist Group, §Decklist Row (design table).

import type { DeckDetailCard } from "../../lib/decks/grouping";
import { groupByCardType, groupByRole } from "../../lib/decks/grouping";
import { GroupToggle } from "./group-toggle";
import { DecklistGroup } from "./decklist-group";

interface DecklistProps {
  deckId: string;
  cards: DeckDetailCard[];
  built: number;
  toBuyCount: number;
  filter: "all" | "shopping";
  grouping: "type" | "role";
  onFilterChange: (f: "all" | "shopping") => void;
  onGroupingChange: (g: "type" | "role") => void;
}

export function Decklist({
  deckId,
  cards,
  built,
  toBuyCount,
  filter,
  grouping,
  onFilterChange,
  onGroupingChange,
}: DecklistProps) {
  // Apply shopping filter: unowned cards only
  const visibleCards = filter === "shopping" ? cards.filter((c) => !c.owned) : cards;

  // Group the visible cards
  const groups =
    grouping === "type" ? groupByCardType(visibleCards) : groupByRole(visibleCards);

  // Flattened in render order, so Prev/Next walks the list the way the eye does — across
  // group boundaries rather than restarting inside each one.
  const orderedIds = groups.flatMap(([, groupCards]) => groupCards.map((c) => c.oracleId));

  return (
    <div className="flex flex-col">
      {/* Toggle bar */}
      <GroupToggle
        allCount={built}
        shoppingCount={toBuyCount}
        filter={filter}
        grouping={grouping}
        onFilterChange={onFilterChange}
        onGroupingChange={onGroupingChange}
      />

      {/* Grouped card rows */}
      <div className="px-[16px] py-[12px] md:px-[26px] md:py-[14px]">
        {groups.length === 0 && (
          <p
            className="font-mono text-[11px] text-center py-[20px]"
            style={{ color: "#6E6353" }}
          >
            {filter === "shopping" ? "No cards to buy." : "No cards in this deck."}
          </p>
        )}
        {groups.map(([label, groupCards]) => (
          <DecklistGroup
            key={label}
            deckId={deckId}
            label={label}
            cards={groupCards}
            siblings={orderedIds}
          />
        ))}
      </div>
    </div>
  );
}
