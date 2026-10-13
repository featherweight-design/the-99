import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARRIVAL_STAGGER_MS, ArrivalOrder } from "./arrival-queue";
import { ArrivingArt } from "./art-wash-near";
import { FadingImg } from "./hydrated-art";

// The queue reads boxes off the page, and jsdom lays nothing out: each element's row is its
// `data-row` (or its wrapper's), 300px apart, and every element has a box.
const RealImage = window.Image;
let probes: HTMLImageElement[] = [];
beforeEach(() => {
  vi.useFakeTimers();
  probes = [];
  vi.stubGlobal("Image", function () {
    const img = new RealImage();
    Object.defineProperty(img, "complete", { value: false, configurable: true });
    probes.push(img);
    return img;
  });
  vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(false);
  vi.spyOn(Element.prototype, "getClientRects").mockReturnValue([{}] as unknown as DOMRectList);
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const top = Number(this.getAttribute("data-row") ?? this.parentElement?.getAttribute("data-row") ?? 0) * 300;
    return { top, bottom: top + 280, left: 0, right: 200, width: 200, height: 280, x: 0, y: top, toJSON() {} } as DOMRect;
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const land = (img: HTMLImageElement) => act(() => { img.dispatchEvent(new Event("load")); });
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

describe("ArrivalOrder", () => {
  it("holds a lower row's <img> art until the row above lands, then fades both in order", () => {
    const { container } = render(
      <ArrivalOrder>
        <FadingImg data-row="0" src="https://img/a.jpg" />
        <FadingImg data-row="1" src="https://img/b.jpg" />
      </ArrivalOrder>,
    );
    const [upper, lower] = [...container.querySelectorAll("img")];
    expect(upper.dataset.arrival).toBe("pending");
    land(lower);
    expect(lower.dataset.arrival).toBe("pending");
    land(upper);
    expect(upper.dataset.arrival).toBe("in");
    expect(lower.dataset.arrival).toBe("pending");
    advance(ARRIVAL_STAGGER_MS);
    expect(lower.dataset.arrival).toBe("in");
  });

  it("holds a lower row's art-wash layer until the row above lands", () => {
    const { container } = render(
      <ArrivalOrder>
        <div data-row="0"><ArrivingArt src="https://img/a.jpg" className="art" style={{}} /></div>
        <div data-row="1"><ArrivingArt src="https://img/b.jpg" className="art" style={{}} /></div>
      </ArrivalOrder>,
    );
    const [upper, lower] = [...container.querySelectorAll<HTMLElement>(".art")];
    land(probes[1]);
    expect(lower.dataset.arrival).toBe("pending");
    land(probes[0]);
    expect(upper.dataset.arrival).toBe("in");
    advance(ARRIVAL_STAGGER_MS);
    expect(lower.dataset.arrival).toBe("in");
  });
});
