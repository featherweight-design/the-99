"use client";

// Decklist — group toggle toolbar + grouped card rows.
// Owns filter/grouping render; filter and grouping come as props from BuilderShell.
// §Decklist Group Toggle, §Decklist Group, §Decklist Row (design table).

import { PublishDeckSiblings } from "./deck-siblings";
import { useSwapTools } from "../../lib/swaps/context";
import { GotItDoorRegistration } from "./got-it-door";
import { StandInsSheet } from "./stand-ins-sheet";
import { StandInDoorRegistration } from "./stand-in-door";
import { SwapReceiptRow } from "./swap-receipt";
import { placeReceipts } from "../../lib/swaps/place-receipts";
import { isOverLimit } from "../../lib/swaps/limit";
import { isLandFace } from "../../lib/cards/facet";
import { jobTally } from "../../lib/decks/job-tally";
import { manaCurve, typeCurve, type DeckStatsInput } from "../../lib/decks/stats";
import { averageComparison } from "../../lib/decks/stats-average";
import { moneyStats } from "../../lib/decks/stats-money";
import { resultsStats } from "../../lib/decks/stats-results";
import { manaSupply } from "../../lib/mana/supply";
import { manaSupplyRows } from "../../lib/mana/supply-rows";
import type { RecommendedMix } from "../../lib/decks/mix";
import type { DeckDetailCard, DeckUnresolvedRow } from "../../lib/decks/grouping";
import { cardCopies, groupByCardType, groupByRole } from "../../lib/decks/grouping";
import { printedNameOf } from "../../lib/collection/browse";
import { labelRolesOf } from "../../lib/decks/label-role-counts";
import { useLabelRows, useRoleCounter } from "./label-rows-context";
import { commanderAsRow, commanderShoppingRows, isShoppingCard, isSpokenFor } from "../../lib/decks/shopping";
import type { DeckCommander } from "../../lib/decks/read";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { DeckStatsView } from "./deck-stats-view";
import { DeckNotesPanel } from "./notes/deck-notes-panel";
import { NO_NOTES, type DeckNotesView } from "../../lib/decks/notes-types";
import { useDeckPanel } from "./deck-panel";
import { DECK_VIEW_KEY, DeckBarPanel, GroupToggle, isDeckView, type AutoControls } from "./group-toggle";
import { deckCardComparator } from "../../lib/decks/sort-cards";
import {
  DECK_SORT_STORAGE_KEY,
  isStoredDeckSort,
  parseDeckSort,
  withLaneOrder,
  type DeckSortState,
} from "../../lib/decks/sort-memory";
import { summarisePrices, type ProvenanceForm } from "../../lib/decks/price";
import { DecklistGroup } from "./decklist-group";
import { DecklistGroupHeader } from "./decklist-group-header";
import { TokensGroup } from "./tokens-group";
import { TokensShoppingGroup } from "./tokens-shopping-group";
import { DecklistRow } from "./decklist-row";
import { HoverPreviewProvider } from "./hover-preview";
import { useStoredView } from "../ui/use-stored-view";
import { readRaw } from "../ui/local-store";
import type { PendingChangeMove } from "./pending-change";
import { UnresolvedGroup } from "./unresolved-group";
import { SweepReceipt } from "./clear-auto";
import type { SweptRow } from "../../app/decks/actions";
import { BuyTag } from "./buy-tag";
import { ProxyTag } from "./proxy-tag";
import { cardTileCopy } from "../../lib/copy/card-surfaces";
import { MarkKey, type MarkKeyEntry } from "./mark-key";
import { LockMark } from "./lock-mark";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";
import { CardFactMark } from "../cards/card-fact-mark";
import { CARD_FACTS, cardFactName } from "../../lib/copy/card-mark";
import { deckRowTag } from "../../lib/decks/row-tag";
import { proxyCopy } from "../../lib/copy/proxies";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useGotIt } from "./got-it";
import { reveal } from "../../lib/ui/reveal";

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
 * The Lock cards mode's line, drawn where the mark key sits while the mode runs. Exported for the
 * About page's Locked cards figure, which draws it above the rows in the mode.
 */
export function LockModeLine({ count }: { count: number }) {
  return (
    // A 16px line, the key's own line height, so a one-line key and this line share a slot exactly
    // (Hugh, 2026-09-26: at 1.5 leading, entering the mode shifted the page 2.75px). Flex rather
    // than one line of text: a smaller mono span on a sans baseline grows a shared line box by a
    // pixel, and as centered flex items each keeps its own (baseline alignment grows it again).
    <p className="m-0 flex flex-wrap items-center gap-x-[4px] text-[12.5px] leading-[16px] text-fg-body" data-testid="lock-mode-line">
      {/* The space rides the text, so the line still reads as one sentence to a screen reader. */}
      <span>{lockedCardsCopy.mode.line}{" "}</span>
      <span className="font-mono text-[11px] text-fg-muted">{lockedCardsCopy.mode.count(count)}</span>
    </p>
  );
}

/**
 * The Shopping section a cut's row sat in, by the rules the list sections its rows with: its type group
 * under `By type`; under `By role` the pinned spoken-for group, else its targeted role, else `Other`.
 * A swap receipt draws there (swap tools, PR 4b).
 */
export function receiptHome(card: DeckDetailCard, grouping: "role" | "type"): { key: string; label: string } {
  if (grouping === "type") return { key: card.cardTypeGroup, label: card.cardTypeGroup };
  if (isSpokenFor(card)) return { key: "spoken-for", label: recommendationsCopy.shopping.spokenForGroupLabel };
  const role = SHOPPING_ROLE_ORDER.find((r) => r === card.role);
  return role ? { key: role, label: SHOPPING_ROLE_LABELS[role] } : { key: "other", label: "Other" };
}

type DecklistProps = {
  /** Passed straight through to `UnresolvedGroup`. Carried, not computed. */
  mix: RecommendedMix;
  deckId: string;
  cards: DeckDetailCard[];
  unresolvedRows: DeckUnresolvedRow[];
  /** Resolving a line to the commander must not also put it in the 99. */
  commanderOracleId: string;
  /**
   * The deck's commanders, for the Shopping list alone (H28): an unowned or spoken-for commander
   * heads that list in a group of its own and counts in every Shopping figure. The All view never
   * lists them, since neither is a `deck_cards` row. Optional because most tests mount the list
   * without them, and absent bills no commander, which is the list as it was.
   */
  commander?: DeckCommander;
  partner?: DeckCommander | null;
  /** The committed claim set — see UnresolvedGroup. */
  deckOracleIds: string[];
  built: number;
  /** The ceiling `built` is measured against — 99, or 98 for a pair. Passed
      rather than derived, so this list cannot disagree with the target strip
      above it about how big the deck is. */
  bodySize: number;
  /**
   * The cards whose slots are spent, each drawn in place as its own undo row
   * (#185; H29 lets several stand at once, one receipt per removal). A list
   * rather than a single card: every removal in a visit leaves its own
   * receipt, undone independently and in any order.
   */
  spentSlots?: DeckDetailCard[];
  /**
   * Whether this deck was ever filled by the auto-fill. Gates the Shopping
   * "Nothing to buy" compliment: a deck that was never filled and simply owns
   * everything in it must not be congratulated on a fill that never ran.
   */
  filled?: boolean;
  /** `DECK_STATS_ENABLED`. Off: no Stats segment is drawn and nothing else changes. */
  statsEnabled?: boolean;
  statsData?: DeckStatsInput | null;
  /** `DECK_NOTES_ENABLED`. Off: no Notes segment is drawn and nothing else changes. `notesData` is the deck's notes. */
  notesEnabled?: boolean;
  notesData?: DeckNotesView | null;
  /**
   * A request to open Deck stats at one card, from the benchmark ledger's Stats link (audit build
   * rule 6). `n` moves on every request, so the same card asked for twice scrolls twice.
   */
  statsFocus?: { card: "curve" | "jobs"; n: number } | null;
  /** Called once the Stats link's request is answered, so the shell drops it: Decklist remounts on
   *  every tab switch, and a request it still held would reopen Stats the reader had since closed. */
  onStatsFocused?: () => void;
  /** The logged games (newest first, as `listDeckGames` returns them) and the deck's versions (newest
   *  first) for the Results card. A brew has no versions, so the card's by-version section is absent. */
  games?: readonly { result: "win" | "loss" | "draw"; playedAt: Date; versionNumber: number | null }[];
  versions?: readonly { number: number; committedAt: Date }[];
  /** The Results card's empty-state link: opens the Games tab. */
  onLogGame?: () => void;
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
  /** The surface's live region. A reorder is the one change on this list that
   *  moves nothing a reader can see happening. */
  onAnnounce?: (message: string) => void;
  /** The Lock cards mode (Locked, PR 4a), owned by the shell so List ↔ Card keeps it. Its
   *  handler is absent with `NEVER_CUT_ENABLED` off, and so is every control it draws. */
  lockMode?: boolean;
  onLockModeChange?: (on: boolean) => void;
  /** Auto copies whose card is locked (T3), for Clear's label. */
  lockedAutoCount?: number;
  /** Locked auto copies the last sweep left, for the receipt's second clause. */
  sweptLockedCount?: number;
};

/**
 * The key's entries for a decklist view — EXPORTED so the composition rule is testable
 * against the shipped function rather than a copy of it. A test that rebuilt these
 * entries itself would stay green with the rule deleted, which is exactly what the first
 * version of its test did.
 */
export function buildMarkKeyEntries({
  cards,
  filter,
  inCardView,
  commanderRows = [],
  shoppingKeyDraws = false,
}: {
  cards: DeckDetailCard[];
  filter: string;
  inCardView: boolean;
  /** The commanders' Shopping rows (`commanderShoppingRows`), glossed under Shopping alone. */
  commanderRows?: DeckDetailCard[];
  /** `ShoppingKey` is drawn above the list (I got it on). It decodes the buy mark itself, so under
   *  Shopping, where every row carries it, this key does not say `to buy` a second time (Hugh, 2026-10-11). */
  shoppingKeyDraws?: boolean;
}): MarkKeyEntry[] {
    const shown = filter === "shopping"
      ? [...commanderRows, ...cards].filter(isShoppingCard)
      : cards;
    const entries: MarkKeyEntry[] = [];
    if (!(shoppingKeyDraws && filter === "shopping") && shown.some((c) => deckRowTag(c, filter === "shopping" && isSpokenFor(c)) === "buy")) {
      entries.push({
        id: "buy",
        // The word the surface beneath it already speaks. The tile's `$` carries
        // `cardTileCopy.slotUnownedAria`; the row's carries the shop. The SAMPLE
        // is the row variant on both, unchanged — the key's own box is not the
        // caption's, and nothing here redraws it.
        sample: <BuyTag variant="row" density="collapsed" price={null} />,
        word: inCardView ? cardTileCopy.slotUnownedAria : proxyCopy.key.buy,
      });
    }
    if (shown.some((c) => c.proxied)) {
      entries.push({ id: "proxy", sample: <ProxyTag variant="row" />, word: proxyCopy.key.proxy });
    }
    // Locked, conditional like `buy` and `proxy`: it describes the rows or tiles below, both of
    // which draw the closed lock (the tile's on its meta line since Locked PR 4b).
    if (shown.some((c) => c.locked)) {
      entries.push({ id: "locked", sample: <LockMark />, word: lockedCardsCopy.mark.key });
    }
    // THE FACT ENTRIES FOLLOW THE CARDS, exactly as `buy` and `proxy` do.
    //
    // The handoff asked for all five always, and its reason — "a player scanning for Game
    // Changers needs the entry to be there BEFORE they find one" — is sound on a surface
    // whose contents stream in. /collection is that surface: a paged, filtered window on
    // thousands of cards, where "no Game Changer on this page" is not "none in your
    // collection", so `CollectionMarkKey` stays unconditional.
    //
    // A DECK IS A CLOSED SET. All 100 cards are here, so absence is knowable and total —
    // there is no later card to find. An entry for a fact the deck does not hold stops
    // being a decoder and becomes a claim, which is how a deck with one extra-turns card
    // came to advertise all three. Reported 2026-09-19.
    //
    // Computed over `shown` rather than `cards`, so the key glosses the rows the reader is
    // actually looking at — the same set `buy` and `proxy` are decided on.
    //
    // IN CARD VIEW TOO. An earlier version suppressed them there, on the reasoning that the
    // tiles drew no mark so glossing three glyphs would teach marks the reader cannot find.
    // The premise was true and the conclusion was backwards: Card view is a surface that
    // shows cards, so the fix was to draw the mark on the tile rather than to remove the
    // words. Suppressing the key made Card view the one place a reader met neither.
    for (const fact of CARD_FACTS) {
      if (!shown.some((c) => c.facts?.includes(fact))) continue;
      entries.push({
        id: fact,
        sample: <CardFactMark fact={fact} silent />,
        word: cardFactName(fact),
      });
    }
    return entries;
}

/** Module-scoped, so the default does not hand a fresh map to the provider on
 *  every render and remount the rows under it. */
const EMPTY_PENDING_CHANGES: ReadonlyMap<string, PendingChangeMove> = new Map();
/** Module-scoped for the same reason: avoids allocating a fresh `[]` on every
 *  render when nothing was spent. */
const EMPTY_SPENT_SLOTS: DeckDetailCard[] = [];
const NO_SLOTS_LEFT: ReadonlySet<string> = new Set();

// Stable empties for a caller that passes neither (the page always does, so a render there reuses
// the slice until a game or version changes).
const NO_GAMES: readonly { result: "win" | "loss" | "draw"; playedAt: Date; versionNumber: number | null }[] = [];
const NO_VERSIONS: readonly { number: number; committedAt: Date }[] = [];

export function Decklist({
  deckId,
  cards,
  unresolvedRows,
  commanderOracleId,
  commander,
  partner = null,
  deckOracleIds,
  built,
  bodySize,
  spentSlots = EMPTY_SPENT_SLOTS,
  filled = false,
  statsEnabled = false,
  statsData = null,
  notesEnabled = false,
  notesData = null,
  statsFocus = null,
  onStatsFocused,
  games = NO_GAMES,
  versions = NO_VERSIONS,
  onLogGame,
  filter,
  grouping,
  onFilterChange: onFilterChangeProp,
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
  newestAsOf,
  provenance = null,
  pendingChanges = EMPTY_PENDING_CHANGES,
  pendingVersion = null,
  onAnnounce,
  mix,
  lockMode = false,
  onLockModeChange,
  lockedAutoCount = 0,
  sweptLockedCount = 0,
}: DecklistProps) {
  // The view persists and does not touch the URL. It is a reading preference,
  // not a description of what is on screen — `/collection`'s `?view=` answers
  // a browse surface's different question, and a deck link that carried a view
  // would hand the recipient this reader's habit. Held in localStorage because
  // nothing above the list reads it and no other device needs to agree.
  //
  // List until this browser says otherwise, which is also what the server
  // renders: the stored choice arrives on the pass after hydration.
  const [storedView, chooseView] = useStoredView(DECK_VIEW_KEY, isDeckView);
  // The panel's body, held for this visit to this deck (`useDeckPanel`), not remembered. Stats is a
  // third segment of the All / Shopping control, so choosing either list segment returns here.
  const [panel, choosePanel] = useDeckPanel();
  const statsOpen = statsEnabled && panel === "stats";
  const notesOpen = notesEnabled && panel === "notes";
  // I got it's held slots (call 8) last until the list is read again: a switch of tab or panel, or
  // leaving the deck, clears them; the action's revalidation does not.
  const gotIt = useGotIt();
  const clearHeld = gotIt?.clearHeld;
  const shoppingKeyDraws = gotIt !== null;
  const [slotsLeft, setSlotsLeft] = useState<ReadonlySet<string>>(NO_SLOTS_LEFT);
  useEffect(() => () => clearHeld?.(), [filter, statsOpen, notesOpen, clearHeld]);
  const onFilterChange = (f: "all" | "shopping") => {
    choosePanel("list");
    onFilterChangeProp(f);
  };
  const stats = statsEnabled
    ? { open: statsOpen, onChange: (open: boolean) => choosePanel(open ? "stats" : "list") }
    : undefined;
  const notes = notesEnabled
    ? { open: notesOpen, count: notesData?.open.length ?? 0, onChange: (open: boolean) => choosePanel(open ? "notes" : "list") }
    : undefined;
  const view = storedView ?? "list";
  // The ledger's Stats link: open the panel, then, once it is drawn, bring the card into view.
  // Each request is answered once, here and in the shell, so closing Stats afterwards is never undone
  // by a stale one: not by a re-render (`answered`) and not by this list remounting on a tab switch
  // (the shell drops the request through `onStatsFocused`).
  const answered = useRef(0);
  useEffect(() => {
    if (!statsFocus || !statsEnabled || answered.current === statsFocus.n) return;
    if (!statsOpen) {
      choosePanel("stats");
      return;
    }
    answered.current = statsFocus.n;
    const target = document.querySelector<HTMLElement>(`[data-stats-card="${statsFocus.card}"]`);
    reveal(target, "start");
    // The ledger and the control that opened it are gone (the tab switched), so focus would fall to
    // the body: it lands on the card the link named instead.
    if (target) {
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }
    onStatsFocused?.();
  }, [statsFocus, statsEnabled, statsOpen, choosePanel, onStatsFocused]);

  // The marks this view actually contains, which is what the key decodes. Only
  // what the current view DRAWS — rows under `Shopping` and under `All`'s list,
  // tiles under `All`'s card view: a legend naming a mark the reader cannot see
  // on screen teaches the wrong thing, and an empty one is furniture.
  // The marks this view contains, decoded by a CANONICAL sample of each — not by
  // the live component at whatever density the rows happen to be drawing.
  //
  // That distinction is a scope decision, taken after three consecutive review
  // rounds on this one line. Sampling the real component per view meant the key
  // had to track Shopping's full-density tag (which renders the word `buy`, so
  // the line read `buy to buy`), the card view's tile plate, and the row's
  // collapsed glyph — three variants of a legend whose whole job is to say what
  // one character means. The glyph is the thing being decoded on every surface;
  // the plate around it is not, so the key draws the glyph in the row's box and
  // stops there.
  // BOTH VIEWS, with one differing word — `ADDENDUM-the-key.md`, which
  // supersedes the scope decision that stood here.
  //
  // That decision was right about the terms and wrong about the conclusion. The
  // two surfaces do not draw `$` on the same cards: `deckRowTag` returns `buy`
  // for `!owned || spokenFor`, and only the ROW passes `spokenFor`. A
  // spoken-for card is owned, so `not owned` is false of it; an unowned card
  // outside Shopping is not `to buy`. No single word is true of both sets, which
  // is why shared copy was never an option rather than merely an unattractive
  // one.
  //
  // But `P` is `card.proxied` on both, identically — so the divergence is ONE
  // WORD WIDE, not a vocabulary wide. Two keys that differ by one entry, each
  // true of what sits beneath it, are the system this component's header
  // describes instantiated twice, not a third vocabulary.
  //
  // Withdrawing it entirely is what this cannot do: a one-character mark is only
  // safe when the word is reachable three ways, and with no key a sighted reader
  // on a phone — the reader most likely to be in card view — has none.
  // THE EFFECTIVE SURFACE, never the stored view. `view` is persisted
  // (`DECK_VIEW_KEY`) and the toggle only renders under `All`, so a reader who
  // reads in card view and then switches to Shopping keeps `view === "card"`
  // while the Shopping branch renders ROWS — it calls `DecklistRow` directly and
  // takes no `view`. Keyed on the raw value, the legend then prints `not owned`
  // over rows whose `$` includes spoken-for cards, which the player OWNS.
  //
  // That is the exact falsehood this key's own ruling forbids, so the condition
  // has to name the surface that is actually drawn rather than the preference
  // that is stored.
  const inCardView = filter === "all" && view === "card";

  // The curve is drawn from the list the page draws (the optimistic one) plus the commanders the
  // server sent, so an add or a sweep moves it in the same frame as the rows.
  const countRoles = useRoleCounter();
  const labelRows = useLabelRows();
  const statsSlice = useMemo(() => {
    if (!statsData) return null;
    const list = [...cards, ...statsData.commanders];
    const byCard = statsData.jobs;
    const jobs = byCard
      ? jobTally(
          cards.filter((c) => !isLandFace(c.typeLine)).map((c) => ({ oracleId: c.oracleId, name: c.name, copies: c.quantity, role: c.role })),
          byCard,
        )
      : null;
    // The Colors card. A land the page had no text for (added since load) reads its type line alone.
    // Null where the land read failed: the card then stays a shell rather than draw every land as
    // making nothing.
    const landsByCard = statsData.lands;
    const sourcesByCard = statsData.sources;
    const deckColors = statsData.commanders.flatMap((c) => c.colorIdentity);
    const mana = landsByCard && sourcesByCard
      ? manaSupply(manaSupplyRows(cards, statsData.commanders, landsByCard, sourcesByCard, deckColors))
      : null;
    // The Average card compares the 99 (EDHREC's counts sum to 99), so it reads the list without the commanders.
    const average = statsData.average
      ? averageComparison(statsData.average, {
          curve: manaCurve(cards),
          types: typeCurve(cards),
          jobs,
          cards: cards.reduce((a, c) => a + c.quantity, 0),
        })
      : null;
    // The Money card partitions by the Shopping pill's own basket, so its "to buy" is the pill's count.
    const money = moneyStats(
      {
        cards,
        commanders: commander ? [commander, ...(partner ? [partner] : [])].map(commanderAsRow) : [],
        shopping: [...(commander ? commanderShoppingRows(commander, partner, cards) : []), ...cards.filter(isShoppingCard)],
      },
      newestAsOf,
    );
    const results = resultsStats(games, versions);
    return { curve: manaCurve(list), types: typeCurve(list), jobs, mana, average, money, results };
  }, [cards, statsData, commander, partner, newestAsOf, games, versions]);

  // The commanders the Shopping list bills (H28), through the list's own predicate. Every Shopping
  // figure below counts them; only the Shopping branch draws them, in a group of their own.
  const commanderShopping = useMemo(
    () => (commander ? commanderShoppingRows(commander, partner, cards) : []),
    [commander, partner, cards],
  );

  const markKey = useMemo(
    () => buildMarkKeyEntries({ cards, filter, inCardView, commanderRows: commanderShopping, shoppingKeyDraws }),
    [cards, filter, inCardView, commanderShopping, shoppingKeyDraws],
  );

  // One label, computed beside the entries and passed to every instance: the
  // three call sites are three branches of one surface, and a label chosen per
  // branch would be three chances to disagree about what is underneath.
  const markKeyRegion = inCardView
    ? proxyCopy.key.regionAriaCards
    : proxyCopy.key.regionAria;

  // The key line holds EITHER the key OR the mode's line, never both (toolbar addendum F3): the
  // same position, above the sweep receipt and the groups. The count is locked CARDS, one per
  // oracle id (T3), over the whole deck: the mode only runs under `All`, where that is the view.
  const lockedCardCount = cards.filter((c) => c.locked).length;
  // BOTH VIEWS since Locked 4b, and the mode is KEPT across List and Card (the addendum's rule):
  // every row's ✕ and every tile's ✕ column is the toggle while it runs. Only Shopping ends it,
  // in the shell.
  //
  // Entering or leaving the mode moves nothing (Hugh, 2026-09-26). Where the lock is on offer and
  // there is a key to trade, both are laid in ONE grid cell and the hidden one keeps its box, so
  // the slot is always the taller of the two: the key wraps to a second line on a busy phone, and
  // a single swap then jumped the list. `invisible` is visibility:hidden, which also takes the
  // hidden one out of the tab order and the accessibility tree, so still only one is read. A deck
  // with no key at all holds the slot too, blank outside the mode: that is the one layout where
  // the rule costs a line, and a list that jumps under the press is the defect being fixed.
  // All only: Shopping has no Lock cards mode, so it keeps its own key and empty-state sizing.
  const keyLine = onLockModeChange && filter === "all" ? (
    <div className="grid">
      <div className={`[grid-area:1/1] ${lockMode ? "invisible" : ""}`}>
        <MarkKey marks={markKey} regionAria={markKeyRegion} />
      </div>
      <div className={`[grid-area:1/1] ${lockMode ? "" : "invisible"}`}>
        <LockModeLine count={lockedCardCount} />
      </div>
    </div>
  ) : lockMode ? (
    <LockModeLine count={lockedCardCount} />
  ) : (
    <MarkKey marks={markKey} regionAria={markKeyRegion} />
  );
  // The toolbar's lock props, identical on all three of its mounts.
  const lockProps = {
    lockMode,
    onLockModeChange,
    lockedAutoCount,
  };

  // ONE SORT PER FILTER, both remembered together. `All` keeps its own order
  // while `Shopping` keeps `Price · Highest`, so switching lanes swaps which is
  // live rather than converting one into the other — and coming back restores
  // what that lane was last read in. Same store as the view well beside it,
  // and for the same reason: how you read a list is a fact about the reader.
  const [storedSort, chooseSort] = useStoredView(DECK_SORT_STORAGE_KEY, isStoredDeckSort);
  const sortMemory = parseDeckSort(storedSort);
  const sort = sortMemory[filter];
  // `withLaneOrder` owns the merge, including reading the stored value fresh
  // and refusing one the guard rejects. Three review rounds landed on a copy of
  // that logic living here; it is one tested function now.
  const setSort = (next: DeckSortState) =>
    chooseSort(withLaneOrder(readRaw(DECK_SORT_STORAGE_KEY), filter, next));

  // The one comparator every group below orders its rows with. `newestAsOf` is
  // only read by the price key; the other two ignore it.
  const compareCards = deckCardComparator(sort.key, sort.direction, newestAsOf);

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

  // The decklist's own Shopping rows, and the whole basket: the commanders first, then those. The
  // basket is what every Shopping FIGURE reads (the pill, the strip, both Mana Pool hrefs, the
  // intro and the footer), so the list and its figures bill one set of cards. The list rows alone
  // are what the type and role groups section, since a commander draws in a group of its own.
  // Memoized on the list itself: I got it's card-details link re-registers when this changes, so a
  // stable identity between reads keeps that from happening on every render.
  const listShoppingCards = useMemo(() => cards.filter(isShoppingCard), [cards]);
  const shoppingCards = useMemo(() => [...commanderShopping, ...listShoppingCards], [commanderShopping, listShoppingCards]);
  const visibleCards = filter === "shopping" ? listShoppingCards : cards;

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

  // The rows over the deck's Shopping limit (swap tools), for the limit line's `N over`. Rows, not
  // copies: the count names the rows the reader sees marked. Zero whenever the tools are off.
  const swapTools = useSwapTools();
  // The stand-ins sheet, mounted by the list rather than by its row: a take takes the row away, and
  // the sheet has to stay to say so. Both views mount it, since a take moves the reader nowhere.
  // I got it's link in the card modal, for a card a Shopping row opened (A11): commander rows too.
  const gotItDoor = gotIt ? <GotItDoorRegistration shoppingCards={shoppingCards} newestAsOf={newestAsOf} /> : null;
  const standInsSheet = swapTools ? (
    <>
      {swapTools.standIns ? (
        <StandInsSheet
          card={swapTools.standIns}
          newestAsOf={newestAsOf}
          onClose={swapTools.closeStandIns}
          fromCard={swapTools.standInsFromCard}
        />
      ) : null}
      {/* The card modal's door, for a card a Shopping row opened (swap tools PR 4c). */}
      {/* The list rows alone: a commander's row opens no door to stand-ins (H28). */}
      <StandInDoorRegistration shoppingCards={listShoppingCards} newestAsOf={newestAsOf} />
    </>
  ) : null;
  // The list rows alone, for the reason the count is rows: a commander's row draws no limit mark
  // (H28), so counting it would name a row the reader cannot find marked.
  const shoppingOverCount = swapTools
    ? listShoppingCards.filter((c) => isOverLimit(c.price, newestAsOf, swapTools.limitCents)).length
    : 0;

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

  // Each spent card is out of the deck's counts already, so it is grouped
  // alongside the live ones only to be marked — which is what puts its undo row
  // where the card's own row was rather than at the end of the list. Any other
  // path that puts a card back — quick-add, a suggestion tile — returns it to
  // `cards` optimistically, and that one slot steps aside for the live row; the
  // other receipts standing are untouched.
  //
  // Under Shopping the test is the filter's own predicate rather than
  // `!card.owned`: a spoken-for card is owned, so the old test would unmount
  // its row with no undo receipt — the one case #185 exists to prevent.
  const spentCards = spentSlots.filter(
    (slot) =>
      !cards.some((c) => c.oracleId === slot.oracleId) &&
      (filter === "all" || isShoppingCard(slot)),
  );
  const spentOracleIds = new Set(spentCards.map((c) => c.oracleId));
  const isSpentCard = (c: DeckDetailCard) => spentOracleIds.has(c.oracleId);
  // I got it's held slots, Shopping only: a bought row, as it was drawn, while the fresh list no
  // longer bills the card. A row that stays (claimed, partial) is still on the list and redraws in
  // place; an undo puts the card back on the list and the slot steps aside for the row. Like a
  // spent slot it is listed only to be placed, and no figure counts it: the tab count, the group
  // counts, the total and the Mana Pool link read the fresh list and move at once.
  const heldCards = filter === "shopping" && gotIt && gotIt.held.size > 0
    ? [...gotIt.held.values()].filter(
        (h) => !shoppingCards.some((c) => c.oracleId === h.oracleId) && !spentOracleIds.has(h.oracleId),
      )
    : [];
  const heldOracleIds = new Set(heldCards.map((c) => c.oracleId));
  const isHeldCard = (c: DeckDetailCard) => heldOracleIds.has(c.oracleId);
  // A held card whose slot has been drawn LEFT the list in this read. Recorded at render, as state
  // adjusted during render rather than in an effect, and pruned to the held map, so it ends with
  // the read. A held card billed again after leaving is a row an undo brought back: it fades in
  // where its slot was from its first frame. A row that stayed was billed all along, so it never
  // left and never fades.
  const leftNow = new Set([...slotsLeft].filter((id) => gotIt?.held.has(id)));
  heldOracleIds.forEach((id) => leftNow.add(id));
  if (leftNow.size !== slotsLeft.size || [...leftNow].some((id) => !slotsLeft.has(id))) setSlotsLeft(leftNow);
  const cameBack = (c: DeckDetailCard) => !isHeldCard(c) && leftNow.has(c.oracleId);
  const heldCommanders = heldCards.filter((c) => c.commander === true);
  const heldBody = heldCards.filter((c) => c.commander !== true);
  const listedCards = spentCards.length > 0 || heldBody.length > 0
    ? [...visibleCards, ...spentCards, ...heldBody]
    : visibleCards;

  // A spent slot draws the undo receipt and returns before the brass rule
  // (`decklist-row.tsx:282`), so a pending change on that card is a mark the
  // reader cannot see. Every figure that counts marks reads these two rather
  // than `pendingChanges` directly — the caption, the group note and Shopping's
  // own caption all answer "how many marked rows are on this screen".
  const isMarked = (c: DeckDetailCard) => pendingChanges.has(c.oracleId) && !isSpentCard(c) && !isHeldCard(c);
  const spentMarkedCount = spentCards.filter((c) => pendingChanges.has(c.oracleId)).length;
  const markedPendingCount = pendingChanges.size - spentMarkedCount;

  // Group the visible cards
  const groups =
    grouping === "type"
      ? groupByCardType(listedCards, compareCards)
      : groupByRole(listedCards, compareCards);

  // Flattened in render order, so Prev/Next walks the list the way the eye does — across
  // group boundaries rather than restarting inside each one. Carries each card's own art
  // (H23 carousel PR 1b), so the modal's neighbor plates resolve without a second fetch.
  const orderedIds = groups
    .flatMap(([, groupCards]) => groupCards)
    .filter((c) => !spentOracleIds.has(c.oracleId))
    .map((c) => ({ oracleId: c.oracleId, name: printedNameOf(c), imageUri: c.imageUri }));

  // Every branch below draws the bar as `key="deck-bar"` in a column `div`, so moving between the list, Stats and
  // Notes keeps the same mounted bar and the tab an arrow key just focused.
  if (notesOpen) {
    // The picker's "In this deck" group: this deck's cards and its commanders, by the name the deck draws.
    const noteCards = [...cards.map((c) => ({ oracleId: c.oracleId, name: c.name, typeLine: c.typeLine, imageUri: c.imageUri ?? null })),
      ...[commander, partner].flatMap((c) => (c ? [{ oracleId: c.oracleId, name: c.name, typeLine: c.typeLine, imageUri: c.imageUri ?? null }] : []))];
    return (
      <div className="flex flex-col">
        <GroupToggle
          key="deck-bar"
          allCount={built}
          shoppingCount={shoppingCount}
          filter={filter}
          grouping={grouping}
          onFilterChange={onFilterChange}
          onGroupingChange={onGroupingChange}
          view={view}
          onViewChange={chooseView}
          shoppingCards={shoppingList}
          sort={sort}
          onSortChange={setSort}
          stats={stats}
          notes={notes}
          {...lockProps}
        />
        <DeckBarPanel value="notes">
        <HoverPreviewProvider>
          <DeckNotesPanel deckId={deckId} notes={notesData ?? NO_NOTES} deckCards={noteCards} />
        </HoverPreviewProvider>
        </DeckBarPanel>
      </div>
    );
  }

  if (statsOpen) {
    return (
      <div className="flex flex-col">
        <GroupToggle
          key="deck-bar"
          allCount={built}
          shoppingCount={shoppingCount}
          filter={filter}
          grouping={grouping}
          onFilterChange={onFilterChange}
          onGroupingChange={onGroupingChange}
          view={view}
          onViewChange={chooseView}
          shoppingCards={shoppingList}
          sort={sort}
          onSortChange={setSort}
          stats={stats}
          notes={notes}
          {...lockProps}
        />
        <DeckBarPanel value="stats">
        <DeckStatsView data={statsSlice} onShop={() => onFilterChange("shopping")} onLogGame={onLogGame} />
        </DeckBarPanel>
      </div>
    );
  }

  // Shopping view: role-grouped with gap clauses, intro, and footer.
  if (filter === "shopping") {
    // Owned cards only. The design draws "3 · closes 7→10", where from + n = to,
    // so `from` is where the deck stands before the purchase — counting the
    // unowned cards here would credit the player with the very cards the group
    // is asking them to buy.
    const roleCounts = countRoles(cards.filter((c) => c.owned));

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
    const notSpent = (c: DeckDetailCard) => !isSpentCard(c) && !isHeldCard(c);
    // A row that STAYED after I got it (claimed or partial) redraws in place and joins Spoken for
    // only at the next read (C2, C3): the card is owned now, so the filter alone would move it at
    // once. It stays in the group the provider's held copy was drawn in, cleared on the same
    // triggers as the held slot.
    const pinnedMissing = (c: DeckDetailCard) =>
      c.owned && !isHeldCard(c) && gotIt?.held.get(c.oracleId)?.owned === false;
    const spokenForCards = listedCards.filter((c) => isSpokenFor(c) && !pinnedMissing(c));
    const missingCards = listedCards.filter((c) => !c.owned || pinnedMissing(c));
    // A pinned row is owned, so `from` already counts it: the clause's `n` leaves it out, or
    // from + n would overshoot `to` by its copies.
    const moveable = (c: DeckDetailCard) => notSpent(c) && !pinnedMissing(c);

    // The marked rows this branch actually draws — the three groups below hold
    // every row it has. The rows carry the brass rule here exactly as they do
    // under All, so the caption has to come with them; what changes is the
    // figure, which counts the marks on screen rather than the whole draft. A
    // caption counting rows the reader cannot see would be a caption about
    // nothing, and no caption at all leaves the rule unexplained.
    const markedOnScreen = new Set(
      [...missingCards, ...spokenForCards].filter(isMarked).map((c) => c.oracleId),
    ).size;

    // Build shopping groups: only roles that have ROLE_TARGETS (no land or other).
    // Under `By type` these are not built at all — the sections below come from
    // the card types instead. The gap clause is role arithmetic ("closes 7→10"
    // is a statement about a role's target), so a type section carries none.
    const shoppingRoleGroups = SHOPPING_ROLE_ORDER.flatMap((role) => {
      const roleCards = missingCards.filter((c) => c.role === role);
      if (roleCards.length === 0) return [];
      const from = roleCounts[role];
      const listed = cardCopies(roleCards.filter(moveable));
      // Where the deck lands if the player buys this group, not the baseline.
      // For a group the fill built they are the same number — the fill buys a
      // role up to its target and no further, so from + n is the target. They
      // part company once the player adds unowned cards of their own, and there
      // the baseline would draw arithmetic the list cannot honour: "5 · closes
      // 9→10", or, past a role already covered, the backwards "3 · closes 12→10".
      // By label, the cards that move the count are the ones whose label names this role, which can
      // be fewer than the group's size (the group is the classifier's), so `to` stays the figure the
      // strip will read after the purchase.
      const moves = countRoles.byLabel
        ? cardCopies(roleCards.filter(moveable).filter((c) => {
            // An unlabeled card is the classifier's call, and the group is already its role.
            const rows = labelRows?.[c.oracleId];
            return rows ? labelRolesOf(rows).includes(role) : true;
          }))
        : listed;
      // `n` is what moves the count, so from + n = to holds on either basis.
      const n = moves;
      const to = from + n;
      const gapClause = recommendationsCopy.shopping.groupGap(
        String(n),
        String(from),
        String(to),
      );
      return [{ key: role, label: SHOPPING_ROLE_LABELS[role], cards: roleCards, gapClause }];
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
    // The two halves of `n` include the commanders (H28), each on the side its row is on, so the
    // intro's and footer's split still sums to the pill. The spoken-for GROUP's own clause counts
    // its own rows, below, and a commander is never in that group.
    const commanderSpokenForN = cardCopies(commanderShopping.filter(isSpokenFor));
    const spokenForGroupN = cardCopies(spokenForCards.filter(notSpent));
    const spokenForN = spokenForGroupN + commanderSpokenForN;
    const missingN = cardCopies(missingCards.filter(notSpent))
      + cardCopies(commanderShopping) - commanderSpokenForN;

    // A spent slot draws an UNDO RECEIPT rather than a row — `DecklistRow`
    // returns `UndoRow` before it reaches the buy tag — but H29's "no row
    // shifts" asks for its receipt to sit where the card's own row sat, which
    // under price order means ranked at the card's OWN price. This reverses
    // the earlier rule (ranked as drawn, with no figure, so last): that rule
    // moved every row below a removed dear card the moment it was cut, which
    // is exactly the shift H29 exists to stop. So the comparator sees each
    // card's real price, spent or not, and `rankAsDrawn` is gone.

    // The sections this list draws, in the order it draws them — and the one
    // place the grouping toggle reaches Shopping. `By role` is the list the
    // design draws: the four targeted roles, then everything else, then the
    // contested rows pinned last with the clause that says why they close
    // nothing. `By type` asks a different question of the same rows, so it
    // groups all of them — missing and spoken-for alike — by card type and
    // carries no arithmetic, the roles being what that arithmetic is about.
    const shoppingSections: {
      key: string;
      label: string;
      cards: DeckDetailCard[];
      gapClause?: string;
    }[] = [
      // The commanders head the list under either grouping (H28), in a group of their own and
      // never among the types or roles: neither is a list card, and a role's arithmetic is about
      // the 99. No clause, for the reason a type section carries none.
      ...(commanderShopping.length + heldCommanders.length > 0
        ? [{
            key: "commander",
            label: recommendationsCopy.shopping.commanderGroupLabel(commanderShopping.length + heldCommanders.length),
            // A bought commander holds its slot here, as a body row does in its group.
            cards: [...commanderShopping, ...heldCommanders],
          }]
        : []),
      ...(grouping === "type"
        ? groupByCardType([...missingCards, ...spokenForCards]).map(([group, groupCards]) => ({
            key: group,
            label: group,
            cards: groupCards,
          }))
        : [
            ...shoppingRoleGroups,
            ...(otherShoppingCards.length > 0
              ? [{ key: "other", label: "Other", cards: otherShoppingCards }]
              : []),
            ...(spokenForCards.length > 0
              ? [{
                  key: "spoken-for",
                  label: recommendationsCopy.shopping.spokenForGroupLabel,
                  cards: spokenForCards,
                  gapClause: recommendationsCopy.shopping.spokenForGroupClause(String(spokenForGroupN)),
                }]
              : []),
          ]),
    // Dearest first, inside whichever grouping is open. A shopping list is read
    // to decide what to buy, and the decision is made on the figures — so the
    // rows carrying them come first, and the ones the feed has nothing for go
    // last rather than sorting as though they were free. Applied here, to the
    // sections rather than inside either branch, so the role groups, the type
    // groups, `Other` and the pinned spoken-for group all order the same way
    // and none of them can be forgotten. Every count, clause and total above is
    // computed already and reads the same rows in any order.
    ].map((section) => ({
      ...section,
      cards: section.cards.slice().sort(compareCards),
    }));

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
          <SweepReceipt removed={sweptCount} stayed={sweptLockedCount} onUndo={onRestoreAuto} />
        )}
      </>
    );

    // Empty shopping list — branch on whether the deck was ever filled.
    // The compliment ("Nothing to buy. Your collection covered it.") belongs only to
    // a deck the fill actually ran on. A deck the player built by hand that
    // happens to own everything it lists must not be congratulated on a fill
    // that never ran.
    // `spentCards.length === 0` for the same reason `builder-shell.tsx` guards
    // its own empty state on it: swapping the list for an empty state would
    // take every standing undo row with it, and the player has nowhere else to
    // undo from. A swap's open sheet and its receipts hold the empty state off
    // for the same reason: a take can empty the list, and Undo swap lives in
    // the receipt.
    if (n === 0 && spentCards.length === 0 && heldCards.length === 0 && !swapTools?.standIns && !swapTools?.receipts.length) {
      return (
        <div className="flex flex-col">
          <GroupToggle
            key="deck-bar"
            allCount={built}
            shoppingCount={shoppingCount}
            filter={filter}
            grouping={grouping}
            onFilterChange={onFilterChange}
            onGroupingChange={onGroupingChange}
            view={view}
            onViewChange={chooseView}
            autoCount={autoCount}
            keptCount={keptCount}
            sweepPending={sweepPending}
            keepAllPending={keepAllPending}
            autoControls={autoControls}
            priceSummary={priceSummary}
            provenance={provenance}
            shoppingCards={shoppingList}
          shoppingOverCount={shoppingOverCount}
            sort={sort}
            onSortChange={setSort}
            onSortAnnounce={onAnnounce}
            draftNote={draftNote}
            stats={stats}
            notes={notes}
            {...lockProps}
          />
          <DeckBarPanel value={filter}>
          <div className="px-[16px] pt-[12px] md:px-[26px] md:pt-[14px] empty:hidden">
            {keyLine}
          </div>
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
          {/* A deck with nothing left to buy can still have tokens joined: they are the list. */}
          <div className="px-[16px] pb-[4px] md:px-[26px]">
            <TokensShoppingGroup />
          </div>
          </DeckBarPanel>
        </div>
      );
    }

    // Prev/Next in the card detail modal walks the list the eye does, so the
    // ids come from the rendered groups rather than from `shoppingCards`, whose
    // deck order the role grouping below discards.
    // Where each receipt draws (swap tools, PR 4b). Under its row while copies of the cut remain;
    // else in the section the cut sat in, by the same rules that section the rows above; else, that
    // section gone with its last row, in a section of the same name (one per section, however many).
    const receipts = swapTools?.receipts ?? [];
    const onList = new Set(shoppingSections.flatMap((s) => s.cards.map((c) => c.oracleId)));
    const receiptsUnder = (oracleId: string) => receipts.filter((r) => r.cutOracleId === oracleId);
    const detached = receipts.filter((r) => !onList.has(r.cutOracleId));
    const receiptsInSection = (key: string) => detached.filter((r) => receiptHome(r.cutCard, grouping).key === key);
    const orphanSections = [
      ...new Map(
        detached
          .map((r) => receiptHome(r.cutCard, grouping))
          .filter((home) => !shoppingSections.some((s) => s.key === home.key))
          .map((home) => [home.key, home.label] as const),
      ),
    ].map(([key, label]) => ({ key, label, cards: [] as DeckDetailCard[], gapClause: undefined }));
    const shoppingOrderedIds = shoppingSections
      .flatMap((section) => section.cards)
      .filter((c) => !spentOracleIds.has(c.oracleId) && !heldOracleIds.has(c.oracleId))
      .map((c) => ({ oracleId: c.oracleId, name: printedNameOf(c), imageUri: c.imageUri }));

    return (
      <div className="flex flex-col">
        {/* The header's commander pages on into the list this view draws, in its order. */}
        <PublishDeckSiblings list={shoppingOrderedIds} />
        {standInsSheet}
        {gotItDoor}
        <GroupToggle
          key="deck-bar"
          allCount={built}
          shoppingCount={shoppingCount}
          filter={filter}
          grouping={grouping}
          onFilterChange={onFilterChange}
          onGroupingChange={onGroupingChange}
          view={view}
          onViewChange={chooseView}
          autoCount={autoCount}
          keptCount={keptCount}
          sweepPending={sweepPending}
          keepAllPending={keepAllPending}
          autoControls={autoControls}
          priceSummary={priceSummary}
          provenance={provenance}
          shoppingCards={shoppingList}
          shoppingOverCount={shoppingOverCount}
          sort={sort}
          onSortChange={setSort}
          onSortAnnounce={onAnnounce}
          draftNote={draftNote}
          stats={stats}
          notes={notes}
            {...lockProps}
        />
        <DeckBarPanel value={filter}>

        <div className="px-[16px] pt-[12px] md:px-[26px] md:pt-[14px] empty:hidden">
          {keyLine}
        </div>

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

          {/* The list's sections — role groups under `By role`, card types under
              `By type`. One map, because the only difference between a role
              section and a type one is the label and whether a clause rides
              beside it; three near-identical blocks is how the two groupings
              came to disagree about what a Shopping row looks like. */}
          {[
            ...shoppingSections,
            // A receipt whose section has gone (the cut was its last row) heads a section of that name.
            ...orphanSections,
          ].map(({ key, label, cards: groupCards, gapClause }) => (
            <div key={key} className="mb-[16px] md:mb-[20px]">
              <DecklistGroupHeader
                label={label}
                count={cardCopies(groupCards.filter(notSpent))}
                gapClause={gapClause}
              />
              <div
                className="flex flex-col gap-[3px] md:grid md:gap-y-[4px] md:gap-x-[20px]"
                // `minmax(0, 1fr)`, never a bare `1fr`: a bare track never shrinks below its widest row's
                // min-content, so one row with a long run of fixed pieces pushed the page sideways.
                style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}
              >
                {placeReceipts(groupCards, receiptsInSection(key), sort.key, compareCards).map((item) => {
                  if ("receipt" in item) return <SwapReceiptRow key={item.receipt.swapId} receipt={item.receipt} />;
                  const card = item.card;
                  const row = (
                    <DecklistRow
                      deckId={deckId}
                      card={card}
                      siblings={shoppingOrderedIds}
                      spent={isSpentCard(card)}
                      held={isHeldCard(card)}
                      cameBack={cameBack(card)}
                      shoppingFigure={figureFor(card.oracleId)}
                      inShopping
                      newestAsOf={newestAsOf}
                    />
                  );
                  const under = receiptsUnder(card.oracleId);
                  // One copy fewer: the row stays, and its receipt sits under it in the same grid cell.
                  // Keyed apart while held, so the slot and the row it gives back are each mounted
                  // fresh and each fades in, rather than one element changing its contents.
                  const k = isHeldCard(card) ? `held:${card.oracleId}` : card.oracleId;
                  return under.length ? (
                    <div key={k} className="flex flex-col gap-[4px]">
                      {row}
                      {under.map((r) => <SwapReceiptRow key={r.swapId} receipt={r} />)}
                    </div>
                  ) : (
                    <Fragment key={k}>{row}</Fragment>
                  );
                })}
              </div>
            </div>
          ))}

          {/* The tokens joined to this deck: last, and not the deck's (they move none of the figures above). */}
          <TokensShoppingGroup />

          {/* Footer — above a 1px --border rule */}
          <div
            className="pt-[10px] mt-[4px] font-mono text-[10.5px]"
            style={{ color: "var(--fg-faint)", borderTop: "1px solid var(--border)" }}
          >
            {spokenForN === 0
              ? recommendationsCopy.shopping.footer(String(n))
              : missingN === 0
                ? recommendationsCopy.shopping.footerOnlySpokenFor(String(spokenForN))
                : recommendationsCopy.shopping.footerSplit(String(n), String(missingN), String(spokenForN))}
          </div>
        </HoverPreviewProvider>
        </DeckBarPanel>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* The header's commander pages on into the list this view draws, in its order. A view that
          draws no list (notes, stats, an empty Shopping) publishes none, so it pages alone. */}
      <PublishDeckSiblings list={orderedIds} />
      {standInsSheet}
      {gotItDoor}
      {/* Toggle bar */}
      <GroupToggle
        key="deck-bar"
        allCount={built}
        shoppingCount={shoppingCount}
        filter={filter}
        grouping={grouping}
        onFilterChange={onFilterChange}
        onGroupingChange={onGroupingChange}
        view={view}
        onViewChange={chooseView}
        autoCount={autoCount}
        keptCount={keptCount}
        sweepPending={sweepPending}
        keepAllPending={keepAllPending}
        autoControls={autoControls}
        priceSummary={priceSummary}
        provenance={provenance}
        shoppingCards={shoppingList}
          shoppingOverCount={shoppingOverCount}
        sort={sort}
        onSortChange={setSort}
        onSortAnnounce={onAnnounce}
        draftNote={draftNote}
        stats={stats}
        notes={notes}
            {...lockProps}
      />
      <DeckBarPanel value={filter}>

      {/* The decoder, on the PRIMARY view. It was in the Shopping branch alone,
          which is the one view a printed card is never in — so the surface that
          actually draws `P` had nothing to decode it. */}
      <div className="px-[16px] pt-[12px] md:px-[26px] md:pt-[14px] empty:hidden">
        {keyLine}
      </div>

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
            stayed={sweptLockedCount}
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
            sentence. The draft's figure less any spent slot, because this list
            holds every changed row that still draws a rule; Shopping draws its
            own caption over the subset it shows.

            BOTH VIEWS since card captions (R1) call B. It was list-only, and the
            stated reason was that the card view's tiles carried no mark at all,
            so the sentence would have pointed at a marker nobody could see. The
            tiles carry the mark now — a 2px accent edge on the caption, and the
            draft's figure in the count's position — so the caption describes
            something the reader can find on either view. */}
        {markedPendingCount > 0 && (
          <p className="m-0 mb-[8px] font-mono text-[10px] text-[color:var(--fg-faint)]">
            {deckVersioningCopy.pending.changeListCaption(markedPendingCount)}
          </p>
        )}
        {groups.map(([label, groupCards]) => {
          // Omitted at zero rather than printed as `0 changed in this draft`: a
          // group the draft did not touch has nothing to say about it.
          //
          // Both views, for the reason the caption above gives: this note is the
          // heading's half of one mark, and since card captions (R1) the card
          // view's tiles have drawn the other half.
          const changedInGroup = groupCards.filter(isMarked).length;
          return (
            <DecklistGroup
              key={label}
              deckId={deckId}
              label={label}
              cards={groupCards}
              view={view}
              spentOracleIds={spentOracleIds}
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
          mix={mix}
          deckId={deckId}
          rows={visibleUnresolved}
          cards={cards}
          deckOracleIds={deckOracleIds}
          commanderOracleId={commanderOracleId}
          onExpandedChange={onUnresolvedExpandedChange}
        />

        {/* The tokens these cards make: not the deck, after every group of it. Draws nothing without the
            provider, so the list is exactly itself wherever the switch is off. */}
        <TokensGroup />
      </HoverPreviewProvider>
      </DeckBarPanel>
    </div>
  );
}
