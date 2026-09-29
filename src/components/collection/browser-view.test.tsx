import { describe, expect, it, beforeEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

import { CollectionBrowser } from "./browser";
import { COLLECTION_VIEW_KEY } from "./filter-bar";
import { CardDetailProvider } from "../cards/card-detail-provider";
import type { BrowseListCard } from "../../lib/collection/browse";
import { viewToggleCopy } from "../../lib/copy/card-surfaces";

/**
 * Which list `/collection` opens as, and the order the three answers are asked
 * in: the URL first, then what this browser last chose, then the width.
 *
 * The URL has to win. `?view=` is in a link because somebody put it there, and
 * a stored habit overriding it would show the recipient a different list than
 * the sender was looking at. The stored choice has to beat the width, because
 * the width is only a guess at what a reader wants and the choice is the
 * reader saying it.
 */
const card = (over: Partial<BrowseListCard> = {}): BrowseListCard =>
  ({
    oracleId: "o1",
    name: "Lightning Bolt",
    quantity: 2,
    colorIdentity: ["R"],
    typeLine: "Instant",
    setCodes: ["LEA"],
    setCounts: [["LEA", 2]],
    primarySetCode: "LEA",
    rarity: "common",
    cmc: 1,
    ...over,
  }) as BrowseListCard;

function view() {
  return (
    <CardDetailProvider fetchCard={async () => null}>
      <CollectionBrowser cards={[card()]} ownedSets={[]} availabilityOk hasCollection />
    </CardDetailProvider>
  );
}

// jsdom's matchMedia answers phone, so the width default here is rows.
const rows = () => screen.getByRole("button", { name: viewToggleCopy.collection.rows });
const grid = () => screen.getByRole("button", { name: viewToggleCopy.collection.grid });

describe("CollectionBrowser — which view it opens as", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/collection");
  });

  it("falls back to the width when nothing else has an opinion", () => {
    render(view());
    expect(rows()).toHaveAttribute("aria-pressed", "true");
  });

  it("opens in the view the last visit chose", () => {
    render(view());
    fireEvent.click(grid());
    expect(grid()).toHaveAttribute("aria-pressed", "true");
    cleanup();

    // A genuinely fresh visit. Choosing mirrors the view into `?view=`, so
    // without this the second render would be reading the first one's URL
    // rather than what the browser kept.
    window.history.replaceState(null, "", "/collection");
    render(view());
    expect(grid()).toHaveAttribute("aria-pressed", "true");
  });

  it("lets a link's own ?view= beat the stored choice", () => {
    localStorage.setItem(COLLECTION_VIEW_KEY, "grid");
    window.history.replaceState(null, "", "/collection?view=rows");
    render(view());
    expect(rows()).toHaveAttribute("aria-pressed", "true");
  });

  // The URL mirror runs once after hydration, and on arrival it describes the URL the page came
  // in on. Writing that again is what Next's router adopted over a pending push, dropping the
  // reader's navigation (1f's startup diagnostic, 2026-09-29), so a mount writes nothing.
  it("makes no write on arrival when the URL already says what the page shows", () => {
    window.history.replaceState(null, "", "/collection?sort=quantity&view=rows");
    const replace = vi.spyOn(window.history, "replaceState");
    render(view());
    expect(replace).not.toHaveBeenCalled();
    replace.mockRestore();
  });

  // The STORED value stays out of the address bar: a reader who never touched
  // the toggle has an unmarked URL to share, whatever their habit is. Pressing
  // the toggle still writes `?view=`, as it did before storage existed — that
  // press is a choice made here, and it is what makes the list shareable. The
  // test after this one holds that half.
  it("keeps the stored choice out of the URL", () => {
    localStorage.setItem(COLLECTION_VIEW_KEY, "grid");
    render(view());
    expect(grid()).toHaveAttribute("aria-pressed", "true");
    expect(window.location.search).not.toContain("view=");
  });

  // Unchanged by this PR, and asserted because the comment above claims it: the
  // toggle writing `?view=` is what a shared link is made of.
  it("still writes the view a reader picks here", () => {
    render(view());
    fireEvent.click(grid());
    expect(window.location.search).toContain("view=grid");
  });
});
