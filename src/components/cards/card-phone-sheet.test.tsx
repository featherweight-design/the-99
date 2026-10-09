// The phone's card-first sheet (carousel R2, PhoneHero.dc.html and STATES §R2). jsdom lays out
// nothing, so these pin the states, the controls and the gesture wiring; geometry is the walk's.
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { BrowseCard } from "../../lib/collection/browse";
import { cardCarouselCopy, cardSheetCopy } from "../../lib/copy/card-carousel";

vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(async () => true),
  clearCardArtPreference: vi.fn(async () => {}),
}));

const { CardModal } = await import("./card-modal");

const card: BrowseCard = {
  oracleId: "o1",
  name: "Smothering Tithe",
  typeLine: "Enchantment",
  manaCost: "{3}{W}",
  cmc: 4,
  oracleText: "Whenever an opponent draws a card, that player may pay {2}. If the player doesn't, you create a Treasure token.",
  keywords: [],
  rarity: "rare",
  colorIdentity: ["W"],
  imageUri: null,
  printedName: null,
  quantity: 3,
  printings: [],
  setCodes: ["RVR"],
  primarySetCode: "RVR",
  preferredPrinting: null,
};

type Props = Partial<Parameters<typeof CardModal>[0]>;

function mount(props: Props = {}) {
  const onClose = vi.fn();
  const utils = render(
    <CardModal card={card} position={1} total={1} onClose={onClose} onPrev={null} onNext={null} {...props} />,
  );
  return { onClose, ...utils };
}

const sheet = () => screen.getByTestId("card-sheet");
const grip = () => screen.getByRole("button", { name: /Show all details|Show less/ });

describe("the sheet's two states", () => {
  it("opens on the teaser: three lines of oracle text and All details", () => {
    mount();
    expect(sheet()).toHaveAttribute("data-sheet", "teaser");
    expect(screen.getByTestId("teaser-oracle")).toHaveTextContent("Whenever an opponent draws a card");
    expect(screen.getByRole("button", { name: cardSheetCopy.expand })).toBeInTheDocument();
    expect(grip()).toHaveAccessibleName(cardSheetCopy.grabberAria(false));
  });

  it("opens to the full sheet from All details, and hands focus to the grip", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: cardSheetCopy.expand }));
    expect(sheet()).toHaveAttribute("data-sheet", "full");
    // The button that was pressed is gone; focus must not fall to the page.
    expect(screen.queryByRole("button", { name: cardSheetCopy.expand })).toBeNull();
    expect(document.activeElement).toBe(grip());
    expect(grip()).toHaveAccessibleName(cardSheetCopy.grabberAria(true));
  });

  it("toggles both ways from the grip, a native button", () => {
    mount();
    expect(grip().tagName).toBe("BUTTON");
    fireEvent.click(grip());
    expect(sheet()).toHaveAttribute("data-sheet", "full");
    fireEvent.click(grip());
    expect(sheet()).toHaveAttribute("data-sheet", "teaser");
  });

  it("walks Escape down full, then teaser, then close", () => {
    const { onClose } = mount();
    fireEvent.click(grip());
    act(() => { fireEvent.keyDown(document, { key: "Escape" }); });
    expect(sheet()).toHaveAttribute("data-sheet", "teaser");
    expect(onClose).not.toHaveBeenCalled();
    act(() => { fireEvent.keyDown(document, { key: "Escape" }); });
    expect(onClose).toHaveBeenCalled();
  });

  it("keeps what the reader owns on the sheet's second line, shown at both snaps", () => {
    // jsdom applies no stylesheet, so "shown" is read off the classes: nothing above the line
    // may carry the phone-hiding class that the full column wears in the teaser.
    const hidden = (el: Element) => el.closest(".max-md\\:hidden") !== null;
    mount();
    expect(screen.getByTestId("owned-line")).toHaveTextContent("×3");
    expect(hidden(screen.getByTestId("owned-line"))).toBe(false);
    fireEvent.click(grip());
    expect(hidden(screen.getByTestId("owned-line"))).toBe(false);
  });

  it("names the printing on screen, set and number, on the second line at both snaps", () => {
    const printings = [{
      setCode: "rvr", setName: "Ravnica Remastered", collectorNumber: "214", releasedAt: "2024-01-12",
      quantity: 1, finishes: { nonfoil: 1 }, imageUri: null, flavorName: null,
    }];
    mount({ card: { ...card, printings } });
    expect(screen.getByTestId("teaser-set")).toHaveTextContent("RVR · 214");
    expect(screen.getByTestId("teaser-set").closest(".max-md\\:hidden")).toBeNull();
    fireEvent.click(grip());
    expect(screen.getByTestId("teaser-set")).toHaveTextContent("RVR · 214");
  });

  it("draws no set line for a card with no printing to name", () => {
    mount();
    expect(screen.queryByTestId("teaser-set")).toBeNull();
  });

  it("makes the card and its peeks inert under the full sheet, and live again on the teaser", () => {
    mount({
      position: 2, total: 3, onPrev: vi.fn(), onNext: vi.fn(), onPrevPeek: vi.fn(), onNextPeek: vi.fn(),
      prevSibling: { oracleId: "o0", name: "Rhystic Study", imageUri: null },
      nextSibling: { oracleId: "o2", name: "Esper Sentinel", imageUri: null },
    });
    const covered = () => [
      screen.getByTestId("modal-art-mobile"),
      screen.getByTestId("phone-peek-prev"),
      screen.getByTestId("phone-peek-next"),
    ];
    for (const el of covered()) expect(el.hasAttribute("inert")).toBe(false);
    fireEvent.click(grip());
    for (const el of covered()) expect(el.hasAttribute("inert")).toBe(true);
    // The band itself stays live: its tap is the way back to the teaser.
    expect(screen.getByTestId("card-band").hasAttribute("inert")).toBe(false);
    fireEvent.click(grip());
    for (const el of covered()) expect(el.hasAttribute("inert")).toBe(false);
  });

  it("closes from the teaser on Escape even with the printings picker left open", () => {
    const printings = Array.from({ length: 2 }, (_, i) => ({
      setCode: "RVR", setName: "Ravnica Remastered", collectorNumber: String(i + 1), releasedAt: "2024-01-12",
      quantity: 1, finishes: { nonfoil: 1 }, imageUri: null, flavorName: null,
    }));
    const { onClose } = mount({ card: { ...card, printings } });
    fireEvent.click(grip());
    fireEvent.click(screen.getAllByRole("button", { name: /printings owned/ })[0]);
    fireEvent.click(grip());
    // The region is out of sight with the full column; the reader's Escape closes the card.
    act(() => { fireEvent.keyDown(document, { key: "Escape" }); });
    expect(onClose).toHaveBeenCalled();
  });
});

describe("the swap tools' door", () => {
  it("takes no room when its renderer draws nothing for this card", () => {
    mount({ door: () => null });
    expect(screen.getByTestId("card-band").style.height).toBe("calc(100% - 280px)");
  });
});

describe("a screen too short for the teaser", () => {
  it("opens the sheet full and closes on the first Escape when the teaser would crush the card", () => {
    // A stacked stand-in on a 360x640 phone: a 500px dialog, and a 96px Take footer on top of the
    // 280 teaser, would leave the card 28px wide. jsdom lays nothing out, so the two heights the
    // modal measures are given here.
    const heights = vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
      if (this.getAttribute("role") === "dialog") return 500;
      if (this.querySelector('[data-testid="take-footer"]')) return 96;
      return 0;
    });
    try {
      const { onClose } = mount({ footer: () => <div data-testid="take-footer">Take</div> });
      expect(sheet()).toHaveAttribute("data-sheet", "full");
      // No teaser to step down to, so no grip offering one.
      expect(screen.queryByRole("button", { name: /Show all details|Show less/ })).toBeNull();
      act(() => { fireEvent.keyDown(document, { key: "Escape" }); });
      expect(onClose).toHaveBeenCalled();
    } finally {
      heights.mockRestore();
    }
  });

  it("offers the teaser where the card keeps its room", () => {
    const heights = vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
      return this.getAttribute("role") === "dialog" ? 844 : 0;
    });
    try {
      mount();
      expect(sheet()).toHaveAttribute("data-sheet", "teaser");
    } finally {
      heights.mockRestore();
    }
  });
});

describe("at desktop widths", () => {
  it("leaves the sheet alone: a drag-select in the column is not a gesture", () => {
    const wide = vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
      matches: true, media: query, onchange: null,
      addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
      dispatchEvent: () => false,
    }));
    try {
      const { onClose } = mount({ position: 2, total: 3, onPrev: vi.fn(), onNext: vi.fn() });
      fireEvent.pointerDown(sheet(), { pointerId: 1, clientX: 400, clientY: 600, button: 0, pointerType: "mouse" });
      for (const y of [550, 450, 300]) fireEvent.pointerMove(window, { pointerId: 1, clientX: 400, clientY: y, pointerType: "mouse" });
      fireEvent.pointerUp(window, { pointerId: 1, clientX: 400, clientY: 300, pointerType: "mouse" });
      expect(sheet()).toHaveAttribute("data-sheet", "teaser");
      // So the desktop's first Escape still closes, and no sheet rung swallows it.
      act(() => { fireEvent.keyDown(document, { key: "Escape" }); });
      expect(onClose).toHaveBeenCalled();
    } finally {
      wide.mockRestore();
    }
  });
});

describe("the card band", () => {
  const prev = { oracleId: "o0", name: "Rhystic Study", imageUri: "https://img/prev.jpg" };
  const next = { oracleId: "o2", name: "Esper Sentinel", colorIdentity: ["W"] };

  it("draws no counter and no peeks for a list of one", () => {
    mount();
    expect(screen.queryByTestId("modal-counter-mobile")).toBeNull();
    expect(screen.queryByTestId("phone-peek-prev")).toBeNull();
    expect(screen.queryByTestId("phone-peek-next")).toBeNull();
  });

  it("draws the counter and both peeks mid-list, each named for its card", () => {
    const onPrevPeek = vi.fn();
    const onNextPeek = vi.fn();
    mount({
      position: 12, total: 48, onPrev: vi.fn(), onNext: vi.fn(), onPrevPeek, onNextPeek,
      prevSibling: prev, nextSibling: next,
    });
    expect(screen.getByTestId("modal-counter-mobile")).toHaveTextContent(cardCarouselCopy.position(12, 48));
    const band = screen.getByTestId("card-band");
    fireEvent.click(within(band).getByRole("button", { name: "Previous card: Rhystic Study" }));
    expect(onPrevPeek).toHaveBeenCalledTimes(1);
    fireEvent.click(within(band).getByRole("button", { name: "Next card: Esper Sentinel" }));
    expect(onNextPeek).toHaveBeenCalledTimes(1);
  });

  it("draws nothing on the missing side at an end", () => {
    mount({ position: 1, total: 48, onPrev: null, onNext: vi.fn(), onNextPeek: vi.fn(), nextSibling: next });
    expect(screen.queryByTestId("phone-peek-prev")).toBeNull();
    expect(screen.getByTestId("phone-peek-next")).toBeInTheDocument();
  });

  it("enters a paged card from where its peek stood, plus where the swipe let go", () => {
    mount({ position: 2, total: 3, onPrev: vi.fn(), onNext: vi.fn(), enterFrom: "next", enterOffset: -100 });
    const art = screen.getByTestId("modal-art-mobile");
    expect(art).toHaveClass("anim-phone-card-enter");
    expect(art.style.getPropertyValue("--enter-x")).toBe("calc(86.875% + 12px + -100px)");
  });

  it("enters a first open in place", () => {
    mount();
    expect(screen.getByTestId("modal-art-mobile")).not.toHaveClass("anim-phone-card-enter");
  });

  it("centres the turn plate along a two-faced card's bottom", () => {
    mount({ card: { ...card, layout: "transform", backImageUri: "https://img/back.jpg", name: "Delver of Secrets // Insectile Aberration" } });
    const button = within(screen.getByTestId("modal-art-mobile")).getByRole("button", { name: /Insectile Aberration/ });
    expect(button).toBeInTheDocument();
    // The corner placement covered the power/toughness box; the wrapper centres on the card.
    const wrapper = button.parentElement as HTMLElement;
    expect(wrapper).toHaveClass("left-1/2", "-translate-x-1/2");
    expect(wrapper.style.right).toBe("");
  });
});

// Pointer streams, written out: a down, a few moves, an up. jsdom's event clock may or may not
// tick between them, so a horizontal drag here always crosses 25% of jsdom's 1024px window and
// pages on distance alone, never on a speed it cannot control. These assert direction and wiring;
// `card-sheet-gesture.test.ts` owns the thresholds.
function drag(target: Element, from: [number, number], to: [number, number], steps = 4) {
  const [x0, y0] = from;
  const [x1, y1] = to;
  fireEvent.pointerDown(target, { pointerId: 1, clientX: x0, clientY: y0, button: 0, pointerType: "touch" });
  for (let i = 1; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    const y = y0 + ((y1 - y0) * i) / steps;
    fireEvent.pointerMove(window, { pointerId: 1, clientX: x, clientY: y, pointerType: "touch" });
  }
  fireEvent.pointerUp(window, { pointerId: 1, clientX: x1, clientY: y1, pointerType: "touch" });
}

describe("gestures", () => {
  it("pages on a horizontal swipe across the band, carrying where it let go", () => {
    const onNext = vi.fn();
    mount({ position: 2, total: 3, onPrev: vi.fn(), onNext });
    drag(screen.getByTestId("card-band"), [700, 300], [250, 305]);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onNext.mock.calls[0][0]).toBe(-450);
  });

  it("does not page past an end, and springs back", () => {
    const onPrev = vi.fn();
    mount({ position: 1, total: 3, onPrev: null, onNext: vi.fn() });
    const band = screen.getByTestId("card-band");
    drag(band, [200, 300], [650, 305]);
    expect(onPrev).not.toHaveBeenCalled();
    expect(band.style.transform).toBe("");
  });

  it("withholds paging in the full state", () => {
    const onNext = vi.fn();
    mount({ position: 2, total: 3, onPrev: vi.fn(), onNext });
    fireEvent.click(grip());
    drag(screen.getByTestId("card-band"), [700, 300], [250, 305]);
    expect(onNext).not.toHaveBeenCalled();
  });

  it("leaves a drag that starts at the screen's edge to the system", () => {
    const onNext = vi.fn();
    mount({ position: 2, total: 3, onPrev: vi.fn(), onNext });
    drag(screen.getByTestId("card-band"), [window.innerWidth - 8, 300], [200, 305]);
    expect(onNext).not.toHaveBeenCalled();
  });

  it("raises the sheet on a vertical drag up the teaser", () => {
    mount();
    drag(sheet(), [200, 700], [200, 300]);
    expect(sheet()).toHaveAttribute("data-sheet", "full");
  });

  it("returns the full sheet to the teaser on a pull down its details from the top", () => {
    mount();
    fireEvent.click(grip());
    // The oracle text sits inside the sheet's scrolling body, which jsdom reports at its top.
    const text = within(sheet()).getAllByText(/Whenever an opponent draws a card/)[0];
    drag(text, [200, 200], [200, 700]);
    expect(sheet()).toHaveAttribute("data-sheet", "teaser");
  });

  // A card opened from a sheet (Change Commander's candidates, a receipt, stand-ins) pulls down the
  // same way: the stacked exception went with the squeezed geometry it was for.
  it("returns a stacked card's full sheet to the teaser on the same pull", () => {
    mount({ stacked: true });
    fireEvent.click(grip());
    const text = within(sheet()).getAllByText(/Whenever an opponent draws a card/)[0];
    drag(text, [200, 200], [200, 700]);
    expect(sheet()).toHaveAttribute("data-sheet", "teaser");
  });

  it("raises the sheet on a vertical drag that starts on the band", () => {
    mount();
    drag(screen.getByTestId("card-band"), [200, 450], [200, 150]);
    expect(sheet()).toHaveAttribute("data-sheet", "full");
  });

  it("returns to the teaser from a tap on the band in the full state", () => {
    mount();
    fireEvent.click(grip());
    const band = screen.getByTestId("card-band");
    fireEvent.pointerDown(band, { pointerId: 1, clientX: 200, clientY: 30, button: 0, pointerType: "touch" });
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 200, clientY: 30, pointerType: "touch" });
    expect(sheet()).toHaveAttribute("data-sheet", "teaser");
  });

  it("cancels the press under a swipe that starts on a peek", () => {
    const onNext = vi.fn();
    const onNextPeek = vi.fn();
    mount({
      position: 2, total: 3, onPrev: vi.fn(), onNext, onNextPeek,
      nextSibling: { oracleId: "o2", name: "Esper Sentinel" },
    });
    const peek = screen.getByTestId("phone-peek-next");
    drag(peek, [700, 300], [250, 305]);
    // The browser fires the click the touch ended in; the band swallows it.
    fireEvent.click(peek);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onNextPeek).not.toHaveBeenCalled();
  });

  it("lets the next plain tap through after a swipe", async () => {
    const onNextPeek = vi.fn();
    mount({
      position: 2, total: 3, onPrev: vi.fn(), onNext: vi.fn(), onNextPeek,
      nextSibling: { oracleId: "o2", name: "Esper Sentinel" },
    });
    const peek = screen.getByTestId("phone-peek-next");
    drag(peek, [700, 300], [250, 305]);
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    fireEvent.click(peek);
    expect(onNextPeek).toHaveBeenCalledTimes(1);
  });
});
