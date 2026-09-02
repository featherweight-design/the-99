"use client";

// Decklist — group toggle toolbar + grouped card rows.
// Owns filter/grouping render; filter and grouping come as props from BuilderShell.
// §Decklist Group Toggle, §Decklist Group, §Decklist Row (design table).

import type { DeckDetailCard, DeckUnresolvedRow } from "../../lib/decks/grouping";
import { groupByCardType, groupByRole, isBasicLand } from "../../lib/decks/grouping";
import { computeRoleCounts } from "../../lib/decks/mix";
import { ROLE_TARGETS } from "../../lib/recs/roles";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import { GroupToggle } from "./group-toggle";
import { DecklistGroup } from "./decklist-group";
import { DecklistGroupHeader } from "./decklist-group-header";
import { DecklistRow } from "./decklist-row";
import { UnresolvedGroup } from "./unresolved-group";
import { SweepReceipt } from "./clear-auto";
import type { SweptRow } from "../../app/decks/actions";

// Role order for Shopping groups — matches ROLE_TARGETS keys.
const SHOPPING_ROLE_ORDER: Array<"ramp" | "draw" | "removal" | "wipes"> = [
  "ramp", "draw", "removal", "wipes",
];

// Display labels for shopping groups. Mirrors the shelf labels.
const SHOPPING_ROLE_LABELS: Record<"ramp" | "draw" | "removal" | "wipes", string> = {
  ramp: "Ramp",
  draw: "Draw",
  removal: "Removal",
  wipes: "Wipes",
};

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
  /** Number of untouched auto cards — passed to the group toolbar. */
  autoCount?: number;
  /** Number of auto cards the player has kept (auto=false). */
  keptCount?: number;
  /** Whether a sweep is in-flight. */
  sweepPending?: boolean;
  /** The swept rows held for Undo. Null = no pending undo. */
  sweptRows?: SweptRow[] | null;
  /** Error string from a failed sweep. */
  sweepError?: string | null;
  onClearAuto?: () => void;
  onRestoreAuto?: () => void;
  /**
   * EDHREC inclusion % for each unowned card in the deck, keyed by oracleId.
   * Cards with no figure are absent from the map — never stored as 0.
   * Threaded from getDeckSuggestions via BuilderShell.
   */
  shoppingFigures?: Record<string, number>;
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
  autoCount = 0,
  keptCount = 0,
  sweepPending = false,
  sweptRows = null,
  sweepError = null,
  onClearAuto,
  onRestoreAuto,
  shoppingFigures = {},
}: DecklistProps) {
  // Apply shopping filter: unowned cards only, excluding basic lands.
  // Basics are never in Shopping — the fill never buys them, and asserting it
  // here means a future change to the fill fails this filter loudly.
  const shoppingCards = cards.filter((c) => !c.owned && !isBasicLand(c.typeLine));
  const visibleCards = filter === "shopping" ? shoppingCards : cards;

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

  // Shopping view: role-grouped with gap clauses, intro, and footer.
  if (filter === "shopping") {
    // Role counts from ALL cards (owned + unowned) — this is the "from" value.
    const roleCounts = computeRoleCounts(cards);

    // Build shopping groups: only roles that have ROLE_TARGETS (no land or other).
    const shoppingGroups = SHOPPING_ROLE_ORDER.flatMap((role) => {
      const roleCards = shoppingCards.filter((c) => c.role === role);
      if (roleCards.length === 0) return [];
      const from = roleCounts[role];
      const to = ROLE_TARGETS[role];
      const gapClause = recommendationsCopy.shopping.groupGap(
        String(roleCards.length),
        String(from),
        String(to),
      );
      return [{ role, label: SHOPPING_ROLE_LABELS[role], cards: roleCards, gapClause }];
    });

    // Also include unowned cards in roles without ROLE_TARGETS ("other", "land").
    // land is excluded (basic lands are filtered). "other" is included if it has unowned.
    const otherShoppingCards = shoppingCards.filter(
      (c) => !SHOPPING_ROLE_ORDER.includes(c.role as "ramp" | "draw" | "removal" | "wipes"),
    );

    const n = shoppingCards.length;
    const autoN = shoppingCards.filter((c) => c.auto).length;
    const allAuto = autoN === n;

    // The open slots the player kept for themselves (not filled by auto).
    const openSlots = 99 - built;

    // Empty covered: nothing in the shopping list.
    if (n === 0) {
      return (
        <div className="flex flex-col">
          <GroupToggle
            allCount={built}
            shoppingCount={toBuyCount}
            filter={filter}
            grouping={grouping}
            onFilterChange={onFilterChange}
            onGroupingChange={onGroupingChange}
            autoCount={autoCount}
            keptCount={keptCount}
            sweepPending={sweepPending}
            onClearAuto={onClearAuto}
          />
          <div className="px-[16px] py-[12px] md:px-[26px] md:py-[14px]">
            <p
              className="font-mono text-[12px] font-semibold mb-[6px]"
              style={{ color: "var(--brass)" }}
            >
              {recommendationsCopy.shopping.emptyCoveredHeading}
            </p>
            <p
              className="font-mono text-[11px] leading-[1.6]"
              style={{ color: "var(--fg-faint)" }}
            >
              {recommendationsCopy.shopping.emptyCoveredBody(String(openSlots))}
            </p>
          </div>
        </div>
      );
    }

    // The ordered ids for the Shopping view (for Prev/Next in the card detail modal).
    const shoppingOrderedIds = shoppingCards.map((c) => c.oracleId);

    return (
      <div className="flex flex-col">
        <GroupToggle
          allCount={built}
          shoppingCount={toBuyCount}
          filter={filter}
          grouping={grouping}
          onFilterChange={onFilterChange}
          onGroupingChange={onGroupingChange}
          autoCount={autoCount}
          keptCount={keptCount}
          sweepPending={sweepPending}
          onClearAuto={onClearAuto}
        />

        <div className="px-[16px] py-[12px] md:px-[26px] md:py-[14px]">
          {/* Sweep error */}
          {sweepError && (
            <p
              role="alert"
              className="font-mono text-[11px] mb-[10px] text-fg-locked"
            >
              {sweepError}
            </p>
          )}
          {/* Sweep receipt */}
          {sweptRows && sweptRows.length > 0 && onRestoreAuto && (
            <SweepReceipt
              removed={sweptRows.length}
              onUndo={onRestoreAuto}
            />
          )}

          {/* Intro line */}
          <p
            className="font-mono text-[10.5px] leading-[1.6] mb-[14px]"
            style={{ color: "var(--fg-faint)" }}
          >
            {recommendationsCopy.shopping.intro(String(n))}
          </p>

          {/* Role groups */}
          {shoppingGroups.map(({ role, label, cards: groupCards, gapClause }) => (
            <div key={role} className="mb-[16px] md:mb-[20px]">
              <DecklistGroupHeader label={label} count={groupCards.length} gapClause={gapClause} />
              <div
                className="flex flex-col gap-[3px] md:grid md:gap-y-[4px] md:gap-x-[20px]"
                style={{ gridTemplateColumns: "1fr 1fr" }}
              >
                {groupCards.map((card) => {
                  const figureRaw = shoppingFigures[card.oracleId];
                  // null = in Shopping but no figure; number = in Shopping with figure.
                  const shoppingFigure = Number.isFinite(figureRaw) ? figureRaw : null;
                  return (
                    <DecklistRow
                      key={card.oracleId}
                      deckId={deckId}
                      card={card}
                      siblings={shoppingOrderedIds}
                      shoppingFigure={shoppingFigure}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {/* Other/non-targeted roles (e.g. "other") */}
          {otherShoppingCards.length > 0 && (
            <div className="mb-[16px] md:mb-[20px]">
              <DecklistGroupHeader label="Other" count={otherShoppingCards.length} />
              <div
                className="flex flex-col gap-[3px] md:grid md:gap-y-[4px] md:gap-x-[20px]"
                style={{ gridTemplateColumns: "1fr 1fr" }}
              >
                {otherShoppingCards.map((card) => {
                  const figureRaw = shoppingFigures[card.oracleId];
                  const shoppingFigure = Number.isFinite(figureRaw) ? figureRaw : null;
                  return (
                    <DecklistRow
                      key={card.oracleId}
                      deckId={deckId}
                      card={card}
                      siblings={shoppingOrderedIds}
                      shoppingFigure={shoppingFigure}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer — above a 1px --border rule */}
          <div
            className="pt-[10px] mt-[4px] font-mono text-[10.5px]"
            style={{ color: "var(--fg-faint)", borderTop: "1px solid var(--border)" }}
          >
            {allAuto
              ? recommendationsCopy.shopping.footer(String(n), String(autoN))
              : recommendationsCopy.shopping.footerMixed(String(n), String(autoN))}
          </div>
        </div>
      </div>
    );
  }

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
        autoCount={autoCount}
        keptCount={keptCount}
        sweepPending={sweepPending}
        onClearAuto={onClearAuto}
      />

      {/* Grouped card rows */}
      <div className="px-[16px] py-[12px] md:px-[26px] md:py-[14px]">
        {/* Sweep error — a failed sweep, deck unchanged. */}
        {sweepError && (
          <p
            role="alert"
            className="font-mono text-[11px] mb-[10px] text-fg-locked"
          >
            {sweepError}
          </p>
        )}
        {/* Sweep receipt — one strip above the first group. */}
        {sweptRows && sweptRows.length > 0 && onRestoreAuto && (
          <SweepReceipt
            removed={sweptRows.length}
            onUndo={onRestoreAuto}
          />
        )}
        {groups.length === 0 && visibleUnresolved.length === 0 && (
          <p
            className="font-mono text-[11px] text-center py-[20px]"
            style={{ color: "var(--fg-locked)" }}
          >
            {"No cards in this deck."}
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
