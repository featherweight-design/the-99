import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DecksView } from "./decks-view";
import type { DeckListItem } from "../../lib/decks/read";
import type { ShoppingRollup } from "../../lib/decks/shopping-rollup";

const NOW = "2026-09-07T12:00:00.000Z";

function deckOf(over: Partial<DeckListItem> = {}): DeckListItem {
  return {
    id: "d1",
    name: "Atraxa, Praetors' Voice",
    commanderName: "Atraxa, Praetors' Voice",
    commanderColorIdentity: ["W", "U", "B", "G"],
    commanderImageUri: null,
    statusPill: "Complete",
    built: 99,
    ownedCount: 99,
    toBuyCount: 0,
    unresolvedCount: 0,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    lastPlayedAt: new Date("2026-09-02T00:00:00Z"),
    ...over,
  };
}

const SHOPPING: ShoppingRollup = {
  byDeck: new Map(),
  total: { copies: 0, cents: 0, pricedCopies: 0 },
};

function view(decks: DeckListItem[]) {
  return (
    <DecksView decks={decks} shopping={SHOPPING} buildable={9} cards={1284} now={NOW} />
  );
}

beforeEach(() => {
  window.history.replaceState(null, "", "/decks");
});

describe("DecksView", () => {
  it("counts what it renders", () => {
    render(view([deckOf(), deckOf({ id: "d2", statusPill: "Draft", built: 0 })]));
    expect(screen.getByText("2 of 2")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("keeps the count and the grid in step while filtering", () => {
    render(
      view([
        deckOf({ id: "a", statusPill: "Draft", built: 0 }),
        deckOf({ id: "b", statusPill: "Complete" }),
      ]),
    );
    fireEvent.click(screen.getAllByRole("checkbox", { name: "Draft" })[0]);
    expect(screen.getByText("1 of 2")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("writes the filter to the URL without navigating", () => {
    render(view([deckOf()]));
    fireEvent.click(screen.getAllByRole("checkbox", { name: "Draft" })[0]);
    expect(window.location.search).toBe("?status=Draft");
  });

  it("writes the default sort as an absence", () => {
    render(view([deckOf()]));
    fireEvent.click(screen.getAllByRole("checkbox", { name: "Draft" })[0]);
    expect(window.location.search).not.toContain("sort=");
  });

  it("shows a removable chip per active value, and Clear", () => {
    render(view([deckOf()]));
    fireEvent.click(screen.getAllByRole("checkbox", { name: "Draft" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Remove filter: draft" }));
    expect(window.location.search).toBe("");
  });

  it("offers the filtered empty, not the zero state, when filters exclude everything", () => {
    render(view([deckOf()]));
    fireEvent.click(screen.getAllByRole("checkbox", { name: "Draft" })[0]);
    expect(screen.getByText("No decks match")).toBeInTheDocument();
    expect(screen.queryByText("No decks yet")).toBeNull();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
  });

  it("Clear filters restores every deck and empties the URL", () => {
    render(view([deckOf()]));
    fireEvent.click(screen.getAllByRole("checkbox", { name: "Draft" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("1 of 1")).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("keeps New deck and Import in the header at every state", () => {
    render(view([deckOf()]));
    fireEvent.click(screen.getAllByRole("checkbox", { name: "Draft" })[0]);
    // Two of each: the desktop header pair and the phone action row, one of
    // which is display:none at any width.
    expect(screen.getAllByRole("link", { name: "New deck" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: /Import/ })).toHaveLength(2);
  });

  it("draws the zero state, with both routes in, when no deck exists at all", () => {
    render(view([]));
    expect(screen.getByText("No decks yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse commanders" })).toBeInTheDocument();
    // The zero header drops the count and the filter controls, and keeps the
    // two buttons.
    expect(screen.queryByText("0 of 0")).toBeNull();
    expect(screen.getByText("9 commanders buildable from 1,284 cards")).toBeInTheDocument();
  });
});
