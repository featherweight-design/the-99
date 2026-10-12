import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NearViewportArt } from "./art-wash-near";

let observed: { el: Element; cb: IntersectionObserverCallback }[] = [];
class FakeObserver {
  constructor(private cb: IntersectionObserverCallback) {}
  observe(el: Element) {
    observed.push({ el, cb: this.cb });
  }
  disconnect() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
}
const bringIntoView = () =>
  act(() => {
    for (const { el, cb } of observed) cb([{ isIntersecting: true, target: el } as IntersectionObserverEntry], {} as IntersectionObserver);
  });

// The stand-in Image each layer preloads, so a test can land it.
let probes: HTMLImageElement[] = [];
const RealImage = window.Image;
beforeEach(() => {
  observed = [];
  probes = [];
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  vi.stubGlobal("Image", function () {
    const img = new RealImage();
    // jsdom loads nothing: the crop is still on its way when the layer arms.
    Object.defineProperty(img, "complete", { value: false, configurable: true });
    probes.push(img);
    return img;
  });
});
afterEach(() => vi.unstubAllGlobals());

const SRC = "https://cards.scryfall.io/art_crop/front/a/b/ab.jpg";

describe("NearViewportArt", () => {
  it("asks for its crop near the viewport, held pending until the crop lands, then fades in", () => {
    const { container } = render(<NearViewportArt src={SRC} className="art" style={{ opacity: 0.8 }} />);
    const layer = container.firstElementChild as HTMLElement;
    expect(layer.style.backgroundImage).toBe("");
    expect(layer.dataset.art).toBeUndefined();
    bringIntoView();
    expect(layer.style.backgroundImage).toContain(SRC);
    expect(probes.map((p) => p.src)).toEqual([SRC]);
    expect(layer.dataset.art).toBe("pending");
    act(() => void probes[0].dispatchEvent(new Event("load")));
    expect(layer.dataset.art).toBe("in");
  });
});
