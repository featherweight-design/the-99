// A deck past 99 (#280). The spine is where the count is stated at full size,
// so it carries the sentence that says what being over means; the deck card and
// the export preview only carry the figure.

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BrowseCard } from "../../lib/collection/browse";
import type { DeckDetail } from "../../lib/decks/read";
import { overCopy, overWord } from "../../lib/copy/decks-builder";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { BuilderSpine } from "./builder-spine";

const deck = {
  id: "d1",
  name: "Kykar, Wind's Fury",
  createdAt: new Date(),
  commander: {
    oracleId: "o-kykar",
    name: "Kykar, Wind's Fury",
    colorIdentity: ["W", "U", "R"],
    manaCost: "{2}{U}{R}{W}",
    typeLine: "Legendary Creature",
    oracleText: null,
    imageUri: null,
  },
  cards: [],
  // Deliberately the server's stale figure. Every number the spine draws comes
  // from `counts`, so a deck the player has just pushed over 99 says so before
  // the server round trip lands — this is what stops the count flickering at
  // the crossing.
  built: 62,
  ownedCount: 54,
  toBuyCount: 8,
} as unknown as DeckDetail;

function mount(built: number) {
  const fetchCard = vi.fn<(id: string) => Promise<BrowseCard | null>>().mockResolvedValue(null);
  render(
    <CardDetailProvider fetchCard={fetchCard}>
      <BuilderSpine
        deck={deck}
        counts={{ built, ownedCount: built, toBuyCount: 0 }}
        onExport={vi.fn()}
        overCommitted={0}
        softClaimed={0}
      />
    </CardDetailProvider>,
  );
}

describe("BuilderSpine over 99", () => {
  it("names the overage and what to do about it", () => {
    mount(104);
    expect(screen.getByText(overCopy.trim.lead(overWord(5)))).toBeInTheDocument();
    expect(screen.getByText(overCopy.trim.body("5"))).toBeInTheDocument();
    expect(screen.getByText(overCopy.trim.bodyShort("5"))).toBeInTheDocument();
  });

  // Reading the optimistic count, not the server's 62 — the assertion the spec
  // asks review to make first.
  it("reads the optimistic count, not the deck row", () => {
    mount(104);
    expect(screen.getByText(overCopy.figure.delta("5"))).toBeInTheDocument();
    expect(screen.queryByText(/62/)).not.toBeInTheDocument();
  });

  it("says one, not 1, at a single card over", () => {
    mount(100);
    expect(screen.getByText(overCopy.trim.lead("One"))).toBeInTheDocument();
    expect(screen.getByText(overCopy.trim.bodyShort("1"))).toHaveTextContent(
      "Cut one and it is legal.",
    );
  });

  it("says nothing at 99", () => {
    mount(99);
    expect(screen.queryByText(/over the ninety-nine/)).not.toBeInTheDocument();
    expect(screen.queryByText(/to cut/)).not.toBeInTheDocument();
  });

  // Export is not blocked by being over: no control on this surface is. Both
  // copies — the phone button and the desktop one.
  it("leaves Export enabled", () => {
    mount(104);
    const buttons = screen.getAllByRole("button", { name: /export/i });
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) expect(button).toBeEnabled();
  });
});
