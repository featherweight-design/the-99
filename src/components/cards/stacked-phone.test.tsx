// Stacked sheets on the phone (R1): a card opened from a sheet replaces it rather than stepping
// down beneath it, and the ✕ becomes the `← {sheet}` pill. jsdom matches no media query, so every
// component here takes its phone branch.
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";

import type { BrowseCard } from "../../lib/collection/browse";
import { cardSheetCopy } from "../../lib/copy/card-carousel";

vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(async () => true),
  clearCardArtPreference: vi.fn(async () => {}),
}));
vi.mock("../../lib/swaps/actions", () => ({}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

const { CardDetailProvider, CardDetailTrigger, useCardDetail } = await import("./card-detail-provider");
const { ModalChrome } = await import("../decks/receipt-modal");

const birds: BrowseCard = {
  oracleId: "o-birds", name: "Birds of Paradise", typeLine: "Creature", manaCost: "{G}", cmc: 1, oracleText: null,
  keywords: [], rarity: "rare", colorIdentity: ["G"], imageUri: null, printedName: null, quantity: 2, printings: [],
  setCodes: [], primarySetCode: "", preferredPrinting: null, commanderLegal: true, hasDecks: true,
};

function draw(onCloseSheet = vi.fn()) {
  return render(
    <CardDetailProvider fetchCard={async () => birds}>
      <ModalChrome title="Game changers" closeLabel="Close game changers" onClose={onCloseSheet} width={760}>
        <CardDetailTrigger oracleId="o-birds" name="Birds of Paradise">open birds</CardDetailTrigger>
      </ModalChrome>
    </CardDetailProvider>,
  );
}

async function openFromSheet() {
  await act(async () => {
    fireEvent.click(screen.getByText("open birds"));
  });
}

const cardDialog = () => document.querySelector('[aria-labelledby="card-modal-title"]') as HTMLElement;
const pill = () => screen.getByTestId("card-modal-back-mobile");

describe("a card opened from a sheet, on the phone", () => {
  it("draws at the unstacked geometry, with no phone offset class on the dialog", async () => {
    draw();
    await openFromSheet();
    expect(cardDialog().className).not.toMatch(/max-md:!h-\[calc/);
  });

  it("puts the way back in the ✕'s slot as `← {sheet}`, named in full, with no ✕ beside it", async () => {
    draw();
    await openFromSheet();
    expect(pill()).toHaveTextContent("Game changers");
    expect(pill()).toHaveAccessibleName(cardSheetCopy.back.a11y("Game changers"));
    expect(pill().querySelector('[aria-hidden="true"]')).toHaveTextContent("←");
    expect(screen.queryByRole("button", { name: "Close card details" })).toBeNull();
  });

  it("caps the pill at 354 with no counter beside it", async () => {
    draw();
    await openFromSheet();
    expect(pill()).toHaveClass("max-w-[min(354px,calc(100%-36px))]");
  });

  it("hands focus to the pill on open", async () => {
    draw();
    await openFromSheet();
    expect(document.activeElement).toBe(pill());
  });

  it("goes straight back to the sheet from the full state, skipping the teaser", async () => {
    draw();
    await openFromSheet();
    fireEvent.click(screen.getByRole("button", { name: /Show all details/ }));
    expect(screen.getByTestId("card-sheet")).toHaveAttribute("data-sheet", "full");
    await act(async () => {
      fireEvent.click(pill());
    });
    expect(cardDialog()).toBeNull();
    expect(screen.getByTestId("receipt-modal")).toBeInTheDocument();
  });

  it("peels one rung per Escape: full, then the teaser, then the card", async () => {
    draw();
    await openFromSheet();
    fireEvent.click(screen.getByRole("button", { name: /Show all details/ }));
    act(() => { fireEvent.keyDown(document, { key: "Escape" }); });
    expect(screen.getByTestId("card-sheet")).toHaveAttribute("data-sheet", "teaser");
    await act(async () => { fireEvent.keyDown(document, { key: "Escape" }); });
    expect(cardDialog()).toBeNull();
    expect(screen.getByTestId("receipt-modal")).toBeInTheDocument();
  });

  it("hands focus back to the opener inside the sheet on the way back", async () => {
    draw();
    screen.getByText("open birds").focus();
    await openFromSheet();
    expect(document.activeElement).toBe(pill());
    await act(async () => { fireEvent.keyDown(document, { key: "Escape" }); });
    expect(cardDialog()).toBeNull();
    expect(document.activeElement).toBe(screen.getByText("open birds"));
  });

  it("hands focus back to the opener even when the press focused nothing, as in Safari", async () => {
    draw();
    // A Safari click focuses no button, so the dialog's own capture would find <body>.
    (document.activeElement as HTMLElement | null)?.blur();
    await openFromSheet();
    await act(async () => { fireEvent.keyDown(document, { key: "Escape" }); });
    expect(cardDialog()).toBeNull();
    expect(document.activeElement).toBe(screen.getByText("open birds"));
  });

  it("hides the sheet underneath while the card is up, and draws it again after", async () => {
    draw();
    const under = () => screen.getByTestId("receipt-modal").parentElement as HTMLElement;
    expect(under()).not.toHaveAttribute("aria-hidden");
    await openFromSheet();
    expect(under()).toHaveAttribute("aria-hidden", "true");
    expect(under().style.opacity).toBe("0");
    expect(under().style.pointerEvents).toBe("none");
    // Not inert: an inert sheet refuses the focus the card hands back to its opener as it closes.
    expect(under()).not.toHaveAttribute("inert");
    await act(async () => { fireEvent.click(pill()); });
    expect(under()).not.toHaveAttribute("aria-hidden");
    expect(under().style.opacity).toBe("");
    expect(under().style.pointerEvents).toBe("");
  });

  it("offers no Find a deck: nothing in a stacked card opens a further layer", async () => {
    draw();
    await openFromSheet();
    expect(screen.queryAllByTestId("fits-door")).toHaveLength(0);
  });
});

describe("a card opened from the page", () => {
  it("keeps its ✕ and its Find a deck", async () => {
    render(
      <CardDetailProvider fetchCard={async () => birds}>
        <CardDetailTrigger oracleId="o-birds" name="Birds of Paradise">open birds</CardDetailTrigger>
      </CardDetailProvider>,
    );
    await openFromSheet();
    expect(screen.getAllByRole("button", { name: "Close card details" }).length).toBeGreaterThan(0);
    expect(screen.queryByTestId("card-modal-back-mobile")).toBeNull();
    expect(screen.getAllByTestId("fits-door").length).toBeGreaterThan(0);
  });
});

/** A sheet opened OVER the open card, as the stand-ins sheet is from its door. */
function OverCard() {
  const { registerSheet } = useCardDetail();
  useEffect(() => registerSheet("Cheaper stand-ins", undefined, true), [registerSheet]);
  return null;
}

describe("the way back through three layers (page · card · sheet · card)", () => {
  it("gives each card its own opener, so the first card still hands focus to its trigger", async () => {
    const view = (sheet: boolean) => (
      <CardDetailProvider fetchCard={async () => birds}>
        <CardDetailTrigger oracleId="o-birds" name="Birds of Paradise">page trigger</CardDetailTrigger>
        {sheet ? (
          <>
            <OverCard />
            <CardDetailTrigger oracleId="o-birds" name="Birds of Paradise">sheet trigger</CardDetailTrigger>
          </>
        ) : null}
      </CardDetailProvider>
    );
    const { rerender } = render(view(false));
    // Nothing focused on a press, as in Safari, so only the provider's opener can find the way back.
    (document.activeElement as HTMLElement | null)?.blur();
    await act(async () => { fireEvent.click(screen.getByText("page trigger")); });
    await act(async () => rerender(view(true)));
    await act(async () => { fireEvent.click(screen.getByText("sheet trigger")); });
    await act(async () => { fireEvent.keyDown(document, { key: "Escape" }); });
    await act(async () => rerender(view(false)));
    await act(async () => { fireEvent.keyDown(document, { key: "Escape" }); });
    expect(document.querySelector('[aria-labelledby^="card-modal-title"]')).toBeNull();
    expect(document.activeElement).toBe(screen.getByText("page trigger"));
  });
});
