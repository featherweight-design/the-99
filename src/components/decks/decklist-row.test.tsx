import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { DECK_REMOVE_FALLBACK_MESSAGE } from "../../lib/decks/mutation-result";
import type { DeckDetail } from "../../lib/decks/read";
import type { DeckMutationResult } from "../../lib/decks/mutation-result";
import { CardDetailProvider } from "./card-detail-provider";

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

// The shell mounts Consider, whose degraded banner refreshes the route.
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const { DecklistRow } = await import("./decklist-row");
const { BuilderShell } = await import("./builder-shell");

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const card = {
  oracleId: "sol-ring",
  name: "Sol Ring",
  owned: true,
  quantity: 1,
} as DeckDetailCard;

function clickRemove(name = addPanelCopy.row.removeAria("Sol Ring")) {
  return act(async () => {
    screen.getByRole("button", { name }).click();
  });
}

beforeEach(() => {
  removeCardFromDeck.mockReset();
  addCardToDeck.mockReset();
  localStorage.clear();
});

// These rows wrap their card name in CardDetailTrigger (#127), which needs the
// provider's context; the mutation behaviour under test is independent of it.
function renderRow(ui: React.ReactNode) {
  render(
    <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>{ui}</CardDetailProvider>,
  );
}

describe("DecklistRow", () => {
  it("hides the card before the removal resolves", async () => {
    const pending = deferred<void>();
    removeCardFromDeck.mockReturnValue(pending.promise);

    renderRow(<DecklistRow deckId="d1" card={card} />);
    await clickRemove();

    expect(screen.queryByText("Sol Ring")).not.toBeInTheDocument();

    await act(async () => {
      pending.resolve();
    });
  });

  // Removal takes one copy, so a stack keeps its row; hiding it would blank a
  // line the deck still holds eight of.
  it("keeps the row when more than one copy remains", async () => {
    const pending = deferred<void>();
    removeCardFromDeck.mockReturnValue(pending.promise);

    renderRow(<DecklistRow deckId="d1" card={{ ...card, quantity: 9 }} />);
    await clickRemove(addPanelCopy.row.removeCopyAria("Sol Ring", 9));

    expect(screen.getByText("Sol Ring")).toBeInTheDocument();
    // A stack is its own receipt, so no undo row is drawn for one.
    expect(screen.queryByText(addPanelCopy.undo.removed("Sol Ring"))).not.toBeInTheDocument();

    await act(async () => {
      pending.resolve();
    });
  });

  it("brings the card back and explains when the removal fails", async () => {
    removeCardFromDeck.mockRejectedValue(new Error("boom"));

    renderRow(<DecklistRow deckId="d1" card={card} />);
    await clickRemove();

    expect(screen.getByText("Sol Ring")).toBeInTheDocument();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(DECK_REMOVE_FALLBACK_MESSAGE);
    // role="alert" carries the implicit assertive live region; no aria-live needed.
    expect(alert).not.toHaveAttribute("aria-live");
  });
});

// #179 — a phone deck could be filled and never emptied: the ✕ was `hidden
// md:block`. The glyph is unchanged; the target is the padding around it.
describe("DecklistRow remove control (#179)", () => {
  it("renders the ✕ at phone width with a 44px hit box", () => {
    renderRow(<DecklistRow deckId="d1" card={card} />);

    const remove = screen.getByRole("button", { name: addPanelCopy.row.removeAria("Sol Ring") });
    expect(remove.className).not.toContain("hidden");
    expect(remove.className).toContain("w-[44px]");
    expect(remove.className).toContain("h-[44px]");
    // Desktop keeps the inline target it already had.
    expect(remove.className).toContain("md:w-auto");
    expect(remove.className).toContain("text-[13px]");
  });

  it("says which of the two outcomes a multi-copy remove has", () => {
    renderRow(<DecklistRow deckId="d1" card={{ ...card, quantity: 8 }} />);

    expect(
      screen.getByRole("button", { name: "Remove one copy of Sol Ring, 8 in deck" }),
    ).toBeInTheDocument();
  });

  it("never draws a ✕ on a meta row", () => {
    renderRow(<DecklistRow deckId="d1" card={{ ...card, quantity: 8 }} isMeta metaLabel="+7 more" />);

    expect(screen.queryByRole("button", { name: /^Remove/ })).not.toBeInTheDocument();
  });
});

// #185 — the removed row is replaced in place rather than unmounting.
describe("DecklistRow undo row (#185)", () => {
  it("replaces the last copy's row with an undo row", async () => {
    const pending = deferred<void>();
    removeCardFromDeck.mockReturnValue(pending.promise);

    renderRow(<DecklistRow deckId="d1" card={card} />);
    await clickRemove();

    expect(screen.getByText(addPanelCopy.undo.removed("Sol Ring"))).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: addPanelCopy.undo.actionAria("Sol Ring") }),
    ).toBeInTheDocument();

    await act(async () => {
      pending.resolve();
    });
  });

  it("puts the card back through the same add the tile makes", async () => {
    const pending = deferred<DeckMutationResult>();
    addCardToDeck.mockReturnValue(pending.promise);

    renderRow(<DecklistRow deckId="d1" card={card} spent />);
    await act(async () => {
      screen.getByRole("button", { name: addPanelCopy.undo.actionAria("Sol Ring") }).click();
    });

    expect(addCardToDeck).toHaveBeenCalledWith("d1", "sol-ring");
    expect(removeCardFromDeck).not.toHaveBeenCalled();

    await act(async () => {
      pending.resolve({ ok: true });
    });
  });

  // The undo row is the only thing between a mis-tap and a lost card, so a
  // refusal says so where the row is rather than in a banner.
  it("states a refused undo in the row, and withdraws the control", async () => {
    addCardToDeck.mockResolvedValue({ ok: false, message: addPanelCopy.undo.failed });

    renderRow(<DecklistRow deckId="d1" card={card} spent />);
    await act(async () => {
      screen.getByRole("button", { name: addPanelCopy.undo.actionAria("Sol Ring") }).click();
    });

    expect(screen.getByRole("alert")).toHaveTextContent(addPanelCopy.undo.failed);
    expect(
      screen.queryByRole("button", { name: addPanelCopy.undo.actionAria("Sol Ring") }),
    ).not.toBeInTheDocument();
  });
});

// The undo row's lifetime is a property of the decklist, not of the row that
// asked for it — the row unmounts with the card. Exercised through BuilderShell
// because that is the seam: state held on the row would pass every assertion
// above and still be lost on a tab switch.
const solRing: DeckDetailCard = {
  oracleId: "sol-ring",
  name: "Sol Ring",
  typeLine: "Artifact",
  cardTypeGroup: "Artifacts",
  role: "ramp",
  owned: true,
  quantity: 1,
};
const arcaneSignet: DeckDetailCard = {
  ...solRing,
  oracleId: "arcane-signet",
  name: "Arcane Signet",
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
    cards: [solRing, arcaneSignet],
    built: 2,
    ownedCount: 2,
    toBuyCount: 0,
    total: 2,
    unresolvedRows: [],
  } as DeckDetail;
}

function renderBuilder() {
  return render(
    <BuilderShell
      deck={makeDeck()}
      suggestions={[]}
      degraded={false}
      firstRun={false}
      commanderIdentity={["B", "R", "G"]}
      arrivedFromImport={false}
    />,
  );
}

// The builder's own region, told apart from the card-detail modal's by
// aria-atomic — every announcement here is read as one sentence.
const BUILDER_REGION = '[aria-live="polite"][aria-atomic="true"]';

function liveRegion(container: HTMLElement) {
  return container.querySelector(BUILDER_REGION)!;
}

async function removeFromBuilder(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: addPanelCopy.row.removeAria(name) }));
  });
}

describe("undo row lifetime (#185)", () => {
  it("announces the removal and the undo on the builder's one live region", async () => {
    removeCardFromDeck.mockReturnValue(deferred<void>().promise);
    addCardToDeck.mockReturnValue(deferred<DeckMutationResult>().promise);

    const { container } = renderBuilder();
    expect(container.querySelectorAll(BUILDER_REGION)).toHaveLength(1);

    await removeFromBuilder("Sol Ring");
    expect(liveRegion(container)).toHaveTextContent(
      addPanelCopy.undo.announceRemoved("Sol Ring", 1),
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: addPanelCopy.undo.actionAria("Sol Ring") }),
      );
    });
    expect(liveRegion(container)).toHaveTextContent(
      addPanelCopy.undo.announceUndone("Sol Ring", 2),
    );
    expect(container.querySelectorAll(BUILDER_REGION)).toHaveLength(1);
  });

  // The slot is a receipt, not a pending state: a deck that held its counts for
  // the life of the row would be lying about its own size.
  it("decrements the deck and the group the moment the row is spent", async () => {
    removeCardFromDeck.mockReturnValue(deferred<void>().promise);

    renderBuilder();
    expect(screen.getByRole("button", { name: /All 2/ })).toBeInTheDocument();

    await removeFromBuilder("Sol Ring");

    expect(screen.getByRole("button", { name: /All 1/ })).toBeInTheDocument();
    expect(screen.getByText(addPanelCopy.undo.removed("Sol Ring"))).toBeInTheDocument();
  });

  it("settles the first undo row when a second card is removed", async () => {
    removeCardFromDeck.mockReturnValue(deferred<void>().promise);

    renderBuilder();
    await removeFromBuilder("Sol Ring");
    await removeFromBuilder("Arcane Signet");

    expect(screen.getByText(addPanelCopy.undo.removed("Arcane Signet"))).toBeInTheDocument();
    expect(screen.queryByText(addPanelCopy.undo.removed("Sol Ring"))).not.toBeInTheDocument();
  });

  // Emptying the deck would otherwise swap the whole decklist for the empty
  // state, taking the undo row with it — the one removal hardest to recover from.
  it("keeps the undo row when the last card leaves the deck", async () => {
    removeCardFromDeck.mockReturnValue(deferred<void>().promise);

    renderBuilder();
    await removeFromBuilder("Sol Ring");
    await removeFromBuilder("Arcane Signet");

    expect(screen.getByText(addPanelCopy.undo.removed("Arcane Signet"))).toBeInTheDocument();
    expect(screen.queryByText(/king with no army/i)).not.toBeInTheDocument();
  });

  it("survives a tab switch to Consider and back", async () => {
    removeCardFromDeck.mockReturnValue(deferred<void>().promise);

    renderBuilder();
    await removeFromBuilder("Sol Ring");

    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: /cards to consider/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: /your deck/i }));
    });

    expect(screen.getByText(addPanelCopy.undo.removed("Sol Ring"))).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: addPanelCopy.undo.actionAria("Sol Ring") }),
    ).toBeInTheDocument();
  });
});
