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

afterEach(cleanup);

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
    expect(setCardArtPreference).not.toHaveBeenCalled();
  });
});
