"use client";

// Decklist — group toggle toolbar + grouped card rows.
// Owns filter/grouping render; filter and grouping come as props from BuilderShell.
// §Decklist Group Toggle, §Decklist Group, §Decklist Row (design table).

import type { DeckDetailCard, DeckUnresolvedRow } from "../../lib/decks/grouping";
import { cardCopies, groupByCardType, groupByRole, isBasicLand } from "../../lib/decks/grouping";
import { computeRoleCounts } from "../../lib/decks/mix";
import { availabilityState } from "../../lib/decks/availability";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { GroupToggle } from "./group-toggle";
import { summarisePrices, type ProvenanceForm } from "../../lib/decks/price";
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

/**
 * What the Shopping list holds: a card you don't own, or one you own whose
 * copies are already sleeved into finished lists — `over` from this deck's own
 * vantage (amendment 5, #281). Both are one trip to a shop.
 *
 * The two halves cannot overlap: `availabilityState`'s first guard is
 * `owned <= 0 → free`, so an unowned card is never `over`.
 *
 * `selfExcluded` is mandatory and `free` is read, never recomputed. The map came
 * from a query given this deck's id, so on this list
 * `free = (owned − ownClaim) − (hard − ownHardClaim)`; `owned − hard` is the
 * off-decklist formula and is silently wrong here (Addendum 2 §6 / R5 §6).
 *
 * Basics are never in Shopping — the fill never buys them, and asserting it here
 * means a future change to the fill fails this filter loudly.
 */
function isShoppingCard(c: DeckDetailCard): boolean {
  if (isBasicLand(c.typeLine)) return false;
  if (!c.owned) return true;
  const a = c.availability;
  // A missing read degrades to the free rendering, as the builder always has:
  // the contested rows are simply absent and the list is today's list.
  return a ? availabilityState(a, { selfExcluded: true }) === "over" : false;
}

/** A card on the Shopping list that is there because it is spoken for. */
function isSpokenFor(c: DeckDetailCard): boolean {
  return c.owned && isShoppingCard(c);
}

interface DecklistProps {
  deckId: string;
  cards: DeckDetailCard[];
  unresolvedRows: DeckUnresolvedRow[];
  /** Resolving a line to the commander must not also put it in the 99. */
  commanderOracleId: string;
  /** The committed claim set — see UnresolvedGroup. */
  deckOracleIds: string[];
  built: number;
  /** The card whose slot is spent, drawn in place as an undo row (#185). */
  spentSlot?: DeckDetailCard | null;
  /**
   * Whether this deck was ever filled by the auto-fill. Gates the Shopping
   * "Nothing to buy" compliment: a deck that was never filled and simply owns
   * everything in it must not be congratulated on a fill that never ran.
   */
  filled?: boolean;
  filter: "all" | "shopping";
  grouping: "type" | "role";
  onFilterChange: (f: "all" | "shopping") => void;
  onGroupingChange: (g: "type" | "role") => void;
  /** The phone unmounts the quick-add bar while a resolution expander is open. */
  onUnresolvedExpandedChange?: (expanded: boolean) => void;
  /** Number of untouched auto cards — passed to the group toolbar. */
  autoCount?: number;
  /** Number of non-auto cards — kept fill cards and player additions alike. */
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
   * Null when EDHREC was unreachable: the rows then print no figure line at
   * all, rather than claiming an absence for every card in the list.
   * Threaded from getDeckSuggestions via BuilderShell.
   */
  shoppingFigures?: Record<string, number> | null;
  /** The newest `as_of` in `printing_prices` — the one scalar every price's
      liveness is compared against. Null leaves every tag bare. */
  newestAsOf?: Date | null;
  /** Built on the server; see BuilderShell. */
  provenance?: ProvenanceForm | null;
}

export function Decklist({
  deckId,
  cards,
  unresolvedRows,
  commanderOracleId,
  deckOracleIds,
  built,
  spentSlot = null,
  filled = false,
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
  newestAsOf = null,
  provenance = null,
}: DecklistProps) {
  // undefined = no figure line on the row. That is the All view's answer, and
  // also the outage's: with EDHREC unreachable we know nothing about any of
  // these cards, so a per-card "no EDHREC figure" would be a claim we can't make.
  function figureFor(oracleId: string): number | null | undefined {
    if (shoppingFigures === null) return undefined;
    const raw = shoppingFigures[oracleId];
    return Number.isFinite(raw) ? raw : null;
  }

  const shoppingCards = cards.filter(isShoppingCard);
  const visibleCards = filter === "shopping" ? shoppingCards : cards;

  // The Shopping pill counts the list it opens, not the deck's unowned total.
  // Those differ by any unowned basic land — the filter drops basics, and a
  // pill promising a card the list refuses to show sends the player looking
  // for something that is not there.
  //
  // Every Shopping figure below counts copies through `cardCopies` for the same
  // reason: they all describe one purchase, so they have to move together if the
  // multi-copy exception ever widens past basics.
  const shoppingCount = cardCopies(shoppingCards);

  // Summed over the same list the pill counts, and by COPIES for the same
  // reason: the strip's denominator and the `Shopping N` pill are one fact
  // rendered twice on the same screen.
  const priceSummary = summarisePrices(shoppingCards, newestAsOf);

  // The receipt counts cards, not rows: a swept basic-land row carries its
  // whole stack in `quantity`, and undo puts every copy back.
  const sweptCount = (sweptRows ?? []).reduce((n, r) => n + r.quantity, 0);

  // Shopping hides the unresolved group outright. The rows are outside the
  // shopping count by definition, so listing them here would offer the player
  // something they cannot go and buy.
  const visibleUnresolved = filter === "shopping" ? [] : unresolvedRows;

  // The spent card is out of the deck's counts already, so it is grouped
  // alongside the live ones only to be marked — which is what puts the undo row
  // where the card's own row was rather than at the end of the list. Any other
  // path that puts the card back — quick-add, a suggestion tile — returns it to
  // `cards` optimistically, and the slot steps aside for the live row.
  //
  // Under Shopping the test is the filter's own predicate rather than
  // `!spentSlot.owned`: a spoken-for card is owned, so the old test would
  // unmount its row with no undo receipt — the one case #185 exists to prevent.
  const spentCard =
    spentSlot &&
    !cards.some((c) => c.oracleId === spentSlot.oracleId) &&
    (filter === "all" || isShoppingCard(spentSlot))
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
    // Owned cards only. The design draws "3 · closes 7→10", where from + n = to,
    // so `from` is where the deck stands before the purchase — counting the
    // unowned cards here would credit the player with the very cards the group
    // is asking them to buy.
    const roleCounts = computeRoleCounts(cards.filter((c) => c.owned));

    // A spoken-for card is already inside `from` — it is an owned card in this
    // deck, so `computeRoleCounts` has tallied it. Dropping it into a role group
    // would make `n` count a card `from` already counts and over-shoot `to` by
    // one, in a clause the player can check against the role strip on the same
    // screen. So the role groups keep exactly the cards they hold today, and the
    // contested rows get a group of their own with no arithmetic in it.
    const spokenForCards = shoppingCards.filter(isSpokenFor);
    const missingCards = shoppingCards.filter((c) => !c.owned);

    // Build shopping groups: only roles that have ROLE_TARGETS (no land or other).
    const shoppingGroups = SHOPPING_ROLE_ORDER.flatMap((role) => {
      const roleCards = missingCards.filter((c) => c.role === role);
      if (roleCards.length === 0) return [];
      const from = roleCounts[role];
      const n = cardCopies(roleCards);
      // Where the deck lands if the player buys this group, not the baseline.
      // For a group the fill built they are the same number — the fill buys a
      // role up to its target and no further, so from + n is the target. They
      // part company once the player adds unowned cards of their own, and there
      // the baseline would draw arithmetic the list cannot honour: "5 · closes
      // 9→10", or, past a role already covered, the backwards "3 · closes 12→10".
      const to = from + n;
      const gapClause = recommendationsCopy.shopping.groupGap(
        String(n),
        String(from),
        String(to),
      );
      return [{ role, label: SHOPPING_ROLE_LABELS[role], cards: roleCards, gapClause }];
    });

    // Also include unowned cards in roles without ROLE_TARGETS — "other", and
    // the non-basic lands that still carry the "land" role. Basics never reach
    // here (shoppingCards filters them), but a fetchland the player does not own
    // is something they can go and buy, so it belongs in the list.
    const otherShoppingCards = missingCards.filter(
      (c) => !SHOPPING_ROLE_ORDER.includes(c.role as "ramp" | "draw" | "removal" | "wipes"),
    );

    const n = shoppingCount;
    const autoN = cardCopies(shoppingCards.filter((c) => c.auto));
    const allAuto = autoN === n;
    // Copies, like every other figure on this surface: they all describe one
    // purchase, so they move together.
    const spokenForN = cardCopies(spokenForCards);
    const missingN = cardCopies(missingCards);

    // The open slots the player kept for themselves (not filled by auto).
    // Clamped because a deck past 99 has none: the copy this feeds says the
    // slots are "the fun part", and a negative count of them is nonsense.
    const openSlots = Math.max(0, 99 - built);

    // The sweep's refusal and its receipt. Shared by both branches below: a
    // sweep usually empties this tab (bought cards are the fill's), so leaving
    // the receipt out of the empty state would strand Undo behind a tab switch
    // at exactly the moment the player is most likely to want it.
    const sweepBanner = (
      <>
        {sweepError && (
          <p role="alert" className="font-mono text-[11px] mb-[10px] text-fg-locked">
            {sweepError}
          </p>
        )}
        {sweptRows && sweptRows.length > 0 && onRestoreAuto && (
          <SweepReceipt removed={sweptCount} onUndo={onRestoreAuto} />
        )}
      </>
    );

    // Empty shopping list — branch on whether the deck was ever filled.
    // The compliment ("Nothing to buy. Your shelf covered it.") belongs only to
    // a deck the fill actually ran on. A deck the player built by hand that
    // happens to own everything it lists must not be congratulated on a fill
    // that never ran.
    if (n === 0) {
      return (
        <div className="flex flex-col">
          <GroupToggle
            allCount={built}
            shoppingCount={shoppingCount}
            filter={filter}
            grouping={grouping}
            onFilterChange={onFilterChange}
            onGroupingChange={onGroupingChange}
            autoCount={autoCount}
            keptCount={keptCount}
            sweepPending={sweepPending}
            onClearAuto={onClearAuto}
          />
          <div className="px-[16px] pt-[12px] md:px-[26px] md:pt-[14px] empty:hidden">
            {sweepBanner}
          </div>
          {filled ? (
            /* Design: centered, padding 24px 14px 28px, heading Cinzel 18px
               weight-600 --fg, body 13.5px --fg-body line-height 1.6
               margin-top 8px max-width 300px. */
            <div className="px-[14px] pt-[24px] pb-[28px] text-center">
              <p
                className="font-display font-semibold text-[18px] m-0"
                style={{ color: "var(--fg)" }}
              >
                {recommendationsCopy.shopping.emptyCoveredHeading}
              </p>
              <p
                className="text-[13.5px] leading-[1.6] mt-[8px] mx-auto mb-0 max-w-[300px]"
                style={{ color: "var(--fg-body)" }}
              >
                {recommendationsCopy.shopping.emptyCoveredBody(String(openSlots))}
              </p>
            </div>
          ) : (
            <div className="px-[16px] py-[12px] md:px-[26px] md:py-[14px]">
              <p
                className="font-mono text-[11px]"
                style={{ color: "var(--fg-faint)" }}
              >
                {recommendationsCopy.shopping.emptyUncovered}
              </p>
            </div>
          )}
        </div>
      );
    }

    // Prev/Next in the card detail modal walks the list the eye does, so the
    // ids come from the rendered groups rather than from `shoppingCards`, whose
    // deck order the role grouping below discards.
    const shoppingOrderedIds = [
      ...shoppingGroups.flatMap((g) => g.cards.map((c) => c.oracleId)),
      ...otherShoppingCards.map((c) => c.oracleId),
      ...spokenForCards.map((c) => c.oracleId),
    ];

    return (
      <div className="flex flex-col">
        <GroupToggle
          allCount={built}
          shoppingCount={shoppingCount}
          filter={filter}
          grouping={grouping}
          onFilterChange={onFilterChange}
          onGroupingChange={onGroupingChange}
          autoCount={autoCount}
          keptCount={keptCount}
          sweepPending={sweepPending}
          onClearAuto={onClearAuto}
          priceSummary={priceSummary}
          provenance={provenance}
        />

        <div className="px-[16px] py-[12px] md:px-[26px] md:py-[14px]">
          {sweepBanner}

          {/* Intro line — sans (default family), 12.5px phone / 13.5px desktop,
              --fg-body per design §Shopping intro. font-mono was wrong. */}
          <p
            className="text-[12.5px] md:text-[13.5px] leading-[1.6] mb-[14px]"
            style={{ color: "var(--fg-body)" }}
          >
            {/* The fill's expressive intro retires whenever a card is contested:
                nobody reached past the collection for a card that is in it, and
                the purchase closes no gap. At zero contested cards both shipped
                strings render exactly as they ship. */}
            {spokenForN === 0
              ? allAuto
                ? recommendationsCopy.shopping.intro(String(n))
                : recommendationsCopy.shopping.introUnfilled(String(n))
              : missingN === 0
                ? recommendationsCopy.shopping.introOnlySpokenFor(String(spokenForN))
                : recommendationsCopy.shopping.introSplit(
                    String(n),
                    String(missingN),
                    String(spokenForN),
                  )}
          </p>

          {/* Role groups */}
          {shoppingGroups.map(({ role, label, cards: groupCards, gapClause }) => (
            <div key={role} className="mb-[16px] md:mb-[20px]">
              <DecklistGroupHeader label={label} count={cardCopies(groupCards)} gapClause={gapClause} />
              <div
                className="flex flex-col gap-[3px] md:grid md:gap-y-[4px] md:gap-x-[20px]"
                style={{ gridTemplateColumns: "1fr 1fr" }}
              >
                {groupCards.map((card) => {
                  const shoppingFigure = figureFor(card.oracleId);
                  return (
                    <DecklistRow
                      key={card.oracleId}
                      deckId={deckId}
                      card={card}
                      siblings={shoppingOrderedIds}
                      shoppingFigure={shoppingFigure}
                      newestAsOf={newestAsOf}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {/* Other/non-targeted roles (e.g. "other") */}
          {otherShoppingCards.length > 0 && (
            <div className="mb-[16px] md:mb-[20px]">
              <DecklistGroupHeader label="Other" count={cardCopies(otherShoppingCards)} />
              <div
                className="flex flex-col gap-[3px] md:grid md:gap-y-[4px] md:gap-x-[20px]"
                style={{ gridTemplateColumns: "1fr 1fr" }}
              >
                {otherShoppingCards.map((card) => {
                  const shoppingFigure = figureFor(card.oracleId);
                  return (
                    <DecklistRow
                      key={card.oracleId}
                      deckId={deckId}
                      card={card}
                      siblings={shoppingOrderedIds}
                      shoppingFigure={shoppingFigure}
                      newestAsOf={newestAsOf}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Spoken for — pinned last, after Other. The clause slot carries why
              this group closes nothing instead of arithmetic it cannot honour. */}
          {spokenForCards.length > 0 && (
            <div className="mb-[16px] md:mb-[20px]">
              <DecklistGroupHeader
                label={recommendationsCopy.shopping.spokenForGroupLabel}
                count={spokenForN}
                gapClause={recommendationsCopy.shopping.spokenForGroupClause(String(spokenForN))}
              />
              <div
                className="flex flex-col gap-[3px] md:grid md:gap-y-[4px] md:gap-x-[20px]"
                style={{ gridTemplateColumns: "1fr 1fr" }}
              >
                {spokenForCards.map((card) => (
                  <DecklistRow
                    key={card.oracleId}
                    deckId={deckId}
                    card={card}
                    siblings={shoppingOrderedIds}
                    shoppingFigure={figureFor(card.oracleId)}
                    newestAsOf={newestAsOf}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Footer — above a 1px --border rule */}
          <div
            className="pt-[10px] mt-[4px] font-mono text-[10.5px]"
            style={{ color: "var(--fg-faint)", borderTop: "1px solid var(--border)" }}
          >
            {spokenForN === 0 ? (
              allAuto
                ? recommendationsCopy.shopping.footer(String(n), String(autoN))
                : recommendationsCopy.shopping.footerMixed(String(n), String(autoN))
            ) : missingN === 0 ? (
              recommendationsCopy.shopping.footerOnlySpokenFor(String(spokenForN))
            ) : (
              <>
                {/* 390px cannot hold four clauses on one mono line, so the auto
                    clause — the one about provenance rather than the trip —
                    drops there. Two strings, so two spans. */}
                <span className="md:hidden">
                  {recommendationsCopy.shopping.footerSplitShort(
                    String(n),
                    String(missingN),
                    String(spokenForN),
                  )}
                </span>
                <span className="hidden md:inline">
                  {recommendationsCopy.shopping.footerSplit(
                    String(n),
                    String(missingN),
                    String(spokenForN),
                    String(autoN),
                  )}
                </span>
              </>
            )}
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
        shoppingCount={shoppingCount}
        filter={filter}
        grouping={grouping}
        onFilterChange={onFilterChange}
        onGroupingChange={onGroupingChange}
        autoCount={autoCount}
        keptCount={keptCount}
        sweepPending={sweepPending}
        onClearAuto={onClearAuto}
        priceSummary={priceSummary}
        provenance={provenance}
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
            removed={sweptCount}
            onUndo={onRestoreAuto}
          />
        )}
        {groups.length === 0 && visibleUnresolved.length === 0 && (
          <p
            className="font-mono text-[11px] text-center py-[20px]"
            style={{ color: "var(--fg-locked)" }}
          >
            {addPanelCopy.emptyList}
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
            newestAsOf={newestAsOf}
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
