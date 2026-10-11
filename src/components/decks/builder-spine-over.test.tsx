// A deck past 99 (#280). The spine is where the count is stated at full size,
// so it carries the sentence that says what being over means; the deck card and
// the export preview only carry the figure.

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BrowseCard } from "../../lib/collection/browse";
import type { DeckDetail } from "../../lib/decks/read";
import { overCopy, overWord } from "../../lib/copy/decks-builder";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import { tuningHubCopy } from "../../lib/copy/tuning-hub";
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

function mount(built: number, onProposedCuts?: () => void) {
  const fetchCard = vi.fn<(id: string) => Promise<BrowseCard | null>>().mockResolvedValue(null);
  render(
    <CardDetailProvider fetchCard={fetchCard}>
      <BuilderSpine
        deck={deck}
        counts={{ built, ownedCount: built, toBuyCount: 0 }}
        onExport={vi.fn()}
        status="Building"
        overCommitted={0}
        softClaimed={0}
        onProposedCuts={onProposedCuts}
      />
    </CardDetailProvider>,
  );
}

// Every figure below is asserted with `getAllByText`: the two widths are
// separate trees since the art wash, so each sentence is in the DOM twice, one
// copy CSS-hidden. Two is the assertion, not an artefact of it.
describe("BuilderSpine over 99", () => {
  it("names the overage and what to do about it", () => {
    mount(104);
    expect(screen.getAllByText(overCopy.trim.lead(overWord(5)))).toHaveLength(2);
    expect(screen.getAllByText(overCopy.trim.body(overWord(5)))).toHaveLength(2);
  });

  // Reading the optimistic count, not the server's 62 — the assertion the spec
  // asks review to make first.
  it("reads the optimistic count, not the deck row", () => {
    mount(104);
    expect(screen.getAllByText(overCopy.figure.delta("5"))).toHaveLength(2);
    expect(screen.queryByText(/62/)).not.toBeInTheDocument();
  });

  it("says one, not 1, at a single card over", () => {
    mount(100);
    expect(screen.getAllByText(overCopy.trim.lead("One"))).toHaveLength(2);
    expect(screen.getAllByText(overCopy.trim.body(overWord(1)))[0]).toHaveTextContent(
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

// The Tuning hub's shortcut (hub handoff A5): the trim line offers Proposed cuts at both widths.
describe("The trim line's Proposed cuts shortcut", () => {
  it("is offered at both widths on a deck over, and opens the tool", () => {
    const open = vi.fn();
    mount(104, open);
    const links = screen.getAllByRole("button", { name: tuningHubCopy.shortcuts.proposedCuts });
    expect(links).toHaveLength(2);
    fireEvent.click(links[1]);
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("is absent at 99", () => {
    mount(99, vi.fn());
    expect(screen.queryByRole("button", { name: tuningHubCopy.shortcuts.proposedCuts })).not.toBeInTheDocument();
  });

  it("is absent with no handler (the hub off), the trim line unchanged", () => {
    mount(104);
    expect(screen.queryByRole("button", { name: tuningHubCopy.shortcuts.proposedCuts })).not.toBeInTheDocument();
    expect(screen.getAllByText(overCopy.trim.lead(overWord(5)))).toHaveLength(2);
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
        status="Building"
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
