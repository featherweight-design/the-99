// Every deck surface that names a card must open the detail modal (#127, #91). One file
// because the assertion is the same on all four; only the component under it changes.

import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BrowseCard } from "../../lib/collection/browse";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import type { DeckDetail } from "../../lib/decks/read";
import type { DeckSuggestion } from "../../lib/decks/suggest";
import { CardDetailProvider, cardDetailCopy } from "./card-detail-provider";
import { BuilderSpine } from "./builder-spine";
import { Decklist } from "./decklist";
import { SearchResultRow } from "./search-result-row";
import { SuggestionCard } from "./suggestion-card";

vi.mock("../../app/decks/actions", () => ({
  addCardToDeck: vi.fn(),
  removeCardFromDeck: vi.fn(),
}));

const deckCard = (over: Partial<DeckDetailCard> = {}): DeckDetailCard => ({
  oracleId: "o-signet",
  name: "Arcane Signet",
  typeLine: "Artifact",
  cardTypeGroup: "Artifacts",
  role: "ramp",
  owned: true,
  quantity: 1,
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
        cards={[deckCard()]}
        built={1}
        toBuyCount={0}
        filter="all"
        grouping="type"
        onFilterChange={vi.fn()}
        onGroupingChange={vi.fn()}
      />,
    );
    await clickTrigger("Arcane Signet");
    expect(fetchCard).toHaveBeenCalledWith("o-signet");
  });

  // The "+1 more" row under a basic land names no card of its own.
  it("leaves the basic-land meta row inert", async () => {
    renderInProvider(
      <Decklist
        deckId="d1"
        cards={[deckCard({ oracleId: "o-forest", name: "Forest", typeLine: "Basic Land — Forest", cardTypeGroup: "Lands", role: "land", quantity: 3 })]}
        built={3}
        toBuyCount={0}
        filter="all"
        grouping="type"
        onFilterChange={vi.fn()}
        onGroupingChange={vi.fn()}
      />,
    );
    expect(screen.getByText("+2 more").tagName).toBe("SPAN");
    expect(screen.getAllByRole("button", { name: cardDetailCopy.triggerAria("Forest") })).toHaveLength(1);
  });

  it("opens details from a suggestion", async () => {
    const suggestion: DeckSuggestion = {
      oracleId: "o-sol", name: "Sol Ring", reason: "edhrec", reasonType: "edhrec",
      reasonLabel: "98% of decks", owned: false, inDeck: false,
      typeLine: "Artifact", cardTypeGroup: "Artifacts", role: "ramp",
      imageUri: null, inclusionPct: null, lift: null,
    };
    const { fetchCard } = renderInProvider(
      <SuggestionCard suggestion={suggestion} deckId="d1" inDeck={false} />,
    );
    await clickTrigger("Sol Ring");
    expect(fetchCard).toHaveBeenCalledWith("o-sol");
  });

  it("opens details from a search result", async () => {
    const { fetchCard } = renderInProvider(
      <SearchResultRow
        result={{
          oracleId: "o-sol", name: "Sol Ring", typeLine: "Artifact", owned: true,
          cardTypeGroup: "Artifacts", role: "ramp", imageUri: null,
        }}
        deckId="d1"
        inDeck={false}
      />,
    );
    await clickTrigger("Sol Ring");
    expect(fetchCard).toHaveBeenCalledWith("o-sol");
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
      />,
    );

    // Mobile and desktop thumbs are parallel trees; both must lead to the same card.
    const triggers = screen.getAllByRole("button", {
      name: cardDetailCopy.triggerAria("Muldrotha, the Gravetide"),
    });
    expect(triggers).toHaveLength(2);
    await act(async () => {
      fireEvent.click(triggers[0]);
    });
    expect(fetchCard).toHaveBeenCalledWith("o-muldrotha");
  });

  it("hands the decklist its cards in display order so the modal can page", async () => {
    const { fetchCard } = renderInProvider(
      <Decklist
        deckId="d1"
        cards={[
          deckCard({ oracleId: "o-sol", name: "Sol Ring" }),
          deckCard({ oracleId: "o-bear", name: "Grizzly Bears", cardTypeGroup: "Creatures", role: "other" }),
          deckCard(),
        ]}
        built={3}
        toBuyCount={0}
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
