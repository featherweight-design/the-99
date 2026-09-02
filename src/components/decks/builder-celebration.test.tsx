// The one-shot lifecycle of the 99/99 reveal, exercised through BuilderShell.
// There is no browser gate on this repo (no Playwright, /decks is behind
// Clerk), so this is the only place the localStorage keying is verified.
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DeckDetail } from "../../lib/decks/read";
import { celebrationKey } from "../../lib/decks/celebration";

vi.mock("../../app/decks/actions", () => ({
  createDeck: vi.fn(),
  getDeckSuggestions: vi.fn(async () => ({ suggestions: [], degraded: false })),
  addCardToDeck: vi.fn(),
  removeCardFromDeck: vi.fn(),
  deleteDeck: vi.fn(),
  renameDeck: vi.fn(),
}));

const { BuilderShell } = await import("./builder-shell");

function makeDeck(overrides: Partial<DeckDetail> = {}): DeckDetail {
  const cards = Array.from({ length: 99 }, (_, i) => ({
    oracleId: `card-${i}`,
    name: `Card ${i}`,
    typeLine: "Artifact",
    cardTypeGroup: "Artifacts" as const,
    role: "other" as const,
    owned: true,
    quantity: 1,
  }));
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
    cards,
    built: 99,
    ownedCount: 99,
    toBuyCount: 0,
    total: 99,
    unresolvedRows: [],
    ...overrides,
  } as DeckDetail;
}

function renderBuilder(deck: DeckDetail) {
  return render(
    <BuilderShell
      deck={deck}
      suggestions={[]}
      degraded={false}
      firstRun={false}
      commanderIdentity={["B", "R", "G"]}
      arrivedFromImport={false}
    />,
  );
}

const HEADING = "Ninety-nine.";

describe("BuilderShell — 99/99 celebration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // The storage-throws test spies on Storage.prototype; a failing assertion
  // would otherwise leak those spies into every test after it.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fires on a 99/99 all-owned deck the first time", async () => {
    await act(async () => {
      renderBuilder(makeDeck());
    });
    expect(screen.getByRole("heading", { name: HEADING })).toBeInTheDocument();
  });

  it("does not fire for a 99/99 deck with unowned cards (Playable, not Complete)", async () => {
    await act(async () => {
      renderBuilder(makeDeck({ ownedCount: 98, toBuyCount: 1 }));
    });
    expect(screen.queryByRole("heading", { name: HEADING })).not.toBeInTheDocument();
  });

  it("does not fire mid-build", async () => {
    await act(async () => {
      renderBuilder(makeDeck({ built: 98, ownedCount: 98 }));
    });
    expect(screen.queryByRole("heading", { name: HEADING })).not.toBeInTheDocument();
  });

  it("never fires again once dismissed — including after 98/99 and back to 99/99", async () => {
    const { unmount } = await act(async () => renderBuilder(makeDeck()));
    fireEvent.click(screen.getByRole("button", { name: "Back to the deck" }));
    expect(screen.queryByRole("heading", { name: HEADING })).not.toBeInTheDocument();
    expect(localStorage.getItem(celebrationKey("deck-1"))).toBe("1");
    unmount();

    // Remove a card…
    const dropped = await act(async () => renderBuilder(makeDeck({ built: 98, ownedCount: 98 })));
    expect(screen.queryByRole("heading", { name: HEADING })).not.toBeInTheDocument();
    dropped.unmount();

    // …and add it back. Still silent: the flag outlives the status.
    await act(async () => {
      renderBuilder(makeDeck());
    });
    expect(screen.queryByRole("heading", { name: HEADING })).not.toBeInTheDocument();
  });

  // The reported bug: the flag used to burn only on an explicit dismiss or
  // export, so a visitor who scrolled past the band and navigated away left it
  // unspent — and "Complete" is derived, so it read true forever and the
  // one-shot fired on every subsequent visit.
  it("never fires again after a visit the user left without dismissing", async () => {
    const first = await act(async () => renderBuilder(makeDeck()));
    expect(screen.getByRole("heading", { name: HEADING })).toBeInTheDocument();
    expect(localStorage.getItem(celebrationKey("deck-1"))).toBe("1");
    first.unmount();

    await act(async () => {
      renderBuilder(makeDeck());
    });
    expect(screen.queryByRole("heading", { name: HEADING })).not.toBeInTheDocument();
  });

  it("is keyed per deck — a second finished deck gets its own reveal", async () => {
    localStorage.setItem(celebrationKey("deck-1"), "1");
    await act(async () => {
      renderBuilder(makeDeck({ id: "deck-2" }));
    });
    expect(screen.getByRole("heading", { name: HEADING })).toBeInTheDocument();
  });

  it("dismisses when the user exports instead", async () => {
    await act(async () => {
      renderBuilder(makeDeck({ id: "deck-export" }));
    });
    fireEvent.click(screen.getByRole("button", { name: "Export decklist" }));
    expect(screen.queryByRole("heading", { name: HEADING })).not.toBeInTheDocument();
    expect(localStorage.getItem(celebrationKey("deck-export"))).toBe("1");
  });

  it("dismisses when the user exports from the spine rather than the band", async () => {
    await act(async () => {
      renderBuilder(makeDeck({ id: "deck-spine-export" }));
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Export" })[0]);
    expect(screen.queryByRole("heading", { name: HEADING })).not.toBeInTheDocument();
  });

  it("mid-build export does not burn the flag — the reveal still fires at 99/99", async () => {
    const mid = await act(async () =>
      renderBuilder(makeDeck({ id: "deck-mid-export", built: 40, ownedCount: 40 })),
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Export" })[0]);
    expect(localStorage.getItem(celebrationKey("deck-mid-export"))).toBeNull();
    mid.unmount();

    await act(async () => {
      renderBuilder(makeDeck({ id: "deck-mid-export" }));
    });
    expect(screen.getByRole("heading", { name: HEADING })).toBeInTheDocument();
  });

  // Safari private mode and blocked storage throw on both read and write. The
  // band must still dismiss, or it is stuck on screen for the whole session.
  it("stays dismissable when storage throws", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    await act(async () => {
      renderBuilder(makeDeck({ id: "deck-nostorage" }));
    });
    expect(screen.getByRole("heading", { name: HEADING })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to the deck" }));
    expect(screen.queryByRole("heading", { name: HEADING })).not.toBeInTheDocument();
  });
});
