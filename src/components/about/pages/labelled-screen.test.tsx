import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HALO_REACH, PIN_GUTTER, PIN_SIZE, type ScreenModel } from "../../../lib/about/pins";
import { LabelledScreen } from "./labelled-screen";
import { PinDockProvider } from "./pin-dock";

// The labelled screen (About visual PR 3, Task 3.2; calls 0, 1 and 8): each width in its own tree behind `md`, no pins
// while a capture loads, and a press on a label or its pin lights the region, the pin and the line together.
// "three" runs the capture's full width from its left edge, as Recommended mix does (R4 board 2).
const model = (src: string, area = "a"): ScreenModel => ({
  shots: [
    {
      shot: { src, w: 780, h: 1688 },
      pins: [
        { key: `${area}/s/one`, n: 1, box: [0.1, 0.05, 0.3, 0.1] },
        { key: `${area}/s/two`, n: 2, box: [0.11, 0.06, 0.3, 0.1] },
        { key: `${area}/s/three`, n: 3, box: [0, 0.5, 1, 0.1] },
      ],
    },
  ],
  labels: [
    { key: `${area}/s/one`, n: 1, lead: "One", text: " is the first.", region: `${area}/s/one`, shot: 0 },
    { key: `${area}/s/two`, n: 2, lead: "Two", text: " is the second.", region: `${area}/s/two`, shot: 0 },
    { key: `${area}/s/three`, n: 3, lead: "Three", text: " is the third.", region: `${area}/s/three`, shot: 0 },
  ],
});

// jsdom lays nothing out: the frame's rendered size and its observer are stood in for. `W` is the picture's width.
let W = 388;
beforeEach(() => {
  W = 388;
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
    return this.hasAttribute("data-about-shot") ? W : 0;
  });
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function (this: HTMLElement) {
    return this.hasAttribute("data-about-shot") ? (W * 1688) / 780 : 0;
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const px = (el: Element) => [parseFloat((el as HTMLElement).style.left), parseFloat((el as HTMLElement).style.top)];

const draw = () => render(<LabelledScreen phone={model("/p.webp")} desktop={model("/d.webp")} />);

describe("LabelledScreen", () => {
  it("renders each width's own captures, the phone hidden from md and the desktop shown only from md", () => {
    const { container } = draw();
    const phone = container.querySelector("[data-about-width='phone']")!;
    const desk = container.querySelector("[data-about-width='desktop']")!;
    expect(phone.className).toMatch(/(^| )md:hidden( |$)/);
    expect(desk.className).toMatch(/(^| )hidden( |$)/);
    expect(desk.className).toMatch(/(^| )md:flex( |$)/);
    expect([...phone.querySelectorAll("img")].map((i) => i.getAttribute("src"))).toEqual(["/p.webp"]);
    expect([...desk.querySelectorAll("img")].map((i) => i.getAttribute("src"))).toEqual(["/d.webp"]);
    for (const img of container.querySelectorAll("img")) expect(img.getAttribute("loading")).toBe("lazy");
  });

  it("holds the frame at the capture's size with a skeleton and no pins until the capture loads; the labels read", () => {
    const { container } = draw();
    const frame = container.querySelector<HTMLElement>("[data-about-width='phone'] [data-about-shot]")!;
    expect(frame.style.aspectRatio).toBe("780 / 1688");
    const gutter = frame.parentElement!;
    expect(frame.querySelector("[data-about-skeleton]")).not.toBeNull();
    expect(gutter.querySelectorAll("[data-about-pin]")).toHaveLength(0);
    expect(container.querySelector("[data-about-width='phone'] [data-about-label='a/s/two']")!.textContent).toBe("2Two is the second.");
    fireEvent.load(frame.querySelector("img")!);
    expect(frame.querySelector("[data-about-skeleton]")).toBeNull();
    expect([...gutter.querySelectorAll("[data-about-pin]")].map((p) => p.textContent)).toEqual(["1", "2", "3"]);
  });

  it("a pressed label lights its region, its pin and its line; pressing it again puts them out", () => {
    const { container } = draw();
    const phone = container.querySelector<HTMLElement>("[data-about-width='phone']")!;
    fireEvent.load(phone.querySelector("img")!);
    const line = phone.querySelector<HTMLButtonElement>("[data-about-label='a/s/two'] button")!;
    fireEvent.click(line);
    expect(line.getAttribute("aria-pressed")).toBe("true");
    const halo = phone.querySelector<HTMLElement>("[data-about-halo]")!;
    expect(halo.getAttribute("data-about-halo")).toBe("a/s/two");
    // In the capture's pixels: 11% of 388.
    expect(halo.style.left).toBe("42.7px");
    expect(phone.querySelector("[data-about-pin='a/s/two']")!.hasAttribute("data-lit")).toBe(true);
    expect(phone.querySelector("[data-about-pin='a/s/one']")!.hasAttribute("data-lit")).toBe(false);
    fireEvent.click(line);
    expect(phone.querySelector("[data-about-halo]")).toBeNull();
  });

  it("a pressed pin lights its label's line", () => {
    const { container } = draw();
    const desk = container.querySelector<HTMLElement>("[data-about-width='desktop']")!;
    fireEvent.load(desk.querySelector("img")!);
    fireEvent.click(desk.querySelector("[data-about-pin='a/s/one']")!);
    expect(desk.querySelector("[data-about-label='a/s/one'] button")!.getAttribute("aria-pressed")).toBe("true");
    expect(desk.querySelector("[data-about-halo]")!.getAttribute("data-about-halo")).toBe("a/s/one");
  });
});

describe("LabelledScreen places pins at the picture's rendered size", () => {
  it("two crowding regions keep their pins 28px apart and on the picture at a narrow width", () => {
    for (const w of [388, 288]) {
      W = w;
      const { container, unmount } = draw();
      const phone = container.querySelector<HTMLElement>("[data-about-width='phone']")!;
      fireEvent.load(phone.querySelector("img")!);
      const [a, b] = [...phone.querySelectorAll("[data-about-pin]")].map(px);
      expect(Math.hypot(a[0] - b[0], a[1] - b[1]), `${w}px`).toBeGreaterThanOrEqual(27.9);
      for (const [x, y] of [a, b]) {
        expect(x).toBe(PIN_GUTTER / 2);
        expect(y).toBeGreaterThanOrEqual(12);
      }
      // The slid pin has its stub in the gutter; the first, on its own row, has none.
      expect(phone.querySelector("[data-about-stub='a/s/one']")).toBeNull();
      expect(phone.querySelector("[data-about-stub='a/s/two']")).not.toBeNull();
      unmount();
    }
  });

  it("draws no pin before the picture is measured", () => {
    W = 0;
    const { container } = draw();
    const phone = container.querySelector<HTMLElement>("[data-about-width='phone']")!;
    fireEvent.load(phone.querySelector("img")!);
    expect(phone.querySelectorAll("[data-about-pin]")).toHaveLength(0);
  });
});

describe("LabelledScreen draws pins in the gutter and the halo inside the frame (R4 boards 1 and 2)", () => {
  it("every pin's box lies wholly left of the frame's left edge, and each region has its brackets", () => {
    const { container } = draw();
    for (const w of ["phone", "desktop"]) {
      const width = container.querySelector<HTMLElement>(`[data-about-width='${w}']`)!;
      fireEvent.load(width.querySelector("img")!);
      const frame = width.querySelector<HTMLElement>("[data-about-shot]")!;
      const gutter = frame.parentElement!;
      // The frame is the gutter wrapper's only padded child: it starts at the 30px padding.
      expect(gutter.style.paddingLeft).toBe(`${PIN_GUTTER}px`);
      expect(frame.querySelectorAll("[data-about-pin]")).toHaveLength(0);
      for (const pin of gutter.querySelectorAll<HTMLElement>("[data-about-pin]")) {
        // A 24px disc centred at `left`, pulled half back by its negative margin.
        expect(parseFloat(pin.style.left) + PIN_SIZE / 2, w).toBeLessThanOrEqual(PIN_GUTTER);
        expect(parseFloat(pin.style.left) - PIN_SIZE / 2, w).toBeGreaterThanOrEqual(0);
        expect(pin.className).toContain("-ml-[12px]");
      }
      const brackets = [...gutter.querySelectorAll<HTMLElement>("[data-about-bracket]")];
      expect(brackets.map((b) => b.getAttribute("data-about-bracket"))).toEqual(["a/s/one", "a/s/two", "a/s/three"]);
      for (const b of brackets) {
        expect(parseFloat(b.style.left)).toBeGreaterThanOrEqual(PIN_GUTTER);
        expect(b.querySelectorAll("i")).toHaveLength(4);
        expect(b.className).toContain("pointer-events-none");
      }
    }
  });

  it("a lit edge-touching region's halo sits 8px inside the frame on all four sides", () => {
    const { container } = draw();
    const desk = container.querySelector<HTMLElement>("[data-about-width='desktop']")!;
    fireEvent.load(desk.querySelector("img")!);
    fireEvent.click(desk.querySelector("[data-about-label='a/s/three'] button")!);
    const halo = desk.querySelector<HTMLElement>("[data-about-halo]")!;
    const [x, y, w, h] = ["left", "top", "width", "height"].map((k) => parseFloat(halo.style.getPropertyValue(k)));
    const H = (W * 1688) / 780;
    expect(x).toBe(HALO_REACH);
    expect(y).toBeGreaterThanOrEqual(HALO_REACH);
    expect(x + w).toBeCloseTo(W - HALO_REACH, 1);
    expect(y + h).toBeLessThanOrEqual(H - HALO_REACH);
    // Inside the clipped frame, not the gutter.
    expect(halo.parentElement!.hasAttribute("data-about-shot")).toBe(true);
    expect(desk.querySelector("[data-about-bracket='a/s/three']")!.hasAttribute("data-lit")).toBe(true);
  });
});

describe("LabelledScreen docks a pressed pin's label on a phone (R4 board 3)", () => {
  const phoneOf = (c: HTMLElement) => {
    const phone = c.querySelector<HTMLElement>("[data-about-width='phone']")!;
    fireEvent.load(phone.querySelector("img")!);
    return phone;
  };
  const pin = (root: HTMLElement, key: string) => fireEvent.click(root.querySelector(`[data-about-pin='${key}']`)!);

  it("a pin press docks its label's number, lead and words; the same pin again puts out the dock and the halo", () => {
    const { container } = draw();
    const phone = phoneOf(container);
    pin(phone, "a/s/two");
    const dock = container.querySelector<HTMLElement>("[data-about-dock]")!;
    expect(dock.getAttribute("data-about-dock")).toBe("a/s/two");
    expect(dock.textContent).toBe("2Two is the second.✕");
    expect(dock.querySelector("b")!.textContent).toBe("Two");
    expect(dock.className).toMatch(/(^| )md:hidden( |$)/);
    expect(dock.className).toMatch(/(^| )fixed( |$)/);
    expect(dock.className).toContain("z-[34]");
    expect(dock.className).toContain("bottom-[calc(var(--tabbar-h)+12px)]");
    expect(dock.className).toContain("max-h-[40dvh]");
    expect(phone.querySelector("[data-about-halo]")!.getAttribute("data-about-halo")).toBe("a/s/two");
    pin(phone, "a/s/two");
    expect(container.querySelector("[data-about-dock]")).toBeNull();
    expect(phone.querySelector("[data-about-halo]")).toBeNull();
  });

  it("another pin swaps the dock", () => {
    const { container } = draw();
    const phone = phoneOf(container);
    pin(phone, "a/s/one");
    pin(phone, "a/s/three");
    expect([...container.querySelectorAll("[data-about-dock]")].map((d) => d.getAttribute("data-about-dock"))).toEqual(["a/s/three"]);
    expect(phone.querySelector("[data-about-halo]")!.getAttribute("data-about-halo")).toBe("a/s/three");
  });

  it("the ✕, named Close, puts out dock and halo and hands focus to the label's line without scrolling", () => {
    const { container, getByRole } = draw();
    const phone = phoneOf(container);
    pin(phone, "a/s/two");
    const line = phone.querySelector<HTMLButtonElement>("[data-about-label='a/s/two'] button[aria-pressed]")!;
    const focus = vi.spyOn(line, "focus");
    const close = getByRole("button", { name: "Close" });
    close.focus();
    fireEvent.click(close);
    expect(container.querySelector("[data-about-dock]")).toBeNull();
    expect(phone.querySelector("[data-about-halo]")).toBeNull();
    expect(document.activeElement).toBe(line);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("a label line lights its region but never docks", () => {
    const { container } = draw();
    const phone = phoneOf(container);
    fireEvent.click(phone.querySelector("[data-about-label='a/s/one'] button")!);
    expect(phone.querySelector("[data-about-halo]")).not.toBeNull();
    expect(container.querySelector("[data-about-dock]")).toBeNull();
    // A docked label's line pressed takes the dock away with its region.
    pin(phone, "a/s/two");
    fireEvent.click(phone.querySelector("[data-about-label='a/s/two'] button")!);
    expect(container.querySelector("[data-about-dock]")).toBeNull();
    expect(phone.querySelector("[data-about-halo]")).toBeNull();
  });

  it("one dock a page: a pin in a second section takes the first section's dock and halo away", () => {
    const { container } = render(
      <PinDockProvider>
        <section data-s="one">
          <LabelledScreen phone={model("/p1.webp", "a")} desktop={model("/d1.webp", "a")} />
        </section>
        <section data-s="two">
          <LabelledScreen phone={model("/p2.webp", "b")} desktop={model("/d2.webp", "b")} />
        </section>
      </PinDockProvider>,
    );
    const first = phoneOf(container.querySelector<HTMLElement>("[data-s='one']")!);
    const second = phoneOf(container.querySelector<HTMLElement>("[data-s='two']")!);
    pin(first, "a/s/one");
    expect(first.querySelector("[data-about-dock]")).not.toBeNull();
    pin(second, "b/s/two");
    expect([...container.querySelectorAll("[data-about-dock]")].map((d) => d.getAttribute("data-about-dock"))).toEqual(["b/s/two"]);
    expect(first.querySelector("[data-about-halo]")).toBeNull();
    expect(second.querySelector("[data-about-halo]")).not.toBeNull();
    // And back: the first takes it again from the second.
    pin(first, "a/s/three");
    expect([...container.querySelectorAll("[data-about-dock]")].map((d) => d.getAttribute("data-about-dock"))).toEqual(["a/s/three"]);
    expect(second.querySelector("[data-about-halo]")).toBeNull();
  });

  // Small items 3 item 6 (board Dock-Low-Region): jsdom lays nothing out, so the boxes the dock reads are stood in for.
  // A 390x844 phone: the dock at the foot spans 658..758; "two" is lit high, "three" low; `top` is the bar's bottom.
  describe("a low region gets the dock at the top", () => {
    const stage = (boxes: { two: number[]; three: number[]; bar?: number[]; back?: number[] | "undrawn" }) => {
      const bar = document.createElement("header");
      bar.setAttribute("data-quick-return", "page");
      document.body.appendChild(bar);
      const back = document.createElement("div");
      back.setAttribute("data-about-back", "");
      if (boxes.back) document.body.appendChild(back);
      vi.spyOn(HTMLElement.prototype, "getClientRects").mockImplementation(function (this: HTMLElement) {
        return (this === back && boxes.back === "undrawn" ? [] : [{}]) as unknown as DOMRectList;
      });
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
        const edges = (e: number[]) => ({ top: e[0], bottom: e[1], left: 0, right: 0, width: 0, height: e[1] - e[0], x: 0, y: e[0] }) as DOMRect;
        if (this.hasAttribute("data-about-dock")) return edges([658, 758]);
        if (this === bar) return edges(boxes.bar ?? [0, 79]);
        if (this === back && Array.isArray(boxes.back)) return edges(boxes.back);
        if (this === back) return edges([79, 200]);
        const halo = this.dataset.aboutHalo;
        if (halo === "a/s/two") return edges(boxes.two);
        if (halo === "a/s/three") return edges(boxes.three);
        return edges([0, 0]);
      });
      // A second stage in one test re-aims the same spies (afterEach restores them).
      return () => {
        bar.remove();
        back.remove();
      };
    };
    const dockOf = (c: HTMLElement) => c.querySelector<HTMLElement>("[data-about-dock]")!;

    it("keeps the foot for a region above the foot dock's top edge", () => {
      const done = stage({ two: [300, 340], three: [700, 730] });
      const { container } = draw();
      pin(phoneOf(container), "a/s/two");
      expect(dockOf(container).getAttribute("data-about-dock-at")).toBe("foot");
      expect(dockOf(container).style.top).toBe("");
      done();
    });

    it("docks a low region's label 12px under the header, and another tap decides again", () => {
      const done = stage({ two: [300, 340], three: [700, 730] });
      const { container } = draw();
      const phone = phoneOf(container);
      pin(phone, "a/s/three");
      expect(dockOf(container).getAttribute("data-about-dock-at")).toBe("top");
      expect(dockOf(container).style.top).toBe("91px");
      expect(dockOf(container).style.bottom).toBe("auto");
      // Same look, gutters and close: only its edge moves.
      expect(dockOf(container).className).toContain("left-[12px] right-[12px]");
      expect(dockOf(container).querySelector("[data-about-dock-close]")).not.toBeNull();
      pin(phone, "a/s/two");
      expect(dockOf(container).getAttribute("data-about-dock")).toBe("a/s/two");
      expect(dockOf(container).getAttribute("data-about-dock-at")).toBe("foot");
      expect(dockOf(container).style.top).toBe("");
      done();
    });

    it("sits under the back bar when it shows, and passes over one that is not drawn", () => {
      const done = stage({ two: [300, 340], three: [700, 730], back: [79, 125] });
      const { container, unmount } = draw();
      pin(phoneOf(container), "a/s/three");
      expect(dockOf(container).style.top).toBe("137px");
      unmount();
      done();
      // A bar that is not drawn (no box) holds nothing: the header's edge wins.
      const done2 = stage({ two: [300, 340], three: [700, 730], back: "undrawn" });
      const again = draw();
      pin(phoneOf(again.container), "a/s/three");
      expect(dockOf(again.container).style.top).toBe("91px");
      done2();
    });

    it("sits 12px from the screen's top when the quick-return header has gone away", () => {
      const done = stage({ two: [300, 340], three: [700, 730], bar: [-79, 0] });
      const { container } = draw();
      pin(phoneOf(container), "a/s/three");
      expect(dockOf(container).style.top).toBe("12px");
      done();
    });

    it("keeps the foot for a region so tall the top dock would cover it too", () => {
      const done = stage({ two: [300, 340], three: [120, 760] });
      const { container } = draw();
      pin(phoneOf(container), "a/s/three");
      expect(dockOf(container).getAttribute("data-about-dock-at")).toBe("foot");
      done();
    });
  });

  it("desktop never docks", () => {
    const { container } = draw();
    const desk = container.querySelector<HTMLElement>("[data-about-width='desktop']")!;
    fireEvent.load(desk.querySelector("img")!);
    pin(desk, "a/s/one");
    expect(desk.querySelector("[data-about-halo]")).not.toBeNull();
    expect(container.querySelector("[data-about-dock]")).toBeNull();
  });
});
