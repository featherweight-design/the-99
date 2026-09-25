import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HoverPreviewProvider, usePreviewRow } from "./hover-preview";

function rect(r: Partial<DOMRect> & { left: number; right: number; top: number; height: number }) {
  return { ...r, width: r.right - r.left, bottom: r.top + r.height } as DOMRect;
}

/** A pane and two rows, each measuring wherever the test says it sits. */
function Harness({
  rows,
}: {
  rows: Array<{ name: string; imageUri: string | null; box: DOMRect }>;
}) {
  return (
    <HoverPreviewProvider className="pane">
      {rows.map((r) => (
        <Row key={r.name} name={r.name} imageUri={r.imageUri} box={r.box} />
      ))}
    </HoverPreviewProvider>
  );
}

function Row({
  name,
  imageUri,
  box,
}: {
  name: string;
  imageUri: string | null;
  box: DOMRect;
}) {
  const handlers = usePreviewRow(imageUri);
  return (
    <div
      {...handlers}
      data-testid={name}
      ref={(node) => {
        if (node) node.getBoundingClientRect = () => box;
      }}
    />
  );
}

function setHover(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query === "(hover: hover)" ? matches : false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

const ART = "https://cards.example/sol-ring.jpg";
const ART_2 = "https://cards.example/arcane-signet.jpg";

// Any row: the box is placed against the POINTER now, so a row's own rect no
// longer decides where it goes. Kept because `usePreviewRow` still measures
// nothing and the harness still needs a box to stub.
const LEFT_COLUMN = rect({ left: 400, right: 700, top: 300, height: 34 });

function preview() {
  return screen.queryByTestId("hover-preview");
}

const frames = { value: 0, queue: [] as FrameRequestCallback[] };

/** Runs every frame the provider has asked for, in order. */
function flushFrames() {
  const due = frames.queue.splice(0, frames.queue.length);
  act(() => {
    for (const cb of due) cb(0);
  });
}

describe("HoverPreviewProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setHover(true);
    frames.value = 0;
    frames.queue = [];
    // Stubbed rather than faked through the timer mock: these tests assert HOW
    // MANY frames were asked for, which is the coalescing rule, and that count
    // has to be observable.
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      frames.value += 1;
      frames.queue.push(cb);
      return frames.value;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("waits 240ms before it opens", () => {
    render(<Harness rows={[{ name: "a", imageUri: ART, box: LEFT_COLUMN }]} />);

    fireEvent.mouseEnter(screen.getByTestId("a"));
    act(() => void vi.advanceTimersByTime(239));
    expect(preview()).toBeNull();

    act(() => void vi.advanceTimersByTime(1));
    expect(preview()).not.toBeNull();
  });

  it("does not open when the pointer leaves inside the delay", () => {
    render(<Harness rows={[{ name: "a", imageUri: ART, box: LEFT_COLUMN }]} />);

    fireEvent.mouseEnter(screen.getByTestId("a"));
    act(() => void vi.advanceTimersByTime(200));
    fireEvent.mouseLeave(screen.getByTestId("a"));
    act(() => void vi.advanceTimersByTime(1000));

    expect(preview()).toBeNull();
  });

  it("closes 80ms after the pointer leaves", () => {
    render(<Harness rows={[{ name: "a", imageUri: ART, box: LEFT_COLUMN }]} />);

    fireEvent.mouseEnter(screen.getByTestId("a"));
    act(() => void vi.advanceTimersByTime(240));
    fireEvent.mouseLeave(screen.getByTestId("a"));

    act(() => void vi.advanceTimersByTime(79));
    expect(preview()).not.toBeNull();

    act(() => void vi.advanceTimersByTime(1));
    expect(preview()).toBeNull();
  });

  it("swaps cards with no delay while it is already open", () => {
    render(
      <Harness
        rows={[
          { name: "a", imageUri: ART, box: LEFT_COLUMN },
          { name: "b", imageUri: ART_2, box: LEFT_COLUMN },
        ]}
      />,
    );

    fireEvent.mouseEnter(screen.getByTestId("a"));
    act(() => void vi.advanceTimersByTime(240));
    expect(preview()?.style.background).toContain(ART);

    // The leave and the next enter are one gesture, and the close is still
    // pending when the second row reports hover.
    fireEvent.mouseLeave(screen.getByTestId("a"));
    fireEvent.mouseEnter(screen.getByTestId("b"));
    act(() => void vi.advanceTimersByTime(0));

    expect(preview()?.style.background).toContain(ART_2);
  });

  it("stays shut on a device with no hover", () => {
    setHover(false);
    render(<Harness rows={[{ name: "a", imageUri: ART, box: LEFT_COLUMN }]} />);

    fireEvent.mouseEnter(screen.getByTestId("a"));
    act(() => void vi.advanceTimersByTime(1000));

    expect(preview()).toBeNull();
  });

  it("stays shut for a card with no art", () => {
    render(<Harness rows={[{ name: "a", imageUri: null, box: LEFT_COLUMN }]} />);

    fireEvent.mouseEnter(screen.getByTestId("a"));
    act(() => void vi.advanceTimersByTime(1000));

    expect(preview()).toBeNull();
  });

  it("opens right of the pointer and below it, where the box fits under it", () => {
    render(<Harness rows={[{ name: "a", imageUri: ART, box: LEFT_COLUMN }]} />);

    fireEvent.mouseEnter(screen.getByTestId("a"), { clientX: 300, clientY: 200 });
    act(() => void vi.advanceTimersByTime(240));

    // 300 + 18, and 200 + 18. In a 768px window 218 + 352 + 8 is 578, so it fits.
    expect(preview()?.style.left).toBe("318px");
    expect(preview()?.style.top).toBe("218px");
  });

  it("flips above the pointer when the box does not fit under it", () => {
    // The vertical twin of the edge flip: one relationship to the pointer at
    // every height, rather than a centred box that the clamp slid around.
    render(<Harness rows={[{ name: "a", imageUri: ART, box: LEFT_COLUMN }]} />);

    fireEvent.mouseEnter(screen.getByTestId("a"), { clientX: 300, clientY: 400 });
    act(() => void vi.advanceTimersByTime(240));

    // 418 + 352 + 8 is 778, past the 768px window, so 400 − 18 − 352.
    expect(preview()?.style.top).toBe("30px");
  });

  it("puts the flip at the last y that fits, and not before it", () => {
    // y + GUTTER + HEIGHT + MARGIN <= 768 makes 390 the last downward cursor:
    // 768 − 352 − 8 − 18. One pixel further and the box moves 387px, which is
    // the jump a boundary written the wrong way round would hide.
    render(<Harness rows={[{ name: "a", imageUri: ART, box: LEFT_COLUMN }]} />);

    fireEvent.mouseEnter(screen.getByTestId("a"), { clientX: 300, clientY: 390 });
    act(() => void vi.advanceTimersByTime(240));
    expect(preview()?.style.top).toBe("408px");

    fireEvent.mouseMove(screen.getByTestId("a"), { clientX: 300, clientY: 391 });
    flushFrames();
    expect(preview()?.style.top).toBe("21px");
  });

  it("flips left of the pointer at the window's right edge", () => {
    // A fixed box is bounded by the WINDOW, not by the list: the pane stopped
    // bounding it when the box started following the pointer.
    render(<Harness rows={[{ name: "a", imageUri: ART, box: LEFT_COLUMN }]} />);

    fireEvent.mouseEnter(screen.getByTestId("a"), { clientX: 1000, clientY: 400 });
    act(() => void vi.advanceTimersByTime(240));

    // 1018 + 252 + 8 is past 1024, so 1000 − 18 − 252.
    expect(preview()?.style.left).toBe("730px");
  });

  it("holds the box inside the window at either end", () => {
    // The clamp survives the below-or-above rule, because neither side fits for
    // a cursor close enough to an edge: above it at y=10 would be −360.
    render(<Harness rows={[{ name: "a", imageUri: ART, box: LEFT_COLUMN }]} />);

    fireEvent.mouseEnter(screen.getByTestId("a"), { clientX: 300, clientY: 10 });
    act(() => void vi.advanceTimersByTime(240));
    // 10 + 18 fits under a 768px window, so this one is the rule rather than the
    // clamp — and it is 20px clear of the clamp's own 8px floor.
    expect(preview()?.style.top).toBe("28px");

    fireEvent.mouseMove(screen.getByTestId("a"), { clientX: 300, clientY: 760 });
    flushFrames();
    // Above: 760 − 18 − 352 = 390, inside the window and under the 408px ceiling.
    expect(preview()?.style.top).toBe("390px");

    // A window shorter than the box has no side that fits, and the clamp is what
    // stops the box hanging off the top.
    const height = window.innerHeight;
    Object.defineProperty(window, "innerHeight", { value: 300, configurable: true });
    fireEvent.mouseMove(screen.getByTestId("a"), { clientX: 300, clientY: 280 });
    flushFrames();
    expect(preview()?.style.top).toBe("8px");
    Object.defineProperty(window, "innerHeight", { value: height, configurable: true });
  });

  it("follows the pointer while it is open", () => {
    // The whole point: the box is beside what the reader is looking at, and
    // never on top of it.
    render(<Harness rows={[{ name: "a", imageUri: ART, box: LEFT_COLUMN }]} />);

    fireEvent.mouseEnter(screen.getByTestId("a"), { clientX: 300, clientY: 400 });
    act(() => void vi.advanceTimersByTime(240));
    expect(preview()?.style.left).toBe("318px");

    fireEvent.mouseMove(screen.getByTestId("a"), { clientX: 500, clientY: 300 });
    flushFrames();

    expect(preview()?.style.left).toBe("518px");
    // 300 + 18: still under the cursor, because 318 + 352 + 8 fits in 768.
    expect(preview()?.style.top).toBe("318px");
  });

  it("writes once per frame however often the pointer reports", () => {
    // A pointer reports far more often than the screen refreshes, and each extra
    // write is a layout the browser throws away — on a list that can run to
    // hundreds of rows.
    render(<Harness rows={[{ name: "a", imageUri: ART, box: LEFT_COLUMN }]} />);

    fireEvent.mouseEnter(screen.getByTestId("a"), { clientX: 300, clientY: 400 });
    act(() => void vi.advanceTimersByTime(240));

    frames.value = 0;
    for (let i = 0; i < 20; i++) {
      fireEvent.mouseMove(screen.getByTestId("a"), { clientX: 300 + i, clientY: 400 });
    }
    expect(frames.value).toBe(1);

    flushFrames();
    // The LAST position, not the first: the frame reads where the pointer is
    // when it runs, not where it was when the frame was asked for.
    expect(preview()?.style.left).toBe("337px");
  });

  it("opens where the pointer IS, not where it entered", () => {
    // A reader who sets off down the list during the 240ms does not want the box
    // at the point they crossed the row's edge.
    render(<Harness rows={[{ name: "a", imageUri: ART, box: LEFT_COLUMN }]} />);

    fireEvent.mouseEnter(screen.getByTestId("a"), { clientX: 300, clientY: 400 });
    fireEvent.mouseMove(screen.getByTestId("a"), { clientX: 600, clientY: 400 });
    act(() => void vi.advanceTimersByTime(240));

    expect(preview()?.style.left).toBe("618px");
  });


  it("says nothing and shows nothing but the card", () => {
    render(<Harness rows={[{ name: "a", imageUri: ART, box: LEFT_COLUMN }]} />);

    fireEvent.mouseEnter(screen.getByTestId("a"));
    act(() => void vi.advanceTimersByTime(240));

    const box = preview() as HTMLElement;
    expect(box).toHaveAttribute("aria-hidden", "true");
    expect(box).not.toHaveAttribute("title");
    expect(box.textContent).toBe("");
    expect(box.className).toContain("pointer-events-none");
    // Desktop only in CSS as well as in script: a hover-capable narrow window
    // would otherwise paint a 252px box over a 390px list.
    expect(box.className).toContain("hidden");
    expect(box.className).toContain("md:block");
  });
  // The layer. A row on the page previews UNDER the z-50 sheets, so the card modal a row press
  // opens covers a box the pointer has not yet closed. A name inside a sheet previews ABOVE it.
  it("draws under the sheets for a row on the page", () => {
    render(<Harness rows={[{ name: "a", imageUri: ART, box: LEFT_COLUMN }]} />);
    fireEvent.mouseEnter(screen.getByTestId("a"));
    act(() => void vi.advanceTimersByTime(240));
    const box = screen.getByTestId("hover-preview");
    expect(box.className).toContain("z-40");
    expect(box.className).not.toContain("z-[60]");
  });

  it("draws above the sheet for a name inside a dialog", () => {
    render(
      <HoverPreviewProvider>
        <div role="dialog">
          <Row name="a" imageUri={ART} box={LEFT_COLUMN} />
        </div>
      </HoverPreviewProvider>,
    );
    fireEvent.mouseEnter(screen.getByTestId("a"));
    act(() => void vi.advanceTimersByTime(240));
    expect(screen.getByTestId("hover-preview").className).toContain("z-[60]");
  });

  // The preload. The box's 240ms is a deliberate calm, but before this the
  // `background: url(…)` was only set when the box mounted, so the REQUEST could
  // not start until the calm was over and the reader paid delay-then-fetch in
  // series. These cases pin when the bytes are asked for, which is the only
  // thing that changed — nothing about what is drawn.
  describe("image preload", () => {
    /** Every `new Image()` this render made, by src, with the order preserved. */
    function trackImages() {
      const made: string[] = [];
      const Original = window.Image;
      class Spy {
        decoding = "";
        set src(v: string) {
          made.push(v);
        }
      }
      // @ts-expect-error — a stand-in for the constructor, narrower than the DOM's
      window.Image = Spy;
      return {
        made,
        restore: () => {
          window.Image = Original;
        },
      };
    }

    it("asks for the image before the box appears", () => {
      const spy = trackImages();
      try {
        render(<Harness rows={[{ name: "a", imageUri: ART, box: LEFT_COLUMN }]} />);
        fireEvent.mouseEnter(screen.getByTestId("a"));
        // Past the preload, short of the box.
        act(() => void vi.advanceTimersByTime(50));
        expect(spy.made).toEqual([ART]);
        expect(screen.queryByTestId("hover-preview")).toBeNull();
        // And the box still arrives on its own schedule, unchanged.
        act(() => void vi.advanceTimersByTime(190));
        expect(screen.getByTestId("hover-preview")).toBeTruthy();
      } finally {
        spy.restore();
      }
    });

    // The cost of the win, and the bound on it: `mouseenter` fires for every row
    // a pointer brushes, so a scan down 99 rows must not ask for 99 images.
    it("asks for nothing when a row is crossed in passing", () => {
      const spy = trackImages();
      try {
        render(
          <Harness
            rows={[
              { name: "a", imageUri: ART, box: LEFT_COLUMN },
              { name: "b", imageUri: `${ART}?b`, box: LEFT_COLUMN },
            ]}
          />,
        );
        fireEvent.mouseEnter(screen.getByTestId("a"));
        act(() => void vi.advanceTimersByTime(30));
        fireEvent.mouseEnter(screen.getByTestId("b"));
        act(() => void vi.advanceTimersByTime(30));
        // Neither row was rested on long enough to be worth 93KB.
        expect(spy.made).toEqual([]);
        // The row the pointer actually settles on is the one that is fetched.
        act(() => void vi.advanceTimersByTime(30));
        expect(spy.made).toEqual([`${ART}?b`]);
      } finally {
        spy.restore();
      }
    });

    it("asks once for a row the pointer returns to", () => {
      const spy = trackImages();
      try {
        render(<Harness rows={[{ name: "a", imageUri: ART, box: LEFT_COLUMN }]} />);
        fireEvent.mouseEnter(screen.getByTestId("a"));
        act(() => void vi.advanceTimersByTime(60));
        fireEvent.mouseLeave(screen.getByTestId("a"));
        act(() => void vi.advanceTimersByTime(200));
        fireEvent.mouseEnter(screen.getByTestId("a"));
        act(() => void vi.advanceTimersByTime(60));
        expect(spy.made).toEqual([ART]);
      } finally {
        spy.restore();
      }
    });
  });
});
