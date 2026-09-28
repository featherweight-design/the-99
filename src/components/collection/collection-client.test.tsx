// The boundary that keeps a printing pick on screen without refetching the route.
//
// Both collaborators are stubbed on purpose. What is under test is the patch — that the
// card the reader picked for takes the new art while every other row is left alone — and
// the real browser drags in filters, storage and the URL, none of which have anything to
// say about that.
import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import type { BrowseListCard, CardArt } from "../../lib/collection/browse";
import { encodeCollection, type CollectionWire } from "../../lib/collection/list-wire";

let fireArtChange: ((oracleId: string, art: CardArt | null) => void) | undefined;

vi.mock("../cards/card-detail-provider", () => ({
  CardDetailProvider: ({
    children,
    onArtChange,
  }: {
    children: React.ReactNode;
    onArtChange?: (oracleId: string, art: CardArt | null) => void;
  }) => {
    fireArtChange = onArtChange;
    return <>{children}</>;
  },
}));

vi.mock("./browser", () => ({
  CollectionBrowser: ({ cards }: { cards: BrowseListCard[] }) => (
    <ul>
      {cards.map((c) => (
        <li key={c.oracleId} data-testid={c.oracleId}>
          {c.primarySetCode} · {c.printedName ?? c.name} · {c.imageUri ?? "no art"}
        </li>
      ))}
    </ul>
  ),
}));

const { CollectionClient } = await import("./collection-client");

const card = (oracleId: string, name: string): BrowseListCard => ({
  oracleId,
  name,
  typeLine: "Enchantment",
  manaCost: "{3}{W}",
  rarity: "rare",
  colorIdentity: ["W"],
  imageUri: "https://cards.scryfall.io/normal/rvr.jpg",
  printedName: null,
  quantity: 1,
  setCounts: [],
  primarySetCode: "RVR",
});

/** The list as the page ships it: each card's own availability becomes the map it is encoded from. */
function wireOf(cards: BrowseListCard[]) {
  const byCard = new Map(cards.flatMap((c) => (c.availability ? [[c.oracleId, c.availability] as const] : [])));
  return encodeCollection(cards, byCard);
}

function mount(input?: BrowseListCard[] | CollectionWire) {
  const wire = input === undefined || Array.isArray(input)
    ? wireOf(input ?? [card("o1", "Smothering Tithe"), card("o2", "Sol Ring")])
    : input;
  return render(
    <CollectionClient
      wire={wire}
      ownedSets={[]}
      availabilityOk
      hasCollection
    />,
  );
}

describe("CollectionClient", () => {
  it("draws the picked printing on that card and leaves the rest alone", () => {
    mount();
    act(() => {
      fireArtChange?.("o1", {
        primarySetCode: "ELD",
        imageUri: "https://cards.scryfall.io/normal/eld.jpg",
        printedName: "Tithe of the Wilds",
      });
    });
    expect(screen.getByTestId("o1").textContent).toBe(
      "ELD · Tithe of the Wilds · https://cards.scryfall.io/normal/eld.jpg",
    );
    expect(screen.getByTestId("o2").textContent).toBe(
      "RVR · Sol Ring · https://cards.scryfall.io/normal/rvr.jpg",
    );
  });

  // A refused write settles with the art the server still holds, so a rollback arrives here
  // as an ordinary patch and has to land like one.
  it("takes the settling payload over the optimistic one", () => {
    mount();
    act(() => {
      fireArtChange?.("o1", {
        primarySetCode: "ELD",
        imageUri: "https://cards.scryfall.io/normal/eld.jpg",
        printedName: null,
      });
    });
    act(() => {
      fireArtChange?.("o1", {
        // Deliberately not the card's original set: a rollback to RVR would read the same
        // whether the second payload landed or the first was never applied at all.
        primarySetCode: "M10",
        imageUri: "https://cards.scryfall.io/normal/m10.jpg",
        printedName: null,
      });
    });
    expect(screen.getByTestId("o1").textContent).toBe(
      "M10 · Smothering Tithe · https://cards.scryfall.io/normal/m10.jpg",
    );
  });

  // A new `cards` identity is a new read of the collection, and it knows more than a patch
  // made against the payload before it — which may be describing a printing the reader has
  // since stopped owning.
  it("drops its patches when a fresh server payload arrives", () => {
    const view = mount();
    act(() => {
      fireArtChange?.("o1", {
        primarySetCode: "ELD",
        imageUri: "https://cards.scryfall.io/normal/eld.jpg",
        printedName: null,
      });
    });
    expect(screen.getByTestId("o1").textContent).toContain("ELD");

    // Same VALUES, new array: this is what a re-read of the route hands the boundary, and
    // the patch has to retire on it rather than on the content having changed.
    view.rerender(
      <CollectionClient
        wire={wireOf([card("o1", "Smothering Tithe"), card("o2", "Sol Ring")])}
        ownedSets={[]}
        availabilityOk
        hasCollection
      />,
    );
    expect(screen.getByTestId("o1").textContent).toBe(
      "RVR · Smothering Tithe · https://cards.scryfall.io/normal/rvr.jpg",
    );
  });

  // The same array, re-rendered, is not a new read. Retiring on that would throw the pick
  // away on any parent render between the write and the server catching up.
  it("keeps its patches when the same payload re-renders", () => {
    // The same WIRE: one payload, decoded once, is one list.
    const wire = wireOf([card("o1", "Smothering Tithe"), card("o2", "Sol Ring")]);
    const view = mount(wire);
    act(() => {
      fireArtChange?.("o1", {
        primarySetCode: "ELD",
        imageUri: "https://cards.scryfall.io/normal/eld.jpg",
        printedName: null,
      });
    });
    view.rerender(
      <CollectionClient wire={wire} ownedSets={[]} availabilityOk hasCollection />,
    );
    expect(screen.getByTestId("o1").textContent).toContain("ELD");
  });

  // Null is "this card names no printing to resolve", which says nothing about whether the
  // art moved — so an earlier patch stands rather than being wiped by it.
  it("keeps an applied pick when a later call carries no art", () => {
    mount();
    act(() => {
      fireArtChange?.("o1", {
        primarySetCode: "ELD",
        imageUri: null,
        printedName: null,
      });
    });
    act(() => fireArtChange?.("o1", null));
    expect(screen.getByTestId("o1").textContent).toBe("ELD · Smothering Tithe · no art");
  });
});
