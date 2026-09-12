"use client";

// Decklist — group toggle toolbar + grouped card rows.
// Owns filter/grouping render; filter and grouping come as props from BuilderShell.
// §Decklist Group Toggle, §Decklist Group, §Decklist Row (design table).

import { useState } from "react";

import type { DeckDetailCard, DeckUnresolvedRow } from "../../lib/decks/grouping";
import { cardCopies, groupByCardType, groupByRole } from "../../lib/decks/grouping";
import { computeRoleCounts } from "../../lib/decks/mix";
import { isShoppingCard, isSpokenFor } from "../../lib/decks/shopping";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { GroupToggle, type AutoControls, type DeckView } from "./group-toggle";
import { summarisePrices, type ProvenanceForm } from "../../lib/decks/price";
import { DecklistGroup } from "./decklist-group";
import { DecklistGroupHeader } from "./decklist-group-header";
import { DecklistRow } from "./decklist-row";
import { HoverPreviewProvider } from "./hover-preview";
import type { PendingChangeMove } from "./pending-change";
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

type DecklistProps = {
  deckId: string;
  cards: DeckDetailCard[];
  unresolvedRows: DeckUnresolvedRow[];
  /** Resolving a line to the commander must not also put it in the 99. */
  commanderOracleId: string;
  /** The committed claim set — see UnresolvedGroup. */
  deckOracleIds: string[];
  built: number;
  /** The ceiling `built` is measured against — 99, or 98 for a pair. Passed
      rather than derived, so this list cannot disagree with the target strip
      above it about how big the deck is. */
  bodySize: number;
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
  keepAllPending?: boolean;
  /** The swept rows held for Undo. Null = no pending undo. */
  sweptRows?: SweptRow[] | null;
  /** Error string from a failed sweep, keep-all or undo. One line for the whole
      auto lifecycle: the three are mutually exclusive on screen, and each
      message names its own write. */
  autoError?: string | null;
  /** Forwarded whole to GroupToggle, which owns why the pair is one prop. */
  autoControls?: AutoControls;
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
  /**
   * The cards this deck's draft changed against its newest version (#389), each
   * against its quantity move. Empty on a brew and on a committed deck with
   * nothing pending, which is why every note below is gated on the map's size
   * rather than on a second flag. Nothing here reads a move — the notes count
   * rows — but the rows read the same map through `PendingChangeProvider`, which is
   * where the pair is printed.
   */
  pendingChanges?: ReadonlyMap<string, PendingChangeMove>;
  /** The newest version's number, for the toolbar note. Null on a brew. */
  pendingVersion?: number | null;
};

/** Module-scoped, so the default does not hand a fresh map to the provider on
 *  every render and remount the rows under it. */
const EMPTY_PENDING_CHANGES: ReadonlyMap<string, PendingChangeMove> = new Map();

export function Decklist({
  deckId,
  cards,
  unresolvedRows,
  commanderOracleId,
  deckOracleIds,
  built,
  bodySize,
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
  keepAllPending = false,
  sweptRows = null,
  autoError = null,
  autoControls,
  onRestoreAuto,
  shoppingFigures = {},
  newestAsOf = null,
  provenance = null,
  pendingChanges = EMPTY_PENDING_CHANGES,
  pendingVersion = null,
}: DecklistProps) {
  // The view does not persist and does not touch the URL: it is one visit's
  // reading preference, where `/collection`'s `?view=` answers a browse
  // surface's different question. Held here because nothing above the list
  // reads it.
  const [view, setView] = useState<DeckView>("list");

  // The toolbar's right slot while a draft exists. Needs both answers: a deck
  // with no version has no vN to count against, and a set with nothing in it has
  // nothing to count. Null in either case, and the kept note keeps the slot.
  const draftNote =
    pendingChanges.size > 0 && pendingVersion !== null
      ? deckVersioningCopy.pending.toolbarNote(pendingChanges.size, pendingVersion)
      : null;

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

  // What the strip's buy link buys — the same rows, in the same order, as the
  // list on screen. Recomputed with the rest of this render, so a ✕ moves the
  // basket and the total in one step.
  const shoppingList = shoppingCards.map((c) => ({ name: c.name, quantity: c.quantity }));

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
    //
    // Membership comes from `listedCards`, which carries the spent slot; every
    // count below comes from `shoppingCards`, which does not. That split is what
    // lets a removed row keep its place in its own group — where the undo receipt
    // has to appear — without the group promising a card that is no longer in the
    // deck. `notSpent` is the one place the difference is spelled.
    const notSpent = (c: DeckDetailCard) => c.oracleId !== spentCard?.oracleId;
    const spokenForCards = listedCards.filter(isSpokenFor);
    const missingCards = listedCards.filter((c) => !c.owned);

    // The marked rows this branch actually draws — the three groups below hold
    // every row it has. The rows carry the brass rule here exactly as they do
    // under All, so the caption has to come with them; what changes is the
    // figure, which counts the marks on screen rather than the whole draft. A
    // caption counting rows the reader cannot see would be a caption about
    // nothing, and no caption at all leaves the rule unexplained.
    const markedOnScreen = new Set(
      [...missingCards, ...spokenForCards]
        .filter((c) => pendingChanges.has(c.oracleId))
        .map((c) => c.oracleId),
    ).size;

    // Build shopping groups: only roles that have ROLE_TARGETS (no land or other).
    const shoppingGroups = SHOPPING_ROLE_ORDER.flatMap((role) => {
      const roleCards = missingCards.filter((c) => c.role === role);
      if (roleCards.length === 0) return [];
      const from = roleCounts[role];
      const n = cardCopies(roleCards.filter(notSpent));
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
    const spokenForN = cardCopies(spokenForCards.filter(notSpent));
    const missingN = cardCopies(missingCards.filter(notSpent));

    // The open slots the player kept for themselves (not filled by auto).
    // Clamped because a deck past its body size has none: the copy this feeds
    // says the slots are "the fun part", and a negative count of them is
    // nonsense.
    const openSlots = Math.max(0, bodySize - built);

    // The auto lifecycle's refusals — a sweep, a keep-all or an undo — and the
    // sweep's receipt. Shared by both branches below: a sweep usually empties
    // this tab (bought cards are the fill's), so leaving the receipt out of the
    // empty state would strand Undo behind a tab switch at exactly the moment
    // the player is most likely to want it.
    const autoBanner = (
      <>
        {autoError && (
          <p role="alert" className="font-mono text-[11px] mb-[10px] text-fg-locked">
            {autoError}
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
    // `!spentCard` for the same reason `builder-shell.tsx` guards its own empty
    // state on it: swapping the list for an empty state would take the undo row
    // with it, and the player has nowhere else to undo from.
    if (n === 0 && !spentCard) {
      return (
        <div className="flex flex-col">
          <GroupToggle
            allCount={built}
            shoppingCount={shoppingCount}
            filter={filter}
            grouping={grouping}
            onFilterChange={onFilterChange}
            onGroupingChange={onGroupingChange}
            view={view}
            onViewChange={setView}
            autoCount={autoCount}
            keptCount={keptCount}
            sweepPending={sweepPending}
            keepAllPending={keepAllPending}
            autoControls={autoControls}
            shoppingCards={shoppingList}
            draftNote={draftNote}
          />
          <div className="px-[16px] pt-[12px] md:px-[26px] md:pt-[14px] empty:hidden">
            {autoBanner}
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
    ].filter((id) => id !== spentCard?.oracleId);

    return (
      <div className="flex flex-col">
        <GroupToggle
          allCount={built}
          shoppingCount={shoppingCount}
          filter={filter}
          grouping={grouping}
          onFilterChange={onFilterChange}
          onGroupingChange={onGroupingChange}
          view={view}
          onViewChange={setView}
          autoCount={autoCount}
          keptCount={keptCount}
          sweepPending={sweepPending}
          keepAllPending={keepAllPending}
          autoControls={autoControls}
          priceSummary={priceSummary}
          provenance={provenance}
          shoppingCards={shoppingList}
          draftNote={draftNote}
        />

        <HoverPreviewProvider className="px-[16px] py-[12px] md:px-[26px] md:py-[14px]">
          {autoBanner}

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

          {markedOnScreen > 0 && (
            <p className="m-0 mb-[14px] font-mono text-[10px] text-[color:var(--fg-faint)]">
              {deckVersioningCopy.pending.changeListCaption(markedOnScreen)}
            </p>
          )}

          {/* Role groups */}
          {shoppingGroups.map(({ role, label, cards: groupCards, gapClause }) => (
            <div key={role} className="mb-[16px] md:mb-[20px]">
              <DecklistGroupHeader
                label={label}
                count={cardCopies(groupCards.filter(notSpent))}
                gapClause={gapClause}
              />
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
                      spent={card.oracleId === spentCard?.oracleId}
                      shoppingFigure={shoppingFigure}
                      inShopping
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
              <DecklistGroupHeader
                label="Other"
                count={cardCopies(otherShoppingCards.filter(notSpent))}
              />
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
                      spent={card.oracleId === spentCard?.oracleId}
                      shoppingFigure={shoppingFigure}
                      inShopping
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
                    spent={card.oracleId === spentCard?.oracleId}
                    shoppingFigure={figureFor(card.oracleId)}
                    inShopping
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
        </HoverPreviewProvider>
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
        view={view}
        onViewChange={setView}
        autoCount={autoCount}
        keptCount={keptCount}
        sweepPending={sweepPending}
        keepAllPending={keepAllPending}
        autoControls={autoControls}
        priceSummary={priceSummary}
        provenance={provenance}
        shoppingCards={shoppingList}
        draftNote={draftNote}
      />

      {/* Grouped card rows */}
      <HoverPreviewProvider className="px-[16px] py-[12px] md:px-[26px] md:py-[14px]">
        {/* A refused sweep, keep-all or undo. Each message names its own write:
            the sweep and the keep leave the deck as it was, an undo does not. */}
        {autoError && (
          <p
            role="alert"
            className="font-mono text-[11px] mb-[10px] text-fg-locked"
          >
            {autoError}
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
        {/* Said once for the whole list rather than once per marked row: at
            nineteen adds the per-row version is nineteen copies of one
            sentence. The whole draft's figure here, because this list holds
            every changed row; Shopping draws its own caption over the subset it
            shows. List
            view only, with `groupChangeNote` below it, for the same reason: the
            brass rule lives on the row, and the card view draws tiles that carry
            no mark at all. A sentence pointing at a marker nobody can see is
            worse than silence. */}
        {pendingChanges.size > 0 && view === "list" && (
          <p className="m-0 mb-[8px] font-mono text-[10px] text-[color:var(--fg-faint)]">
            {deckVersioningCopy.pending.changeListCaption(pendingChanges.size)}
          </p>
        )}
        {groups.map(([label, groupCards]) => {
          // Omitted at zero rather than printed as `0 changed in this draft`: a
          // group the draft did not touch has nothing to say about it.
          // List view only: this note is the heading's half of one mark, and the
          // card view's tiles draw the other half nowhere.
          const changedInGroup =
            view === "list"
              ? groupCards.filter((c) => pendingChanges.has(c.oracleId)).length
              : 0;
          return (
            <DecklistGroup
              key={label}
              deckId={deckId}
              label={label}
              cards={groupCards}
              view={view}
              spentOracleId={spentCard?.oracleId}
              siblings={orderedIds}
              newestAsOf={newestAsOf}
              note={
                changedInGroup > 0
                  ? deckVersioningCopy.pending.groupChangeNote(changedInGroup)
                  : undefined
              }
              // Brass, the same brass as the rules below it: this note is the
              // heading's half of one mark. The quiet default belongs to the
              // unresolved group's note, which describes rows rather than
              // pointing at them.
              noteColor="var(--accent)"
            />
          );
        })}

        {/* Pinned last, after every type or role group. */}
        <UnresolvedGroup
          deckId={deckId}
          rows={visibleUnresolved}
          cards={cards}
          deckOracleIds={deckOracleIds}
          commanderOracleId={commanderOracleId}
          onExpandedChange={onUnresolvedExpandedChange}
        />
      </HoverPreviewProvider>
    </div>
  );
}
