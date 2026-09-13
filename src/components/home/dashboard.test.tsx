import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Dashboard } from "./dashboard";
import type { DeckListItem } from "../../lib/decks/read";

// `inUse` is a Map and `ready` a slice rather than a list, because the sections
// that read them (tasks 15–17) take exactly what the loader assembled once.
const BASE = {
  stats: { totalCards: 1284, uniqueCards: 900 },
  lastUpdated: new Date("2026-09-05T00:00:00Z"),
  ready: { shown: [], moreCount: 0, floor: null },
  inUse: new Map(),
  decks: [],
  commitments: { inUse: 312, overCommitted: 3 },
  shopping: { byDeck: new Map(), total: { copies: 18, cents: 9480, pricedCopies: 18 } },
  now: "2026-09-07T12:00:00.000Z",
};

describe("Dashboard header", () => {
  it("greets without a name and prints both kicker figures", () => {
    render(<Dashboard {...BASE} />);
    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    expect(screen.getByText("1,284 cards · read 2 days ago")).toBeInTheDocument();
  });

  it("still prints a kicker when the collection has never been dated", () => {
    render(<Dashboard {...BASE} lastUpdated={null} />);
    expect(screen.getByText(/1,284 cards/)).toBeInTheDocument();
  });

  it("sends Update collection to the replace flow", () => {
    render(<Dashboard {...BASE} />);
    expect(screen.getByRole("link", { name: "Update collection" })).toHaveAttribute(
      "href",
      "/collection/replace",
    );
  });
});

const deck = (o: Partial<DeckListItem> = {}): DeckListItem => ({
  id: "d1",
  name: "Atraxa",
  createdAt: new Date("2026-09-01T00:00:00Z"),
  commanderName: "Atraxa, Praetors' Voice",
  commanderColorIdentity: ["W", "U", "B", "G"],
  commanderImageUri: null,
  commanderArtCropUri: null,
  partnerName: null,
  partnerColorIdentity: null,
  folderId: null,
  folderName: null,
  built: 99,
  ownedCount: 96,
  toBuyCount: 3,
  unresolvedCount: 0,
  statusPill: "To buy",
  lastPlayedAt: null,
  lastEditedAt: new Date("2026-09-01T00:00:00Z"),
  lastCommittedAt: null,
  inUseElsewhere: 0,
  ...o,
});

describe("Dashboard body", () => {
  it("draws the rail against every deck and the resume rows against two", () => {
    const decks = [
      deck({ id: "a", name: "Alpha", lastPlayedAt: new Date("2026-09-01T00:00:00Z") }),
      deck({ id: "b", name: "Beta", lastPlayedAt: new Date("2026-09-05T00:00:00Z") }),
      deck({ id: "c", name: "Gamma" }),
    ];
    render(<Dashboard {...BASE} decks={decks} />);
    // The heading counts what the player has, not what either section drew.
    expect(screen.getByText("Your decks · 3")).toBeInTheDocument();
    // Two resume rows, most recently played first — and the rail beside them
    // still holds the loader's own order, which is why Home slices a copy.
    expect(screen.getAllByRole("link", { name: /Beta/ })).not.toHaveLength(0);
    expect(screen.getAllByRole("link", { name: /Gamma/ })).toHaveLength(2);
  });

  it("leaves the Commitments card out when the availability read failed", () => {
    render(<Dashboard {...BASE} commitments={null} />);
    expect(screen.queryByText("Commitments")).toBeNull();
    // A card of three zeroes after a failed query is a lie, so nothing stands
    // in for it — not a zero, not a placeholder.
    expect(screen.queryByRole("link", { name: "Review commitments" })).toBeNull();
  });

  it("draws the Commitments figures against the collection's own total", () => {
    render(<Dashboard {...BASE} />);
    expect(screen.getByText("312 of 1,284")).toBeInTheDocument();
    expect(screen.getByText("18 · $94.80")).toBeInTheDocument();
  });
});
