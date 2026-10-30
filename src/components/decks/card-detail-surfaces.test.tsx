// Every deck surface that names a card must open the detail modal (#127, #91),
// quick add included since its popup became a grid (small items 2, item 6b). One
// file because the assertion is the same across surfaces; only the component
// under it changes.

import type { SearchResult } from "../../app/decks/[id]/search-action";
import { EMPTY_NOTE_COUNTS } from "../../lib/bracket/card-note";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BrowseCard } from "../../lib/collection/browse";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import type { DeckDetail } from "../../lib/decks/read";
import type { DeckSuggestionWithFacts } from "../../lib/decks/suggest";
import { CardDetailProvider, cardDetailCopy } from "../cards/card-detail-provider";
// The modal is loaded on demand; loaded here, after the mocks, a press draws it in the same tick.
await (await import("../cards/card-detail-provider")).warmCardModal();
import { BuilderSpine } from "./builder-spine";
import { Decklist } from "./decklist";
import { SuggestionTile } from "./suggestion-tile";
import { QuickAddBar } from "./quick-add-bar";
import { recommendedMix } from "../../lib/decks/mix";

/** The asserted baseline, through the real function rather than restated — a hand-built
 *  literal drifts from the type the moment a field is added, which is how 120 of these broke. */
const TEST_MIX = recommendedMix(null, false);

vi.mock("../../app/decks/actions", () => ({
  addCardToDeck: vi.fn(),
  removeCardFromDeck: vi.fn(),
}));

// Typed, so a hand-built result that leaves out a required field fails typecheck rather than
// reaching the row as `undefined` — which is how a stand-in with no `facts` draws no note.
const { searchCards } = vi.hoisted(() => ({
  searchCards: vi.fn<(...args: unknown[]) => Promise<SearchResult[]>>(),
}));
vi.mock("../../app/decks/[id]/search-action", () => ({ searchCards }));

const deckCard = (over: Partial<DeckDetailCard> = {}): DeckDetailCard => ({
  oracleId: "o-signet",
  name: "Arcane Signet",
  typeLine: "Artifact",
  cardTypeGroup: "Artifacts",
  role: "ramp",
  cmc: 2,
  owned: true,
  quantity: 1,
  auto: false,
  printedName: null,
  printedSetCode: null,
  printedCollectorNumber: null,
  ...over,
});

function renderInProvider(ui: React.ReactNode) {
  const fetchCard = vi.fn<(id: string) => Promise<BrowseCard | null>>().mockResolvedValue(null);
  render(<CardDetailProvider fetchCard={fetchCard}>{ui}</CardDetailProvider>);
  return { fetchCard };
}

async function clickTrigger(name: string) {
  const trigger = screen.getByRole("button", { name: cardDetailCopy.triggerAria(name) });
  await act(async () => {
    fireEvent.click(trigger);
  });
  return trigger;
}

describe("deck card-detail triggers", () => {
  it("opens details from a decklist row", async () => {
    const { fetchCard } = renderInProvider(
      <Decklist mix={TEST_MIX}
        deckId="d1"
        commanderOracleId="cmdr"
        deckOracleIds={[]}
        unresolvedRows={[]}
        cards={[deckCard()]}
        built={1}
        bodySize={99}
        filter="all"
        grouping="type"
        onFilterChange={vi.fn()}
        onGroupingChange={vi.fn()}
       newestAsOf={null}/>,
    );
    await clickTrigger("Arcane Signet");
    expect(fetchCard).toHaveBeenCalledWith("o-signet", undefined);
  });

  // A stack of basics is one row carrying its count, so it offers one trigger.
  it("gives a multi-copy basic land a single detail trigger", async () => {
    renderInProvider(
      <Decklist mix={TEST_MIX}
        deckId="d1"
        commanderOracleId="cmdr"
        deckOracleIds={[]}
        unresolvedRows={[]}
        cards={[deckCard({ oracleId: "o-forest", name: "Forest", typeLine: "Basic Land — Forest", cardTypeGroup: "Lands", role: "land", quantity: 3 })]}
        built={3}
        bodySize={99}
        filter="all"
        grouping="type"
        onFilterChange={vi.fn()}
        onGroupingChange={vi.fn()}
       newestAsOf={null}/>,
    );
    // The stepper holds the count now (basics stepper, R2), in its field rather than a `×3` glyph.
    expect(screen.getByRole("textbox", { name: "Forest copies in deck" })).toHaveValue("3");
    expect(screen.getAllByRole("button", { name: cardDetailCopy.triggerAria("Forest") })).toHaveLength(1);
  });

  it("opens details from a suggestion tile", async () => {
    const suggestion: DeckSuggestionWithFacts = {
      facts: null,
      oracleId: "o-sol", name: "Sol Ring", reason: "edhrec", reasonType: "edhrec",
      reasonLabel: "98% of decks", owned: false, inDeck: false,
      typeLine: "Artifact", cardTypeGroup: "Artifacts", role: "ramp",
      manaCost: "{1}", manaValue: 1,
      imageUri: null, inclusionPct: null, lift: null, synergyFigure: null,
    };
    const { fetchCard } = renderInProvider(
      <SuggestionTile
        suggestion={suggestion}
        deckId="d1"
        declaredBracket={null}
        noteCounts={{ gameChanger: 0, extraTurns: 0, tutor: 0 }}
        inDeck={false}
        siblings={["o-sol"]}
        commanderShortName="Muldrotha"
        selfClaimed={false}
       newestAsOf={null}/>,
    );
    // The tile names the card twice, art and label, and both are triggers.
    const triggers = screen.getAllByRole("button", {
      name: cardDetailCopy.triggerAria("Sol Ring"),
    });
    await act(async () => {
      fireEvent.click(triggers[0]);
    });
    expect(fetchCard).toHaveBeenCalledWith("o-sol", undefined);
  });

  // Quick add was #127's one exception while its rows were listbox options, which cannot hold a control. Its
  // popup is a grid now (small items 2, item 6b), and a row's first cell is the name: not a nested button, since
  // DOM focus stays in the field, but the same open path with the same accessible name.
  it("opens details from a quick-add result's name cell", async () => {
    searchCards.mockResolvedValue([
      {
        oracleId: "o-sol", name: "Sol Ring", typeLine: "Artifact", owned: true, ownedQty: 1,
        cardTypeGroup: "Artifacts", role: "ramp", imageUri: null, manaCost: "{1}", cmc: 1,
        flavorName: null, facts: null,
      },
    ]);
    const { fetchCard } = renderInProvider(
      <QuickAddBar
        deckId="d1"
        commanderIdentity={["U"]}
        deckOracleIds={[]}
        commanderShortName="Muldrotha"
        commanderOracleId="cmd-muldrotha"
        declaredBracket={null}
        noteCounts={EMPTY_NOTE_COUNTS}
      />,
    );
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "sol" } });
    await waitFor(() => expect(screen.getAllByRole("row").length).toBeGreaterThan(0));
    // Still no nested button: the cell is the trigger, reached through the field's active descendant.
    expect(
      screen.queryByRole("button", { name: cardDetailCopy.triggerAria("Sol Ring") }),
    ).toBeNull();
    const cell = screen.getByRole("gridcell", { name: cardDetailCopy.triggerAria("Sol Ring") });
    await act(async () => {
      fireEvent.click(cell);
    });
    expect(fetchCard).toHaveBeenCalledWith("o-sol", undefined);
  });

  // The 72×100 thumb is retired with the art wash: the art is the band now, and
  // `Card details` is the way into the printing.
  it("opens details from the header's Card details pill", async () => {
    const deck = {
      id: "d1",
      name: "Muldrotha",
      createdAt: new Date(),
      commander: {
        oracleId: "o-muldrotha", name: "Muldrotha, the Gravetide", colorIdentity: ["B", "G", "U"],
        manaCost: "{3}{B}{G}{U}", typeLine: "Legendary Creature", oracleText: null,
        imageUri: null, artCropUri: "/crop.jpg",
      },
      cards: [], built: 0, ownedCount: 0, toBuyCount: 0,
    } as unknown as DeckDetail;
    const { fetchCard } = renderInProvider(
      <BuilderSpine
        deck={deck}
        counts={{ built: 0, ownedCount: 0, toBuyCount: 0 }}
        onExport={vi.fn()}
        status="Building"
      />,
    );

    // One per band. The two widths are separate trees here — the wash strategy
    // differs, not only the skin — so both are in the DOM and one is CSS-hidden.
    const triggers = screen.getAllByRole("button", { name: "View card details" });
    expect(triggers).toHaveLength(2);
    await act(async () => {
      fireEvent.click(triggers[0]);
    });
    expect(fetchCard).toHaveBeenCalledWith("o-muldrotha", undefined);
  });

  it("hands the decklist its cards in display order so the modal can page", async () => {
    const { fetchCard } = renderInProvider(
      <Decklist mix={TEST_MIX}
        deckId="d1"
        commanderOracleId="cmdr"
        deckOracleIds={[]}
        unresolvedRows={[]}
        cards={[
          deckCard({ oracleId: "o-sol", name: "Sol Ring" }),
          deckCard({ oracleId: "o-bear", name: "Grizzly Bears", cardTypeGroup: "Creatures", role: "other" }),
          deckCard(),
        ]}
        built={3}
        bodySize={99}
        filter="all"
        grouping="type"
        onFilterChange={vi.fn()}
        onGroupingChange={vi.fn()}
       newestAsOf={null}/>,
    );
    // Creatures precede Artifacts in group order, and names sort within a group.
    fetchCard.mockResolvedValue({
      oracleId: "o-bear", name: "Grizzly Bears", typeLine: "Creature", manaCost: null, cmc: 2,
      oracleText: null, keywords: [], rarity: "common", colorIdentity: [], imageUri: null,
      printedName: null,
      quantity: 1, printings: [], setCodes: [], primarySetCode: "", preferredPrinting: null,
    });
    await clickTrigger("Grizzly Bears");
    expect(await screen.findAllByText("1 of 3")).not.toHaveLength(0);
  });
});
