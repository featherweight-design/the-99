import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScreenModel } from "../../../lib/about/pins";
import { LabelledScreen } from "./labelled-screen";

// The labelled screen (About visual PR 3, Task 3.2; calls 0, 1 and 8): each width in its own tree behind `md`, no pins
// while a capture loads, and a press on a label or its pin lights the region, the pin and the line together.
const model = (src: string): ScreenModel => ({
  shots: [
    {
      shot: { src, w: 780, h: 1688 },
      pins: [
        { key: "a/s/one", n: 1, box: [0.1, 0.05, 0.3, 0.1] },
        { key: "a/s/two", n: 2, box: [0.11, 0.06, 0.3, 0.1] },
      ],
    },
  ],
  labels: [
    { key: "a/s/one", n: 1, lead: "One", text: " is the first.", region: "a/s/one", shot: 0 },
    { key: "a/s/two", n: 2, lead: "Two", text: " is the second.", region: "a/s/two", shot: 0 },
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
    expect(frame.querySelector("[data-about-skeleton]")).not.toBeNull();
    expect(frame.querySelectorAll("[data-about-pin]")).toHaveLength(0);
    expect(container.querySelector("[data-about-width='phone'] [data-about-label='a/s/two']")!.textContent).toBe("2Two is the second.");
    fireEvent.load(frame.querySelector("img")!);
    expect(frame.querySelector("[data-about-skeleton]")).toBeNull();
    expect([...frame.querySelectorAll("[data-about-pin]")].map((p) => p.textContent)).toEqual(["1", "2"]);
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
    expect(halo.style.left).toBe("11%");
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
        expect(x).toBeGreaterThanOrEqual(12);
        expect(x).toBeLessThanOrEqual(w - 12);
        expect(y).toBeGreaterThanOrEqual(12);
      }
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
