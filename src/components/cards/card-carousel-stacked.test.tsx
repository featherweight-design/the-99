import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";

import type { BrowseCard } from "../../lib/collection/browse";
import { cardCarouselCopy } from "../../lib/copy/card-carousel";

vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(async () => true),
  clearCardArtPreference: vi.fn(async () => {}),
}));

const { CardDetailProvider, CardDetailTrigger, useCardDetail } = await import("./card-detail-provider");

// The stacked carousel (carousel PR 4, call #9): a card opened from a sheet that sits over a held
// card pages ITS OWN list, with its own neighbors, and the held card under the sheet draws none.
const card = (oracleId: string, name: string): BrowseCard => ({
  oracleId, name, typeLine: "Artifact", manaCost: null, cmc: 0, oracleText: null, keywords: [], rarity: "rare",
  colorIdentity: [], imageUri: null, printedName: null, quantity: 1, printings: [], setCodes: [], primarySetCode: "",
  preferredPrinting: null,
});
const byId: Record<string, BrowseCard> = Object.fromEntries(
  [["o-held", "Held Card"], ["o-held-2", "Held Neighbor"], ["o-x", "Card X"], ["o-y", "Card Y"], ["o-z", "Card Z"]]
    .map(([id, name]) => [id, card(id, name)]),
);
const sheetList = [
  { oracleId: "o-x", name: "Card X" },
  { oracleId: "o-y", name: "Card Y" },
  { oracleId: "o-z", name: "Card Z" },
];

/** Declares a sheet opened over the open card, as the stand-ins sheet does from its door. */
function OverCard() {
  const { registerSheet } = useCardDetail();
  useEffect(() => registerSheet("Cheaper stand-ins", undefined, true), [registerSheet]);
  return null;
}

function draw(fetchCard: (id: string) => Promise<BrowseCard | null>, sheet: boolean) {
  return (
    <CardDetailProvider fetchCard={fetchCard} prefetchCard={fetchCard}>
      <CardDetailTrigger oracleId="o-held" name="Held Card" siblings={["o-held", "o-held-2"]}>open held</CardDetailTrigger>
      {sheet ? (
        <>
          <OverCard />
          <CardDetailTrigger oracleId="o-y" name="Card Y" siblings={sheetList}>open y</CardDetailTrigger>
        </>
      ) : null}
    </CardDetailProvider>
  );
}

async function press(text: string) {
  await act(async () => { fireEvent.click(screen.getByText(text)); });
}

async function stack(fetchCard = vi.fn(async (id: string) => byId[id] ?? null)) {
  const view = render(draw(fetchCard, false));
  await press("open held");
  await screen.findByRole("dialog");
  await act(async () => view.rerender(draw(fetchCard, true)));
  await press("open y");
  await waitFor(() => expect(document.getElementById("card-modal-title")).toHaveTextContent("Card Y"));
  const [held, top] = [...document.querySelectorAll('[aria-labelledby^="card-modal-title"]')] as HTMLElement[];
  return { fetchCard, held, top };
}

describe("the stacked carousel", () => {
  it("pages the top card through its own list, with its own counter and neighbors", async () => {
    const { held, top } = await stack();
    expect(within(top).getAllByText(cardCarouselCopy.position(2, 3)).length).toBeGreaterThan(0);
    expect(within(top).getAllByRole("button", { name: "Next card: Card Z" }).length).toBeGreaterThan(0);
    expect(within(top).getAllByRole("button", { name: "Previous card: Card X" }).length).toBeGreaterThan(0);
    // The held card under the sheet pages nothing: no neighbors, and arrows that do nothing. It
    // keeps the counter it wore live, so it is exactly as the reader left it when the sheet goes.
    expect(within(held).queryAllByRole("button", { name: /^(Previous|Next) card: / })).toHaveLength(0);
    for (const arrow of within(held).queryAllByRole("button", { name: /^(Previous|Next) card$/ })) {
      expect(arrow).toHaveAttribute("aria-disabled", "true");
    }

    await act(async () => { fireEvent.click(within(top).getAllByRole("button", { name: "Next card: Card Z" })[0]); });
    await waitFor(() => expect(document.getElementById("card-modal-title")).toHaveTextContent("Card Z"));
    // The held card stayed where it was.
    expect(document.querySelector('[aria-labelledby="card-modal-title-held"]')).toBe(held);
  });

  it("pages only the top card from the body, never the held card under the sheet", async () => {
    const { held } = await stack();
    (document.activeElement as HTMLElement | null)?.blur();
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    await waitFor(() => expect(document.getElementById("card-modal-title")).toHaveTextContent("Card Z"));
    expect(document.getElementById("card-modal-title-held")).toHaveTextContent("Held Card");
    expect(document.querySelector('[aria-labelledby="card-modal-title-held"]')).toBe(held);
  });

  it("reads the top card's neighbors ahead, as it does for any paged card", async () => {
    const { fetchCard } = await stack();
    await waitFor(() => {
      const asked = fetchCard.mock.calls.map(([id]) => id);
      expect(asked).toContain("o-z");
      expect(asked).toContain("o-x");
    });
  });
});
