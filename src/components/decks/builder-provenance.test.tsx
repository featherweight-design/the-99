// The ledger's wiring, exercised through BuilderShell because the shell owns
// it: the header's figure, the mark that reaches the decklist rows, and the
// reconcile that drops a mark whose pass is no longer in the summaries.
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DeckDetail } from "../../lib/decks/read";
import type { FillPassSummary } from "../../lib/decks/fill-passes";
import { topOffCopy } from "../../lib/copy/top-off";

vi.mock("../../app/decks/actions", () => ({
  createDeck: vi.fn(),
  getDeckSuggestions: vi.fn(async () => ({ suggestions: [], degraded: false })),
  addCardToDeck: vi.fn(),
  removeCardFromDeck: vi.fn(),
  deleteDeck: vi.fn(),
  renameDeck: vi.fn(),
  fillDeck: vi.fn(),
  undoFillPass: vi.fn(),
}));

const { BuilderShell } = await import("./builder-shell");

const ledger = topOffCopy.ledger;

function makeDeck(autoCount: number, keptCount: number): DeckDetail {
  const cards = Array.from({ length: autoCount + keptCount }, (_, i) => ({
    oracleId: `card-${i}`,
    name: `Card ${i}`,
    typeLine: "Artifact",
    cardTypeGroup: "Artifacts" as const,
    role: "other" as const,
    owned: true,
    quantity: 1,
    auto: i < autoCount,
  }));
  const size = autoCount + keptCount;
  return {
    id: "deck-1",
    name: "Korvold",
    createdAt: new Date("2026-01-01"),
    filled: true,
    commander: {
      oracleId: "korvold",
      name: "Korvold, Fae-Cursed King",
      colorIdentity: ["B", "R", "G"],
      manaCost: "{2}{B}{R}{G}",
      typeLine: "Legendary Creature — Dragon Noble",
      oracleText: null,
      imageUri: null,
    },
    cards,
    built: size,
    ownedCount: size,
    toBuyCount: 0,
    total: size,
    unresolvedRows: [],
  } as unknown as DeckDetail;
}

function makePass(id: string, ordinal: number, oracleIds: string[]): FillPassSummary {
  return {
    id,
    kind: "top_off",
    ordinal,
    createdAt: new Date("2026-01-01"),
    live: oracleIds.length,
    kept: 0,
    removed: 0,
    openSlots: 5,
    liveCards: oracleIds.map((oracleId) => ({ oracleId, quantity: 1 })),
  };
}

async function mount(deck: DeckDetail, fillPasses: FillPassSummary[] = []) {
  let view!: ReturnType<typeof render>;
  await act(async () => {
    view = render(
      <BuilderShell
        deck={deck}
        suggestions={[]}
        degraded={false}
        firstRun={false}
        commanderIdentity={["B", "R", "G"]}
        arrivedFromImport={false}
        fillPasses={fillPasses}
       newestAsOf={null}/>,
    );
  });
  return view;
}

describe("BuilderShell — the ledger's header", () => {
  it("states the deck's auto count, not the deck's size", async () => {
    await mount(makeDeck(3, 20), [makePass("p1", 1, ["card-0", "card-1", "card-2"])]);
    expect(screen.getByText(ledger.header("3"))).toBeInTheDocument();
  });

  it("is absent once the player has kept or swept every auto card", async () => {
    await mount(makeDeck(0, 20), [makePass("p1", 1, [])]);
    expect(screen.queryByText(/came from/)).not.toBeInTheDocument();
  });
});

describe("BuilderShell — the mark", () => {
  it("names only the marked pass's rows in the decklist below", async () => {
    await mount(makeDeck(2, 0), [makePass("p1", 1, ["card-0"])]);
    expect(screen.queryByText(ledger.markedRow(ledger.passLabel("1")))).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: ledger.markAria("1", ledger.passLabel("1")) }),
      );
    });

    // One card in the pass, so exactly one row gains the marker — the other
    // auto card is in the deck but not in this pass.
    expect(screen.getAllByText(ledger.markedRow(ledger.passLabel("1")))).toHaveLength(1);
  });

  // Visually-hidden text beside the name button is browse-mode only, and a
  // reader moving through the decklist by Tab never leaves focus mode. The
  // button has to point at it for the mark to be spoken to the reader it is for.
  it("reads the mark after the card's own name when the name is focused", async () => {
    await mount(makeDeck(2, 0), [makePass("p1", 1, ["card-0"])]);
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: ledger.markAria("1", ledger.passLabel("1")) }),
      );
    });

    const marker = screen.getByText(ledger.markedRow(ledger.passLabel("1")));
    // A containment selector, not an equality one: every row now describes its
    // name with the availability word as well (§Errata), so the mark's id shares
    // the attribute rather than owning it.
    const described = document.querySelectorAll(`[aria-describedby~="${marker.id}"]`);
    expect(marker.id).not.toBe("");
    expect(described).toHaveLength(1);

    // And it is the marked card's own name that points at it. The other auto
    // card is in the deck but not in this pass, so its name describes only its
    // own availability rather than borrowing a neighbour's mark.
    expect(described[0].textContent).toBe("Card 0");
    expect(
      screen.getByText("Card 1").closest("button")?.getAttribute("aria-describedby"),
    ).not.toContain(marker.id);
  });

  it("drops a mark whose pass is gone from the incoming summaries", async () => {
    const deck = makeDeck(2, 0);
    const view = await mount(deck, [makePass("p1", 1, ["card-0"])]);
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: ledger.markAria("1", ledger.passLabel("1")) }),
      );
    });
    expect(screen.getAllByText(ledger.markedRow(ledger.passLabel("1")))).toHaveLength(1);

    // The undo landed on the server and the pass came back gone. The mark it
    // held has to go with it, or the decklist keeps an edge nothing can clear.
    await act(async () => {
      view.rerender(
        <BuilderShell
          deck={deck}
          suggestions={[]}
          degraded={false}
          firstRun={false}
          commanderIdentity={["B", "R", "G"]}
          arrivedFromImport={false}
          fillPasses={[makePass("p2", 2, ["card-1"])]}
         newestAsOf={null}/>,
      );
    });
    expect(screen.queryByText(ledger.markedRow(ledger.passLabel("1")))).not.toBeInTheDocument();
  });
});
