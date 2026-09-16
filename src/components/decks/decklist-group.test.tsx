import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { CardDetailProvider } from "../cards/card-detail-provider";

vi.mock("../../app/decks/actions", () => ({
  createDeck: vi.fn(),
  getDeckSuggestions: vi.fn(async () => ({ suggestions: [], degraded: false })),
  addCardToDeck: vi.fn(),
  removeCardFromDeck: vi.fn(),
  keepAutoCard: vi.fn(),
  deleteDeck: vi.fn(),
  renameDeck: vi.fn(),
}));

const { DecklistGroup } = await import("./decklist-group");

const cards = [
  { oracleId: "sol-ring", name: "Sol Ring", owned: true, quantity: 1, manaCost: "{1}" },
  { oracleId: "arcane-signet", name: "Arcane Signet", owned: true, quantity: 1, manaCost: "{2}" },
] as DeckDetailCard[];

function renderGroup(view: "list" | "card") {
  render(
    <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
      <DecklistGroup deckId="d1" label="Artifacts" cards={cards} view={view}  newestAsOf={null}/>
    </CardDetailProvider>,
  );
}

afterEach(cleanup);

// The view changes the unit, never the grouping. A well that also regrouped
// would be a second list rather than a second way of reading the one list.
describe("DecklistGroup — the view well changes the unit only", () => {
  it("keeps the header and the group's cards in card view", () => {
    renderGroup("card");

    expect(screen.getByText("Artifacts")).toBeInTheDocument();
    expect(screen.getByText("Sol Ring")).toBeInTheDocument();
    expect(screen.getByText("Arcane Signet")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("draws rows rather than tiles in list view", () => {
    renderGroup("list");

    expect(screen.getByText("Artifacts")).toBeInTheDocument();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});
