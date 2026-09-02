import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import type { DeckDetailCard } from "../../lib/decks/grouping";

const { clearAutoCards, restoreAutoCards } = vi.hoisted(() => ({
  clearAutoCards: vi.fn(),
  restoreAutoCards: vi.fn(),
}));
const { ClearAutoButton, SweepReceipt } = await import("./clear-auto");

afterEach(() => {
  clearAutoCards.mockReset();
  restoreAutoCards.mockReset();
});

// ── Fixture cards ──────────────────────────────────────────────────────────────
const autoCard = (id: string, name: string): DeckDetailCard => ({
  oracleId: id,
  name,
  typeLine: "Artifact",
  cardTypeGroup: "Artifacts",
  role: "ramp",
  owned: true,
  quantity: 1,
  auto: true,
});

const keptCard = (id: string, name: string): DeckDetailCard => ({
  ...autoCard(id, name),
  auto: false,
});

// ── ClearAutoButton ────────────────────────────────────────────────────────────

describe("ClearAutoButton", () => {
  it("is absent entirely at a count of 0 — not disabled, not hidden", () => {
    render(
      <ClearAutoButton
        count={0}
        keptCount={0}
        onClear={vi.fn()}
        pending={false}
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("prints the count on its face (desktop label)", () => {
    render(
      <ClearAutoButton
        count={5}
        keptCount={0}
        onClear={vi.fn()}
        pending={false}
      />,
    );
    // The desktop span carries the full clearAll label
    expect(
      screen.getByText(recommendationsCopy.auto.clearAll("5")),
    ).toBeInTheDocument();
  });

  it("shows the kept note only when keptCount >= 1", () => {
    const { rerender } = render(
      <ClearAutoButton
        count={5}
        keptCount={0}
        onClear={vi.fn()}
        pending={false}
      />,
    );
    expect(
      screen.queryByText(recommendationsCopy.auto.keptNote("0")),
    ).not.toBeInTheDocument();

    rerender(
      <ClearAutoButton
        count={5}
        keptCount={3}
        onClear={vi.fn()}
        pending={false}
      />,
    );
    expect(
      screen.getByText(recommendationsCopy.auto.keptNote("3")),
    ).toBeInTheDocument();
  });

  it("calls onClear once when clicked", async () => {
    const onClear = vi.fn();
    render(
      <ClearAutoButton
        count={3}
        keptCount={0}
        onClear={onClear}
        pending={false}
      />,
    );

    await act(async () => {
      screen.getByRole("button").click();
    });

    expect(onClear).toHaveBeenCalledOnce();
  });
});

// ── SweepReceipt ──────────────────────────────────────────────────────────────

describe("SweepReceipt", () => {
  const sweptRows = [
    { oracleId: "sol-ring", quantity: 1 },
    { oracleId: "arcane-signet", quantity: 1 },
  ];

  it("renders one receipt line, not one per row", () => {
    render(
      <SweepReceipt
        removed={sweptRows.length}
        onUndo={vi.fn()}
      />,
    );

    // One receipt sentence for the whole sweep
    expect(
      screen.getByText(recommendationsCopy.auto.swept(String(sweptRows.length))),
    ).toBeInTheDocument();
  });

  it("renders the Undo control", () => {
    render(
      <SweepReceipt
        removed={sweptRows.length}
        onUndo={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: recommendationsCopy.auto.sweptUndoAria(String(sweptRows.length)),
      }),
    ).toBeInTheDocument();
  });

  it("calls onUndo when the Undo button is clicked", async () => {
    const onUndo = vi.fn();
    render(
      <SweepReceipt
        removed={sweptRows.length}
        onUndo={onUndo}
      />,
    );

    await act(async () => {
      screen
        .getByRole("button", {
          name: recommendationsCopy.auto.sweptUndoAria(String(sweptRows.length)),
        })
        .click();
    });

    expect(onUndo).toHaveBeenCalledOnce();
  });
});

// ── Integration: sweep + undo lifecycle ───────────────────────────────────────
// Exercised through BuilderShell because swept state lives there beside spentSlot.

const { BuilderShell } = await import("./builder-shell");
import type { DeckDetail } from "../../lib/decks/read";

// One factory for the whole file: vi.mock is hoisted per module path, so a
// second call on this path would silently replace this one. BuilderShell needs
// the wider surface, so every action the file touches is stubbed here.
vi.mock("../../app/decks/actions", () => ({
  clearAutoCards,
  restoreAutoCards,
  keepAutoCard: vi.fn(),
  addCardToDeck: vi.fn(),
  removeCardFromDeck: vi.fn(),
  deleteDeck: vi.fn(),
  renameDeck: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

function makeDeck(cards: DeckDetailCard[]): DeckDetail {
  const built = cards.reduce((sum, c) => sum + c.quantity, 0);
  return {
    id: "deck-sweep",
    name: "Test Deck",
    createdAt: new Date("2026-01-01"),
    commander: {
      oracleId: "commander-id",
      name: "Korvold, Fae-Cursed King",
      colorIdentity: ["B", "R", "G"],
      manaCost: "{2}{B}{R}{G}",
      typeLine: "Legendary Creature — Dragon Noble",
      oracleText: null,
      imageUri: null,
    },
    filled: true,
    cards,
    built,
    ownedCount: built,
    toBuyCount: 0,
    total: built,
    unresolvedRows: [],
  } as DeckDetail;
}

const card1 = autoCard("sol-ring", "Sol Ring");
const card2 = autoCard("arcane-signet", "Arcane Signet");
const card3 = keptCard("swords", "Swords to Plowshares");

function shell(cards: DeckDetailCard[]) {
  return (
    <BuilderShell
      deck={makeDeck(cards)}
      suggestions={[]}
      degraded={false}
      firstRun={false}
      commanderIdentity={["B", "R", "G"]}
      arrivedFromImport={false}
    />
  );
}

function renderBuilder(cards: DeckDetailCard[]) {
  const view = render(shell(cards));
  return {
    ...view,
    revalidate: (next: DeckDetailCard[]) =>
      act(async () => {
        view.rerender(shell(next));
      }),
  };
}

describe("sweep + undo lifecycle (through BuilderShell)", () => {
  it("clearing calls the action once and removes every auto row optimistically", async () => {
    // clearAutoCards returns the swept rows
    clearAutoCards.mockResolvedValue([
      { oracleId: "sol-ring", quantity: 1 },
      { oracleId: "arcane-signet", quantity: 1 },
    ]);

    renderBuilder([card1, card2]);

    const btn = screen.getByRole("button", {
      name: recommendationsCopy.auto.clearAllAria("2"),
    });

    await act(async () => {
      btn.click();
    });

    expect(clearAutoCards).toHaveBeenCalledOnce();
    expect(clearAutoCards).toHaveBeenCalledWith("deck-sweep");
  });

  it("takes the auto rows off the list before the server answers", async () => {
    // The prediction is only observable while the action is in flight: once the
    // transition ends React hands the list back to the server props, which in a
    // test never revalidate. Holding the action open is what makes the
    // optimistic frame assertable at all — and an optimistic dispatch made
    // outside a transition never reaches this frame.
    let settle: (rows: { oracleId: string; quantity: number }[]) => void = () => {};
    clearAutoCards.mockReturnValue(
      new Promise<{ oracleId: string; quantity: number }[]>((resolve) => {
        settle = resolve;
      }),
    );

    renderBuilder([card1, card2]);

    await act(async () => {
      screen
        .getByRole("button", { name: recommendationsCopy.auto.clearAllAria("2") })
        .click();
    });

    expect(screen.queryByText("Sol Ring")).not.toBeInTheDocument();
    expect(screen.queryByText("Arcane Signet")).not.toBeInTheDocument();

    await act(async () => {
      settle([
        { oracleId: "sol-ring", quantity: 1 },
        { oracleId: "arcane-signet", quantity: 1 },
      ]);
    });
  });

  it("keeps the receipt after a sweep empties the deck", async () => {
    // The canonical case: every card in the deck is auto, so the sweep leaves
    // nothing built. The empty state must not claim the screen while the only
    // route back to those cards is the receipt's Undo.
    clearAutoCards.mockResolvedValue([
      { oracleId: "sol-ring", quantity: 1 },
      { oracleId: "arcane-signet", quantity: 1 },
    ]);

    const { revalidate } = renderBuilder([card1, card2]);

    await act(async () => {
      screen
        .getByRole("button", { name: recommendationsCopy.auto.clearAllAria("2") })
        .click();
    });

    await revalidate([]);

    expect(
      screen.getByRole("button", {
        name: recommendationsCopy.auto.sweptUndoAria("2"),
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(recommendationsCopy.sweptEmpty.heading)).toBeNull();
  });

  it("a kept row survives the sweep", async () => {
    clearAutoCards.mockResolvedValue([
      { oracleId: "sol-ring", quantity: 1 },
    ]);

    renderBuilder([card1, card3]);

    // With one auto card and one kept, the count is 1
    const btn = screen.getByRole("button", {
      name: recommendationsCopy.auto.clearAllAria("1"),
    });

    await act(async () => {
      btn.click();
    });

    // card3 (kept) should still be in the deck
    expect(screen.getByText("Swords to Plowshares")).toBeInTheDocument();
  });

  it("the receipt says swept count once, not once per row", async () => {
    clearAutoCards.mockResolvedValue([
      { oracleId: "sol-ring", quantity: 1 },
      { oracleId: "arcane-signet", quantity: 1 },
    ]);

    renderBuilder([card1, card2]);

    const btn = screen.getByRole("button", {
      name: recommendationsCopy.auto.clearAllAria("2"),
    });

    await act(async () => {
      btn.click();
    });

    // One receipt, not two
    const receipts = screen.getAllByText(recommendationsCopy.auto.swept("2"));
    expect(receipts).toHaveLength(1);
  });

  it("counts a stacked basic-land row by its copies, not as one card", async () => {
    // A fill puts every basic into a single row of ~37. Counting rows would
    // offer to sweep "2 cards" and then take 38 away.
    const basics: DeckDetailCard = {
      oracleId: "forest",
      name: "Forest",
      typeLine: "Basic Land — Forest",
      cardTypeGroup: "Lands",
      role: "land",
      owned: true,
      quantity: 37,
      auto: true,
    };
    clearAutoCards.mockResolvedValue([
      { oracleId: "sol-ring", quantity: 1 },
      { oracleId: "forest", quantity: 37 },
    ]);

    const { revalidate } = renderBuilder([card1, basics]);

    await act(async () => {
      screen
        .getByRole("button", { name: recommendationsCopy.auto.clearAllAria("38") })
        .click();
    });

    await revalidate([]);

    expect(
      screen.getByRole("button", {
        name: recommendationsCopy.auto.sweptUndoAria("38"),
      }),
    ).toBeInTheDocument();
  });

  it("Undo calls restoreAutoCards with the swept rows", async () => {
    const sweptRows = [
      { oracleId: "sol-ring", quantity: 1 },
      { oracleId: "arcane-signet", quantity: 1 },
    ];
    clearAutoCards.mockResolvedValue(sweptRows);
    restoreAutoCards.mockResolvedValue(undefined);

    renderBuilder([card1, card2]);

    // Trigger sweep
    await act(async () => {
      screen
        .getByRole("button", {
          name: recommendationsCopy.auto.clearAllAria("2"),
        })
        .click();
    });

    // Trigger undo
    await act(async () => {
      screen
        .getByRole("button", {
          name: recommendationsCopy.auto.sweptUndoAria("2"),
        })
        .click();
    });

    expect(restoreAutoCards).toHaveBeenCalledOnce();
    expect(restoreAutoCards).toHaveBeenCalledWith("deck-sweep", sweptRows);
  });

  it("announces the restore, since accepting Undo unmounts the receipt", async () => {
    const sweptRows = [
      { oracleId: "sol-ring", quantity: 1 },
      { oracleId: "arcane-signet", quantity: 1 },
    ];
    clearAutoCards.mockResolvedValue(sweptRows);
    restoreAutoCards.mockResolvedValue(undefined);

    const { revalidate } = renderBuilder([card1, card2]);

    await act(async () => {
      screen
        .getByRole("button", { name: recommendationsCopy.auto.clearAllAria("2") })
        .click();
    });
    // The server list settles without the swept rows before Undo is offered.
    await revalidate([]);

    await act(async () => {
      screen
        .getByRole("button", { name: recommendationsCopy.auto.sweptUndoAria("2") })
        .click();
    });

    expect(
      screen.getByText(recommendationsCopy.auto.sweptRestoredAnnounce("2", "2")),
    ).toBeInTheDocument();
  });

  it("a failed sweep restores the list and says so", async () => {
    clearAutoCards.mockRejectedValue(new Error("network error"));

    renderBuilder([card1, card2]);

    await act(async () => {
      screen
        .getByRole("button", {
          name: recommendationsCopy.auto.clearAllAria("2"),
        })
        .click();
    });

    // The error message from sweepFailed
    expect(
      screen.getByText(recommendationsCopy.auto.sweepFailed),
    ).toBeInTheDocument();
  });

  // The sweep succeeded, so the deck is not unchanged — the cards really are
  // gone. Reusing the sweep's refusal here would name the wrong action and tell
  // the player the deck still holds what it no longer holds.
  it("a failed Undo says the cards are still out, not that nothing happened", async () => {
    const sweptRows = [
      { oracleId: "sol-ring", quantity: 1 },
      { oracleId: "arcane-signet", quantity: 1 },
    ];
    clearAutoCards.mockResolvedValue(sweptRows);
    restoreAutoCards.mockRejectedValue(new Error("network error"));

    renderBuilder([card1, card2]);

    await act(async () => {
      screen
        .getByRole("button", { name: recommendationsCopy.auto.clearAllAria("2") })
        .click();
    });

    await act(async () => {
      screen
        .getByRole("button", { name: recommendationsCopy.auto.sweptUndoAria("2") })
        .click();
    });

    expect(
      screen.getByText(recommendationsCopy.auto.restoreFailed),
    ).toBeInTheDocument();
    expect(screen.queryByText(recommendationsCopy.auto.sweepFailed)).toBeNull();
  });

  // The receipt stays up after a refused Undo so the player can try again. If
  // the refusal outlived the retry, a restored deck would still read as broken.
  it("a retried Undo that succeeds drops the earlier refusal", async () => {
    const sweptRows = [
      { oracleId: "sol-ring", quantity: 1 },
      { oracleId: "arcane-signet", quantity: 1 },
    ];
    clearAutoCards.mockResolvedValue(sweptRows);
    restoreAutoCards
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce(undefined);

    renderBuilder([card1, card2]);

    await act(async () => {
      screen
        .getByRole("button", { name: recommendationsCopy.auto.clearAllAria("2") })
        .click();
    });

    await act(async () => {
      screen
        .getByRole("button", { name: recommendationsCopy.auto.sweptUndoAria("2") })
        .click();
    });
    expect(
      screen.getByText(recommendationsCopy.auto.restoreFailed),
    ).toBeInTheDocument();

    await act(async () => {
      screen
        .getByRole("button", { name: recommendationsCopy.auto.sweptUndoAria("2") })
        .click();
    });

    expect(screen.queryByText(recommendationsCopy.auto.restoreFailed)).toBeNull();
  });
});
