import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

import { DecksView } from "./decks-view";
import type { DeckListItem } from "../../lib/decks/read";
import type { DeckFolderWithCount } from "../../lib/decks/folders";
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

function view(decks: DeckListItem[], folders: DeckFolderWithCount[] = []) {
  return (
    <DecksView
      decks={decks}
      folders={folders}
      shopping={SHOPPING}
      buildable={9}
      cards={1284}
      now={NOW}
    />
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

  it("tells assistive tech the compact triggers open a dialog", () => {
    render(view([deckOf()]));
    for (const name of [/Filter decks/, /Search decks/]) {
      const trigger = screen.getByRole("button", { name });
      expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    }
    openFilters();
    expect(screen.getByRole("button", { name: /Filter decks/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("keeps search reachable on the compact form", () => {
    // The old phone header carried a search trigger; dropping it would have
    // left search reachable only by opening the sheet on some other errand.
    render(view([deckOf()]));
    fireEvent.click(screen.getByRole("button", { name: /Search decks/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("opens a visible sheet across the whole compact band, not just under 640px", () => {
    // `DeckFilterSheet` was `sm:hidden`. With the chassis switching at 1000,
    // that left 640-999px opening a dialog CSS had already hidden — the
    // filters unreachable across the entire band.
    render(view([deckOf()]));
    openFilters();
    const dialog = screen.getByRole("dialog");
    expect(dialog.parentElement?.className ?? "").not.toMatch(/\bsm:hidden\b/);
  });

  it("does not remount an open sheet after a trip through the wide form", () => {
    // Crossing to wide unmounts the sheet; leaving `open` true would reopen it
    // on the way back, unasked, with the search field taking focus.
    const { rerender } = render(view([deckOf()]));
    openFilters();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    Object.defineProperty(window, "matchMedia", {
      writable: true, configurable: true,
      value: (query: string) => ({
        matches: true, media: query, onchange: null,
        addEventListener: () => {}, removeEventListener: () => {},
        addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
      }),
    });
    rerender(view([deckOf()]));
    expect(screen.queryByRole("dialog")).toBeNull();
    // The trigger the sheet would restore focus to unmounts with it, so the
    // wide form's search field takes the focus rather than losing it to body.
    expect(screen.getByLabelText("Search decks")).toHaveFocus();
  });

  it("clears every filter and leaves a non-default sort alone", () => {
    // The real version of the assertion the sheet's test could no longer make:
    // `Clear all filters` names the sort as unchanged, so a sort that is not
    // the default has to survive the clear — in state and on the URL.
    window.history.replaceState(null, "", "/decks?sort=name&status=Draft");
    render(view([deckOf()]));
    fireEvent.click(
      screen.getByRole("button", { name: "Clear all filters. The sort is unchanged." }),
    );
    expect(window.location.search).toBe("?sort=name");
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
