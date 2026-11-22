// The printings strip in the card details (alternate printings R2): it shows for a card opened from search with two or more
// catalog printings, selecting a thumb shows that printing in place, and nothing is stored.
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BrowseCard, BrowsePrinting } from "../../lib/collection/browse";
import { printingStripCopy } from "../../lib/copy/collection";

vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(async () => true),
  clearCardArtPreference: vi.fn(async () => {}),
}));

const { CardModal } = await import("./card-modal");
const { setCardArtPreference } = await import("../../app/collection/actions");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const printing = (setCode: string, collectorNumber: string, quantity = 0): BrowsePrinting => ({
  setCode,
  setName: `${setCode} Set`,
  collectorNumber,
  releasedAt: "2024-01-12",
  quantity,
  finishes: quantity > 0 ? { nonfoil: quantity } : {},
  imageUri: null,
  flavorName: null,
  scryfallId: `${setCode}-${collectorNumber}`,
});

const base: BrowseCard = {
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
  quantity: 0,
  printings: [],
  setCodes: [],
  primarySetCode: "RVR",
  preferredPrinting: null,
};

const mount = (card: BrowseCard, browsePrintings = true) =>
  render(<CardModal card={card} position={1} total={1} onClose={() => {}} onPrev={null} onNext={null} browsePrintings={browsePrintings} />);

describe("CardModal printings strip", () => {
  it("shows for an unowned card with two printings, and selecting a thumb views it in place", () => {
    mount({ ...base, printings: [printing("RVR", "24"), printing("ELD", "8")] });
    const strips = screen.getAllByTestId("printing-strip");
    expect(strips.length).toBeGreaterThan(0);
    const thumb = within(strips[0]).getAllByRole("button").find((b) => /ELD Set/.test(b.getAttribute("aria-label") ?? ""))!;
    fireEvent.click(thumb);
    expect(thumb.getAttribute("aria-pressed")).toBe("true");
    expect(setCardArtPreference).not.toHaveBeenCalled();
  });

  it("is absent at one printing, which keeps the plain Set field", () => {
    mount({ ...base, printings: [printing("RVR", "24")] });
    expect(screen.queryByTestId("printing-strip")).toBeNull();
  });

  it("is absent when the modal was not opened from search", () => {
    mount({ ...base, printings: [printing("RVR", "24"), printing("ELD", "8")] }, false);
    expect(screen.queryByTestId("printing-strip")).toBeNull();
  });

  it("lists an owned card's printings first and the rest after, without changing the pick", () => {
    mount({
      ...base,
      quantity: 1,
      printings: [printing("RVR", "24", 1)],
      otherPrintings: [printing("ELD", "8")],
    });
    const strip = screen.getAllByTestId("printing-strip")[0];
    expect(within(strip).getByText(printingStripCopy.headOwned(2, 1))).toBeTruthy();
    const thumb = within(strip).getAllByRole("button").find((b) => /ELD Set/.test(b.getAttribute("aria-label") ?? ""))!;
    fireEvent.click(thumb);
    // Viewed, not picked: the view moved to the other printing and nothing was written.
    expect(thumb.getAttribute("aria-pressed")).toBe("true");
    expect(within(strip).getAllByRole("button", { pressed: true })).toHaveLength(1);
    expect(setCardArtPreference).not.toHaveBeenCalled();
  });

  // Alternate printings R3: the phone has no strip. Its Set line becomes the printings button at two or more printings, and
  // the button opens the panel over the shelf.
  it("phone: the Set line is a printings button at two printings, and a plain line at one", () => {
    const { unmount } = mount({ ...base, printings: [printing("RVR", "24"), printing("ELD", "8")] });
    const button = screen.getByTestId("printings-button");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.textContent).toContain("2 printings");
    expect(screen.queryByTestId("teaser-set")).toBeNull();
    unmount();
    mount({ ...base, printings: [printing("RVR", "24")] });
    expect(screen.queryByTestId("printings-button")).toBeNull();
    expect(screen.getByTestId("teaser-set")).toBeTruthy();
  });

  it("phone: the button opens the panel, a thumb views its printing and keeps the panel open, Escape closes the panel first", () => {
    const onClose = vi.fn();
    render(
      <CardModal
        card={{ ...base, printings: [printing("RVR", "24"), printing("ELD", "8")] }}
        position={1}
        total={1}
        onClose={onClose}
        onPrev={null}
        onNext={null}
        browsePrintings
      />,
    );
    fireEvent.click(screen.getByTestId("printings-button"));
    const panel = screen.getByTestId("printings-panel");
    expect(screen.getByTestId("printings-button").getAttribute("aria-expanded")).toBe("true");
    const thumb = within(panel).getAllByRole("button").find((b) => /ELD Set/.test(b.getAttribute("aria-label") ?? ""))!;
    fireEvent.click(thumb);
    expect(thumb.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("printings-panel")).toBeTruthy();
    expect(setCardArtPreference).not.toHaveBeenCalled();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(screen.queryByTestId("printings-panel")).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });
});
