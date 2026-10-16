import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CardSearchRow } from "../../lib/card-search/search";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { cardSearchCopy } from "../../lib/copy/card-search";

vi.mock("next/navigation", () => ({ usePathname: () => "/collection" }));
const { SearchLayer } = await import("./search-layer");
type Props = React.ComponentProps<typeof SearchLayer>;

const row: CardSearchRow = { oracleId: "o-1", name: "Sol Ring", imageUri: null, flavorName: null, owned: 1, decks: [], wishlist: false };

function draw(over: Partial<Props>) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const props: Props = {
    bodyEl: host, query: "sol", searching: true, phase: "results", rows: [row], rowsFor: "sol", recentRows: [],
    recentsHeld: false, online: true, active: -1, returned: null, listboxId: "l", onPick: vi.fn(), onClear: vi.fn(),
    onRetry: vi.fn(), onAnnounce: vi.fn(), onCardDismissed: vi.fn(), onCardFailed: vi.fn(), recentsFailed: false, openCardRef: { current: null },
    ...over,
  };
  render(<SearchLayer {...props} />);
  return props;
}

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("the sheet's body", () => {
  it("S6: a failed read is an alert with Add cards' sentence and Try again", () => {
    const p = draw({ phase: "failed" });
    expect(screen.getByRole("alert").textContent).toContain(collectionEditCopy.add.searchFailed);
    fireEvent.click(screen.getByRole("button", { name: cardSearchCopy.tryAgain }));
    expect(p.onRetry).toHaveBeenCalledTimes(1);
  });

  it("S5: no results reuse Add cards' title and body", () => {
    draw({ rows: [] });
    expect(screen.getByText(collectionEditCopy.add.noResultsTitle("sol"))).toBeTruthy();
    expect(screen.getByText(collectionEditCopy.add.noResultsBody)).toBeTruthy();
  });

  it("S7: offline draws nothing here (the frame draws it) and hides the recent cards", () => {
    draw({ online: false, searching: false, recentsHeld: true, recentRows: [row] });
    expect(screen.queryByText(cardSearchCopy.recent.heading)).toBeNull();
  });

  it("a failed read of the recents' signals is S6 with Try again, never rows drawn as not owned", () => {
    const p = draw({ searching: false, recentsHeld: true, recentsFailed: true });
    expect(screen.getByRole("alert").textContent).toContain(collectionEditCopy.add.searchFailed);
    expect(screen.queryByRole("option")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: cardSearchCopy.tryAgain }));
    expect(p.onRetry).toHaveBeenCalledTimes(1);
  });

  it("S1 draws the empty state with no recent cards, S2 the list with Clear", () => {
    draw({ searching: false });
    expect(screen.getByText(cardSearchCopy.empty.title)).toBeTruthy();
    cleanup();
    const p = draw({ searching: false, recentsHeld: true, recentRows: [row] });
    fireEvent.click(screen.getByRole("button", { name: cardSearchCopy.recent.clear }));
    expect(p.onClear).toHaveBeenCalledTimes(1);
  });

  it("S3: a later search keeps the previous rows at half strength under Searching…", () => {
    draw({ query: "sola", phase: "searching" });
    expect(screen.getByText(cardSearchCopy.searching)).toBeTruthy();
    expect(screen.getByRole("listbox").parentElement?.className).toContain("opacity-50");
  });

  it("speaks the count half a second after the results settle", async () => {
    vi.useFakeTimers();
    const p = draw({});
    // Emptied at once, so the same count after another search is still a change the region speaks.
    expect(p.onAnnounce).toHaveBeenLastCalledWith("");
    await act(async () => vi.advanceTimersByTime(500));
    expect(p.onAnnounce).toHaveBeenLastCalledWith(cardSearchCopy.count(1));
    vi.useRealTimers();
  });
});
