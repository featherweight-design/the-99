// Every deck surface that names a card must open the detail modal (#127, #91),
// with one stated exception now that quick add is a combobox — see below. One
// file because the assertion is the same across surfaces; only the component
// under it changes.

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BrowseCard } from "../../lib/collection/browse";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import type { DeckDetail } from "../../lib/decks/read";
import type { DeckSuggestion } from "../../lib/decks/suggest";
import { CardDetailProvider, cardDetailCopy } from "../cards/card-detail-provider";
import { BuilderSpine } from "./builder-spine";
import { Decklist } from "./decklist";
import { SuggestionTile } from "./suggestion-tile";
import { QuickAddBar } from "./quick-add-bar";

vi.mock("../../app/decks/actions", () => ({
  addCardToDeck: vi.fn(),
  removeCardFromDeck: vi.fn(),
}));

const { searchCards } = vi.hoisted(() => ({ searchCards: vi.fn() }));
vi.mock("../../app/decks/[id]/search-action", () => ({ searchCards }));

const deckCard = (over: Partial<DeckDetailCard> = {}): DeckDetailCard => ({
  oracleId: "o-signet",
  name: "Arcane Signet",
  typeLine: "Artifact",
  cardTypeGroup: "Artifacts",
  role: "ramp",
  owned: true,
  quantity: 1,
  auto: false,
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
      <Decklist
        deckId="d1"
        commanderOracleId="cmdr"
        deckOracleIds={[]}
        unresolvedRows={[]}
        cards={[deckCard()]}
        built={1}
        filter="all"
        grouping="type"
        onFilterChange={vi.fn()}
        onGroupingChange={vi.fn()}
      />,
    );
    await clickTrigger("Arcane Signet");
    expect(fetchCard).toHaveBeenCalledWith("o-signet");
  });

  // A stack of basics is one row carrying its count, so it offers one trigger.
  it("gives a multi-copy basic land a single detail trigger", async () => {
    renderInProvider(
      <Decklist
        deckId="d1"
        commanderOracleId="cmdr"
        deckOracleIds={[]}
        unresolvedRows={[]}
        cards={[deckCard({ oracleId: "o-forest", name: "Forest", typeLine: "Basic Land — Forest", cardTypeGroup: "Lands", role: "land", quantity: 3 })]}
        built={3}
        filter="all"
        grouping="type"
        onFilterChange={vi.fn()}
        onGroupingChange={vi.fn()}
      />,
    );
    expect(screen.getByText("×3")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: cardDetailCopy.triggerAria("Forest") })).toHaveLength(1);
  });

  it("opens details from a suggestion tile", async () => {
    const suggestion: DeckSuggestion = {
      oracleId: "o-sol", name: "Sol Ring", reason: "edhrec", reasonType: "edhrec",
      reasonLabel: "98% of decks", owned: false, inDeck: false,
      typeLine: "Artifact", cardTypeGroup: "Artifacts", role: "ramp",
      manaCost: "{1}", manaValue: 1,
      imageUri: null, inclusionPct: null, lift: null,
    };
    const { fetchCard } = renderInProvider(
      <SuggestionTile
        suggestion={suggestion}
        deckId="d1"
        inDeck={false}
        siblings={["o-sol"]}
        commanderShortName="Muldrotha"
        selfClaimed={false}
      />,
    );
    // The tile names the card twice, art and label, and both are triggers.
    const triggers = screen.getAllByRole("button", {
      name: cardDetailCopy.triggerAria("Sol Ring"),
    });
    await act(async () => {
      fireEvent.click(triggers[0]);
    });
    expect(fetchCard).toHaveBeenCalledWith("o-sol");
  });

  // The one deliberate exception to #127. A quick-add row is a listbox option
  // under a combobox whose contract is that DOM focus never leaves the input,
  // and a nested trigger inside an option breaks that. Retrieval by name is the
  // row's whole job; the Consider tile and the decklist carry detail.
  it("leaves a quick-add result without a detail trigger, by design", async () => {
    searchCards.mockResolvedValue([
      {
        oracleId: "o-sol", name: "Sol Ring", typeLine: "Artifact", owned: true, ownedQty: 1,
        cardTypeGroup: "Artifacts", role: "ramp", imageUri: null,
      },
    ]);
    renderInProvider(
      <QuickAddBar
        deckId="d1"
        commanderIdentity={["U"]}
        deckOracleIds={[]}
        commanderShortName="Muldrotha"
        commanderOracleId="cmd-muldrotha"
      />,
    );
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "sol" } });
    await waitFor(() => expect(screen.getAllByRole("option").length).toBeGreaterThan(0));
    expect(
      screen.queryByRole("button", { name: cardDetailCopy.triggerAria("Sol Ring") }),
    ).toBeNull();
  });

  it("opens details from the commander thumb", async () => {
    const deck = {
      id: "d1",
      name: "Muldrotha",
      createdAt: new Date(),
      commander: {
        oracleId: "o-muldrotha", name: "Muldrotha, the Gravetide", colorIdentity: ["B", "G", "U"],
        manaCost: "{3}{B}{G}{U}", typeLine: "Legendary Creature", oracleText: null, imageUri: null,
      },
      cards: [], built: 0, ownedCount: 0, toBuyCount: 0,
    } as unknown as DeckDetail;
    const { fetchCard } = renderInProvider(
      <BuilderSpine
        deck={deck}
        counts={{ built: 0, ownedCount: 0, toBuyCount: 0 }}
        onExport={vi.fn()}
        overCommitted={0}
        softClaimed={0}
      />,
    );

    // One thumb sized responsively, not a mobile/desktop pair: a duplicated
    // subtree gave the same commander two buttons in the accessibility tree.
    const triggers = screen.getAllByRole("button", {
      name: cardDetailCopy.triggerAria("Muldrotha, the Gravetide"),
    });
    expect(triggers).toHaveLength(1);
    await act(async () => {
      fireEvent.click(triggers[0]);
    });
    expect(fetchCard).toHaveBeenCalledWith("o-muldrotha");
  });

  it("hands the decklist its cards in display order so the modal can page", async () => {
    const { fetchCard } = renderInProvider(
      <Decklist
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
        filter="all"
        grouping="type"
        onFilterChange={vi.fn()}
        onGroupingChange={vi.fn()}
      />,
    );
    // Creatures precede Artifacts in group order, and names sort within a group.
    fetchCard.mockResolvedValue({
      oracleId: "o-bear", name: "Grizzly Bears", typeLine: "Creature", manaCost: null,
      oracleText: null, keywords: [], rarity: "common", colorIdentity: [], imageUri: null,
      quantity: 1, printings: [], setCodes: [], primarySetCode: "", preferredPrinting: null,
    });
    await clickTrigger("Grizzly Bears");
    expect(await screen.findByText("1 of 3")).toBeInTheDocument();
  });
});
