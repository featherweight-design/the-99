import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { CardDetailProvider } from "../cards/card-detail-provider";
// The modal is loaded on demand; loaded here, after the mocks, a press draws it in the same tick.
await (await import("../cards/card-detail-provider")).warmCardModal();

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

// A precon's Lands (its handoff's O2): the basics line sits under the rows and its copies are in
// the group's figure, without becoming rows.
describe("DecklistGroup — a footer", () => {
  it("draws the footer under the rows and counts its copies", () => {
    render(
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <DecklistGroup deckId="" readOnly label="Lands" cards={cards} newestAsOf={null}
          footer={<p>Wastes ×15</p>} footerCount={15} />
      </CardDetailProvider>,
    );
    expect(screen.getByText("Wastes ×15")).toBeInTheDocument();
    expect(screen.getByText("17")).toBeInTheDocument();
  });
});

// Precons R4 §6: a read-only group in card view draws `ReadOnlyCardTile`, which carries none of the
// deck tile's editing: no `✕`, no buy tag, no chip. The tail lands inside the same grid.
describe("DecklistGroup — read-only card view", () => {
  it("draws read-only tiles with no remove control, and the tail in the same grid", () => {
    const precon = [
      { oracleId: "sol-ring", name: "Sol Ring", owned: true, quantity: 1, printedSetCode: "cmm", printedCollectorNumber: "312" },
      { oracleId: "mind-stone", name: "Mind Stone", owned: false, quantity: 1, printedSetCode: "cmm", printedCollectorNumber: "380" },
    ] as DeckDetailCard[];
    render(
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <DecklistGroup deckId="" readOnly view="card" label="Artifacts" cards={precon} newestAsOf={null}
          cardTail={<li data-testid="tail">basics</li>} />
      </CardDetailProvider>,
    );
    expect(screen.getAllByTestId("read-only-card-tile")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /remove/i })).toBeNull();
    expect(screen.getByText("CMM 312")).toBeInTheDocument();
    expect(screen.getByText("not owned")).toBeInTheDocument();
    expect(screen.getByLabelText("Not owned")).toBeInTheDocument();
    expect(screen.getByTestId("tail").parentElement).toBe(screen.getAllByTestId("read-only-card-tile")[0].parentElement);
  });
});
