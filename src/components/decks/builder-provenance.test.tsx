// The provenance line's arithmetic, exercised through BuilderShell because the
// shell derives it — the line itself only renders the numbers it is handed.
// The sentence reads "we filled N — the other M are yours", so N + M must be 99
// even once the player keeps an auto card or adds one of their own; measuring M
// against the deck's size would silently drop those cards out of the sentence.
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DeckDetail } from "../../lib/decks/read";
import { recommendationsCopy } from "../../lib/copy/recommendations";

vi.mock("../../app/decks/actions", () => ({
  createDeck: vi.fn(),
  getDeckSuggestions: vi.fn(async () => ({ suggestions: [], degraded: false })),
  addCardToDeck: vi.fn(),
  removeCardFromDeck: vi.fn(),
  deleteDeck: vi.fn(),
  renameDeck: vi.fn(),
  fillDeck: vi.fn(),
}));

const { BuilderShell } = await import("./builder-shell");

function makeDeck(autoCount: number, keptCount: number): DeckDetail {
  const cards = Array.from({ length: autoCount + keptCount }, (_, i) => ({
    oracleId: `card-${i}`,
    name: `Card ${i}`,
    typeLine: "Artifact",
    cardTypeGroup: "Artifacts" as const,
    role: "other" as const,
    owned: true,
    quantity: 1,
    auto: i < autoCount,
  }));
  const size = autoCount + keptCount;
  return {
    id: "deck-1",
    name: "Korvold",
    createdAt: new Date("2026-01-01"),
    filled: true,
    commander: {
      oracleId: "korvold",
      name: "Korvold, Fae-Cursed King",
      colorIdentity: ["B", "R", "G"],
      manaCost: "{2}{B}{R}{G}",
      typeLine: "Legendary Creature — Dragon Noble",
      oracleText: null,
      imageUri: null,
    },
    cards,
    built: size,
    ownedCount: size,
    toBuyCount: 0,
    total: size,
    unresolvedRows: [],
  } as unknown as DeckDetail;
}

async function mount(deck: DeckDetail) {
  await act(async () => {
    render(
      <BuilderShell
        deck={deck}
        suggestions={[]}
        degraded={false}
        firstRun={false}
        commanderIdentity={["B", "R", "G"]}
        arrivedFromImport={false}
      />,
    );
  });
}

describe("BuilderShell — provenance arithmetic", () => {
  it("closes at 99 when every card in the deck came from the fill", async () => {
    await mount(makeDeck(3, 0));
    // The fixture has no ramp, so the shortfall branch carries the numbers.
    expect(
      screen.getAllByText(recommendationsCopy.fill.provenanceShort("3", "Ramp", "96")),
    ).toHaveLength(2);
  });

  it("still closes at 99 once the player has kept cards of their own", async () => {
    await mount(makeDeck(3, 20));
    expect(
      screen.getAllByText(recommendationsCopy.fill.provenanceShort("3", "Ramp", "96")),
    ).toHaveLength(2);
  });
});
