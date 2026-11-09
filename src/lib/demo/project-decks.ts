// The landing demo's deck projections (plan 2026-11-08-public-landing-demo.md, "The demo's data"; PR 6b): steps 4
// (the three decks' rows), 7 (Giada's proposed cuts, Zimone's Mana Balance and Top off) and 8 (Which deck needs it
// most?). Siblings of `project.ts`, on its rules: each takes what the signed-in surface's own loaders returned and gives
// the data its drawing half takes, nothing else (no UI state, no callback, no database, no request). Pure, so each is
// tested on synthetic input, and `scripts/demo-export.mts` is only the loaders and the file write around them.
//
// A projection never invents a figure: every number and string in its result is one a loader gave, assembled by the
// same pure functions the signed-in page assembles it with.
import type { SiblingCard } from "../../components/cards/card-detail-context";
import type { FitsViewDrawingProps, FitsViewList } from "../../components/cards/fits-view-drawing";
import type { CandidateFacts } from "../bracket/delta";
import type { NoteCounts } from "../bracket/card-note";
import type { Bracket } from "../bracket/types";
import { commanderDisplayName, printedNameOf } from "../cards/printed-name";
import type { Availability } from "../cards/availability";
import type { ComboPartner } from "../combos/near-miss";
import type { SynergyCard } from "../commanders/synergy-cards";
import { assembleDeckCards, assembleTopOffCandidates } from "../decks/assemble-cards";
import { findingArtOf, ledgerAvailabilityOf, runFiguresOf, type FindingArt, type LedgerAvailability, type RunFigures } from "../decks/builder-figures";
import { deckBodySize } from "../decks/deck-size";
import { deckCounts, groupByCardType, unresolvedCardCount, type DeckDetailCard } from "../decks/grouping";
import { poolEmptiedByNegativeCut, type TopOffCandidateWithFacts } from "../decks/last-slots";
import type { PriceRead } from "../decks/price-query";
import type { DeckDetail } from "../decks/read";
import { commanderShoppingRows } from "../decks/shopping";
import type { JobRowsByCard } from "../decks/job-tally";
import type { RecommendedMix } from "../decks/mix";
import { deckCardComparator } from "../decks/sort-cards";
import { DEFAULT_DECK_SORT } from "../decks/sort-memory";
import type { FitsRead } from "../swaps/fits";
import { fitsCounts } from "../swaps/fits-counts";
import type { FitsReadPanel } from "../swaps/fits-read-run";
import type { CutsPanel } from "../tuning/cuts-state";
import type { ManaPanelData } from "../tuning/mana-view";

/** The three decks the demo is shot on (fixture cast, `scripts/lib/fictional-fixture/cast.ts`): Ashling at exactly 100,
 *  Giada over (Look deeper), Zimone under (Top off). */
export type DemoDeckRole = "played" | "over" | "under";

type Assembled = ReturnType<typeof assembleDeckCards>;

/** Step 4, one deck as `/decks/[id]` hands it to the builder, for the decklist's rows, marks and key line. */
export type DemoDeck = {
  /** The fixture's fixed deck id (`ABOUT_DECK_IDS`, a name-based uuid), which the drawing halves key on. */
  id: string;
  /** The deck's name (named `deckName` so the name scan checks it against the fixture's list). */
  deckName: string;
  /** The rows, priced and combo-marked (`assembleDeckCards`, the page's own assembly). */
  cards: DeckDetailCard[];
  commander: Assembled["commander"];
  partner: Assembled["partner"];
  /** The newest price date the deck's price read saw: the rows' over-limit and staleness rules read it. */
  newestAsOf: Date | null;
  /** What card details page through from this deck, in the decklist's own order for a first visit (grouped by type, sorted
   *  `DEFAULT_DECK_SORT.all`, commanders first): `orderedIds` in `decklist.tsx`. */
  siblings: SiblingCard[];
  /** The mark key's one input beyond the rows (`buildMarkKeyEntries`' `commanderRows`): the commanders the Shopping list
   *  bills, through `commanderShoppingRows`. */
  commanderShopping: DeckDetailCard[];
};

export function projectDeck(input: {
  deckId: string;
  detail: DeckDetail;
  priced: PriceRead | null;
  inDeckCombos: ReadonlyMap<string, ComboPartner> | null;
}): DemoDeck {
  const { deckId, detail, priced, inDeckCombos } = input;
  const { cards, commander, partner } = assembleDeckCards({ deckId, detail, priced, inDeckCombos });
  const newestAsOf = priced?.newestAsOf ?? null;
  const sort = DEFAULT_DECK_SORT.all;
  const groups = groupByCardType(cards, deckCardComparator(sort.key, sort.direction, newestAsOf));
  const siblings: SiblingCard[] = [
    ...[commander, partner].flatMap((c) =>
      c ? [{ oracleId: c.oracleId, name: commanderDisplayName(c), imageUri: c.imageUri, colorIdentity: c.colorIdentity }] : [],
    ),
    ...groups
      .flatMap(([, groupCards]) => groupCards)
      .map((c) => ({ oracleId: c.oracleId, name: printedNameOf(c), imageUri: c.imageUri, foil: c.foil })),
  ];
  return {
    id: deckId,
    deckName: detail.name,
    cards,
    commander,
    partner,
    newestAsOf,
    siblings,
    commanderShopping: commanderShoppingRows(commander, partner, cards),
  };
}

/**
 * Steps 5 and 6 on the played deck (Ashling): what the builder derives from its rows for the Analysis tab and Suggested
 * changes, beside the stored outputs lane 21's `DemoAnalysis` and `DemoSuggested` carry. Each through the builder's own
 * function (`builder-figures.ts`).
 */
export type DemoPlayedDeck = DemoDeck & {
  analysis: {
    /** A finding receipt's names and art (`findingArtOf`). */
    art: FindingArt;
    /** The benchmark ledger's copy marks (`ledgerAvailabilityOf`). */
    ledgerAvailability: LedgerAvailability;
  };
  /** A v2 run's group heads (`runFiguresOf`): the deck's count per type group, and its have and target per role. */
  runFigures: RunFigures;
  /** The brackets the stored reading permits (`readStoredPermits`), null with no reading: Suggested changes' `permits`. */
  permits: Bracket[] | null;
  /** The bracket the player declared (`decks.declared_bracket`): Suggested changes' `declared`. */
  declared: Bracket | null;
};

export function projectPlayedDeck(deck: DemoDeck, input: {
  detail: Pick<DeckDetail, "declaredBracket">;
  /** The deck's label rows as the page settles them (`settleLabelRead`), null when the read failed. */
  labelRows: JobRowsByCard | null;
  /** The mix the page's shelves count against: the suggestions' mix, or the classifier's when the label read failed. */
  mix: RecommendedMix;
  permits: Bracket[] | null;
}): DemoPlayedDeck {
  return {
    ...deck,
    analysis: {
      art: findingArtOf(deck.cards, deck.commander, deck.partner),
      ledgerAvailability: ledgerAvailabilityOf(deck.cards, deck.commander, deck.partner),
    },
    runFigures: runFiguresOf(deck.cards, input.labelRows, input.mix).runFigures,
    permits: input.permits,
    declared: input.detail.declaredBracket,
  };
}

/** Step 7, Giada's deck: the Proposed cuts panel's read (`CutsView`'s `panel`), the stored Look deeper run included. */
export type DemoCuts = CutsPanel;

export function projectCuts(panel: CutsPanel | null): DemoCuts {
  if (!panel) throw new Error("projectCuts: the cuts panel read nothing for the over deck (not the owner's, or no such deck)");
  return panel;
}

/** Step 7, Zimone's deck: Mana Balance's free count (`ManaBalanceView`'s `data`). */
export type DemoMana = ManaPanelData;

export function projectMana(data: ManaPanelData | null): DemoMana {
  if (!data) throw new Error("projectMana: Mana Balance read nothing for the under deck (not the owner's, or a catalog read failed)");
  return data;
}

/** Step 7, Zimone's deck: the Top off list's data props (`LastSlotsStrip` and `TopOffList`), as the builder derives them. */
export type DemoTopOff = {
  /** The whole ranked pool in rank order, assembled as the page assembles it (`assembleTopOffCandidates`). */
  candidates: TopOffCandidateWithFacts[];
  /** The pool is empty only because EDHREC argues against every card left (`poolEmptiedByNegativeCut`). */
  allNegative: boolean;
  openSlots: number;
  bodySize: number;
  deckOracleIds: Set<string>;
  newestAsOf: Date | null;
  declaredBracket: Bracket | null;
  noteCounts: NoteCounts;
};

export function projectTopOff(input: {
  /** The deck's rows as the builder holds them (`DemoDeck.cards`). */
  cards: DeckDetailCard[];
  detail: Pick<DeckDetail, "partner" | "unresolvedRows" | "declaredBracket" | "noteCounts">;
  /** `readSynergyCards` over the deck's commanders, with images: the ranked support list. */
  ranked: SynergyCard[];
  /** The pool the strip offers, as the caller cut it from `ranked` (`listLastSlotsCandidates`) and priced it. */
  candidateCards: SynergyCard[];
  ownedArt: ReadonlyMap<string, string>;
  priced: PriceRead | null;
  availability: ReadonlyMap<string, Availability> | null;
  candidateFacts: ReadonlyMap<string, CandidateFacts> | null;
  completions: ReadonlyMap<string, ComboPartner> | null;
}): DemoTopOff {
  const { cards, detail, ranked } = input;
  const inDeckOracleIds = new Set(cards.map((c) => c.oracleId));
  const bodySize = deckBodySize(detail.partner !== null);
  return {
    candidates: assembleTopOffCandidates({
      candidateCards: input.candidateCards,
      ownedArt: input.ownedArt,
      priced: input.priced,
      availability: input.availability,
      candidateFacts: input.candidateFacts,
      completions: input.completions,
    }),
    allNegative: poolEmptiedByNegativeCut({ ranked, inDeckOracleIds }),
    openSlots: bodySize - deckCounts(cards, unresolvedCardCount(detail.unresolvedRows)).total,
    bodySize,
    deckOracleIds: inDeckOracleIds,
    newestAsOf: input.priced?.newestAsOf ?? null,
    declaredBracket: detail.declaredBracket,
    noteCounts: detail.noteCounts,
  };
}

/** Step 8, Which deck needs it most?: the data half of `FitsViewDrawingProps` (lane 58's `fits-view-drawing.tsx`), never
 *  its UI state or callbacks, which the demo host supplies. */
/** The read panel as the demo carries it: the stored read, the free list and the names, art and commanders it draws.
 *  Never the owner's live state: the allowance (their credits) and the per-deck plan sources the drawing does not read
 *  are dropped, and the demo host supplies an allowance of its own. */
export type DemoFitsPanel = Pick<FitsReadPanel, "fits" | "view" | "candidates" | "names" | "images" | "commanderIds">;

export type DemoFits = Pick<FitsViewDrawingProps, "card" | "name" | "owned" | "freeNow" | "countsKnown"> & {
  panel: DemoFitsPanel | null;
  /** `loadFitsAction`'s read: the free list of decks. The rest of `FitsViewList` is the view's state. */
  list: Pick<FitsViewList, "read">;
};

export function projectFits(input: {
  /** The card as the collection opens it. */
  card: { oracleId: string; name: string; printedName: string | null; colorIdentity: string[]; quantity: number; availability: Pick<Availability, "free"> | null };
  panel: FitsReadPanel | null;
  read: FitsRead | null;
}): DemoFits {
  const { card, panel, read } = input;
  if (read && read.card.oracleId !== card.oracleId) throw new Error("projectFits: the free list is about another card");
  if (panel && panel.fits.card.oracleId !== card.oracleId) throw new Error("projectFits: the read panel is about another card");
  // The name and counts by the picker's own rule (`fitsCounts`), as the view opens: nothing added or written yet.
  const { name, owned, freeNow, countsKnown } = fitsCounts({ card, read, spent: false });
  // Named field by field, so a field the read gains later is left out until someone decides the demo may carry it.
  const kept: DemoFitsPanel | null = panel
    ? { fits: panel.fits, view: panel.view, candidates: panel.candidates, names: panel.names, images: panel.images, commanderIds: panel.commanderIds }
    : null;
  return {
    card: { oracleId: card.oracleId, colorIdentity: card.colorIdentity },
    name,
    owned,
    freeNow,
    countsKnown,
    panel: kept,
    list: { read },
  };
}
