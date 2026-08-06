import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { deckImportCopy } from "../../lib/copy/deck-import";
import type { DeckListItem } from "../../lib/decks/read";
import { DeckCard } from "./deck-card";

const deck = (over: Partial<DeckListItem> = {}): DeckListItem => ({
  id: "d1",
  name: "Slime Time",
  createdAt: new Date("2026-08-05"),
  commanderName: "Slimefoot, the Stowaway",
  commanderColorIdentity: ["B", "G"],
  commanderImageUri: null,
  built: 97,
  ownedCount: 90,
  toBuyCount: 7,
  unresolvedCount: 0,
  statusPill: "Building",
  ...over,
});

describe("DeckCard — unresolved badge", () => {
  it("marks a deck that imported short", () => {
    render(<DeckCard deck={deck({ unresolvedCount: 2 })} />);
    expect(screen.getByText(deckImportCopy.unresolved.deckCardBadge(2))).toBeInTheDocument();
  });

  it("shows nothing on a deck with no unresolved lines", () => {
    render(<DeckCard deck={deck()} />);
    expect(screen.queryByText(/couldn't name/)).not.toBeInTheDocument();
  });

  // The badge is additive: the status vocabulary is unchanged, so a 99-card
  // deck with unresolved lines still reports one of the four shipped pills.
  it("does not introduce a new status pill", () => {
    render(<DeckCard deck={deck({ built: 99, ownedCount: 99, unresolvedCount: 1, statusPill: "Playable" })} />);
    expect(screen.getByText("Playable")).toBeInTheDocument();
  });
});
