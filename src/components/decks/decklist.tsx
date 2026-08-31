"use client";

// Decklist — group toggle toolbar + grouped card rows.
// Owns filter/grouping render; filter and grouping come as props from BuilderShell.
// §Decklist Group Toggle, §Decklist Group, §Decklist Row (design table).

import type { DeckDetailCard, DeckUnresolvedRow } from "../../lib/decks/grouping";
import { groupByCardType, groupByRole } from "../../lib/decks/grouping";
import { GroupToggle } from "./group-toggle";
import { DecklistGroup } from "./decklist-group";
import { UnresolvedGroup } from "./unresolved-group";

interface DecklistProps {
  deckId: string;
  cards: DeckDetailCard[];
  unresolvedRows: DeckUnresolvedRow[];
  /** Resolving a line to the commander must not also put it in the 99. */
  commanderOracleId: string;
  /** The committed claim set — see UnresolvedGroup. */
  deckOracleIds: string[];
  built: number;
  toBuyCount: number;
  /** The card whose slot is spent, drawn in place as an undo row (#185). */
  spentSlot?: DeckDetailCard | null;
  filter: "all" | "shopping";
  grouping: "type" | "role";
  onFilterChange: (f: "all" | "shopping") => void;
  onGroupingChange: (g: "type" | "role") => void;
  /** The phone unmounts the quick-add bar while a resolution expander is open. */
  onUnresolvedExpandedChange?: (expanded: boolean) => void;
}

export function Decklist({
  deckId,
  cards,
  unresolvedRows,
  commanderOracleId,
  deckOracleIds,
  built,
  toBuyCount,
  spentSlot = null,
  filter,
  grouping,
  onFilterChange,
  onGroupingChange,
  onUnresolvedExpandedChange,
}: DecklistProps) {
  // Apply shopping filter: unowned cards only
  const visibleCards = filter === "shopping" ? cards.filter((c) => !c.owned) : cards;

  // Shopping hides the unresolved group outright. The rows are outside
  // toBuyCount by definition, so listing them here would offer the player
  // something they cannot go and buy.
  const visibleUnresolved = filter === "shopping" ? [] : unresolvedRows;

  // The spent card is out of the deck's counts already, so it is grouped
  // alongside the live ones only to be marked — which is what puts the undo row
  // where the card's own row was rather than at the end of the list. Any other
  // path that puts the card back — quick-add, a suggestion tile — returns it to
  // `cards` optimistically, and the slot steps aside for the live row.
  const spentCard =
    spentSlot &&
    !cards.some((c) => c.oracleId === spentSlot.oracleId) &&
    (filter === "all" || !spentSlot.owned)
      ? spentSlot
      : null;
  const listedCards = spentCard ? [...visibleCards, spentCard] : visibleCards;

  // Group the visible cards
  const groups =
    grouping === "type" ? groupByCardType(listedCards) : groupByRole(listedCards);

  // Flattened in render order, so Prev/Next walks the list the way the eye does — across
  // group boundaries rather than restarting inside each one.
  const orderedIds = groups
    .flatMap(([, groupCards]) => groupCards.map((c) => c.oracleId))
    .filter((id) => id !== spentCard?.oracleId);

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
        {groups.length === 0 && visibleUnresolved.length === 0 && (
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
            spentOracleId={spentCard?.oracleId}
            siblings={orderedIds}
          />
        ))}

        {/* Pinned last, after every type or role group. */}
        <UnresolvedGroup
          deckId={deckId}
          rows={visibleUnresolved}
          cards={cards}
          deckOracleIds={deckOracleIds}
          commanderOracleId={commanderOracleId}
          onExpandedChange={onUnresolvedExpandedChange}
        />
      </div>
    </div>
  );
}
