import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { BrowseCard } from "../../../lib/collection/browse";
import { landingCopy } from "../../../lib/copy/landing";
import { manapoolCardUrl } from "../../../lib/manapool/links";
import { cardCarouselCopy } from "../../../lib/copy/card-carousel";
import { cardZoomCopy, twoFacedCopy } from "../../../lib/copy/card-surfaces";
import { DemoCardModal, type DemoCardModalProps } from "./demo-card-modal";

// The card details modal as Try it draws it: read-only, from one card's exported details. The signed-in modal's own tests hold the
// shared halves; these hold what this host takes out (nothing writes, nothing leaves the page) and what it keeps working.
const card = (over: Partial<BrowseCard> = {}): BrowseCard => ({
  oracleId: "o1",
  name: "Smothering Tithe",
  typeLine: "Enchantment",
  manaCost: "{3}{W}",
  cmc: 4,
  oracleText: "Whenever an opponent draws a card, they pay {2}.",
  keywords: [],
  rarity: "rare",
  colorIdentity: ["W"],
  imageUri: "https://img/front.jpg",
  printedName: null,
  quantity: 1,
  printings: [
    { setCode: "RVR", scryfallId: "s-1", setName: "Ravnica Remastered", collectorNumber: "12", releasedAt: "2024-01-12", quantity: 1, finishes: { nonfoil: 1 }, imageUri: "https://img/front.jpg", flavorName: null },
    { setCode: "CLB", scryfallId: "s-2", setName: "Commander Legends: Battle for Baldur's Gate", collectorNumber: "99", releasedAt: "2022-06-10", quantity: 1, finishes: { nonfoil: 1 }, imageUri: "https://img/other.jpg", flavorName: null },
  ],
  setCodes: ["RVR", "CLB"],
  primarySetCode: "RVR",
  preferredPrinting: null,
  ...over,
});

function mount(over: Partial<DemoCardModalProps> = {}, c: BrowseCard = card()) {
  const props: DemoCardModalProps = {
    card: c, position: 1, total: 1, onClose: vi.fn(), onPrev: null, onNext: null, onPrevPeek: null, onNextPeek: null,
    prevSibling: null, nextSibling: null, enterFrom: null, enterOffset: 0, enterProgress: 0, enterLeftFace: null,
    startMinimized: false, onMinimizedChange: vi.fn(), returnFocusRef: { current: null }, ...over,
  };
  render(<DemoCardModal {...props} />);
  return props;
}

describe("the demo's card modal", () => {
  it("draws the dialog for the card, named by its title, with the details a fixture card carries", () => {
    mount();
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Smothering Tithe");
    expect(screen.getByTestId("card-sheet")).toHaveTextContent("Whenever an opponent draws a card");
  });

  it("draws nothing that writes or leaves the page: no printing picker, no wishlist or proxy box, and the one link a new tab", () => {
    mount({}, card({ proxiedBy: [{ id: "d1", name: "Atraxa" }] }));
    const dialog = screen.getByRole("dialog");
    // Two printings are held, and the picker that would choose between them is a write: its trigger is not drawn.
    expect(within(dialog).queryByText(/printings you own|printing you own/i)).toBeNull();
    // The Mana Pool link is live and opens in a new tab (the shipped `ExternalLink`): the only anchor in the dialog.
    const hrefs = [...dialog.querySelectorAll("a[href]")].map((a) => a.getAttribute("href"));
    expect(new Set(hrefs)).toEqual(new Set([manapoolCardUrl("Smothering Tithe")]));
    for (const a of dialog.querySelectorAll("a[href]")) expect(a).toHaveAttribute("target", "_blank");
    expect(within(dialog).getByText("Atraxa")).toBeInTheDocument();
  });

  it("draws Find a deck disabled, with the line that says who it is for, and pressing it does nothing", () => {
    const { onClose } = mount();
    const doors = screen.getAllByTestId("demo-fits-door");
    expect(doors.length).toBeGreaterThan(0);
    for (const door of doors) {
      const button = within(door).getByRole("button", { name: "Find a deck for Smothering Tithe" });
      expect(button).toHaveAttribute("aria-disabled", "true");
      expect(button.getAttribute("aria-describedby")).toBe(within(door).getByTestId("demo-fits-door-note").id);
      expect(within(door).getByTestId("demo-fits-door-note")).toHaveTextContent(landingCopy.demo.fitsLocked);
      fireEvent.click(button);
    }
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: /Find a deck/ })).toBeNull();
  });

  it("closes on Escape (the zoom layer first), on the ✕ and on the backdrop, and not on a press inside the dialog", () => {
    const { onClose } = mount();
    fireEvent.click(screen.getAllByRole("button", { name: cardZoomCopy.zoomAria("Smothering Tithe") })[0]);
    expect(screen.getByTestId("card-zoom")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("card-zoom")).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getAllByRole("button", { name: "Close card details" })[0]);
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("dialog").parentElement!);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("turns a two-faced card over in the art and in the zoom, each on its own", () => {
    mount({}, card({ layout: "transform", backImageUri: "https://img/back.jpg" }));
    const flip = screen.getAllByRole("button", { name: twoFacedCopy.flipToSideAria("back") });
    expect(flip.length).toBeGreaterThan(0);
    act(() => { fireEvent.click(flip[0]); });
    for (const turn of screen.getAllByTestId("modal-art-turn")) expect(turn).toHaveAttribute("data-face", "back");
    fireEvent.click(screen.getAllByRole("button", { name: cardZoomCopy.zoomAria("Smothering Tithe") })[0]);
    expect(screen.getByTestId("card-zoom-card")).toHaveAttribute("data-face", "front");
    fireEvent.click(within(screen.getByTestId("card-zoom")).getByRole("button", { name: twoFacedCopy.flipToSideAria("back") }));
    expect(screen.getByTestId("card-zoom-card")).toHaveAttribute("data-face", "back");
  });

  it("pages from the footer and the arrow keys, and says an end when there is none to page to", () => {
    const onNext = vi.fn();
    const onAtStart = vi.fn();
    mount({ total: 3, position: 1, onNext, onAtStart });
    fireEvent.click(screen.getAllByRole("button", { name: cardCarouselCopy.nextAria })[0]);
    expect(onNext).toHaveBeenCalledTimes(1);
    // A key goes to the focused element, and with nothing focused that is <body>: the handler hears the body and the dialog, not the
    // document itself (the signed-in modal's rule, so a key aimed at the document is ignored there too).
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    expect(onNext).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(document.body, { key: "ArrowLeft" });
    expect(onAtStart).toHaveBeenCalledTimes(1);
  });

  it("reads 1 of 1 with both arrows off for a card opened from no list", () => {
    mount();
    expect(screen.queryByRole("button", { name: cardCarouselCopy.nextAria })).toBeNull();
    expect(screen.queryByText(cardCarouselCopy.position(1, 1))).toBeNull();
  });
});
