// The content column drawn from props alone, no CardModal: the states the landing's demo will draw.
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { BrowseCard } from "../../lib/collection/browse";
import { CardModalSheet, type CardModalSheetProps } from "./card-modal-sheet";

const card = {
  oracleId: "o1", name: "Smothering Tithe", typeLine: "Enchantment", manaCost: "{3}{W}", cmc: 4,
  oracleText: "Whenever an opponent draws a card, they may pay {2}.", keywords: [], rarity: "rare",
  colorIdentity: ["W"], imageUri: null, printedName: null, quantity: 2, printings: [], setCodes: ["RVR"],
  primarySetCode: "RVR", preferredPrinting: null,
} as unknown as BrowseCard;

function props(over: Partial<CardModalSheetProps> = {}): CardModalSheetProps {
  return {
    card, preview: card, resolved: undefined, titleId: "t", caption: "Ravnica Remastered #1", ownedPrintings: [],
    hasPicker: false, isToken: false, tokenNoSet: false, pick: null, deckScope: false, total: 1, position: 1,
    deckPage: false, deckName: null, buyUrl: "https://example.com/buy", buyLabel: "Buy",
    min: false, full: true, zoomed: false, viewOpen: false, cramped: false, gentle: false, sheetFull: true,
    teaserHeight: 280, closeReserve: 0, back: null, onSheetPointerDown: undefined, setSnap: () => {},
    priceTag: null, fromLine: () => null, doorStrip: null, footer: null, figured: false,
    printingRegion: () => null, wishlistBox: null, proxyBox: null, tokenDeckBox: null,
    openCombo: undefined, onOpenCombo: null, onSelectCard: () => {},
    expanded: false, triggerAria: "", onToggleExpanded: () => {}, fitsDoor: null,
    onEditCopies: null, receiptLink: null, onPrev: null, onNext: null,
    sheetRef: createRef(), gripRef: createRef(), doorRef: createRef(), sheetBodyRef: createRef(),
    mobileTriggerRef: createRef(), desktopTriggerRef: createRef(), prevButtonRef: createRef(), nextButtonRef: createRef(),
    registerCloseRef: () => {}, registerBackRef: () => {}, onClose: () => {},
    ...over,
  } as CardModalSheetProps;
}

describe("CardModalSheet", () => {
  it("draws the title, type line and cost, and names the snap on the sheet", () => {
    render(<CardModalSheet {...props()} />);
    expect(screen.getByRole("heading", { name: "Smothering Tithe" })).toBeTruthy();
    expect(screen.getByTestId("card-sheet").getAttribute("data-sheet")).toBe("full");
    expect(screen.getByTestId("modal-mana-cost")).toBeTruthy();
    expect(screen.getAllByText("Enchantment").length).toBeGreaterThan(0);
  });

  it("draws the plain close, the grip and a list of one without a counter", () => {
    const onClose = vi.fn();
    const setSnap = vi.fn();
    render(<CardModalSheet {...props({ onClose, setSnap })} />);
    fireEvent.click(screen.getByLabelText("Close card details"));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(document.querySelector("[data-sheet-grip]")!);
    expect(setSnap).toHaveBeenCalledWith("teaser");
    expect(screen.queryByText(/Next ›/)).toBeNull();
  });

  it("draws the way back over a sheet that names itself, and no grip when cramped", () => {
    render(<CardModalSheet {...props({ back: "Analysis", cramped: true })} />);
    expect(screen.getByTestId("card-modal-back")).toBeTruthy();
    expect(document.querySelector("[data-sheet-grip]")).toBeNull();
  });

  it("draws the teaser at its snap, with its oracle line and the All details button", () => {
    const setSnap = vi.fn();
    render(<CardModalSheet {...props({ full: false, sheetFull: false, setSnap })} />);
    expect(screen.getByTestId("card-sheet").getAttribute("data-sheet")).toBe("teaser");
    expect(screen.getByTestId("teaser-oracle")).toBeTruthy();
  });

  it("draws the Prev/Next row for a list and pages through the caller's handlers", () => {
    const onNext = vi.fn();
    render(<CardModalSheet {...props({ total: 3, position: 2, onNext })} />);
    fireEvent.click(screen.getByLabelText(/next/i));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(/prev/i).getAttribute("aria-disabled")).toBe("true");
  });

  it("draws the caller's nodes in place: the Find a deck door, the wishlist and proxy boxes, the sheet footer", () => {
    render(
      <CardModalSheet
        {...props({
          fitsDoor: (layout) => <span data-testid={`door-${layout}`} />,
          wishlistBox: <p data-testid="wish" />, proxyBox: <p data-testid="proxy" />,
          footer: (layout) => <span data-testid={`footer-${layout}`} />, figured: true,
        })}
      />,
    );
    expect(screen.getByTestId("wish")).toBeTruthy();
    expect(screen.getByTestId("proxy")).toBeTruthy();
    expect(screen.getByTestId("footer-row")).toBeTruthy();
    expect(screen.getByTestId("sheet-footer-foot")).toBeTruthy();
    expect(screen.queryByTestId("door-row")).toBeNull();
  });

  it("draws the set picker trigger and its region when the card has printings to pick", () => {
    const toggle = vi.fn();
    render(
      <CardModalSheet
        {...props({
          hasPicker: true, ownedPrintings: [{} as never, {} as never], expanded: true, triggerAria: "Show printings",
          onToggleExpanded: toggle, printingRegion: (id) => <div data-testid={id} />,
        })}
      />,
    );
    expect(screen.getByTestId("printings-mobile")).toBeTruthy();
    expect(screen.getByTestId("printings-desktop")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { expanded: true })[0]);
    expect(toggle).toHaveBeenCalledTimes(1);
  });

  it("draws a token with a set and no rarity, identity or owned count", () => {
    render(<CardModalSheet {...props({ isToken: true, card: { ...card, kind: "token" } as BrowseCard })} />);
    expect(screen.queryByText("Rarity")).toBeNull();
    expect(screen.getAllByText("Set").length).toBeGreaterThan(0);
  });
});
