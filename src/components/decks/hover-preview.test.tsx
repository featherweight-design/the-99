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

  it("opens right of the pointer, vertically centred on it", () => {
    render(<Harness rows={[{ name: "a", imageUri: ART, box: LEFT_COLUMN }]} />);

    fireEvent.mouseEnter(screen.getByTestId("a"), { clientX: 300, clientY: 400 });
    act(() => void vi.advanceTimersByTime(240));

    // 300 + 18, and 400 − 176.
    expect(preview()?.style.left).toBe("318px");
    expect(preview()?.style.top).toBe("224px");
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
    render(<Harness rows={[{ name: "a", imageUri: ART, box: LEFT_COLUMN }]} />);

    fireEvent.mouseEnter(screen.getByTestId("a"), { clientX: 300, clientY: 10 });
    act(() => void vi.advanceTimersByTime(240));
    expect(preview()?.style.top).toBe("8px");

    fireEvent.mouseMove(screen.getByTestId("a"), { clientX: 300, clientY: 760 });
    flushFrames();
    // 768 − 352 − 8.
    expect(preview()?.style.top).toBe("408px");
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
    expect(preview()?.style.top).toBe("124px");
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
});
