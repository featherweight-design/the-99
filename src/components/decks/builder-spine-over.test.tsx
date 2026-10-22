// A deck past 99 (#280). The spine states the count at full size, with its `+N`; the sentence that
// says what being over means is the to-do card's over row now (deck messages A4, todo-card.test).

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BrowseCard } from "../../lib/collection/browse";
import type { DeckDetail } from "../../lib/decks/read";
import { overCopy } from "../../lib/copy/decks-builder";
import { CardDetailProvider } from "../cards/card-detail-provider";
// The modal is loaded on demand; loaded here, after the mocks, a press draws it in the same tick.
await (await import("../cards/card-detail-provider")).warmCardModal();
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
  partner: null,
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
        status="Building"
        softClaimed={0}
      />
    </CardDetailProvider>,
  );
}

// Every figure below is asserted with `getAllByText`: the two widths are
// separate trees since the art wash, so each sentence is in the DOM twice, one
// copy CSS-hidden. Two is the assertion, not an artefact of it.
describe("BuilderSpine over 99", () => {
  // Reading the optimistic count, not the server's 62 — the assertion the spec
  // asks review to make first.
  it("reads the optimistic count, not the deck row", () => {
    mount(104);
    expect(screen.getAllByText(overCopy.figure.delta("5"))).toHaveLength(2);
    expect(screen.queryByText(/62/)).not.toBeInTheDocument();
  });

  // The trim line and its Proposed cuts left the header for the to-do card's over row.
  it("draws no trim line and no cuts shortcut of its own", () => {
    mount(104);
    expect(screen.queryByText(/over the ninety-nine/)).not.toBeInTheDocument();
    expect(screen.queryByText(/and it is legal/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cuts/i })).not.toBeInTheDocument();
  });

  it("draws no delta at 99", () => {
    mount(99);
    expect(screen.queryByText(overCopy.figure.delta("0"))).not.toBeInTheDocument();
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
