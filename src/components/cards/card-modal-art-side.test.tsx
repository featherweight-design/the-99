// The art side drawn from props alone, no CardModal: the states the landing's demo will draw.
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { BrowseCard } from "../../lib/collection/browse";
import { CardModalArtSide, type CardModalArtSideProps } from "./card-modal-art-side";

const preview = { name: "Sol Ring", printedName: null } as unknown as BrowseCard;

function props(over: Partial<CardModalArtSideProps> = {}): CardModalArtSideProps {
  const files: (HTMLButtonElement | null)[] = [];
  return {
    artStyle: { background: "red" }, preview, oneFaceFilm: null, turningArt: () => null, turningAttr: undefined,
    twoFaced: false, showingBack: false, flipLabel: () => "Flip", onFlip: () => {},
    underCard: <p data-testid="under">under</p>, underCardHeight: 52, door: null,
    narrow: false, min: false, full: false, zoomed: false, viewOpen: false, teaserHeight: 280,
    bandRef: null, stageRef: null, onBandPointerDown: () => {},
    prevSibling: null, nextSibling: null, onPrevPeek: null, onNextPeek: null,
    prevPhonePeekRef: null, nextPhonePeekRef: null, leftFace: null,
    enteredLeftFace: null, enteredFrom: null, enteredOffset: 0, enteredProgress: 0, phoneTiltRef: null,
    total: 1, position: 1, phoneBack: null, registerCloseRef: (s, el) => { files[s] = el; }, onClose: () => {},
    desktopTiltRef: null, tiltHover: () => {}, tiltLeave: () => {}, registerZoomTriggerRef: (s, el) => { files[s] = el; },
    openZoom: () => {}, zoomRegion: "card-zoom",
    ...over,
  };
}

describe("CardModalArtSide", () => {
  it("draws the band, the desktop art and the under-card stack, with no counter for a list of one", () => {
    render(<CardModalArtSide {...props()} />);
    expect(screen.getByTestId("card-band").getAttribute("data-snap")).toBe("teaser");
    expect(screen.getByTestId("modal-art-desktop")).toBeTruthy();
    expect(screen.getByTestId("modal-under-card")).toBeTruthy();
    expect(screen.queryByTestId("modal-counter-mobile")).toBeNull();
  });

  it("names the snap, draws the counter and the back pill when stacked over a sheet", () => {
    const onClose = vi.fn();
    render(<CardModalArtSide {...props({ min: true, total: 3, position: 2, phoneBack: "Analysis", onClose })} />);
    expect(screen.getByTestId("card-band").getAttribute("data-snap")).toBe("min");
    expect(screen.getByTestId("modal-counter-mobile")).toBeTruthy();
    fireEvent.click(screen.getByTestId("card-modal-back-mobile"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("draws the plain close and the zoom trigger, and hands both to the caller's registers", () => {
    const seen: number[] = [];
    const openZoom = vi.fn();
    render(<CardModalArtSide {...props({ openZoom, registerCloseRef: (s, el) => { if (el) seen.push(s); } })} />);
    expect(screen.getByLabelText("Close card details")).toBeTruthy();
    expect(seen).toContain(0);
    fireEvent.click(screen.getByLabelText(/up close/i));
    expect(openZoom).toHaveBeenCalledTimes(1);
  });

  it("draws a two-faced card's turn plate on the phone card and an inert band under the zoom", () => {
    render(<CardModalArtSide {...props({ twoFaced: true, zoomed: true })} />);
    expect(screen.getAllByLabelText("Flip").length).toBeGreaterThan(0);
    expect(screen.getByTestId("card-band").hasAttribute("inert")).toBe(true);
  });
});
