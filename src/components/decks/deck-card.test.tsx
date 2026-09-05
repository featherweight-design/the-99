import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { overCopy } from "../../lib/copy/decks-builder";
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

describe("DeckCard — over 99", () => {
  const overDeck = deck({ built: 104, ownedCount: 104, toBuyCount: 0, statusPill: "Over" });

  it("says how many to cut", () => {
    render(<DeckCard deck={overDeck} />);
    expect(screen.getByText(overCopy.toCut("5"))).toBeInTheDocument();
  });

  // A bare amber 104 with no denominator is the reading this amendment exists
  // to stop, so the suffix is present at phone width too — where a deck at or
  // under 99 hides it.
  it("keeps the / 99 denominator visible at every width", () => {
    render(<DeckCard deck={overDeck} />);
    const suffix = screen.getByText(overCopy.figure.denominator.trim());
    expect(suffix.className).not.toContain("hidden");
  });

  // A valuenow of 104 against a max of 99 is an invalid range, and a reader
  // that clamps it to 100% announces a finished deck.
  it("raises the progressbar's max to the deck's own total", () => {
    render(<DeckCard deck={overDeck} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "104");
    expect(bar).toHaveAttribute("aria-valuemax", "104");
    expect(bar).toHaveAccessibleName(overCopy.aria.progress("104", "5"));
  });

  it("leaves a deck at 99 alone", () => {
    render(<DeckCard deck={deck({ built: 99, ownedCount: 99, toBuyCount: 0, statusPill: "Complete" })} />);
    expect(screen.queryByText(/to cut/)).not.toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "99");
  });
});
