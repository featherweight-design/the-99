import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { BrowseCard, BrowsePrinting } from "../../lib/collection/browse";
import { NEIGHBOR_MIN_WIDTH, PriceFrom, UnderCard, cardFace, cardPrice, underCardRows } from "./card-modal-parts";

const printing = (extra: Partial<BrowsePrinting> = {}) =>
  ({ setCode: "LEA", setName: "Alpha", collectorNumber: "1", quantity: 1, finishes: {}, imageUri: "https://img/front.jpg", ...extra }) as BrowsePrinting;
const card = (extra: Partial<BrowseCard> = {}) =>
  ({ name: "Delver of Secrets // Insectile Aberration", printedName: null, layout: "transform", colorIdentity: ["U"], backImageUri: "https://img/back.jpg", ...extra }) as BrowseCard;

describe("the modal's pure parts", () => {
  it("reserves the rows under the desktop card: the turn control only on two faces, the door's rows only with a door", () => {
    expect(underCardRows(false, false)).toBe(52);
    expect(underCardRows(true, false)).toBe(90);
    expect(underCardRows(false, true)).toBe(52 + 59);
    expect(NEIGHBOR_MIN_WIDTH).toBe(1252);
  });

  it("reads a card's faces from the printing on screen, and names the side a turn lands on", () => {
    const c = card();
    const face = cardFace({ card: c, preview: c, resolved: printing(), flipped: true, zoomFlipped: true });
    expect(face.twoFaced).toBe(true);
    expect(face.showingBack).toBe(true);
    expect(face.faceImage).toBe("https://img/back.jpg");
    expect(face.zoomCaption).toMatch(/Alpha/);
    expect(face.flipLabel(true)).toMatch(/Insectile Aberration/);
    // A one-sided layout with no back of this printing's own does not turn.
    const flat = cardFace({ card: card({ layout: "normal" }), preview: c, resolved: printing(), flipped: true, zoomFlipped: false });
    expect(flat.twoFaced).toBe(false);
    expect(flat.faceImage).toBe("https://img/front.jpg");
    // No printing names no caption.
    expect(cardFace({ card: c, preview: c, resolved: undefined, flipped: false, zoomFlipped: false }).zoomCaption).toBeNull();
  });

  it("quotes the cheapest printing beside the one on screen only when it is lower", () => {
    const asOf = new Date("2026-11-08");
    const fact = (cents: number) => ({ cents, foilCents: null, etchedCents: null, asOf });
    const prices = { byScryfallId: { a: fact(439), b: fact(234) }, byPrintingKey: {}, ambiguousKeys: [], catalogIds: ["a", "b"], catalogKeys: [], newestAsOf: asOf };
    const on = (id: string) => cardPrice(card({ prices } as Partial<BrowseCard>), printing({ scryfallId: id }));
    expect(on("a").fromCents).toBe(234);
    expect(on("a").figured).toBe(true);
    expect(on("b").fromCents).toBeNull();
  });

  it("draws the from line and the under-card rows as the modal did", () => {
    render(<UnderCard twoFaced={false} flipAria="Turn" onFlip={() => {}} priceTag={<span>$4.39</span>} fromLine={<PriceFrom cents={234} phone={false} />} />);
    expect(screen.getByTestId("modal-zoom-hint")).toBeTruthy();
    expect(screen.getByTestId("modal-price-tag-desktop").textContent).toBe("$4.39");
    expect(screen.getByTestId("modal-price-from-desktop").textContent).toMatch(/2\.34/);
  });
});
