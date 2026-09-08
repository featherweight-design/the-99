import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HoverPreviewProvider, usePreviewRow } from "./hover-preview";

const PANE = { top: 0, left: 0, right: 1200, bottom: 800, width: 1200, height: 800 };

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

function setPaneRect() {
  const pane = document.querySelector(".pane") as HTMLElement;
  pane.getBoundingClientRect = () => rect(PANE);
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

// A row in the left column: 252 + 14 of clear space to its left, so the box
// opens leftward.
const LEFT_COLUMN = rect({ left: 400, right: 700, top: 300, height: 34 });
// A row hard against the pane's left edge, which is what flips the box right.
const NO_ROOM = rect({ left: 10, right: 300, top: 300, height: 34 });

function preview() {
  return screen.queryByTestId("hover-preview");
}

describe("HoverPreviewProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setHover(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits 240ms before it opens", () => {
    render(<Harness rows={[{ name: "a", imageUri: ART, box: LEFT_COLUMN }]} />);
    setPaneRect();

    fireEvent.mouseEnter(screen.getByTestId("a"));
    act(() => void vi.advanceTimersByTime(239));
    expect(preview()).toBeNull();

    act(() => void vi.advanceTimersByTime(1));
    expect(preview()).not.toBeNull();
  });

  it("does not open when the pointer leaves inside the delay", () => {
    render(<Harness rows={[{ name: "a", imageUri: ART, box: LEFT_COLUMN }]} />);
    setPaneRect();

    fireEvent.mouseEnter(screen.getByTestId("a"));
    act(() => void vi.advanceTimersByTime(200));
    fireEvent.mouseLeave(screen.getByTestId("a"));
    act(() => void vi.advanceTimersByTime(1000));

    expect(preview()).toBeNull();
  });

  it("closes 80ms after the pointer leaves", () => {
    render(<Harness rows={[{ name: "a", imageUri: ART, box: LEFT_COLUMN }]} />);
    setPaneRect();

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
    setPaneRect();

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
    setPaneRect();

    fireEvent.mouseEnter(screen.getByTestId("a"));
    act(() => void vi.advanceTimersByTime(1000));

    expect(preview()).toBeNull();
  });

  it("stays shut for a card with no art", () => {
    render(<Harness rows={[{ name: "a", imageUri: null, box: LEFT_COLUMN }]} />);
    setPaneRect();

    fireEvent.mouseEnter(screen.getByTestId("a"));
    act(() => void vi.advanceTimersByTime(1000));

    expect(preview()).toBeNull();
  });

  it("opens left of the row, centred on it", () => {
    render(<Harness rows={[{ name: "a", imageUri: ART, box: LEFT_COLUMN }]} />);
    setPaneRect();

    fireEvent.mouseEnter(screen.getByTestId("a"));
    act(() => void vi.advanceTimersByTime(240));

    // 400 − 14 − 252, and 300 + 17 − 176.
    expect(preview()?.style.left).toBe("134px");
    expect(preview()?.style.top).toBe("141px");
  });

  it("flips right when the row has no room to its left", () => {
    render(<Harness rows={[{ name: "a", imageUri: ART, box: NO_ROOM }]} />);
    setPaneRect();

    fireEvent.mouseEnter(screen.getByTestId("a"));
    act(() => void vi.advanceTimersByTime(240));

    // 300 + 14.
    expect(preview()?.style.left).toBe("314px");
  });

  it("holds the box inside the pane at either end of the list", () => {
    render(
      <Harness
        rows={[
          { name: "top", imageUri: ART, box: rect({ left: 400, right: 700, top: 4, height: 34 }) },
          {
            name: "bottom",
            imageUri: ART,
            box: rect({ left: 400, right: 700, top: 780, height: 34 }),
          },
        ]}
      />,
    );
    setPaneRect();

    fireEvent.mouseEnter(screen.getByTestId("top"));
    act(() => void vi.advanceTimersByTime(240));
    expect(preview()?.style.top).toBe("0px");

    fireEvent.mouseLeave(screen.getByTestId("top"));
    fireEvent.mouseEnter(screen.getByTestId("bottom"));
    act(() => void vi.advanceTimersByTime(0));
    expect(preview()?.style.top).toBe("448px");
  });

  it("says nothing and shows nothing but the card", () => {
    render(<Harness rows={[{ name: "a", imageUri: ART, box: LEFT_COLUMN }]} />);
    setPaneRect();

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
