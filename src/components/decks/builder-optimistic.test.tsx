// Adding a card has to land across the whole builder in the frame of the click
// — decklist row, group heading, and the All/Shopping counts — not just on the
// button that was pressed. Exercised through BuilderShell because the seam
// being tested is precisely that one component's optimistic list feeding three
// different subtrees; a test of the reducer alone would pass while the wiring
// stayed broken.
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DeckDetail } from "../../lib/decks/read";
import type { DeckSuggestion } from "../../lib/decks/suggest";
import type { DeckMutationResult } from "../../lib/decks/mutation-result";

const { addCardToDeck } = vi.hoisted(() => ({ addCardToDeck: vi.fn() }));
vi.mock("../../app/decks/actions", () => ({
  createDeck: vi.fn(),
  getDeckSuggestions: vi.fn(async () => ({ suggestions: [], degraded: false })),
  addCardToDeck,
  removeCardFromDeck: vi.fn(),
  deleteDeck: vi.fn(),
  renameDeck: vi.fn(),
}));

const { BuilderShell } = await import("./builder-shell");

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

const suggestion: DeckSuggestion = {
  oracleId: "sol-ring",
  name: "Sol Ring",
  reason: "edhrec",
  reasonType: "edhrec",
  imageUri: null,
  inclusionPct: null,
  lift: null,
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
    },
    cards: [
      {
        oracleId: "forest",
        name: "Forest",
        typeLine: "Basic Land — Forest",
        cardTypeGroup: "Lands",
        role: "land",
        owned: true,
        quantity: 1,
      },
    ],
    built: 1,
    ownedCount: 1,
    toBuyCount: 0,
  } as DeckDetail;
}

function renderBuilder() {
  return render(
    <BuilderShell
      deck={makeDeck()}
      suggestions={[suggestion]}
      degraded={false}
      firstRun={false}
      commanderIdentity={["B", "R", "G"]}
    />,
  );
}

function addSolRing() {
  fireEvent.click(screen.getByRole("button", { name: "Add Sol Ring to deck" }));
}

describe("optimistic deck list", () => {
  beforeEach(() => {
    addCardToDeck.mockReset();
    localStorage.clear();
  });

  it("draws the card in the decklist before the server answers", async () => {
    const pending = deferred<DeckMutationResult>();
    addCardToDeck.mockReturnValue(pending.promise);

    renderBuilder();
    // The card is only in the suggestions rail to begin with.
    expect(screen.queryByText("Artifacts")).not.toBeInTheDocument();

    await act(async () => { addSolRing(); });

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

    await act(async () => { addSolRing(); });

    // Sol Ring is unowned, so it moves both counts — one card built, one to buy.
    expect(screen.getByRole("button", { name: /All 2/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Shopping 1/ })).toBeInTheDocument();

    await act(async () => { pending.resolve({ ok: true }); });
  });

  it("moves the spine's progress figure, not just the decklist", async () => {
    const pending = deferred<DeckMutationResult>();
    addCardToDeck.mockReturnValue(pending.promise);

    renderBuilder();
    // The progress bar is the biggest thing on the page and the thing the user
    // is looking at when they click, so it is the worst possible place to wait
    // for the round-trip.
    expect(screen.getByText("1 owned · 0 to buy")).toBeInTheDocument();

    await act(async () => { addSolRing(); });

    expect(screen.getByText("1 owned · 1 to buy")).toBeInTheDocument();

    await act(async () => { pending.resolve({ ok: true }); });
  });

  it("withdraws the row when the server rejects the add", async () => {
    const pending = deferred<DeckMutationResult>();
    addCardToDeck.mockReturnValue(pending.promise);

    renderBuilder();
    await act(async () => { addSolRing(); });
    expect(screen.getByText("Artifacts")).toBeInTheDocument();

    await act(async () => {
      pending.resolve({ ok: false, message: "Deck is full." });
    });

    // React drops the override when the transition ends; nothing explicitly
    // reverts it, which is the property worth pinning.
    expect(screen.queryByText("Artifacts")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /All 1/ })).toBeInTheDocument();
    // The refusal has to survive the revert — a prediction that silently
    // un-happens is worse than no prediction at all.
    expect(screen.getByRole("alert")).toHaveTextContent("Deck is full.");
  });
});
