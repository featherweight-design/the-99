import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { CollectionPlaceHead, type CollectionPlace } from "./collection-place-head";
import { collectionTabsCopy } from "../../lib/copy/collection";

const OWNED = { totalCards: 4492, uniqueCards: 2926 };
const EMPTY = { totalCards: 0, uniqueCards: 0 };

function head(current: CollectionPlace, stats = OWNED, lastUpdated: Date | null = null) {
  return render(<CollectionPlaceHead current={current} stats={stats} lastUpdated={lastUpdated} />);
}

function strip() {
  return screen.getByRole("navigation", { name: collectionTabsCopy.regionAria });
}

function tabNames() {
  return within(strip())
    .getAllByRole("link")
    .filter((a) => a.getAttribute("href") !== "/collection/replace")
    .map((a) => a.textContent);
}

describe("the place strip", () => {
  it("is a nav of plain links, one per route, with no query on any of them", () => {
    head("cards");
    const links = within(strip()).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/collection",
      "/collection/sets",
      "/collection/proxies",
      "/collection/replace",
    ]);
    // Place navigation, not ARIA tabs (E10).
    expect(within(strip()).queryAllByRole("tab")).toEqual([]);
  });

  it.each([
    ["cards", collectionTabsCopy.cards],
    ["sets", collectionTabsCopy.sets],
    ["proxies", collectionTabsCopy.proxies],
  ] as const)("marks %s as the current page, and only it", (place, name) => {
    head(place);
    const current = within(strip())
      .getAllByRole("link")
      .filter((a) => a.getAttribute("aria-current") === "page");
    expect(current.map((a) => a.textContent)).toEqual([name]);
  });

  it("leaves Sets out, not disabled, on an empty collection", () => {
    head("cards", EMPTY);
    expect(tabNames()).toEqual([collectionTabsCopy.cards, collectionTabsCopy.proxies]);
  });

  it("keeps the current route's own tab even then (E10)", () => {
    head("sets", EMPTY);
    expect(tabNames()).toEqual([
      collectionTabsCopy.cards,
      collectionTabsCopy.sets,
      collectionTabsCopy.proxies,
    ]);
  });
});

describe("the title block", () => {
  it("makes Collection the h1 on /collection alone (E11)", () => {
    head("cards");
    expect(screen.getByRole("heading", { level: 1, name: "Collection" })).toBeTruthy();
  });

  it.each(["sets", "proxies"] as const)("leaves the h1 to %s's own section name", (place) => {
    head(place);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(screen.getByText("Collection").tagName).toBe("P");
  });

  it("keeps the stats line on an empty collection, so the strip does not move", () => {
    head("proxies", EMPTY);
    expect(screen.getByText("0 cards · 0 unique")).toBeTruthy();
  });

  it("says when the collection was last updated, on every route", () => {
    head("sets", OWNED, new Date());
    expect(screen.getByText(/4,492 cards · 2,926 unique · last updated/)).toBeTruthy();
  });

  it("offers Replace only when there is a collection to replace", () => {
    // Two copies: the phone's link in the strip and the desktop button by the title.
    const { unmount } = head("cards");
    expect(screen.getAllByRole("link", { name: /Replace/ })).toHaveLength(2);
    unmount();
    head("cards", EMPTY);
    expect(screen.queryAllByRole("link", { name: /Replace/ })).toEqual([]);
  });
});
