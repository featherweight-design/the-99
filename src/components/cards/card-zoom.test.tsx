// The zoom (card detail R2, §3): the whole card at something like hand size, as a
// region inside the dialog rather than a second one.
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { BrowseCard } from "../../lib/collection/browse";
import { cardZoomCopy } from "../../lib/copy/card-surfaces";

vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(async () => true),
  clearCardArtPreference: vi.fn(async () => {}),
}));

const { CardModal } = await import("./card-modal");

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
  imageUri: "https://img/front.jpg",
  printedName: null,
  quantity: 1,
  printings: [{
    setCode: "RVR",
    scryfallId: "s-1",
    setName: "Ravnica Remastered",
    collectorNumber: "12",
    releasedAt: "2024-01-12",
    quantity: 1,
    finishes: { nonfoil: 1 },
    imageUri: "https://img/front.jpg",
    flavorName: null,
  }],
  setCodes: ["RVR"],
  primarySetCode: "RVR",
  preferredPrinting: null,
  ...over,
});

function mount(c: BrowseCard = card()) {
  const onClose = vi.fn();
  render(<CardModal card={c} position={1} total={1} onClose={onClose} onPrev={null} onNext={null} />);
  return { onClose };
}

const openZoom = () => {
  // Both breakpoint trees mount an art trigger; either opens the same layer.
  fireEvent.click(screen.getAllByRole("button", { name: cardZoomCopy.zoomAria("Smothering Tithe") })[0]);
};

describe("the zoom", () => {
  it("opens from the art and shows the whole card with one caption", () => {
    mount();
    expect(screen.queryByTestId("card-zoom")).toBeNull();

    openZoom();

    const layer = screen.getByTestId("card-zoom");
    expect(layer).toHaveAttribute("role", "region");
    expect(layer.querySelector('[data-testid="card-zoom-card"]')).not.toBeNull();
    expect(layer).toHaveTextContent("Ravnica Remastered · RVR 12");
  });

  it("is a region inside the dialog, not a second dialog", () => {
    // A second `role="dialog"` would mean a second focus trap, a second thing for
    // Escape to mean, and a backdrop whose click-to-close no longer reaches.
    mount();
    openZoom();

    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByTestId("card-zoom").closest('[role="dialog"]')).not.toBeNull();
  });

  it("closes by the card, by the layer, and by its own control", () => {
    mount();

    openZoom();
    fireEvent.click(screen.getByTestId("card-zoom-card"));
    expect(screen.queryByTestId("card-zoom")).toBeNull();

    openZoom();
    fireEvent.click(screen.getByTestId("card-zoom"));
    expect(screen.queryByTestId("card-zoom")).toBeNull();

    openZoom();
    fireEvent.click(screen.getByRole("button", { name: cardZoomCopy.close }));
    expect(screen.queryByTestId("card-zoom")).toBeNull();
  });

  it("takes the first Escape and leaves the dialog the second", () => {
    const { onClose } = mount();
    openZoom();

    act(() => { fireEvent.keyDown(document, { key: "Escape" }); });
    expect(screen.queryByTestId("card-zoom")).toBeNull();
    expect(onClose).not.toHaveBeenCalled();

    act(() => { fireEvent.keyDown(document, { key: "Escape" }); });
    expect(onClose).toHaveBeenCalled();
  });

  it("names the printing on the reverse face", () => {
    mount(card({ layout: "transform", backImageUri: "https://img/back.jpg", name: "Delver of Secrets // Insectile Aberration" }));

    fireEvent.click(screen.getAllByRole("button", { name: /Turn over to/ })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /Look at/ })[0]);

    expect(screen.getByTestId("card-zoom")).toHaveTextContent(`RVR 12${cardZoomCopy.backSuffix}`);
  });

  it("opens on a card with no art rather than refusing", () => {
    mount(card({
      imageUri: null,
      printings: [{ ...card().printings[0], imageUri: null }],
    }));

    openZoom();

    // The gradient stands in for the picture; nothing is drawn to stand in for a card.
    expect(screen.getByTestId("card-zoom-card").getAttribute("style")).toContain("gradient");
  });

  it("says the same thing about an unowned card", () => {
    mount(card({ quantity: 0, printings: [{ ...card().printings[0], quantity: 0, finishes: {} }] }));

    openZoom();

    expect(screen.getByTestId("card-zoom")).toHaveTextContent("Ravnica Remastered · RVR 12");
  });

  it("omits the collector number and its separator when the holding carries none", () => {
    mount(card({ printings: [{ ...card().printings[0], collectorNumber: "" }] }));

    openZoom();

    expect(screen.getByTestId("card-zoom")).toHaveTextContent("Ravnica Remastered · RVR");
    expect(screen.getByTestId("card-zoom").textContent).not.toContain("RVR ·");
  });

  it("moves focus to the close on open and back to the art on close", () => {
    mount();
    openZoom();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: cardZoomCopy.close }));

    fireEvent.click(screen.getByRole("button", { name: cardZoomCopy.close }));
    expect(document.activeElement).toBe(
      screen.getAllByRole("button", { name: cardZoomCopy.zoomAria("Smothering Tithe") })[0],
    );
  });

  it("makes everything under the layer inert", () => {
    // The shipped ✕ stays mounted behind the zoom, and the dialog's focus trap
    // collects every button in the dialog — so a Tab could otherwise reach it and
    // close the whole modal when the reader meant to close the zoom.
    mount();
    openZoom();

    const covered = screen.getAllByRole("button", { name: "Close card details" });
    expect(covered.length).toBeGreaterThan(0);
    for (const button of covered) {
      expect(button.closest("[inert]")).not.toBeNull();
    }
    // The layer's own control is not under an inert ancestor.
    expect(screen.getByRole("button", { name: cardZoomCopy.close }).closest("[inert]")).toBeNull();
  });

  it("draws no caption at all for a card with no printings", () => {
    // ` · ` is not a printing label.
    mount(card({ printings: [] }));
    openZoom();

    expect(screen.getByTestId("card-zoom").querySelector("p")).toBeNull();
  });

  it("names the set once when the catalog has no name for it", () => {
    mount(card({ printings: [{ ...card().printings[0], setName: null }] }));
    openZoom();

    expect(screen.getByTestId("card-zoom")).toHaveTextContent("RVR 12");
    expect(screen.getByTestId("card-zoom").textContent).not.toContain("RVR · RVR");
  });

  it("points at the region only while it exists", () => {
    // A dangling `aria-controls` is a reference to nothing for assistive tech.
    mount();
    const closed = screen.getAllByRole("button", { name: cardZoomCopy.zoomAria("Smothering Tithe") })[0];
    expect(closed).not.toHaveAttribute("aria-controls");

    openZoom();

    expect(screen.getAllByRole("button", { name: cardZoomCopy.zoomAria("Smothering Tithe") })[0])
      .toHaveAttribute("aria-controls", "card-zoom");
  });

  it("reports its own state on the trigger", () => {
    mount();
    const trigger = screen.getAllByRole("button", { name: cardZoomCopy.zoomAria("Smothering Tithe") })[0];
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    openZoom();

    expect(screen.getAllByRole("button", { name: cardZoomCopy.zoomAria("Smothering Tithe") })[0])
      .toHaveAttribute("aria-expanded", "true");
  });
});
