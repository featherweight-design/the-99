import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { builtFragment } from "../../lib/copy/decks-builder";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import type { DeckDetailCard } from "../../lib/decks/grouping";

const { clearAutoCards, restoreAutoCards, keepAllAutoCards } = vi.hoisted(() => ({
  clearAutoCards: vi.fn(),
  restoreAutoCards: vi.fn(),
  keepAllAutoCards: vi.fn(),
}));
const { ClearAutoButton, SweepReceipt } = await import("./clear-auto");

afterEach(() => {
  clearAutoCards.mockReset();
  restoreAutoCards.mockReset();
  keepAllAutoCards.mockReset();
});

// ── Fixture cards ──────────────────────────────────────────────────────────────
const autoCard = (id: string, name: string): DeckDetailCard => ({
  oracleId: id,
  name,
  typeLine: "Artifact",
  cardTypeGroup: "Artifacts",
  role: "ramp",
  cmc: 2,
  owned: true,
  quantity: 1,
  auto: true,
  printedName: null,
  printedSetCode: null,
  printedCollectorNumber: null,
});

const keptCard = (id: string, name: string): DeckDetailCard => ({
  ...autoCard(id, name),
  auto: false,
});

const unownedAutoCard = (id: string, name: string): DeckDetailCard => ({
  ...autoCard(id, name),
  owned: false,
});

/** The keep is two clicks: the trigger raises the question, `Keep them`
 *  answers it. Every test about what the write does goes through both, because
 *  no path to the write skips the question. */
const keepAllAnswered = async (count: string) => {
  await act(async () => {
    screen.getByRole("button", { name: recommendationsCopy.auto.keepAllAria(count) }).click();
  });
  await act(async () => {
    screen.getByRole("button", { name: recommendationsCopy.auto.keepAllConfirmYes }).click();
  });
};

// ── ClearAutoButton ────────────────────────────────────────────────────────────

describe("ClearAutoButton", () => {
  it("is absent entirely at a count of 0 — not disabled, not hidden", () => {
    render(
      <ClearAutoButton
        count={0}
        keptCount={0}
        onClear={vi.fn()}
        pending={false}
        onKeepAll={vi.fn()}
        keepAllPending={false}
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
        onKeepAll={vi.fn()}
        keepAllPending={false}
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
        onKeepAll={vi.fn()}
        keepAllPending={false}
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
        onKeepAll={vi.fn()}
        keepAllPending={false}
      />,
    );
    expect(
      screen.getByText(recommendationsCopy.auto.keptNote("3")),
    ).toBeInTheDocument();
  });

  // Design table state 7: the keptNote must survive the button's absence.
  // Before the fix, keptNote was rendered inside the early `if (count === 0) return null`
  // guard, so it disappeared with the button.
  it("shows the keptNote even when count is 0 and the button is absent", () => {
    render(
      <ClearAutoButton
        count={0}
        keptCount={4}
        onClear={vi.fn()}
        pending={false}
        onKeepAll={vi.fn()}
        keepAllPending={false}
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText(recommendationsCopy.auto.keptNote("4"))).toBeInTheDocument();
  });

  // With neither a note nor a button, the wrapper is an empty flex child that
  // still collects the toolbar's gap. Nothing to say means nothing rendered.
  it("renders no element at all when there is neither a count nor a kept note", () => {
    const { container } = render(
      <ClearAutoButton
        count={0}
        keptCount={0}
        onClear={vi.fn()}
        pending={false}
        onKeepAll={vi.fn()}
        keepAllPending={false}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  // The same emptiness one breakpoint down: at a count of 0 the kept note is the
  // only content, and it is desktop-only, so on a phone the wrapper would sit in
  // the toolbar's flex row spacing it for something nobody can see.
  it("keeps the wrapper out of the mobile toolbar when only the note remains", () => {
    const { container } = render(
      <ClearAutoButton
        count={0}
        keptCount={4}
        onClear={vi.fn()}
        pending={false}
        onKeepAll={vi.fn()}
        keepAllPending={false}
      />,
    );
    expect(container.firstElementChild).toHaveClass("hidden", "md:flex");
  });

  // Both bulk controls read the same count, so a toolbar showing one and not
  // the other would say that count means two things.
  it("offers Keep all beside the sweep, and neither at a count of 0", () => {
    const { rerender } = render(
      <ClearAutoButton
        count={5}
        keptCount={2}
        onClear={vi.fn()}
        pending={false}
        onKeepAll={vi.fn()}
        keepAllPending={false}
      />,
    );
    expect(screen.getByText(recommendationsCopy.auto.keepAll("5"))).toBeInTheDocument();

    rerender(
      <ClearAutoButton
        count={0}
        keptCount={2}
        onClear={vi.fn()}
        pending={false}
        onKeepAll={vi.fn()}
        keepAllPending={false}
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  // Keep leads, so the cluster reads from the safe answer to the destructive
  // one and the sweep is not the first bulk control the eye lands on.
  it("puts Keep all left of the sweep", () => {
    render(
      <ClearAutoButton
        count={5}
        keptCount={0}
        onClear={vi.fn()}
        pending={false}
        onKeepAll={vi.fn()}
        keepAllPending={false}
      />,
    );

    const [first, second] = screen.getAllByRole("button");
    expect(first).toHaveAccessibleName(recommendationsCopy.auto.keepAllAria("5"));
    expect(second).toHaveAccessibleName(recommendationsCopy.auto.clearAllAria("5"));
  });

  // Either write in flight disables both: they act on the same rows, so the
  // second one clicked would decide the fate of cards the first has claimed.
  it.each([
    ["the sweep", { pending: true, keepAllPending: false }],
    ["the keep", { pending: false, keepAllPending: true }],
  ])("disables both controls while %s is in flight", (_name, flags) => {
    render(
      <ClearAutoButton
        count={5}
        keptCount={0}
        onClear={vi.fn()}
        onKeepAll={vi.fn()}
        {...flags}
      />,
    );

    for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled();
  });

  // The keep asks first, because it has no undo. The sweep beside it does not,
  // because it ships a receipt with one.
  it("asks before keeping, and only writes once the question is answered", async () => {
    const onKeepAll = vi.fn();
    render(
      <ClearAutoButton
        count={3}
        keptCount={0}
        onClear={vi.fn()}
        pending={false}
        onKeepAll={onKeepAll}
        keepAllPending={false}
      />,
    );

    await act(async () => {
      screen
        .getByRole("button", { name: recommendationsCopy.auto.keepAllAria("3") })
        .click();
    });

    expect(onKeepAll).not.toHaveBeenCalled();
    const question = screen.getByText(
      recommendationsCopy.auto.keepAllConfirm("3"),
    );
    expect(question).toBeInTheDocument();

    const yes = screen.getByRole("button", {
      name: recommendationsCopy.auto.keepAllConfirmYes,
    });
    expect(yes).toHaveFocus();
    // Focus lands on a button whose own label names nothing, so both answers
    // point back at the question and a reader hears what it is answering.
    const questionId = question.closest("[id]")?.id;
    expect(questionId).toBeTruthy();
    expect(yes).toHaveAttribute("aria-describedby", questionId);
    expect(
      screen.getByRole("button", {
        name: recommendationsCopy.auto.keepAllConfirmNo,
      }),
    ).toHaveAttribute("aria-describedby", questionId);

    await act(async () => {
      yes.click();
    });

    expect(onKeepAll).toHaveBeenCalledOnce();
  });

  // The question replaces both bulk controls, so the sweep cannot be offered on
  // cards an unanswered keep has already spoken for.
  it("takes both bulk controls away while the question is up", async () => {
    render(
      <ClearAutoButton
        count={3}
        keptCount={0}
        onClear={vi.fn()}
        pending={false}
        onKeepAll={vi.fn()}
        keepAllPending={false}
      />,
    );

    await act(async () => {
      screen
        .getByRole("button", { name: recommendationsCopy.auto.keepAllAria("3") })
        .click();
    });

    expect(
      screen.queryByRole("button", { name: recommendationsCopy.auto.clearAllAria("3") }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: recommendationsCopy.auto.keepAllAria("3") }),
    ).not.toBeInTheDocument();
  });

  // A row's own keep can take the last auto card while the question is up. The
  // question goes with the count; the flag must go with it, or the next fill
  // pass reopens a question nobody asked for.
  it("forgets an unanswered question once the count reaches 0", async () => {
    const props = {
      keptCount: 0,
      onClear: vi.fn(),
      pending: false,
      onKeepAll: vi.fn(),
      keepAllPending: false,
    };
    const { rerender } = render(<ClearAutoButton count={3} {...props} />);

    await act(async () => {
      screen
        .getByRole("button", { name: recommendationsCopy.auto.keepAllAria("3") })
        .click();
    });
    expect(
      screen.getByText(recommendationsCopy.auto.keepAllConfirm("3")),
    ).toBeInTheDocument();

    await act(async () => {
      rerender(<ClearAutoButton count={0} {...props} />);
    });
    await act(async () => {
      rerender(<ClearAutoButton count={2} {...props} />);
    });

    expect(
      screen.queryByText(recommendationsCopy.auto.keepAllConfirm("2")),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: recommendationsCopy.auto.keepAllAria("2") }),
    ).toBeInTheDocument();
  });

  // The trigger unmounts while the question is up, so a cancel that did not
  // carry focus back would drop a keyboard reader at the top of the document.
  it("writes nothing on cancel, and returns focus to the trigger", async () => {
    const onKeepAll = vi.fn();
    render(
      <ClearAutoButton
        count={3}
        keptCount={0}
        onClear={vi.fn()}
        pending={false}
        onKeepAll={onKeepAll}
        keepAllPending={false}
      />,
    );

    await act(async () => {
      screen
        .getByRole("button", { name: recommendationsCopy.auto.keepAllAria("3") })
        .click();
    });
    await act(async () => {
      screen
        .getByRole("button", { name: recommendationsCopy.auto.keepAllConfirmNo })
        .click();
    });

    expect(onKeepAll).not.toHaveBeenCalled();
    const trigger = screen.getByRole("button", {
      name: recommendationsCopy.auto.keepAllAria("3"),
    });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("calls onClear once when clicked", async () => {
    const onClear = vi.fn();
    render(
      <ClearAutoButton
        count={3}
        keptCount={0}
        onClear={onClear}
        pending={false}
        onKeepAll={vi.fn()}
        keepAllPending={false}
      />,
    );

    await act(async () => {
      screen
        .getByRole("button", { name: recommendationsCopy.auto.clearAllAria("3") })
        .click();
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
// Exercised through BuilderShell because swept state lives there beside spentSlots.

const { BuilderShell } = await import("./builder-shell");
import type { DeckDetail } from "../../lib/decks/read";
import { recommendedMix } from "../../lib/decks/mix";

/** The asserted baseline, through the real function rather than restated — a hand-built
 *  literal drifts from the type the moment a field is added, which is how 120 of these broke. */
const TEST_MIX = recommendedMix(null, false);

// One factory for the whole file: vi.mock is hoisted per module path, so a
// second call on this path would silently replace this one. BuilderShell needs
// the wider surface, so every action the file touches is stubbed here.
vi.mock("../../app/decks/actions", () => ({
  clearAutoCards,
  restoreAutoCards,
  keepAllAutoCards,
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
      artCropUri: null,
    },
    partner: null,
    filled: true,
    cards,
    built,
    ownedCount: built,
    coveredCount: built,
    toBuyCount: 0,
    total: built,
    unresolvedRows: [],
    declaredBracket: null,
    intent: null,
    intentSeeded: false,
    noteCounts: { gameChanger: 0, extraTurns: 0, tutor: 0 },
  } as DeckDetail;
}

const card1 = autoCard("sol-ring", "Sol Ring");
const card2 = autoCard("arcane-signet", "Arcane Signet");
const card3 = keptCard("swords", "Swords to Plowshares");

function shell(cards: DeckDetailCard[]) {
  return (
    <BuilderShell mix={TEST_MIX}
      deck={makeDeck(cards)}
      suggestions={[]}
      degraded={false}
      firstRun={false}
      commanderIdentity={["B", "R", "G"]}
      arrivedFromImport={false}
     newestAsOf={null}/>
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

  // The cards Shopping lists are the fill's, so a sweep usually empties that
  // tab. If the empty state took the screen alone, Undo would sit behind a tab
  // switch the player has no reason to guess at.
  it("keeps the receipt reachable when a sweep empties the Shopping tab", async () => {
    const unowned = unownedAutoCard("dockside", "Dockside Extortionist");
    clearAutoCards.mockResolvedValue([{ oracleId: "dockside", quantity: 1 }]);

    const { revalidate } = renderBuilder([unowned]);

    await act(async () => {
      screen.getByRole("tab", { name: "Shopping 1" }).click();
    });

    await act(async () => {
      screen
        .getByRole("button", { name: recommendationsCopy.auto.clearAllAria("1") })
        .click();
    });

    await revalidate([]);

    expect(
      screen.getByRole("button", {
        name: recommendationsCopy.auto.sweptUndoAria("1"),
      }),
    ).toBeInTheDocument();
  });

  // Design table state 7 again, this time end to end. The component keeps the
  // note past the button's absence, but the toolbar used to gate the whole
  // component on the auto count — so at zero the note went with it.
  it("keeps the kept-note in the toolbar after the last auto card is gone", async () => {
    renderBuilder([card3]);

    expect(screen.queryByRole("button", { name: /Clear all/ })).not.toBeInTheDocument();
    expect(screen.getByText(recommendationsCopy.auto.keptNote("1"))).toBeInTheDocument();
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
      cmc: 0,
      owned: true,
      quantity: 37,
      auto: true,
      printedName: null,
      printedSetCode: null,
      printedCollectorNumber: null,
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
    restoreAutoCards.mockResolvedValue(2);

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
    restoreAutoCards.mockResolvedValue(2);

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
      screen.getByText(recommendationsCopy.auto.sweptRestoredAnnounce("2", builtFragment(2, 99))),
    ).toBeInTheDocument();
  });

  // A card the player re-added by hand between the sweep and the Undo is skipped
  // by the restore, so the receipt's own total would overstate both numbers.
  it("announces the count the server restored, not the receipt's", async () => {
    clearAutoCards.mockResolvedValue([
      { oracleId: "sol-ring", quantity: 1 },
      { oracleId: "arcane-signet", quantity: 1 },
    ]);
    restoreAutoCards.mockResolvedValue(1);

    const { revalidate } = renderBuilder([card1, card2]);

    await act(async () => {
      screen
        .getByRole("button", { name: recommendationsCopy.auto.clearAllAria("2") })
        .click();
    });
    await revalidate([]);

    await act(async () => {
      screen
        .getByRole("button", { name: recommendationsCopy.auto.sweptUndoAria("2") })
        .click();
    });

    expect(
      screen.getByText(recommendationsCopy.auto.sweptRestoredAnnounce("1", builtFragment(1, 99))),
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
    // And the cards are back. The sweep takes no explicit rollback because the
    // optimistic edit is dispatched inside the transition, and React drops its
    // predictions when that transition ends however it ends — but "the deck is
    // unchanged" beside a swept list would be the worst outcome this flow has,
    // so the recovery is asserted rather than assumed.
    expect(screen.getByText("Sol Ring")).toBeInTheDocument();
    expect(screen.getByText("Arcane Signet")).toBeInTheDocument();
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
  // A keep takes no card, so there is no receipt strip and no Undo — an Undo
  // would have to write `auto = true` back across the rows the player has just
  // declared theirs. The receipts are the tags leaving, the controls going
  // absent, the kept note, and one spoken line.
  it("keeps every auto card and offers no way back", async () => {
    keepAllAutoCards.mockResolvedValue(2);

    const { revalidate } = renderBuilder([card1, card2]);

    await keepAllAnswered("2");

    expect(keepAllAutoCards).toHaveBeenCalledOnce();
    expect(keepAllAutoCards).toHaveBeenCalledWith("deck-sweep");
    expect(screen.getByText("Sol Ring")).toBeInTheDocument();
    expect(screen.getByText("Arcane Signet")).toBeInTheDocument();
    expect(screen.queryByText(recommendationsCopy.auto.swept("2"))).toBeNull();

    await revalidate([keptCard("sol-ring", "Sol Ring"), keptCard("arcane-signet", "Arcane Signet")]);

    // The toolbar goes quiet: both controls absent, the kept note the survivor.
    expect(screen.queryByRole("button", { name: /Keep all/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Clear all/ })).not.toBeInTheDocument();
    expect(screen.getByText(recommendationsCopy.auto.keptNote("2"))).toBeInTheDocument();
  });

  it("announces the keep once, counting the whole deck as the player's", async () => {
    keepAllAutoCards.mockResolvedValue(2);

    renderBuilder([card1, card2, card3]);

    await keepAllAnswered("2");

    // Two kept here, one kept already — the note's own sentence, word for word.
    const spoken = screen.getAllByText(
      recommendationsCopy.auto.keptAllAnnounce("2", "3"),
    );
    expect(spoken).toHaveLength(1);
  });

  // The player told us to keep these cards. A refusal that said "the deck is
  // unchanged" would answer a question nobody asked: what they need to know is
  // that the tags are back.
  it("a failed keep says the cards are still marked auto", async () => {
    keepAllAutoCards.mockRejectedValue(new Error("network error"));

    renderBuilder([card1, card2]);

    await keepAllAnswered("2");

    expect(screen.getByText(recommendationsCopy.auto.keepAllFailed)).toBeInTheDocument();
    expect(screen.queryByText(recommendationsCopy.auto.sweepFailed)).toBeNull();
    // The transition ended, so React dropped the prediction: the sweep is on
    // offer again at its original count.
    expect(
      screen.getByRole("button", { name: recommendationsCopy.auto.clearAllAria("2") }),
    ).toBeInTheDocument();
  });

  it("a retried Undo that succeeds drops the earlier refusal", async () => {
    const sweptRows = [
      { oracleId: "sol-ring", quantity: 1 },
      { oracleId: "arcane-signet", quantity: 1 },
    ];
    clearAutoCards.mockResolvedValue(sweptRows);
    restoreAutoCards
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce(2);

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
