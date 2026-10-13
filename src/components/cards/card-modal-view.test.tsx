import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { BrowseCard, BrowsePrinting } from "../../lib/collection/browse";

vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(async () => true),
  clearCardArtPreference: vi.fn(async () => {}),
}));

const { CardModal } = await import("./card-modal");

// Find a deck's view inside card details (handoff R2, D1 to D3): drawn in the dialog, over the details
// pane, which stays mounted and inert; Escape goes back one layer, never closes the card.
const printing = (over: Partial<BrowsePrinting> = {}): BrowsePrinting => ({
  setCode: "RVR",
  scryfallId: "s-1",
  setName: "Ravnica Remastered",
  collectorNumber: "12",
  releasedAt: "2024-01-12",
  quantity: 1,
  finishes: { nonfoil: 1 },
  imageUri: null,
  flavorName: null,
  ...over,
});

const card = (over: Partial<BrowseCard> = {}): BrowseCard => ({
  oracleId: "o1",
  name: "Smothering Tithe",
  typeLine: "Enchantment",
  manaCost: "{3}{W}",
  cmc: 4,
  oracleText: "",
  keywords: [],
  rarity: "rare",
  colorIdentity: ["W"],
  imageUri: null,
  printedName: null,
  quantity: 1,
  printings: [printing()],
  setCodes: ["RVR"],
  primarySetCode: "RVR",
  preferredPrinting: null,
  ...over,
});


describe("CardModal with Find a deck's view", () => {
  it("draws the view in the dialog, leaves the details mounted and inert, and goes back on Escape", () => {
    const onClose = vi.fn();
    const onBack = vi.fn();
    render(
      <CardModal
        card={card()}
        position={2}
        total={3}
        onClose={onClose}
        onPrev={() => {}}
        onNext={() => {}}
        view={{ node: <p>the view</p>, onBack }}
      />,
    );
    const view = screen.getByTestId("card-modal-view");
    expect(view).toHaveTextContent("the view");
    // The details are still there, under it, and out of reach.
    const title = screen.getAllByText("Smothering Tithe")[0];
    expect(title.closest("[inert]")).not.toBeNull();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("without the view, Escape closes as before", () => {
    const onClose = vi.fn();
    render(<CardModal card={card()} position={1} total={1} onClose={onClose} onPrev={null} onNext={null} />);
    expect(screen.queryByTestId("card-modal-view")).toBeNull();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
