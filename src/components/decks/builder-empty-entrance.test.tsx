// The mobile empty deck must always keep a way in.
//
// This exists because deleting the empty state's "Open suggestions" CTA very
// nearly stranded a mobile empty deck with no control that opens the Add sheet:
// the copy change and the shell rewiring that replaces the sheet land in
// different PRs, and in between there would have been no entrance at all. The
// component renders correctly in isolation either way — what breaks is that the
// only affordance is gone, which is invisible to a props-level check.
//
// The shell rewiring has since landed, so the two entrances the empty deck must
// keep are the Consider tab and the quick-add bar.
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DeckDetail } from "../../lib/decks/read";

vi.mock("../../app/decks/actions", () => ({
  createDeck: vi.fn(),
  getDeckSuggestions: vi.fn(async () => ({ suggestions: [], degraded: false })),
  addCardToDeck: vi.fn(),
  removeCardFromDeck: vi.fn(),
  deleteDeck: vi.fn(),
  renameDeck: vi.fn(),
}));

const { BuilderShell } = await import("./builder-shell");

const emptyDeck = {
  id: "deck-1",
  name: "Korvold",
  createdAt: new Date("2026-01-01"),
  commander: {
    oracleId: "korvold",
    name: "Korvold, Fae-Cursed King",
    colorIdentity: ["B", "R", "G"],
    manaCost: "{2}{B}{R}{G}",
    typeLine: "Legendary Creature — Dragon Noble",
    oracleText: null,
    imageUri: null,
  },
  cards: [],
  built: 0,
  ownedCount: 0,
  toBuyCount: 0,
} as unknown as DeckDetail;

describe("empty builder", () => {
  const renderEmpty = () =>
    render(
      <BuilderShell
        deck={emptyDeck}
        suggestions={[]}
        degraded={false}
        firstRun={false}
        commanderIdentity={["B", "R", "G"]}
      />,
    );

  it("keeps both entrances: the Consider tab and the quick-add bar", () => {
    renderEmpty();
    expect(screen.getByRole("tab", { name: /cards to consider/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("no longer offers the retired Open suggestions CTA", () => {
    renderEmpty();
    expect(screen.queryByRole("button", { name: /open suggestions/i })).toBeNull();
  });

  it("serves the role hint at both widths, not desktop only", () => {
    renderEmpty();
    const hint = screen.getByText(/ramp, draw, removal, and wipe slots first/i);
    expect(hint.className).not.toContain("hidden");
  });
});
