// decklist.test.tsx — Shopping-filter grouping (Task 11, #130)
// Tests for the role-grouped Shopping view: group headers, gap clauses, footer
// variants, empty-covered state, row heights, and the EDHREC figure meta line.

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import { ROLE_TARGETS } from "../../lib/recs/roles";
import { CardDetailProvider } from "./card-detail-provider";

// ── Server-action mocks ───────────────────────────────────────────────────────
vi.mock("../../app/decks/actions", () => ({
  createDeck: vi.fn(),
  getDeckSuggestions: vi.fn(async () => ({ suggestions: [], degraded: false })),
  addCardToDeck: vi.fn(),
  removeCardFromDeck: vi.fn(),
  keepAutoCard: vi.fn(),
  deleteDeck: vi.fn(),
  renameDeck: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

// ── Dynamic imports (after mocks are set up) ─────────────────────────────────
const { Decklist } = await import("./decklist");
const { DecklistRow } = await import("./decklist-row");

// ── Shared card factories ─────────────────────────────────────────────────────
function makeCard(overrides: Partial<DeckDetailCard> & { oracleId: string; name: string }): DeckDetailCard {
  return {
    typeLine: "Artifact",
    cardTypeGroup: "Artifacts",
    role: "other",
    owned: true,
    quantity: 1,
    auto: true,
    ...overrides,
  };
}

const rampOwned = makeCard({ oracleId: "sol-ring", name: "Sol Ring", role: "ramp", owned: true, auto: true });
const rampUnowned = makeCard({ oracleId: "arcane-signet", name: "Arcane Signet", role: "ramp", owned: false, auto: true });
const drawOwned = makeCard({ oracleId: "rhystic-study", name: "Rhystic Study", role: "draw", owned: true, auto: true });
const drawUnowned = makeCard({ oracleId: "mystic-remora", name: "Mystic Remora", role: "draw", owned: false, auto: true });
const drawUnownedManual = makeCard({ oracleId: "necropotence", name: "Necropotence", role: "draw", owned: false, auto: false });
const basicLand = makeCard({
  oracleId: "forest",
  name: "Forest",
  role: "land",
  typeLine: "Basic Land — Forest",
  cardTypeGroup: "Lands",
  owned: false,
  auto: true,
});

// A Decklist with the Shopping filter active requires the optimistic-deck
// providers. Thread through the minimal BuilderShell context.
const { AddOptimisticCardProvider } = await import("./optimistic-deck");

function renderDecklist(
  cards: DeckDetailCard[],
  opts: {
    shoppingFigures?: Record<string, number>;
  } = {},
) {
  const deckEdits = {
    add: vi.fn(),
    remove: vi.fn(),
    markSpent: vi.fn(),
    announceUndo: vi.fn(),
    reportRemoveFailure: vi.fn(),
    resolveRow: vi.fn(),
    deleteRow: vi.fn(),
  };

  render(
    <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
      <AddOptimisticCardProvider value={deckEdits}>
        <Decklist
          deckId="deck-1"
          cards={cards}
          unresolvedRows={[]}
          commanderOracleId="commander-1"
          deckOracleIds={cards.map((c) => c.oracleId)}
          built={cards.reduce((s, c) => s + c.quantity, 0)}
          toBuyCount={cards.filter((c) => !c.owned).length}
          filter="shopping"
          grouping="role"
          onFilterChange={vi.fn()}
          onGroupingChange={vi.fn()}
          shoppingFigures={opts.shoppingFigures ?? {}}
        />
      </AddOptimisticCardProvider>
    </CardDetailProvider>,
  );
}

// ── Test suites ───────────────────────────────────────────────────────────────

describe("Shopping groups by role and heads each group with the gap it closes", () => {
  it("renders the role label as a group header for unowned cards", () => {
    renderDecklist([rampOwned, rampUnowned, drawOwned, drawUnowned]);

    // Only the unowned cards appear in Shopping — each role that has unowned cards
    // should have a group header with the role name.
    expect(screen.getByText("Ramp")).toBeInTheDocument();
    expect(screen.getByText("Draw")).toBeInTheDocument();
    // Owned-only roles must NOT appear
    expect(screen.queryByText("Removal")).not.toBeInTheDocument();
  });

  it("does not render owned cards in the Shopping filter", () => {
    renderDecklist([rampOwned, rampUnowned]);
    expect(screen.queryByText("Sol Ring")).not.toBeInTheDocument();
    expect(screen.getByText("Arcane Signet")).toBeInTheDocument();
  });
});

describe("the gap clause reads '{n} · closes {from}→{to}' against the deck's real counts", () => {
  it("produces the gap clause from ROLE_TARGETS vs current total role counts", () => {
    // ramp target = 10; owned ramp = 1 (Sol Ring), unowned ramp = 1 (Arcane Signet)
    // current total ramp count = 2 (owned + unowned), target = 10
    // n = 1 (unowned ramp cards to buy)
    // gap clause: "1 · closes 2→10"
    renderDecklist([rampOwned, rampUnowned]);

    const expected = recommendationsCopy.shopping.groupGap(
      "1",
      "2",
      String(ROLE_TARGETS.ramp),
    );
    expect(screen.getByText(expected)).toBeInTheDocument();
  });
});

describe("a basic land never appears in Shopping", () => {
  it("excludes cards with Basic in the typeLine from Shopping", () => {
    renderDecklist([basicLand, rampUnowned]);
    // Forest is a basic land — must not appear in Shopping even if unowned
    expect(screen.queryByText("Forest")).not.toBeInTheDocument();
    // The ramp card still shows
    expect(screen.getByText("Arcane Signet")).toBeInTheDocument();
  });
});

describe("the footer takes the all-auto branch when every to-buy card is auto", () => {
  it("renders shopping.footer when all unowned cards are auto", () => {
    renderDecklist([rampOwned, rampUnowned]);
    // rampUnowned has auto=true — all to-buy are auto
    const footer = recommendationsCopy.shopping.footer("1", "1");
    expect(screen.getByText(footer)).toBeInTheDocument();
  });
});

describe("the footer takes the mixed branch otherwise", () => {
  it("renders shopping.footerMixed when some unowned cards are not auto", () => {
    // drawUnownedManual has auto=false
    renderDecklist([drawOwned, drawUnowned, drawUnownedManual]);
    const footer = recommendationsCopy.shopping.footerMixed("2", "1");
    expect(screen.getByText(footer)).toBeInTheDocument();
  });
});

describe("the empty-covered state renders when there is nothing to buy", () => {
  it("renders emptyCoveredHeading and emptyCoveredBody when all cards are owned", () => {
    // Pass cards=[] for Shopping — no unowned cards to show
    renderDecklist([rampOwned, drawOwned]);
    expect(
      screen.getByText(recommendationsCopy.shopping.emptyCoveredHeading),
    ).toBeInTheDocument();
  });

  it("renders the empty covered body with the open slot count", () => {
    renderDecklist([rampOwned, drawOwned]);
    // open = 99 - built(2) = 97
    expect(
      screen.getByText(recommendationsCopy.shopping.emptyCoveredBody("97")),
    ).toBeInTheDocument();
  });
});

describe("the phone Shopping row is 52px and prints the EDHREC figure on its meta line", () => {
  it("renders the EDHREC figure when shoppingFigure is provided", () => {
    render(
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <AddOptimisticCardProvider value={{
          add: vi.fn(), remove: vi.fn(), markSpent: vi.fn(),
          announceUndo: vi.fn(), reportRemoveFailure: vi.fn(),
          resolveRow: vi.fn(), deleteRow: vi.fn(),
        }}>
          <DecklistRow deckId="d1" card={rampUnowned} shoppingFigure={42} />
        </AddOptimisticCardProvider>
      </CardDetailProvider>,
    );

    expect(screen.getByText(recommendationsCopy.shopping.rowFigure("42"))).toBeInTheDocument();
  });

  it("phone Shopping row has min-h-[52px] class when shoppingFigure is provided", () => {
    const { container } = render(
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <AddOptimisticCardProvider value={{
          add: vi.fn(), remove: vi.fn(), markSpent: vi.fn(),
          announceUndo: vi.fn(), reportRemoveFailure: vi.fn(),
          resolveRow: vi.fn(), deleteRow: vi.fn(),
        }}>
          <DecklistRow deckId="d1" card={rampUnowned} shoppingFigure={42} />
        </AddOptimisticCardProvider>
      </CardDetailProvider>,
    );

    // The row shell should have 52px phone min-height
    const rowShell = container.querySelector(".min-h-\\[52px\\]");
    expect(rowShell).toBeInTheDocument();
  });
});

describe("the phone All row stays 44px and prints no figure", () => {
  it("has min-h-[44px] and no EDHREC figure when no shoppingFigure is passed", () => {
    const { container } = render(
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <AddOptimisticCardProvider value={{
          add: vi.fn(), remove: vi.fn(), markSpent: vi.fn(),
          announceUndo: vi.fn(), reportRemoveFailure: vi.fn(),
          resolveRow: vi.fn(), deleteRow: vi.fn(),
        }}>
          <DecklistRow deckId="d1" card={rampUnowned} />
        </AddOptimisticCardProvider>
      </CardDetailProvider>,
    );

    const rowShell = container.querySelector(".min-h-\\[44px\\]");
    expect(rowShell).toBeInTheDocument();

    // No figure text rendered
    expect(screen.queryByText(/edhrec/i)).not.toBeInTheDocument();
  });
});

describe("a row with no figure prints 'no EDHREC figure', not an em dash", () => {
  it("renders rowNoFigure sentence when shoppingFigure prop is absent from the map (undefined)", () => {
    // Pass shoppingFigures map that does NOT include this card's oracleId
    renderDecklist([rampOwned, rampUnowned], { shoppingFigures: {} });

    // rowNoFigure should appear for arcane-signet which is in Shopping
    expect(screen.getByText(recommendationsCopy.shopping.rowNoFigure)).toBeInTheDocument();
    // Must NOT be an em dash
    expect(screen.queryByText("—")).not.toBeInTheDocument();
  });

  it("renders rowFigure when the oracleId IS in the shoppingFigures map", () => {
    renderDecklist([rampOwned, rampUnowned], {
      shoppingFigures: { "arcane-signet": 67 },
    });

    expect(screen.getByText(recommendationsCopy.shopping.rowFigure("67"))).toBeInTheDocument();
    expect(screen.queryByText(recommendationsCopy.shopping.rowNoFigure)).not.toBeInTheDocument();
  });
});
