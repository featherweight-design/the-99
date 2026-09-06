// A deck past 99 (#280). The spine is where the count is stated at full size,
// so it carries the sentence that says what being over means; the deck card and
// the export preview only carry the figure.

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BrowseCard } from "../../lib/collection/browse";
import type { DeckDetail } from "../../lib/decks/read";
import { overCopy, overWord } from "../../lib/copy/decks-builder";
import { recommendationsCopy } from "../../lib/copy/recommendations";
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
    expect(screen.getByText(overCopy.trim.body("1"))).toHaveTextContent(
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

// ── Amendment 5 (#281) — the over-committed band's link to Shopping ──────────
// The band already names the contested cards; the link is the one control that
// takes the player to them. It is keyed on the callback rather than on a route,
// because /decks renders the same figure on a card with no Shopping list to
// open — there the callback is simply absent and no link renders.

function mountOver(opts: { onShowShopping?: () => void } = {}) {
  const fetchCard = vi.fn<(id: string) => Promise<BrowseCard | null>>().mockResolvedValue(null);
  render(
    <CardDetailProvider fetchCard={fetchCard}>
      <BuilderSpine
        deck={deck}
        counts={{ built: 62, ownedCount: 54, toBuyCount: 8 }}
        onExport={vi.fn()}
        overCommitted={2}
        softClaimed={0}
        onShowShopping={opts.onShowShopping}
      />
    </CardDetailProvider>,
  );
}

describe("The over-committed band's link to the Shopping list", () => {
  it("draws no link when the surface has no Shopping list to open", () => {
    mountOver();
    expect(
      screen.queryByText(recommendationsCopy.shopping.summaryLink),
    ).not.toBeInTheDocument();
  });

  it("draws the link on both breakpoints when the callback is given", () => {
    mountOver({ onShowShopping: vi.fn() });
    // Phone and desktop each render one — both are in the DOM, one CSS-hidden.
    expect(
      screen.getAllByRole("button", {
        name: recommendationsCopy.shopping.summaryLinkAria("2"),
      }),
    ).toHaveLength(2);
  });

  it("calls back rather than navigating", () => {
    const onShowShopping = vi.fn();
    mountOver({ onShowShopping });

    fireEvent.click(
      screen.getAllByRole("button", {
        name: recommendationsCopy.shopping.summaryLinkAria("2"),
      })[0],
    );
    expect(onShowShopping).toHaveBeenCalledTimes(1);
  });
});
