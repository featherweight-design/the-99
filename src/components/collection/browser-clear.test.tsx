import { describe, expect, it, beforeEach, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

import { CollectionBrowser } from "./browser";
import { CardDetailProvider } from "../cards/card-detail-provider";
import type { BrowseListCard } from "../../lib/collection/browse";

/**
 * The route's clear behaviour, at the route level.
 *
 * The chassis's Clear names the sort as unchanged, and `/collection` used to
 * reset it — twice, from two different controls. The pure pieces cannot prove
 * this: `collectionChips` knows nothing about sort, and the chassis only
 * reports what it was handed. It takes the browser.
 */
const card = (over: Partial<BrowseListCard> = {}): BrowseListCard =>
  ({
    oracleId: "o1",
    name: "Lightning Bolt",
    quantity: 2,
    colorIdentity: ["R"],
    typeLine: "Instant",
    setCodes: ["LEA"],
    // Entries, not objects — `buildSetOptions` destructures [code, quantity].
    setCounts: [["LEA", 2]],
    primarySetCode: "LEA",
    rarity: "common",
    cmc: 1,
    ...over,
  }) as BrowseListCard;

function view(cards: BrowseListCard[]) {
  return (
    <CardDetailProvider fetchCard={async () => null}>
      <CollectionBrowser cards={cards} ownedSets={[]} availabilityOk hasCollection />
    </CardDetailProvider>
  );
}

describe("CollectionBrowser — clearing filters", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/collection");
  });

  it("keeps a non-default sort when every filter is cleared", () => {
    window.history.replaceState(null, "", "/collection?sort=quantity&q=bolt");
    render(view([card(), card({ oracleId: "o2", name: "Counterspell", colorIdentity: ["U"] })]));
    const clear = screen.queryByRole("button", {
      name: /Clear all filters/i,
    });
    if (clear) fireEvent.click(clear);
    // The sort survives; only the filters go.
    expect(window.location.search).not.toContain("q=bolt");
    expect(window.location.search).toContain("sort=quantity");
  });
});
