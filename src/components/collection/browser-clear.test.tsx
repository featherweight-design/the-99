import { describe, expect, it, beforeEach, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
  // The browser refreshes a page whose list a fields batch shows to be stale.
  useRouter: () => ({ refresh: () => {} }),
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

/**
 * jsdom's `matchMedia` stub reports `matches: false`, so the chassis renders its
 * COMPACT form here and every dimension lives in the sheet. That is the real
 * phone path rather than a test artifact — the wide form's pips are only
 * mounted above 1000px.
 */
function openFilters() {
  fireEvent.click(screen.getByRole("button", { name: /Filter cards/i }));
}

describe("CollectionBrowser — clearing filters", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/collection");
  });

  it("keeps a non-default sort when every filter is cleared", () => {
    window.history.replaceState(null, "", "/collection?sort=quantity&q=bolt");
    render(view([card(), card({ oracleId: "o2", name: "Counterspell", colorIdentity: ["U"] })]));
    fireEvent.click(screen.getByRole("button", { name: /Clear all filters/i }));
    // The sort survives; only the filters go.
    expect(window.location.search).not.toContain("q=bolt");
    expect(window.location.search).toContain("sort=quantity");
  });

  it("announces a collapsed chip's removal as the whole control, not one value", () => {
    // The chip stands for the control, and `next` empties it. Announcing
    // "White removed" while two colours came off tells the reader the wrong
    // thing about what they just did.
    window.history.replaceState(null, "", "/collection?c=W,U");
    render(view([card(), card({ oracleId: "o2", name: "Counterspell", colorIdentity: ["U"] })]));
    fireEvent.click(screen.getByRole("button", { name: /Remove filter: White, Blue/i }));
    // The chip's accessible name lists both, which is why it is matched on:
    // the visible label collapses them to "2 colors".
    expect(document.body.textContent).toContain("Color filter cleared");
    expect(document.body.textContent).not.toContain("White removed");
  });

  it("toggles a colour on and off through the pips", () => {
    // `ColourPips`' own tests prove it emits a hue code; nothing proved this
    // route wires that code into `filters.colors`. The bar's deleted test was
    // the only cover, so an inert colour filter would have passed everything.
    render(view([card(), card({ oracleId: "o2", name: "Counterspell", colorIdentity: ["U"] })]));
    openFilters();
    const red = screen.getAllByRole("switch", { name: /Red/i })[0];
    fireEvent.click(red);
    expect(window.location.search).toContain("c=R");
    fireEvent.click(screen.getAllByRole("switch", { name: /Red/i })[0]);
    expect(window.location.search).not.toContain("c=R");
  });


  it("refuses a hue the other filters leave no cards in", () => {
    // `ColourPips`' own test proves it honours `unavailable`; this proves the
    // route computes and passes it. Without the wiring the pip stays live and
    // selecting it empties the list — the behaviour the retired mobile panel
    // prevented.
    window.history.replaceState(null, "", "/collection?t=Instant");
    render(
      view([
        card({ oracleId: "r", name: "Bolt", colorIdentity: ["R"], typeLine: "Instant" }),
        card({ oracleId: "b", name: "Ogre", colorIdentity: ["B"], typeLine: "Creature" }),
      ]),
    );
    openFilters();
    // Black exists in the collection but not among the Instants.
    expect(screen.getAllByRole("switch", { name: /Black/i })[0]).toHaveAttribute("aria-disabled", "true");
    expect(screen.getAllByRole("switch", { name: /Red/i })[0]).not.toHaveAttribute("aria-disabled");
  });


  it("says nothing when Clear filters is pressed with no filter on", () => {
    // `NoResults` draws its CTA in the catalog-unmatched state too — a reader
    // with a collection, none of it resolved against the catalog. Nothing is
    // filtered there, so the button changes nothing and a "Filters cleared"
    // announcement would describe an event that did not happen.
    render(view([]));
    fireEvent.click(screen.getByRole("button", { name: /Clear filters/i }));
    expect(document.body.textContent).not.toContain("Filters cleared");
  });

});
