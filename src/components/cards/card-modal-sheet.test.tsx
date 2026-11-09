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

  it("draws the teaser at its snap, with its oracle line and an All details button that lifts the sheet", () => {
    const setSnap = vi.fn();
    render(<CardModalSheet {...props({ full: false, sheetFull: false, setSnap })} />);
    expect(screen.getByTestId("card-sheet").getAttribute("data-sheet")).toBe("teaser");
    expect(screen.getByTestId("teaser-oracle")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /All details/ }));
    expect(setSnap).toHaveBeenCalledWith("full");
  });

  it("at the min snap keeps the door strip in the DOM but out of reach, and the second line inert", () => {
    render(<CardModalSheet {...props({ min: true, full: false, sheetFull: false, doorStrip: <span data-testid="door-strip" /> })} />);
    expect(screen.getByTestId("card-sheet").getAttribute("data-sheet")).toBe("min");
    const strip = screen.getByTestId("door-strip").parentElement!;
    expect(strip.className).toContain("invisible");
    expect(strip.className).toContain("absolute");
    expect(screen.getByTestId("teaser-oracle").parentElement!.hasAttribute("inert")).toBe(true);
  });

  it("draws the stand-in's teaser footer: its note and action beside All details", () => {
    const setSnap = vi.fn();
    render(
      <CardModalSheet
        {...props({
          full: false, sheetFull: false, setSnap,
          footer: (layout) => <span data-testid={`footer-${layout}`} />,
        })}
      />,
    );
    expect(screen.getByTestId("teaser-footer-note").querySelector("[data-testid=footer-teaserNote]")).toBeTruthy();
    expect(screen.getByTestId("teaser-footer-action").querySelector("[data-testid=footer-teaserAction]")).toBeTruthy();
    expect(screen.queryByTestId("sheet-footer-foot")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /All details/ }));
    expect(setSnap).toHaveBeenCalledWith("full");
  });

  it("pins the footer's foot only in the full sheet", () => {
    render(<CardModalSheet {...props({ footer: (layout) => <span data-testid={`footer-${layout}`} /> })} />);
    expect(screen.getByTestId("sheet-footer-foot").querySelector("[data-testid=footer-foot]")).toBeTruthy();
    expect(screen.queryByTestId("teaser-footer-note")).toBeNull();
  });

  it("names a printed name's oracle name under it, and draws the oracle text block", () => {
    render(<CardModalSheet {...props({ preview: { ...card, printedName: "Titre Imprime" } as BrowseCard })} />);
    expect(screen.getByRole("heading", { name: "Titre Imprime" })).toBeTruthy();
    expect(screen.getAllByText("Smothering Tithe").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Whenever an opponent draws/).length).toBeGreaterThan(0);
  });

  it("draws a token whose printing read failed with no Set cell at all", () => {
    render(<CardModalSheet {...props({ isToken: true, tokenNoSet: true, caption: "", card: { ...card, kind: "token" } as BrowseCard })} />);
    expect(screen.queryByText("Set")).toBeNull();
    expect(screen.queryByText("Rarity")).toBeNull();
  });

  it("opens the combo block when the card was opened for a combo", () => {
    const withCombos = {
      ...card,
      comboPartners: [{ oracleId: "p1", name: "Partner Card", state: "owned", popularity: null }],
    } as unknown as BrowseCard;
    render(<CardModalSheet {...props({ card: withCombos, preview: withCombos, openCombo: true })} />);
    expect(screen.getByTestId("combo-partners-block").querySelector("[aria-expanded=true]")).toBeTruthy();
  });

  it("points the desktop picker trigger at the id it gave printingRegion", () => {
    const ids: string[] = [];
    render(
      <CardModalSheet
        {...props({
          hasPicker: true, ownedPrintings: [{} as never, {} as never], expanded: true, triggerAria: "Show printings",
          printingRegion: (id) => { ids.push(id); return <div id={id} data-testid={id} />; },
        })}
      />,
    );
    expect(ids.sort()).toEqual(["printings-desktop", "printings-mobile"]);
    const controlled = Array.from(document.querySelectorAll("[aria-controls]")).map((e) => e.getAttribute("aria-controls"));
    expect(controlled.sort()).toEqual(["printings-desktop", "printings-mobile"]);
    for (const id of controlled) expect(document.getElementById(id!)).toBeTruthy();
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
