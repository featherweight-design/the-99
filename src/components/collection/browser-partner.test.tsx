import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
  // The browser refreshes a page whose list a fields batch shows to be stale.
  useRouter: () => ({ refresh: () => {} }),
}));

import { CollectionBrowser } from "./browser";
import { CardDetailProvider } from "../cards/card-detail-provider";
import type { BrowseCard, BrowseListCard } from "../../lib/collection/browse";

/**
 * THE PARTNER LINK ON `/collection`, end to end: the real browser inside the real provider.
 *
 * The browser closes the modal when the card it shows is no longer in the filtered results —
 * right for a filter change, and wrong for the combo block's partner name, which opens a card
 * the filter usually does NOT hold. Searching `mystical` and pressing Approach of the Second
 * Sun closed the modal on staging. Each half is asserted: the partner stays open, and a real
 * list change still closes it.
 */
const listCard = (oracleId: string, name: string): BrowseListCard =>
  ({
    oracleId, name, quantity: 1, colorIdentity: ["U"], typeLine: "Instant",
    setCounts: [["SS1", 1]], primarySetCode: "SS1", rarity: "rare",
  }) as BrowseListCard;

const detail = (oracleId: string, name: string, partners: BrowseCard["comboPartners"] = []): BrowseCard => ({
  oracleId, name, typeLine: "Instant", manaCost: "{U}", cmc: 1, oracleText: "", keywords: [],
  rarity: "rare", colorIdentity: ["U"], imageUri: null, printedName: null, quantity: 1,
  printings: [], setCodes: ["SS1"], primarySetCode: "SS1", preferredPrinting: null,
  comboPartners: partners,
});

const CARDS: Record<string, BrowseCard> = {
  mystical: detail("mystical", "Mystical Tutor", [
    { oracleId: "approach", name: "Approach of the Second Sun", state: "owned", popularity: 900 },
  ]),
  approach: detail("approach", "Approach of the Second Sun"),
};

const fetchCard = async (id: string) => CARDS[id] ?? null;

function tree(cards: BrowseListCard[]) {
  return (
    <CardDetailProvider fetchCard={fetchCard}>
      <CollectionBrowser cards={cards} ownedSets={[]} availabilityOk />
    </CardDetailProvider>
  );
}

const LIST = () => [listCard("mystical", "Mystical Tutor"), listCard("brainstorm", "Brainstorm")];

function mount() {
  window.history.replaceState(null, "", "/collection");
  return render(tree(LIST()));
}

async function openMysticalThenPartner() {
  fireEvent.click(screen.getAllByRole("button", { name: /Mystical Tutor/ })[0]);
  await screen.findByRole("dialog");
  await act(async () => {
    screen.getByRole("button", { name: /Two-card combos/ }).click();
  });
  await act(async () => {
    screen.getByRole("button", { name: "Approach of the Second Sun" }).click();
  });
}

describe("CollectionBrowser — a combo partner outside the list", () => {
  it("stays open on the partner, which the filtered list does not hold", async () => {
    mount();
    await openMysticalThenPartner();
    await waitFor(() =>
      expect(screen.getByRole("dialog")).toHaveTextContent("Approach of the Second Sun"),
    );
    // And it is still open a beat later, after every effect the browser runs has run.
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole("dialog")).not.toBeNull();
  });

  // A NEW ARRAY OF THE SAME CARDS IS NOT THE LIST MOVING. An art pick patches the list and
  // hands the browser fresh card objects with the same ids; compared by reference, that reads
  // as a list change with the partner absent from it, and closes the modal under the reader.
  it("stays open when the list is rebuilt with the same cards, as an art pick does", async () => {
    const { rerender } = mount();
    await openMysticalThenPartner();
    await waitFor(() =>
      expect(screen.getByRole("dialog")).toHaveTextContent("Approach of the Second Sun"),
    );
    const rebuilt = LIST().map((c) => ({ ...c, imageUri: "https://example.test/new-art.jpg" }));
    rerender(tree(rebuilt));
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole("dialog")).not.toBeNull();
  });

  it("still closes when the RESULTS change and no longer hold the open card", async () => {
    mount();
    await openMysticalThenPartner();
    await waitFor(() =>
      expect(screen.getByRole("dialog")).toHaveTextContent("Approach of the Second Sun"),
    );
    const search = screen.getAllByRole("searchbox")[0] ?? screen.getAllByRole("textbox")[0];
    fireEvent.change(search, { target: { value: "brainstorm" } });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
