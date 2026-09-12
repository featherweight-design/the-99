import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

import { DecksView } from "./decks-view";
import type { DeckListItem } from "../../lib/decks/read";
import type { ShoppingRollup } from "../../lib/decks/shopping-rollup";

const NOW = "2026-09-07T12:00:00.000Z";

function deckOf(over: Partial<DeckListItem> = {}): DeckListItem {
  return {
    id: "d1",
    name: "Atraxa, Praetors' Voice",
    commanderName: "Atraxa, Praetors' Voice",
    commanderColorIdentity: ["W", "U", "B", "G"],
    commanderImageUri: null,
    commanderArtCropUri: null,
    partnerName: null,
    partnerColorIdentity: null,
    folderId: null,
    folderName: null,
    statusPill: "Complete",
    built: 99,
    ownedCount: 99,
    toBuyCount: 0,
    unresolvedCount: 0,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    lastPlayedAt: new Date("2026-09-02T00:00:00Z"),
    inUseElsewhere: 0,
    ...over,
  };
}

const SHOPPING: ShoppingRollup = {
  byDeck: new Map(),
  total: { copies: 0, cents: 0, pricedCopies: 0 },
};

function view(decks: DeckListItem[]) {
  return (
    <DecksView decks={decks} shopping={SHOPPING} buildable={9} cards={1284} now={NOW} />
  );
}

beforeEach(() => {
  window.history.replaceState(null, "", "/decks");
  // `renderWide` replaces this stub; restore the phone default every test, or
  // the first wide render silently re-forms every test after it.
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false, media: query, onchange: null,
      addEventListener: () => {}, removeEventListener: () => {},
      addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
    }),
  });
});

/**
 * jsdom's `matchMedia` stub reports `matches: false`, so the chassis renders its
 * compact form here and every dimension lives in the sheet. That is the real
 * phone path rather than a test artifact — the desktop panels are only mounted
 * above 1000px, and a hidden duplicate of an `aria-modal` sheet is exactly what
 * `use-min-width.ts` exists to prevent.
 */
function openFilters() {
  fireEvent.click(screen.getByRole("button", { name: /Filter decks/ }));
}

/** Re-stub `matchMedia` so the chassis takes its wide form for one test. */
function renderWide(ui: React.ReactElement) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: true, media: query, onchange: null,
      addEventListener: () => {}, removeEventListener: () => {},
      addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
    }),
  });
  return render(ui);
}

describe("DecksView", () => {
  it("counts what it renders", () => {
    render(view([deckOf(), deckOf({ id: "d2", statusPill: "Draft", built: 0 })]));
    expect(screen.getByText("2 decks")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("keeps the count and the grid in step while filtering", () => {
    render(
      view([
        deckOf({ id: "a", statusPill: "Draft", built: 0 }),
        deckOf({ id: "b", statusPill: "Complete" }),
      ]),
    );
    openFilters();
    fireEvent.click(screen.getAllByRole("checkbox", { name: "Draft" })[0]);
    expect(screen.getByText("1 of 2 decks match")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("writes the filter to the URL without navigating", () => {
    render(view([deckOf()]));
    openFilters();
    fireEvent.click(screen.getAllByRole("checkbox", { name: "Draft" })[0]);
    expect(window.location.search).toBe("?status=Draft");
  });

  it("writes the default sort as an absence", () => {
    render(view([deckOf()]));
    openFilters();
    fireEvent.click(screen.getAllByRole("checkbox", { name: "Draft" })[0]);
    expect(window.location.search).not.toContain("sort=");
  });

  it("shows a removable chip per active value, and Clear", () => {
    render(view([deckOf()]));
    openFilters();
    fireEvent.click(screen.getAllByRole("checkbox", { name: "Draft" })[0]);
    // The shared chip does not lowercase its label, where /decks' own chip row
    // did. It cannot: the same control carries `/collection`'s set names, and
    // "duskmourn" is wrong in a way "draft" never was.
    fireEvent.click(screen.getByRole("button", { name: "Remove filter: Draft" }));
    expect(window.location.search).toBe("");
  });

  it("offers the filtered empty, not the zero state, when filters exclude everything", () => {
    render(view([deckOf()]));
    openFilters();
    fireEvent.click(screen.getAllByRole("checkbox", { name: "Draft" })[0]);
    expect(screen.getByText("No decks match")).toBeInTheDocument();
    expect(screen.queryByText("No decks yet")).toBeNull();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
  });

  it("Clear filters restores every deck and empties the URL", () => {
    render(view([deckOf()]));
    openFilters();
    fireEvent.click(screen.getAllByRole("checkbox", { name: "Draft" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("1 deck")).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("mounts the chassis inline above the grid, with no sidebar left", () => {
    const { container } = renderWide(view([deckOf()]));
    // The 262px the column took is the whole visible point of this round.
    expect(container.querySelector("[data-filter-column]")).toBeNull();
    expect(container.querySelector("[data-chassis-row='controls']")).toBeTruthy();
    expect(container.querySelector("[data-chassis-row='chips']")).toBeTruthy();
    expect(container.querySelector("[data-chassis-row='result']")).toBeTruthy();
  });

  it("gives the wide form its five dimensions, sort separated by a hairline", () => {
    const { container } = renderWide(view([deckOf()]));
    // Search, status, colour, last-played — then sort, past the hairline,
    // because sort is not a filter.
    expect(screen.getByLabelText("Search decks")).toBeInTheDocument();
    expect(screen.getAllByRole("switch")).toHaveLength(5);
    expect(container.querySelector("[data-chassis-hairline]")).toBeTruthy();
  });

  it("states its count in the chassis rather than the page header", () => {
    renderWide(view([deckOf(), deckOf({ id: "d2" })]));
    const result = document.querySelector("[data-chassis-row='result']");
    expect(result?.textContent).toContain("2 decks");
  });

  it("keeps New deck and Import in the header at every state", () => {
    render(view([deckOf()]));
    openFilters();
    fireEvent.click(screen.getAllByRole("checkbox", { name: "Draft" })[0]);
    // Two of each: the desktop header pair and the phone action row, one of
    // which is display:none at any width.
    expect(screen.getAllByRole("link", { name: "New deck" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: /Import/ })).toHaveLength(2);
  });

  it("draws the zero state, with both routes in, when no deck exists at all", () => {
    render(view([]));
    expect(screen.getByText("No decks yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse commanders" })).toBeInTheDocument();
    // The zero header drops the count and the filter controls, and keeps the
    // two buttons.
    expect(screen.queryByText("0 of 0")).toBeNull();
    expect(screen.getByText("9 commanders buildable from 1,284 cards")).toBeInTheDocument();
  });
});
