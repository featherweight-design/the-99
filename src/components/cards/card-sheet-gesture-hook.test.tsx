// The hook's pointer handling, driven through a harness shaped like the card modal's phone layout:
// a dialog holding a band (with a peek and a turn plate in it) and a sheet (with its grip). The
// math has its own tests; these pin what the hook does with it.
import { useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

import { useCardSheetGestures } from "./card-sheet-gesture";

type HarnessProps = {
  canPrev?: boolean;
  canNext?: boolean;
  startFull?: boolean;
  onPage?: (dir: "prev" | "next", offset: number) => void;
  onPeek?: () => void;
  onTurn?: () => void;
  /** Where the full sheet's body is scrolled to. */
  bodyScrollTop?: number;
  canCollapse?: boolean;
  disabled?: boolean;
  /** The sheet starts at its min snap, where a tap on the band returns it to the teaser. */
  startMin?: boolean;
  onSnap?: (to: "full" | "teaser" | "min") => void;
  /** A press on the card's own box (the tilt host) clicks this. */
  onCard?: () => void;
};

function Harness({
  canPrev = true, canNext = true, startFull = false, onPage = () => {}, onPeek = () => {}, onTurn = () => {},
  bodyScrollTop = 0, canCollapse = true, disabled = false, startMin = false, onSnap = () => {}, onCard = () => {},
}: HarnessProps) {
  const tiltRef = useRef<HTMLDivElement | null>(null);
  const bandRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [full, setFull] = useState(startFull);
  const g = useCardSheetGestures({
    bandRef,
    sheetRef,
    full,
    teaserHeight: 280,
    canPrev,
    canNext,
    onPage,
    onSnap: (to) => {
      onSnap(to);
      setFull(to === "full");
    },
    bodyRef,
    canCollapse,
    disabled,
    min: startMin,
    canMinimize: startMin,
    tiltRef,
  });
  return (
    <div onClickCapture={g.onClickCapture}>
      <div ref={bandRef} data-testid="band" onPointerDown={g.onBandPointerDown}>
        <div ref={tiltRef} data-testid="card" data-tilt="" onClick={onCard} />
        <button type="button" onClick={onPeek}>peek</button>
        <button type="button" onClick={onTurn}>turn</button>
      </div>
      <div ref={sheetRef} data-testid="sheet" data-sheet={full ? "full" : "teaser"} onPointerDown={g.onSheetPointerDown}>
        <button type="button" data-sheet-grip="">grip</button>
        <p>strip</p>
        <div
          ref={(el) => {
            bodyRef.current = el;
            if (el) Object.defineProperty(el, "scrollTop", { configurable: true, value: bodyScrollTop });
          }}
        >
          <p>body</p>
        </div>
      </div>
    </div>
  );
}

// jsdom's window is 1024 wide and its event clock may not tick between dispatches, so every
// horizontal drag here crosses 25% of that width and pages on distance alone.
function drag(target: Element, from: [number, number], to: [number, number], steps = 4) {
  fireEvent.pointerDown(target, { pointerId: 1, clientX: from[0], clientY: from[1], button: 0, pointerType: "touch" });
  for (let i = 1; i <= steps; i++) {
    fireEvent.pointerMove(window, {
      pointerId: 1,
      clientX: from[0] + ((to[0] - from[0]) * i) / steps,
      clientY: from[1] + ((to[1] - from[1]) * i) / steps,
      pointerType: "touch",
    });
  }
  fireEvent.pointerUp(window, { pointerId: 1, clientX: to[0], clientY: to[1], pointerType: "touch" });
}
const tap = (target: Element, x = 300, y = 30) => {
  fireEvent.pointerDown(target, { pointerId: 2, clientX: x, clientY: y, button: 0, pointerType: "touch" });
  fireEvent.pointerUp(window, { pointerId: 2, clientX: x, clientY: y, pointerType: "touch" });
};
const sheet = () => screen.getByTestId("sheet");

describe("useCardSheetGestures", () => {
  it("pages on a horizontal drag of the band, with the band's offset at release", () => {
    const onPage = vi.fn();
    render(<Harness onPage={onPage} />);
    drag(screen.getByTestId("band"), [700, 300], [250, 305]);
    expect(onPage).toHaveBeenCalledWith("next", -450);
  });

  it("hands over the offset at the release, not at the last move", () => {
    const onPage = vi.fn();
    render(<Harness onPage={onPage} />);
    const band = screen.getByTestId("band");
    fireEvent.pointerDown(band, { pointerId: 1, clientX: 700, clientY: 300, button: 0, pointerType: "touch" });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 400, clientY: 302, pointerType: "touch" });
    // The finger travels on past its last move event before it lifts.
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 250, clientY: 303, pointerType: "touch" });
    expect(onPage).toHaveBeenCalledWith("next", -450);
    expect(band.style.transform).toBe("translateX(-450px)");
  });

  it("snaps the sheet from where it was let go, not from its last move", () => {
    // Timestamps set by hand: the release comes a second after the last move, so no flick is
    // read and only the release POSITION can carry the sheet to full.
    const at = (type: string, y: number, t: number) => {
      const e = new PointerEvent(type, { pointerId: 1, clientX: 200, clientY: y, button: 0, pointerType: "touch", bubbles: true });
      Object.defineProperty(e, "timeStamp", { value: t });
      return e;
    };
    render(<Harness />);
    const s = sheet();
    fireEvent(s, at("pointerdown", 700, 0));
    // A last move that alone would read as nearer the teaser.
    fireEvent(window, at("pointermove", 690, 10));
    fireEvent(window, at("pointerup", 200, 1000));
    expect(s).toHaveAttribute("data-sheet", "full");
  });

  it("follows the finger 1:1 while dragging, and springs back at an end without paging", () => {
    const onPage = vi.fn();
    render(<Harness canPrev={false} onPage={onPage} />);
    const band = screen.getByTestId("band");
    fireEvent.pointerDown(band, { pointerId: 1, clientX: 200, clientY: 300, button: 0, pointerType: "touch" });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 300, clientY: 302, pointerType: "touch" });
    // Toward the missing side: 0.3x of 100.
    expect(band.style.transform).toBe("translateX(30px)");
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 300, clientY: 302, pointerType: "touch" });
    expect(onPage).not.toHaveBeenCalled();
    expect(band.style.transform).toBe("");
  });

  it("clears the spring's inline transition once the band is home", async () => {
    render(<Harness canPrev={false} />);
    const band = screen.getByTestId("band");
    drag(band, [200, 300], [300, 302]);
    await act(async () => { await new Promise((r) => setTimeout(r, 260)); });
    expect(band.style.transition).toBe("");
  });

  it("withholds paging in the full state", () => {
    const onPage = vi.fn();
    render(<Harness startFull onPage={onPage} />);
    drag(screen.getByTestId("band"), [700, 300], [250, 305]);
    expect(onPage).not.toHaveBeenCalled();
  });

  it("does nothing horizontally for a list of one", () => {
    const onPage = vi.fn();
    render(<Harness canPrev={false} canNext={false} onPage={onPage} />);
    const band = screen.getByTestId("band");
    drag(band, [700, 300], [250, 305]);
    expect(onPage).not.toHaveBeenCalled();
    expect(band.style.transform).toBe("");
  });

  it("leaves a drag that starts at the screen's edge to the system", () => {
    const onPage = vi.fn();
    render(<Harness onPage={onPage} />);
    drag(screen.getByTestId("band"), [window.innerWidth - 8, 300], [250, 305]);
    expect(onPage).not.toHaveBeenCalled();
  });

  it("raises the sheet on a vertical drag up the teaser", () => {
    render(<Harness />);
    drag(sheet(), [200, 700], [200, 200]);
    expect(sheet()).toHaveAttribute("data-sheet", "full");
  });

  it("raises the sheet from a vertical drag that starts on the band", () => {
    render(<Harness />);
    drag(screen.getByTestId("band"), [200, 600], [200, 150]);
    expect(sheet()).toHaveAttribute("data-sheet", "full");
  });

  it("writes the drag's top while it moves and clears it on release", () => {
    render(<Harness />);
    const s = sheet();
    fireEvent.pointerDown(s, { pointerId: 1, clientX: 200, clientY: 600, button: 0, pointerType: "touch" });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 200, clientY: 500, pointerType: "touch" });
    expect(s.style.getPropertyValue("--sheet-drag-top")).not.toBe("");
    expect(s.dataset.dragging).toBe("");
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 200, clientY: 500, pointerType: "touch" });
    expect(s.style.getPropertyValue("--sheet-drag-top")).toBe("");
    expect(s.dataset.dragging).toBeUndefined();
  });

  it("leaves a full sheet's body to scroll when it is scrolled down, and drags by the grip", () => {
    render(<Harness startFull bodyScrollTop={120} />);
    drag(screen.getByText("body"), [200, 200], [200, 700]);
    expect(sheet()).toHaveAttribute("data-sheet", "full");
    drag(screen.getByText("grip"), [200, 70], [200, 700]);
    expect(sheet()).toHaveAttribute("data-sheet", "teaser");
  });

  it("returns the full sheet to the teaser on a pull down its body from the top", () => {
    render(<Harness startFull />);
    drag(screen.getByText("body"), [200, 200], [200, 700]);
    expect(sheet()).toHaveAttribute("data-sheet", "teaser");
  });

  it("keeps the full sheet on a short pull from the top, by the grip's own snap", () => {
    // The same rule as the grip: a slow release snaps to the nearer state, so a 100px pull stays.
    render(<Harness startFull />);
    // fireEvent drops a `timeStamp` option, and jsdom's own clock can read a 100px move as a flick
    // under load, so each event carries a defined time: slow enough that only distance decides.
    const at = (type: string, y: number, t: number) => {
      const e = new PointerEvent(type, { pointerId: 1, clientX: 200, clientY: y, button: 0, pointerType: "touch", bubbles: true });
      Object.defineProperty(e, "timeStamp", { value: t });
      return e;
    };
    fireEvent(screen.getByText("body"), at("pointerdown", 200, 0));
    fireEvent(window, at("pointermove", 300, 400));
    fireEvent(window, at("pointerup", 300, 800));
    expect(sheet()).toHaveAttribute("data-sheet", "full");
  });

  it("leaves an upward drag from the top to the body's scroll", () => {
    render(<Harness startFull />);
    drag(screen.getByText("body"), [200, 600], [200, 100]);
    expect(sheet()).toHaveAttribute("data-sheet", "full");
  });

  it("holds the body's scroll back during a pull, and not during an upward drag", () => {
    render(<Harness startFull />);
    const body = screen.getByText("body");
    const touchMove = (y: number) => {
      const ev = new Event("touchmove", { bubbles: true, cancelable: true }) as TouchEvent;
      Object.defineProperty(ev, "touches", { value: [{ clientX: 200, clientY: y }] });
      window.dispatchEvent(ev);
      return ev.defaultPrevented;
    };
    fireEvent.pointerDown(body, { pointerId: 1, clientX: 200, clientY: 200, button: 0, pointerType: "touch" });
    expect(touchMove(206)).toBe(true);
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 200, clientY: 206, pointerType: "touch" });

    fireEvent.pointerDown(body, { pointerId: 2, clientX: 200, clientY: 200, button: 0, pointerType: "touch" });
    expect(touchMove(194)).toBe(false);
    // Handed to the scroll for the rest of the gesture, even if the finger turns back down.
    expect(touchMove(230)).toBe(false);
    fireEvent.pointerUp(window, { pointerId: 2, clientX: 200, clientY: 230, pointerType: "touch" });
    expect(sheet()).toHaveAttribute("data-sheet", "full");
  });

  it("lets a second finger pinch: the pull drops and holds nothing back", () => {
    render(<Harness startFull />);
    const pinch = (ys: number[]) => {
      const ev = new Event("touchmove", { bubbles: true, cancelable: true }) as TouchEvent;
      Object.defineProperty(ev, "touches", { value: ys.map((y) => ({ clientX: 200, clientY: y })) });
      window.dispatchEvent(ev);
      return ev.defaultPrevented;
    };
    fireEvent.pointerDown(screen.getByText("body"), { pointerId: 1, clientX: 200, clientY: 200, button: 0, pointerType: "touch" });
    expect(pinch([210, 400])).toBe(false);
    // Dropped for the rest of the gesture, even back to one finger moving down.
    expect(pinch([240])).toBe(false);
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 200, clientY: 600, pointerType: "touch" });
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 200, clientY: 700, pointerType: "touch" });
    expect(sheet()).toHaveAttribute("data-sheet", "full");
  });

  it("pulls only from the scrolling body, not from a strip beside it", () => {
    render(<Harness startFull />);
    drag(screen.getByText("strip"), [200, 200], [200, 700]);
    expect(sheet()).toHaveAttribute("data-sheet", "full");
  });

  it("does not pull a sheet that has no teaser to return to", () => {
    render(<Harness startFull canCollapse={false} />);
    drag(screen.getByText("body"), [200, 200], [200, 700]);
    expect(sheet()).toHaveAttribute("data-sheet", "full");
  });

  it("returns to the teaser from a tap on the band in the full state", () => {
    render(<Harness startFull />);
    tap(screen.getByTestId("band"));
    expect(sheet()).toHaveAttribute("data-sheet", "teaser");
  });

  it("keeps the full sheet when the tap is a control's, such as the turn plate", () => {
    const onTurn = vi.fn();
    render(<Harness startFull onTurn={onTurn} />);
    const turn = screen.getByText("turn");
    tap(turn);
    fireEvent.click(turn);
    expect(onTurn).toHaveBeenCalledTimes(1);
    expect(sheet()).toHaveAttribute("data-sheet", "full");
  });

  it("swallows the click a swipe ends in, and lets the next plain tap through", async () => {
    const onPeek = vi.fn();
    render(<Harness onPeek={onPeek} />);
    const peek = screen.getByText("peek");
    drag(peek, [700, 300], [250, 305]);
    fireEvent.click(peek);
    expect(onPeek).not.toHaveBeenCalled();
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    fireEvent.click(peek);
    expect(onPeek).toHaveBeenCalledTimes(1);
  });

  it("restores the snap it started from when the pointer is cancelled", () => {
    render(<Harness />);
    const s = sheet();
    fireEvent.pointerDown(s, { pointerId: 1, clientX: 200, clientY: 700, button: 0, pointerType: "touch" });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 200, clientY: 200, pointerType: "touch" });
    fireEvent.pointerCancel(window, { pointerId: 1, pointerType: "touch" });
    expect(s).toHaveAttribute("data-sheet", "teaser");
    expect(s.style.getPropertyValue("--sheet-drag-top")).toBe("");
  });

  it("detaches its window listeners on unmount", () => {
    const onPage = vi.fn();
    const { unmount } = render(<Harness onPage={onPage} />);
    const band = screen.getByTestId("band");
    fireEvent.pointerDown(band, { pointerId: 1, clientX: 700, clientY: 300, button: 0, pointerType: "touch" });
    unmount();
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 250, clientY: 305, pointerType: "touch" });
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 250, clientY: 305, pointerType: "touch" });
    expect(onPage).not.toHaveBeenCalled();
  });
});

// #1268: a stacked card dropping off its sheet is leaving. A swipe held when the drop begins must
// not page on release, and a new one must not start.
describe("disabled (a card leaving)", () => {
  it("abandons a drag in progress, so its release pages nothing, and starts no new one", () => {
    const onPage = vi.fn();
    const view = render(<Harness onPage={onPage} />);
    const band = screen.getByTestId("band");
    fireEvent.pointerDown(band, { pointerId: 1, clientX: 600, clientY: 100, button: 0, pointerType: "touch" });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 400, clientY: 100, pointerType: "touch" });
    act(() => { view.rerender(<Harness onPage={onPage} disabled />); });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 200, clientY: 100, pointerType: "touch" });
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 100, clientY: 100, pointerType: "touch" });
    expect(onPage).not.toHaveBeenCalled();
    drag(band, [600, 100], [100, 100]);
    expect(onPage).not.toHaveBeenCalled();
  });
});

// The tilt's hold (foil R2, audit G7 and G13): 300ms inside the swipe's slop, on the card's own box, lifts it.
describe("the hold", () => {
  const card = () => screen.getByTestId("card");
  const lifted = () => card().hasAttribute("data-tilting");
  const down = (target: Element, id = 9, x = 300, y = 200) =>
    fireEvent.pointerDown(target, { pointerId: id, clientX: x, clientY: y, button: 0, pointerType: "touch" });
  const moveTo = (x: number, y: number, id = 9) => fireEvent.pointerMove(window, { pointerId: id, clientX: x, clientY: y, pointerType: "touch" });
  const up = (x = 300, y = 200, id = 9) => fireEvent.pointerUp(window, { pointerId: id, clientX: x, clientY: y, pointerType: "touch" });
  const wait = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("lifts the card after 300ms, follows the finger, and pages nothing", () => {
    const onPage = vi.fn();
    render(<Harness onPage={onPage} />);
    // jsdom lays nothing out: give the card a 400 x 560 box, so the follow writes where the finger is.
    card().getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 560, right: 400, bottom: 560, x: 0, y: 0, toJSON: () => ({}) });
    down(card());
    wait(299);
    expect(lifted()).toBe(false);
    wait(1);
    expect(lifted()).toBe(true);
    // A drag that would page, once the card is held, only tilts it.
    moveTo(800, 210);
    expect(card().style.getPropertyValue("--tilt-x")).toBe("1");
    moveTo(60, 210);
    // The card follows the finger: x is where it is across the box, y where it is down it.
    expect(card().style.getPropertyValue("--tilt-x")).toBe("0.15");
    expect(card().style.getPropertyValue("--tilt-y")).toBe("0.375");
    expect(card().style.getPropertyValue("--tilt-lift")).toBe("1");
    up(60, 210);
    expect(onPage).not.toHaveBeenCalled();
    expect(lifted()).toBe(false);
    expect(card().style.getPropertyValue("--tilt-x")).toBe("");
  });

  it("stays a swipe when the press moves first", () => {
    const onPage = vi.fn();
    render(<Harness onPage={onPage} />);
    down(card(), 9, 700, 300);
    moveTo(500, 302);
    wait(400);
    expect(lifted()).toBe(false);
    moveTo(250, 305);
    up(250, 305);
    expect(onPage).toHaveBeenCalledWith("next", expect.any(Number));
  });

  it("swallows the release's tap: no snap to the teaser from min, and no click", () => {
    const onSnap = vi.fn();
    const onCard = vi.fn();
    render(<Harness startMin onSnap={onSnap} onCard={onCard} />);
    down(card());
    wait(300);
    up();
    fireEvent.click(card());
    expect(onSnap).not.toHaveBeenCalled();
    expect(onCard).not.toHaveBeenCalled();
    // Only that one: a later tap at min still returns to the teaser.
    wait(1);
    down(card(), 10);
    up(300, 200, 10);
    expect(onSnap).toHaveBeenCalledWith("teaser");
  });

  it("is armed on the card alone: not on a peek, not at the full snap", () => {
    const { unmount } = render(<Harness />);
    down(screen.getByRole("button", { name: "peek" }));
    wait(400);
    expect(lifted()).toBe(false);
    up();
    unmount();
    render(<Harness startFull />);
    down(card());
    wait(400);
    expect(lifted()).toBe(false);
    up();
  });

  it("is not armed under reduced motion (G7)", () => {
    const real = window.matchMedia;
    window.matchMedia = ((q: string) => ({ ...real(q), matches: q === "(prefers-reduced-motion: reduce)" })) as typeof window.matchMedia;
    try {
      const onPage = vi.fn();
      render(<Harness onPage={onPage} />);
      down(card(), 9, 700, 300);
      wait(400);
      expect(lifted()).toBe(false);
      // The press is still a swipe after any rest.
      moveTo(450, 302);
      moveTo(250, 305);
      up(250, 305);
      expect(onPage).toHaveBeenCalled();
    } finally {
      window.matchMedia = real;
    }
  });
});
