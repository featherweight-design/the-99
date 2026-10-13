import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ArrivingArt, NearViewportArt } from "./art-wash-near";

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
    expect(layer.dataset.arrival).toBeUndefined();
    bringIntoView();
    expect(layer.style.backgroundImage).toContain(SRC);
    expect(probes.map((p) => p.src)).toEqual([SRC]);
    expect(layer.dataset.arrival).toBe("pending");
    act(() => void probes[0].dispatchEvent(new Event("load")));
    expect(layer.dataset.arrival).toBe("in");
  });

  it("fades an eager crop in too: drawn at once, held only while its bytes are on their way", () => {
    const { container } = render(<ArrivingArt src={SRC} className="art" style={{ opacity: 0.8 }} />);
    const layer = container.firstElementChild as HTMLElement;
    expect(layer.style.backgroundImage).toContain(SRC);
    expect(observed).toHaveLength(0);
    expect(layer.dataset.arrival).toBe("pending");
    act(() => void probes[0].dispatchEvent(new Event("load")));
    expect(layer.dataset.arrival).toBe("in");
  });

  it("draws a crop it has already asked for at once, so a list restored by Back never blanks it", () => {
    const seen = "https://cards.scryfall.io/art_crop/front/c/d/cd.jpg";
    const first = render(<NearViewportArt src={seen} className="art" style={{}} />);
    bringIntoView();
    expect((first.container.firstElementChild as HTMLElement).style.backgroundImage).toContain(seen);
    first.unmount();
    observed = [];
    const again = render(<NearViewportArt src={seen} className="art" style={{}} />);
    expect((again.container.firstElementChild as HTMLElement).style.backgroundImage).toContain(seen);
    expect(observed).toHaveLength(0);
  });
});

describe("ArtWash, cover band", () => {
  it("defers its crop when asked, a screen ahead of the viewport", async () => {
    const { ArtWash } = await import("./art-wash");
    const crop = "https://cards.scryfall.io/art_crop/front/e/f/ef.jpg";
    let margin: string | undefined;
    vi.stubGlobal("IntersectionObserver", class extends FakeObserver {
      constructor(cb: IntersectionObserverCallback, opts?: IntersectionObserverInit) {
        super(cb);
        margin = opts?.rootMargin;
      }
    });
    const { container } = render(<ArtWash strategy="cover" height={248} labelAtPx={46} artCropUri={crop} colorIdentity={[]} deferArt />);
    const layer = container.querySelector(".art-wash-art") as HTMLElement;
    expect(layer.style.backgroundImage).toBe("");
    expect(margin).toBe("100% 0px");
    bringIntoView();
    expect(layer.style.backgroundImage).toContain(crop);
  });

  it("draws its crop at once when not deferred", async () => {
    const { ArtWash } = await import("./art-wash");
    const crop = "https://cards.scryfall.io/art_crop/front/1/2/12.jpg";
    const { container } = render(<ArtWash strategy="cover" height={248} labelAtPx={46} artCropUri={crop} colorIdentity={[]} />);
    expect((container.querySelector(".art-wash-art") as HTMLElement).style.backgroundImage).toContain(crop);
  });
});
