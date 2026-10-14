// Adding a card has to land across the whole builder in the frame of the click
// — decklist row, group heading, and the All/Shopping counts — not just on the
// button that was pressed. Exercised through BuilderShell because the seam
// being tested is precisely that one component's optimistic list feeding three
// different subtrees; a test of the reducer alone would pass while the wiring
// stayed broken.
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DeckDetail } from "../../lib/decks/read";
import type { DeckSuggestionWithFacts } from "../../lib/decks/suggest";
import type { DeckMutationResult } from "../../lib/decks/mutation-result";
import { recommendedMix } from "../../lib/decks/mix";

/** The asserted baseline, through the real function rather than restated — a hand-built
 *  literal drifts from the type the moment a field is added, which is how 120 of these broke. */
const TEST_MIX = recommendedMix(null, false);

const { addCardToDeck, removeCardFromDeck } = vi.hoisted(() => ({
  addCardToDeck: vi.fn(),
  removeCardFromDeck: vi.fn(),
}));
vi.mock("../../app/decks/actions", () => ({
  createDeck: vi.fn(),
  getDeckSuggestions: vi.fn(async () => ({ suggestions: [], degraded: false })),
  addCardToDeck,
  removeCardFromDeck,
  deleteDeck: vi.fn(),
  renameDeck: vi.fn(),
}));

// Consider's degraded banner refreshes the route rather than owning a retry, so
// mounting the shell now needs a router even on the happy path.
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const { BuilderShell } = await import("./builder-shell");

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

const suggestion: DeckSuggestionWithFacts = {
  // `null` — a card with no facts, which draws no note. Required on the enriched type.
  facts: null,
  oracleId: "sol-ring",
  name: "Sol Ring",
  reason: "edhrec",
  reasonType: "edhrec",
  manaCost: "{1}",
  manaValue: 1,
  imageUri: null,
  inclusionPct: null,
  lift: null,
  synergyFigure: null,
  reasonLabel: "EDHREC staple",
  owned: false,
  inDeck: false,
  typeLine: "Artifact",
  cardTypeGroup: "Artifacts",
  role: "ramp",
};

function makeDeck(): DeckDetail {
  return {
    id: "deck-1",
    name: "Korvold",
    createdAt: new Date("2026-01-01"),
    commander: {
      oracleId: "korvold",
      name: "Korvold, Fae-Cursed King",
      colorIdentity: ["B", "R", "G"],
      manaCost: "{2}{B}{R}{G}",
      typeLine: "Legendary Creature — Dragon Noble",
      oracleText: null,
      imageUri: null,
      artCropUri: null,
    },
    partner: null,
    filled: false,
    cards: [
      {
        oracleId: "forest",
        name: "Forest",
        typeLine: "Basic Land — Forest",
        cardTypeGroup: "Lands",
        role: "land",
        cmc: 0,
        owned: true,
        quantity: 1,
        auto: false,
        printedName: null,
        printedSetCode: null,
        printedCollectorNumber: null,
      },
    ],
    built: 1,
    ownedCount: 1,
    coveredCount: 1,
    toBuyCount: 0,
    total: 1,
    unresolvedRows: [],
    declaredBracket: null,
    intent: null,
    intentSeeded: false,
    noteCounts: { gameChanger: 0, extraTurns: 0, tutor: 0 },
  } as DeckDetail;
}

function renderBuilder() {
  return render(
    <BuilderShell mix={TEST_MIX}
      deck={makeDeck()}
      suggestions={[suggestion]}
      degraded={false}
      firstRun={false}
      commanderIdentity={["B", "R", "G"]}
      arrivedFromImport={false}
     newestAsOf={null}/>,
  );
}

// Suggestions live behind the Consider tab now, so each step is flushed on its
// own: batched inside a single act(), the add would be looked up in the DOM the
// tab click had not yet redrawn.
const showTab = async (name: RegExp) => {
  await act(async () => {
    fireEvent.click(screen.getByRole("tab", { name }));
  });
};

async function addSolRing() {
  await showTab(/cards to consider/i);
  await act(async () => {
    // This fixture's Sol Ring is unowned, so its accessible name is the long
    // form. Spelled out rather than prefix-matched: the owned name is a prefix
    // of this one, so a loose query would match both the day a test adds one.
    fireEvent.click(
      screen.getByRole("button", {
        name: "Add Sol Ring to the deck, and to your Shopping list, because you don’t own it",
      }),
    );
  });
}

describe("optimistic deck list", () => {
  beforeEach(() => {
    addCardToDeck.mockReset();
    removeCardFromDeck.mockReset();
    localStorage.clear();
  });

  // The prediction unmounts the row it came from, so the row's own inline
  // message is written to nothing and a failed removal would otherwise look
  // exactly like a successful one.
  it("explains a failed removal after the row is already gone", async () => {
    removeCardFromDeck.mockRejectedValue(new Error("boom"));

    renderBuilder();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Remove Forest" }));
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Forest");
    expect(screen.getByRole("alert")).toHaveTextContent("It's still in the deck");
    // And the card comes back: the override expires with the transition.
    expect(screen.getByRole("button", { name: "Remove Forest" })).toBeInTheDocument();
  });

  // A decremented stack keeps its row, so the row explains itself and the shell
  // must stay quiet — otherwise one failure is announced in two places.
  it("says it once when the row survives to say it", async () => {
    removeCardFromDeck.mockRejectedValue(new Error("boom"));

    render(
      <BuilderShell mix={TEST_MIX}
        deck={{ ...makeDeck(), cards: [{ ...makeDeck().cards[0], quantity: 9 }] }}
        suggestions={[suggestion]}
        degraded={false}
        firstRun={false}
        commanderIdentity={["B", "R", "G"]}
        arrivedFromImport={false}
       newestAsOf={null}/>,
    );
    await act(async () => {
      // A stack says which of the two outcomes the ✕ has (#179).
      fireEvent.click(
        screen.getByRole("button", { name: "Remove one copy of Forest, 9 in deck" }),
      );
    });

    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });

  it("draws the card in the decklist before the server answers", async () => {
    const pending = deferred<DeckMutationResult>();
    addCardToDeck.mockReturnValue(pending.promise);

    renderBuilder();
    // The card is only in the suggestions rail to begin with.
    expect(screen.queryByText("Artifacts")).not.toBeInTheDocument();

    await addSolRing();
    await showTab(/your deck/i);

    // A decklist group heading for its type is the proof the row was inserted
    // into the list rather than the button merely flipping to "In deck".
    expect(screen.getByText("Artifacts")).toBeInTheDocument();

    await act(async () => { pending.resolve({ ok: true }); });
  });

  it("counts the card immediately, including the shopping tally", async () => {
    const pending = deferred<DeckMutationResult>();
    addCardToDeck.mockReturnValue(pending.promise);

    renderBuilder();
    expect(screen.getByRole("button", { name: /All 1/ })).toBeInTheDocument();

    await addSolRing();
    await showTab(/your deck/i);

    // Sol Ring is unowned, so it moves both counts — one card built, one to buy.
    expect(screen.getByRole("button", { name: /All 2/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Shopping 1/ })).toBeInTheDocument();

    await act(async () => { pending.resolve({ ok: true }); });
  });

  it("moves the spine's progress figure, not just the decklist", async () => {
    const pending = deferred<DeckMutationResult>();
    addCardToDeck.mockReturnValue(pending.promise);

    const { container } = renderBuilder();
    // The progress bar is the biggest thing on the page and the thing the user
    // is looking at when they click, so it is the worst possible place to wait
    // for the round-trip. The bar's own fill is the figure now: the
    // `x owned · y to buy` split under it was cut, and the bar and the count
    // beside it carry the same fact.
    const fill = () =>
      container.querySelector<HTMLElement>('[data-testid="spine-bar-fill"]')!.style.width;
    expect(fill()).toBe(`${(1 / 99) * 100}%`);

    await addSolRing();
    await showTab(/your deck/i);

    expect(fill()).toBe(`${(2 / 99) * 100}%`);

    await act(async () => { pending.resolve({ ok: true }); });
  });

  it("withdraws the row when the server rejects the add", async () => {
    const pending = deferred<DeckMutationResult>();
    addCardToDeck.mockReturnValue(pending.promise);

    renderBuilder();
    await addSolRing();

    // Resolved from Consider, where the click was made and where the user
    // still is: the refusal is owned by the tile, so it is only reachable
    // while that tile is mounted. (Switching tabs mid-flight loses the
    // message — the revert is still visible in the counts. Tracked separately.)
    await act(async () => {
      pending.resolve({ ok: false, message: "Deck is full." });
    });

    // The refusal has to be said out loud — a prediction that silently
    // un-happens is worse than no prediction at all.
    expect(screen.getByRole("alert")).toHaveTextContent("Deck is full.");

    await showTab(/your deck/i);

    // React drops the override when the transition ends; nothing explicitly
    // reverts it, which is the property worth pinning.
    expect(screen.queryByText("Artifacts")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /All 1/ })).toBeInTheDocument();
  });
});
